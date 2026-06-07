/**
 * Chargement de fichiers : transforme un File en HexEditorState complet.
 * Inclut gestion d'erreur FileReader (m1), borne de taille (m2), détection unifiée (M3).
 */
import type {
  HexEditorState, MifareClassicCard, IButtonCard, RfidCard,
  IrCard, SubGhzCard, CompareState
} from '../types';
import {
  parseNfcFile, convertBinaryToNfc
} from '../utils/nfcParser';
import {
  parseIButtonFile, convertIButtonToBinary,
  parseRfidFile, convertRfidToBinary,
  parseIrFile, parseSubGhzFile
} from '../utils/flipperParsers';
import { detectByExtension, isTextExtension } from './fileTypeDetector';
import { isFileTooLarge, MAX_FILE_SIZE, formatBytes } from './limits';

export class FileTooLargeError extends Error {
  readonly file: File;
  constructor(file: File) {
    super(`Fichier trop volumineux : ${formatBytes(file.size)} (max ${formatBytes(MAX_FILE_SIZE)})`);
    this.name = 'FileTooLargeError';
    this.file = file;
  }
}

/**
 * Lit un fichier selon son type (texte si extension Flipper, binaire sinon).
 * Renvoie une promesse qui rejette en cas d'erreur de lecture.
 */
export function readFile(file: File): Promise<{ name: string; content: string | ArrayBuffer }> {
  if (isFileTooLarge(file)) {
    return Promise.reject(new FileTooLargeError(file));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Erreur de lecture du fichier "${file.name}"`));
    reader.onabort = () => reject(new Error(`Lecture annulée pour "${file.name}"`));
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result === null || result === undefined) {
        reject(new Error(`Contenu vide pour "${file.name}"`));
        return;
      }
      resolve({ name: file.name, content: result });
    };

    if (isTextExtension(file.name)) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Construit un HexEditorState à partir d'un nom + contenu (texte ou binaire).
 */
export function buildStateFromContent(name: string, content: string | ArrayBuffer): HexEditorState {
  const mode = detectByExtension(name);

  if (mode === 'nfc' && typeof content === 'string') {
    const card = parseNfcFile(content);
    const blockCount = card.lines.filter(l => l.type === 'block').length;
    return baseState({ fileMode: 'nfc', fileName: name, fileSize: blockCount * 16, nfcCard: card, cursorIndex: 0 });
  }
  if (mode === 'ibtn' && typeof content === 'string') {
    const card = parseIButtonFile(content);
    const binary = convertIButtonToBinary(card);
    return baseState({ fileMode: 'ibtn', fileName: name, fileSize: binary.length, ibtnCard: card, rawBytes: binary, cursorIndex: 0 });
  }
  if (mode === 'rfid' && typeof content === 'string') {
    const card = parseRfidFile(content);
    const binary = convertRfidToBinary(card);
    return baseState({ fileMode: 'rfid', fileName: name, fileSize: binary.length, rfidCard: card, rawBytes: binary, cursorIndex: 0 });
  }
  if (mode === 'ir' && typeof content === 'string') {
    const card = parseIrFile(content);
    return baseState({ fileMode: 'ir', fileName: name, fileSize: 0, irCard: card });
  }
  if (mode === 'sub' && typeof content === 'string') {
    const card = parseSubGhzFile(content);
    return baseState({ fileMode: 'sub', fileName: name, fileSize: card.rawTimes ? card.rawTimes.length : 0, subGhzCard: card });
  }
  if (mode === 'badusb' && typeof content === 'string') {
    return baseState({ fileMode: 'badusb', fileName: name, fileSize: content.length, badusbScript: content });
  }

  // Fallback : binaire brut
  const buffer = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
  return baseState({ fileMode: 'raw', fileName: name, fileSize: buffer.length, rawBytes: buffer, cursorIndex: 0 });
}

/**
 * Construit un CompareState (Fichier B) selon le mode du fichier A.
 * Le mode B est toujours conformé à celui de A (logique d'origine).
 */
export function buildCompareState(name: string, content: string | ArrayBuffer, modeA: HexEditorState['fileMode']): CompareState {
  let nfcCard: MifareClassicCard | null = null;
  let ibtnCard: IButtonCard | null = null;
  let rfidCard: RfidCard | null = null;
  let irCard: IrCard | null = null;
  let subGhzCard: SubGhzCard | null = null;
  let badusbScript: string | null = null;
  let rawBytes: Uint8Array | null = null;
  let fileSize = 0;

  const lowerName = name.toLowerCase();
  const ext = detectByExtension(name);

  if (modeA === 'nfc') {
    if (ext === 'nfc' && typeof content === 'string') {
      nfcCard = parseNfcFile(content);
      fileSize = nfcCard.lines.filter(l => l.type === 'block').length * 16;
    } else {
      const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
      nfcCard = convertBinaryToNfc(bytes);
      fileSize = bytes.length;
    }
  } else if (modeA === 'ibtn') {
    if (ext === 'ibtn' && typeof content === 'string') {
      ibtnCard = parseIButtonFile(content);
      rawBytes = convertIButtonToBinary(ibtnCard);
      fileSize = rawBytes.length;
    } else {
      rawBytes = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
      fileSize = rawBytes.length;
    }
  } else if (modeA === 'rfid') {
    if (ext === 'rfid' && typeof content === 'string') {
      rfidCard = parseRfidFile(content);
      rawBytes = convertRfidToBinary(rfidCard);
      fileSize = rawBytes.length;
    } else {
      rawBytes = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
      fileSize = rawBytes.length;
    }
  } else if (modeA === 'ir') {
    if (ext === 'ir' && typeof content === 'string') {
      irCard = parseIrFile(content);
    }
  } else if (modeA === 'sub') {
    if (ext === 'sub' && typeof content === 'string') {
      subGhzCard = parseSubGhzFile(content);
      fileSize = subGhzCard.rawTimes ? subGhzCard.rawTimes.length : 0;
    }
  } else if (modeA === 'badusb') {
    if (typeof content === 'string') {
      badusbScript = content;
      fileSize = content.length;
    }
  } else {
    rawBytes = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
    fileSize = rawBytes.length;
  }

  // Référence intentionnelle au nom au cas où on ajoute plus tard une logique extension-spécifique
  void lowerName;

  return {
    fileName: name,
    fileSize,
    rawBytes,
    nfcCard,
    ibtnCard,
    rfidCard,
    irCard,
    badusbScript,
    subGhzCard
  };
}

function baseState(overrides: Partial<HexEditorState>): HexEditorState {
  return {
    fileMode: 'raw',
    fileName: '',
    fileSize: 0,
    rawBytes: null,
    nfcCard: null,
    ibtnCard: null,
    rfidCard: null,
    irCard: null,
    badusbScript: null,
    subGhzCard: null,
    cursorIndex: null,
    selectionStart: null,
    selectionEnd: null,
    isEditingAscii: false,
    compareState: null,
    isCompareMode: false,
    ...overrides
  };
}
