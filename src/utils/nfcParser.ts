import type { MifareClassicCard, NfcLine, DecodedSector, SectorPermission } from '../types';

/**
 * Analyse le contenu d'un fichier .nfc au format Flipper.
 */
export function parseNfcFile(content: string): MifareClassicCard {
  const lines: NfcLine[] = [];
  let fileType = '';
  let version = 0;
  let deviceType = '';
  let uid = '';
  let atqa = '';
  let sak = '';
  let ats = '';
  let mifareClassicType = '1K';
  let dataFormatVersion = 1;

  // Séparer par ligne (accepte \r\n ou \n)
  const rawLines = content.split(/\r?\n/);

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      lines.push({ type: 'empty', raw: rawLine });
      continue;
    }

    if (trimmed.startsWith('#')) {
      lines.push({ type: 'comment', raw: rawLine });
      continue;
    }

    // Détection des blocs de données
    const blockMatch = trimmed.match(/^Block\s+(\d+)\s*:\s*(.*)$/i);
    if (blockMatch) {
      const blockIndex = parseInt(blockMatch[1], 10);
      const bytesStr = blockMatch[2].trim();
      // Séparer les octets par espace
      const bytes = bytesStr.split(/\s+/);
      lines.push({
        type: 'block',
        blockIndex,
        bytes,
        raw: rawLine
      });
      continue;
    }

    // Détection des pages (Mifare Ultralight / NTAG)
    const pageMatch = trimmed.match(/^Page\s+(\d+)\s*:\s*(.*)$/i);
    if (pageMatch) {
      const pageIndex = parseInt(pageMatch[1], 10);
      const bytesStr = pageMatch[2].trim();
      const bytes = bytesStr.split(/\s+/);
      lines.push({
        type: 'block',
        blockIndex: pageIndex,
        bytes,
        raw: rawLine
      });
      continue;
    }

    // Détection des en-têtes (Key: Value)
    const headerMatch = trimmed.match(/^([^:]+)\s*:\s*(.*)$/);
    if (headerMatch) {
      const key = headerMatch[1].trim();
      const value = headerMatch[2].trim();

      lines.push({
        type: 'header',
        key,
        value,
        raw: rawLine
      });

      // Remplir les métadonnées principales
      if (key === 'Filetype') fileType = value;
      else if (key === 'Version') version = parseInt(value, 10);
      else if (key === 'Device type') deviceType = value;
      else if (key === 'UID') uid = value;
      else if (key === 'ATQA') atqa = value;
      else if (key === 'SAK') sak = value;
      else if (key === 'ATS') ats = value;
      else if (key === 'Mifare Classic type') mifareClassicType = value;
      else if (key === 'Data format version') dataFormatVersion = parseInt(value, 10);
      
      continue;
    }

    // Autre ligne inconnue (traitée comme commentaire)
    lines.push({ type: 'comment', raw: rawLine });
  }

  return {
    fileType,
    version,
    deviceType,
    uid,
    atqa,
    sak,
    ats,
    mifareClassicType,
    dataFormatVersion,
    lines
  };
}

/**
 * Sérialise une carte NFC Flipper en chaîne de caractères.
 */
export function serializeNfcFile(card: MifareClassicCard): string {
  const outputLines: string[] = [];

  for (const line of card.lines) {
    if (line.type === 'empty' || line.type === 'comment') {
      outputLines.push(line.raw);
    } else if (line.type === 'header') {
      // Trouver si la valeur a été modifiée dans notre objet principal
      let val = line.value || '';
      if (line.key === 'Filetype') val = card.fileType;
      else if (line.key === 'Version') val = card.version.toString();
      else if (line.key === 'Device type') val = card.deviceType;
      else if (line.key === 'UID') val = card.uid;
      else if (line.key === 'ATQA' && card.atqa) val = card.atqa;
      else if (line.key === 'SAK' && card.sak) val = card.sak;
      else if (line.key === 'ATS' && card.ats) val = card.ats;
      else if (line.key === 'Mifare Classic type' && card.mifareClassicType) val = card.mifareClassicType;
      else if (line.key === 'Data format version' && card.dataFormatVersion) val = card.dataFormatVersion.toString();

      outputLines.push(`${line.key}: ${val}`);
    } else if (line.type === 'block') {
      const blockIndex = line.blockIndex!;
      const bytesStr = line.bytes!.join(' ');
      if (card.deviceType === 'NTAG/Ultralight') {
        outputLines.push(`Page ${blockIndex}: ${bytesStr}`);
      } else {
        outputLines.push(`Block ${blockIndex}: ${bytesStr}`);
      }
    }
  }

  // S'assurer qu'il y a un retour à la ligne à la fin
  return outputLines.join('\n') + (outputLines.length > 0 && !outputLines[outputLines.length - 1].endsWith('\n') ? '\n' : '');
}

/**
 * Analyse et décode les bits d'accès d'un secteur Mifare Classic.
 */
export function decodeSector(card: MifareClassicCard, sectorIndex: number): DecodedSector {
  const isLargeSector = sectorIndex >= 32;
  const startBlock = isLargeSector 
    ? 128 + (sectorIndex - 32) * 16 
    : sectorIndex * 4;
  const endBlock = isLargeSector 
    ? startBlock + 15 
    : startBlock + 3;

  // Trouver la ligne du trailer du secteur (le dernier bloc)
  const trailerBlockLine = card.lines.find(l => l.type === 'block' && l.blockIndex === endBlock);

  if (!trailerBlockLine || !trailerBlockLine.bytes || trailerBlockLine.bytes.length < 16) {
    return createEmptyDecodedSector(sectorIndex, startBlock, endBlock);
  }

  const bytes = trailerBlockLine.bytes;

  // Key A : octets 0 à 5
  const keyA = bytes.slice(0, 6).join(' ');
  // Key B : octets 10 à 15
  const keyB = bytes.slice(10, 16).join(' ');
  // Access Bits : octets 6, 7, 8
  const accessBytes = bytes.slice(6, 9);
  // User Byte : octet 9
  const userByte = bytes[9];

  // Vérifier si des octets d'accès sont inconnus (??)
  if (accessBytes.some(b => b === '??')) {
    return {
      sectorIndex,
      startBlock,
      endBlock,
      keyA,
      keyB,
      accessBytes,
      userByte,
      permissions: [],
      isValid: false
    };
  }

  const b6 = parseInt(accessBytes[0], 16);
  const b7 = parseInt(accessBytes[1], 16);
  const b8 = parseInt(accessBytes[2], 16);

  if (isNaN(b6) || isNaN(b7) || isNaN(b8)) {
    return {
      sectorIndex,
      startBlock,
      endBlock,
      keyA,
      keyB,
      accessBytes,
      userByte,
      permissions: [],
      isValid: false
    };
  }

  const permissions: SectorPermission[] = [];
  let isValid = true;
  const loopCount = isLargeSector ? 16 : 4;

  // Décoder les bits de contrôle C1, C2, C3 pour chaque bloc (ou groupe de blocs)
  for (let i = 0; i < loopCount; i++) {
    const globalBlockIndex = startBlock + i;
    const isTrailer = isLargeSector ? (i === 15) : (i === 3);

    // Déterminer à quel groupe d'accès appartient ce bloc (0, 1, 2 ou 3)
    let accessGroupIndex: number;
    if (isLargeSector) {
      if (i === 15) accessGroupIndex = 3;
      else if (i >= 10) accessGroupIndex = 2;
      else if (i >= 5) accessGroupIndex = 1;
      else accessGroupIndex = 0;
    } else {
      accessGroupIndex = i;
    }

    // Récupérer les bits inversés
    const nc1 = (b6 >> accessGroupIndex) & 1;
    const nc2 = (b6 >> (4 + accessGroupIndex)) & 1;
    const nc3 = (b7 >> accessGroupIndex) & 1;

    // Récupérer les bits normaux
    const c1 = (b7 >> (4 + accessGroupIndex)) & 1;
    const c2 = (b8 >> accessGroupIndex) & 1;
    const c3 = (b8 >> (4 + accessGroupIndex)) & 1;

    // Vérifier la cohérence (les bits inversés doivent être le complément à 1 des bits normaux)
    const check1 = nc1 === (c1 ^ 1);
    const check2 = nc2 === (c2 ^ 1);
    const check3 = nc3 === (c3 ^ 1);

    if (!check1 || !check2 || !check3) {
      isValid = false;
    }

    let read: string;
    let write: string;
    let increment: string;
    let decrement: string;
    let desc: string;

    const code = `${c1}${c2}${c3}`;

    if (isTrailer) {
      // Bloc Trailer (Bloc 3)
      desc = `Sector Trailer (Block ${globalBlockIndex})`;
      switch (code) {
        case '000':
          read = 'Jamais';
          write = 'Key A | Key B (Key A)';
          increment = 'Access Bits (Key A)';
          decrement = 'Jamais';
          desc += ' - Key writes by Key A, access bits read-only';
          break;
        case '010':
          read = 'Jamais';
          write = 'Jamais';
          increment = 'Access Bits (Key A)';
          decrement = 'Jamais';
          desc += ' - Keys locked, access bits read-only (A)';
          break;
        case '100':
          read = 'Jamais';
          write = 'Key A | Key B (Key B)';
          increment = 'Access Bits (Key A or B)';
          decrement = 'Jamais';
          desc += ' - Key writes by Key B, access bits read-only';
          break;
        case '110':
          read = 'Jamais';
          write = 'Jamais';
          increment = 'Access Bits (Key A or B)';
          decrement = 'Jamais';
          desc += ' - Keys locked, access bits read-only (A/B)';
          break;
        case '001':
          read = 'Jamais';
          write = 'Key A | Key B (Key A)';
          increment = 'Access Bits (Key A)';
          decrement = 'Access Bits (Key A)';
          desc += ' - Standard config (Key A manages all)';
          break;
        case '011':
          read = 'Jamais';
          write = 'Key A | Key B (Key B)';
          increment = 'Access Bits (Key A or B)';
          decrement = 'Access Bits (Key B)';
          desc += ' - Key B manages everything (Keys & Bits)';
          break;
        case '101':
          read = 'Jamais';
          write = 'Jamais';
          increment = 'Access Bits (Key A or B)';
          decrement = 'Access Bits (Key B)';
          desc += ' - Access bits modifiable by Key B, keys locked';
          break;
        case '111':
        default:
          read = 'Jamais';
          write = 'Jamais';
          increment = 'Access Bits (Key A or B)';
          decrement = 'Jamais';
          desc += ' - Entièrement verrouillé en écriture';
          break;
      }
    } else {
      // Blocs de données (Blocs 0, 1, 2)
      desc = `Bloc de données ${i} (Block ${globalBlockIndex})`;
      switch (code) {
        case '000':
          read = 'Key A ou B';
          write = 'Key A ou B';
          increment = 'Key A ou B';
          decrement = 'Key A ou B';
          desc += ' - Standard Read/Write';
          break;
        case '010':
          read = 'Key A ou B';
          write = 'Jamais';
          increment = 'Jamais';
          decrement = 'Jamais';
          desc += ' - Read only';
          break;
        case '100':
          read = 'Key A ou B';
          write = 'Key B';
          increment = 'Jamais';
          decrement = 'Jamais';
          desc += ' - Write restricted to Key B';
          break;
        case '110':
          read = 'Key A ou B';
          write = 'Key B';
          increment = 'Key B';
          decrement = 'Key A ou B';
          desc += ' - Bloc valeur (Key B écriture/inc)';
          break;
        case '001':
          read = 'Key A ou B';
          write = 'Jamais';
          increment = 'Jamais';
          decrement = 'Key A ou B';
          desc += ' - Bloc valeur (Décrémentation seule)';
          break;
        case '011':
          read = 'Key B';
          write = 'Key B';
          increment = 'Jamais';
          decrement = 'Jamais';
          desc += ' - Read/Write Key B only';
          break;
        case '101':
          read = 'Key B';
          write = 'Jamais';
          increment = 'Jamais';
          decrement = 'Jamais';
          desc += ' - Read only Key B only';
          break;
        case '111':
        default:
          read = 'Jamais';
          write = 'Jamais';
          increment = 'Jamais';
          decrement = 'Jamais';
          desc += ' - Bloqué (Données inaccessibles)';
          break;
      }
    }

    permissions.push({
      blockIndex: globalBlockIndex,
      blockType: isTrailer ? 'trailer' : 'data',
      read,
      write,
      increment,
      decrement,
      desc
    });
  }

  return {
    sectorIndex,
    startBlock,
    endBlock,
    keyA,
    keyB,
    accessBytes,
    userByte,
    permissions,
    isValid
  };
}

function createEmptyDecodedSector(sectorIndex: number, startBlock: number, endBlock: number): DecodedSector {
  return {
    sectorIndex,
    startBlock,
    endBlock,
    keyA: '?? ?? ?? ?? ?? ??',
    keyB: '?? ?? ?? ?? ?? ??',
    accessBytes: ['??', '??', '??'],
    userByte: '??',
    permissions: [],
    isValid: false
  };
}

/**
 * Met à jour les valeurs d'octets d'un bloc dans les lignes brutes de la carte NFC.
 */
export function updateCardBlock(card: MifareClassicCard, blockIndex: number, bytes: string[]): MifareClassicCard {
  const updatedLines = card.lines.map(line => {
    if (line.type === 'block' && line.blockIndex === blockIndex) {
      return {
        ...line,
        bytes,
        raw: `Block ${blockIndex}: ${bytes.join(' ')}`
      };
    }
    return line;
  });

  return {
    ...card,
    lines: updatedLines
  };
}

/**
 * Calcule l'entropie de Shannon pour un flux d'octets.
 * L'entropie varie entre 0 (très structuré/répétitif) et 8 (aléatoire/chiffré).
 */
export function calculateShannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  
  const frequencies = new Array(256).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    frequencies[bytes[i]]++;
  }
  
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / bytes.length;
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

/**
 * Convertit une carte NFC en tableau d'octets binaires pour les statistiques (si toutes les données sont connues).
 * Remplace les octets inconnus '??' par 0x00.
 */
export function convertNfcToBinary(card: MifareClassicCard): Uint8Array {
  const blockLines = card.lines.filter(l => l.type === 'block');
  if (blockLines.length === 0) return new Uint8Array(0);

  const maxBlockIndex = Math.max(...blockLines.map(l => l.blockIndex ?? 0));
  const isPageMode = card.deviceType === 'NTAG/Ultralight';
  const bytesPerBlock = isPageMode ? 4 : 16;
  
  const totalBytes = (maxBlockIndex + 1) * bytesPerBlock;
  const binary = new Uint8Array(totalBytes);
  
  for (const line of blockLines) {
    if (line.bytes && line.blockIndex !== undefined) {
      const offset = line.blockIndex * bytesPerBlock;
      for (let i = 0; i < bytesPerBlock; i++) {
        const byteStr = line.bytes[i];
        const val = (byteStr === '??' || !byteStr) ? 0 : parseInt(byteStr, 16);
        binary[offset + i] = isNaN(val) ? 0 : val;
      }
    }
  }
  
  return binary;
}

/**
 * Convertit un dump binaire brut (1K ou 4K) en carte NFC Flipper compatible.
 */
export function convertBinaryToNfc(bytes: Uint8Array): MifareClassicCard {
  const is4K = bytes.length > 1024;
  const blockCount = is4K ? 256 : 64;
  const mifareClassicType = is4K ? '4K' : '1K';
  const atqa = is4K ? '00 02' : '00 04';
  const sak = is4K ? '18' : '08';

  // UID: les 4 premiers octets du Bloc 0
  const uidBytes: string[] = [];
  for (let i = 0; i < Math.min(4, bytes.length); i++) {
    uidBytes.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
  }
  const uid = uidBytes.join(' ');

  const lines: NfcLine[] = [
    { type: 'header', key: 'Filetype', value: 'Flipper NFC device', raw: 'Filetype: Flipper NFC device' },
    { type: 'header', key: 'Version', value: '4', raw: 'Version: 4' },
    { type: 'comment', raw: '# Device type can be ISO14443-3A, ISO14443-3B, ISO14443-4A, ISO14443-4B, ISO15693-3, FeliCa, NTAG/Ultralight, Mifare Classic, Mifare Plus, Mifare DESFire, SLIX, ST25TB, NTAG4xx, Type 4 Tag, EMV' },
    { type: 'header', key: 'Device type', value: 'Mifare Classic', raw: 'Device type: Mifare Classic' },
    { type: 'comment', raw: '# UID is common for all formats' },
    { type: 'header', key: 'UID', value: uid, raw: `UID: ${uid}` },
    { type: 'comment', raw: '# ISO14443-3A specific data' },
    { type: 'header', key: 'ATQA', value: atqa, raw: `ATQA: ${atqa}` },
    { type: 'header', key: 'SAK', value: sak, raw: `SAK: ${sak}` },
    { type: 'comment', raw: '# Mifare Classic specific data' },
    { type: 'header', key: 'Mifare Classic type', value: mifareClassicType, raw: `Mifare Classic type: ${mifareClassicType}` },
    { type: 'header', key: 'Data format version', value: '2', raw: 'Data format version: 2' },
    { type: 'comment', raw: "# Mifare Classic blocks, '??' means unknown data" }
  ];

  for (let i = 0; i < blockCount; i++) {
    const blockBytes: string[] = [];
    const start = i * 16;
    for (let j = 0; j < 16; j++) {
      const offset = start + j;
      if (offset < bytes.length) {
        blockBytes.push(bytes[offset].toString(16).padStart(2, '0').toUpperCase());
      } else {
        blockBytes.push('00');
      }
    }
    lines.push({
      type: 'block',
      blockIndex: i,
      bytes: blockBytes,
      raw: `Block ${i}: ${blockBytes.join(' ')}`
    });
  }

  return {
    fileType: 'Flipper NFC device',
    version: 4,
    deviceType: 'Mifare Classic',
    uid,
    atqa,
    sak,
    mifareClassicType,
    dataFormatVersion: 2,
    lines
  };
}
