import type { NfcLine, IButtonCard, RfidCard, IrCard, IrButton, SubGhzCard } from '../types';

/**
 * Calcule le CRC-8 Dallas 1-Wire (polynôme X^8 + X^5 + X^4 + 1).
 */
export function calculateDallasCrc(bytes: number[]): number {
  let crc = 0;
  for (let i = 0; i < 7; i++) {
    let byte = bytes[i];
    for (let j = 0; j < 8; j++) {
      const mix = (crc ^ byte) & 0x01;
      crc >>= 1;
      if (mix) {
        crc ^= 0x8C;
      }
      byte >>= 1;
    }
  }
  return crc;
}

// ==========================================
// 1. IBUTTON (.ibtn)
// ==========================================

export function parseIButtonFile(content: string): IButtonCard {
  const lines: NfcLine[] = [];
  let fileType = '';
  let version = 1;
  let protocol = '';
  let romData: string[] | undefined;
  let sramData: string[] | undefined;
  let eepromData: string[] | undefined;
  let data: string[] | undefined;

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

    const headerMatch = trimmed.match(/^([^:]+)\s*:\s*(.*)$/);
    if (headerMatch) {
      const key = headerMatch[1].trim();
      const value = headerMatch[2].trim();

      lines.push({ type: 'header', key, value, raw: rawLine });

      if (key === 'Filetype') fileType = value;
      else if (key === 'Version') version = parseInt(value, 10);
      else if (key === 'Protocol' || key === 'Key type') protocol = value;
      else if (key === 'Rom Data') romData = value.split(/\s+/);
      else if (key === 'Sram Data') sramData = value.split(/\s+/);
      else if (key === 'Eeprom Data') eepromData = value.split(/\s+/);
      else if (key === 'Data') data = value.split(/\s+/);
      continue;
    }

    lines.push({ type: 'comment', raw: rawLine });
  }

  return {
    fileType,
    version,
    protocol,
    romData,
    sramData,
    eepromData,
    data,
    lines
  };
}

export function serializeIButtonFile(card: IButtonCard): string {
  const outputLines: string[] = [];

  for (const line of card.lines) {
    if (line.type === 'empty' || line.type === 'comment') {
      outputLines.push(line.raw);
    } else if (line.type === 'header') {
      let val = line.value || '';
      if (line.key === 'Filetype') val = card.fileType;
      else if (line.key === 'Version') val = card.version.toString();
      else if (line.key === 'Protocol' || line.key === 'Key type') val = card.protocol;
      else if (line.key === 'Rom Data' && card.romData) val = card.romData.join(' ');
      else if (line.key === 'Sram Data' && card.sramData) val = card.sramData.join(' ');
      else if (line.key === 'Eeprom Data' && card.eepromData) val = card.eepromData.join(' ');
      else if (line.key === 'Data' && card.data) val = card.data.join(' ');

      outputLines.push(`${line.key}: ${val}`);
    }
  }

  return outputLines.join('\n') + (outputLines.length > 0 && !outputLines[outputLines.length - 1].endsWith('\n') ? '\n' : '');
}

export function convertIButtonToBinary(card: IButtonCard): Uint8Array {
  const parts: string[] = [];
  if (card.romData) parts.push(...card.romData);
  if (card.sramData) parts.push(...card.sramData);
  else if (card.eepromData) parts.push(...card.eepromData);
  else if (card.data) parts.push(...card.data);

  const binary = new Uint8Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const val = parseInt(parts[i], 16);
    binary[i] = isNaN(val) ? 0 : val;
  }
  return binary;
}

export function updateIButtonFromBinary(card: IButtonCard, bytes: Uint8Array): IButtonCard {
  const hexStrs = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase());
  const updated = { ...card };

  let offset = 0;
  if (card.romData) {
    updated.romData = hexStrs.slice(offset, offset + card.romData.length);
    offset += card.romData.length;
  }
  if (card.sramData) {
    updated.sramData = hexStrs.slice(offset, offset + card.sramData.length);
  } else if (card.eepromData) {
    updated.eepromData = hexStrs.slice(offset, offset + card.eepromData.length);
  } else if (card.data) {
    updated.data = hexStrs.slice(offset, offset + card.data.length);
  }

  return updated;
}

// ==========================================
// 2. LF RFID (.rfid)
// ==========================================

export function parseRfidFile(content: string): RfidCard {
  const lines: NfcLine[] = [];
  let fileType = '';
  let version = 1;
  let keyType = '';
  let data: string[] = [];

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

    const headerMatch = trimmed.match(/^([^:]+)\s*:\s*(.*)$/);
    if (headerMatch) {
      const key = headerMatch[1].trim();
      const value = headerMatch[2].trim();

      lines.push({ type: 'header', key, value, raw: rawLine });

      if (key === 'Filetype') fileType = value;
      else if (key === 'Version') version = parseInt(value, 10);
      else if (key === 'Key type') keyType = value;
      else if (key === 'Data') data = value.split(/\s+/);
      continue;
    }

    lines.push({ type: 'comment', raw: rawLine });
  }

  return {
    fileType,
    version,
    keyType,
    data,
    lines
  };
}

export function serializeRfidFile(card: RfidCard): string {
  const outputLines: string[] = [];

  for (const line of card.lines) {
    if (line.type === 'empty' || line.type === 'comment') {
      outputLines.push(line.raw);
    } else if (line.type === 'header') {
      let val = line.value || '';
      if (line.key === 'Filetype') val = card.fileType;
      else if (line.key === 'Version') val = card.version.toString();
      else if (line.key === 'Key type') val = card.keyType;
      else if (line.key === 'Data') val = card.data.join(' ');

      outputLines.push(`${line.key}: ${val}`);
    }
  }

  return outputLines.join('\n') + (outputLines.length > 0 && !outputLines[outputLines.length - 1].endsWith('\n') ? '\n' : '');
}

export function convertRfidToBinary(card: RfidCard): Uint8Array {
  const binary = new Uint8Array(card.data.length);
  for (let i = 0; i < card.data.length; i++) {
    const val = parseInt(card.data[i], 16);
    binary[i] = isNaN(val) ? 0 : val;
  }
  return binary;
}

export function updateRfidFromBinary(card: RfidCard, bytes: Uint8Array): RfidCard {
  const hexStrs = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase());
  return {
    ...card,
    data: hexStrs
  };
}

// ==========================================
// 3. INFRARED (.ir)
// ==========================================

export function parseIrFile(content: string): IrCard {
  const lines: NfcLine[] = [];
  let fileType = '';
  let version = 1;
  const buttons: IrButton[] = [];

  const rawLines = content.split(/\r?\n/);
  let currentButton: Partial<IrButton> | null = null;

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

    const headerMatch = trimmed.match(/^([^:]+)\s*:\s*(.*)$/);
    if (headerMatch) {
      const key = headerMatch[1].trim();
      const value = headerMatch[2].trim();

      lines.push({ type: 'header', key, value, raw: rawLine });

      if (key === 'Filetype') {
        fileType = value;
      } else if (key === 'Version') {
        version = parseInt(value, 10);
      } else if (key === 'name') {
        if (currentButton) {
          buttons.push(currentButton as IrButton);
        }
        currentButton = { name: value };
      } else if (currentButton) {
        if (key === 'type') currentButton.type = value as 'parsed' | 'raw';
        else if (key === 'protocol') currentButton.protocol = value;
        else if (key === 'address') currentButton.address = value;
        else if (key === 'command') currentButton.command = value;
        else if (key === 'frequency') currentButton.frequency = parseInt(value, 10);
        else if (key === 'duty_cycle') currentButton.dutyCycle = parseFloat(value);
        else if (key === 'data') currentButton.data = value;
      }
      continue;
    }

    lines.push({ type: 'comment', raw: rawLine });
  }

  if (currentButton) {
    buttons.push(currentButton as IrButton);
  }

  return {
    fileType,
    version,
    buttons,
    lines
  };
}

export function serializeIrFile(card: IrCard): string {
  // m7 — Tentative de sérialisation préservante : on rejoue card.lines pour
  // garder les commentaires utilisateur de l'origine.
  // Si l'utilisateur a ajouté ou supprimé des boutons, on bascule sur la
  // sérialisation complète "from scratch" pour rester cohérent.
  const lineButtonsCount = card.lines.filter(l => l.type === 'header' && l.key === 'name').length;
  const canPreserve = lineButtonsCount === card.buttons.length && card.lines.length > 0;

  if (!canPreserve) {
    return serializeIrFromScratch(card);
  }

  const outputLines: string[] = [];
  let buttonIdx = -1;

  for (const line of card.lines) {
    if (line.type === 'empty' || line.type === 'comment') {
      outputLines.push(line.raw);
      continue;
    }
    if (line.type !== 'header') continue;

    let val = line.value || '';
    if (line.key === 'Filetype') {
      val = card.fileType;
    } else if (line.key === 'Version') {
      val = card.version.toString();
    } else if (line.key === 'name') {
      buttonIdx++;
      const b = card.buttons[buttonIdx];
      val = b?.name ?? val;
    } else if (buttonIdx >= 0 && buttonIdx < card.buttons.length) {
      const b = card.buttons[buttonIdx];
      if (line.key === 'type') val = b.type;
      else if (line.key === 'protocol' && b.protocol !== undefined) val = b.protocol;
      else if (line.key === 'address' && b.address !== undefined) val = b.address;
      else if (line.key === 'command' && b.command !== undefined) val = b.command;
      else if (line.key === 'frequency' && b.frequency !== undefined) val = b.frequency.toString();
      else if (line.key === 'duty_cycle' && b.dutyCycle !== undefined) val = b.dutyCycle.toFixed(6);
      else if (line.key === 'data' && b.data !== undefined) val = b.data;
    }
    outputLines.push(`${line.key}: ${val}`);
  }

  return outputLines.join('\n') + (outputLines.length > 0 && !outputLines[outputLines.length - 1].endsWith('\n') ? '\n' : '');
}

function serializeIrFromScratch(card: IrCard): string {
  const outputLines: string[] = [
    `Filetype: ${card.fileType}`,
    `Version: ${card.version}`,
    `#`
  ];

  for (const btn of card.buttons) {
    outputLines.push(`name: ${btn.name}`);
    outputLines.push(`type: ${btn.type}`);
    if (btn.type === 'parsed') {
      if (btn.protocol) outputLines.push(`protocol: ${btn.protocol}`);
      if (btn.address) outputLines.push(`address: ${btn.address}`);
      if (btn.command) outputLines.push(`command: ${btn.command}`);
    } else {
      if (btn.frequency !== undefined) outputLines.push(`frequency: ${btn.frequency}`);
      if (btn.dutyCycle !== undefined) outputLines.push(`duty_cycle: ${btn.dutyCycle.toFixed(6)}`);
      if (btn.data) outputLines.push(`data: ${btn.data}`);
    }
    outputLines.push(`#`);
  }

  return outputLines.join('\n') + '\n';
}

// ==========================================
// 4. SUB-GHZ (.sub)
// ==========================================

export function parseSubGhzFile(content: string): SubGhzCard {
  const lines: NfcLine[] = [];
  let fileType = '';
  let version = 1;
  let frequency: number | undefined;
  let preset: string | undefined;
  let protocol: string | undefined;
  let bit: number | undefined;
  let key: string | undefined;
  const rawTimes: number[] = [];

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

    const headerMatch = trimmed.match(/^([^:]+)\s*:\s*(.*)$/);
    if (headerMatch) {
      const k = headerMatch[1].trim();
      const value = headerMatch[2].trim();

      lines.push({ type: 'header', key: k, value, raw: rawLine });

      if (k === 'Filetype') fileType = value;
      else if (k === 'Version') version = parseInt(value, 10);
      else if (k === 'Frequency') frequency = parseInt(value, 10);
      else if (k === 'Preset') preset = value;
      else if (k === 'Protocol') protocol = value;
      else if (k === 'Bit') bit = parseInt(value, 10);
      else if (k === 'Key') key = value;
      else if (k === 'RAW_Data') {
        const timings = value.split(/\s+/).map(t => parseInt(t, 10)).filter(t => !isNaN(t));
        rawTimes.push(...timings);
      }
      continue;
    }

    lines.push({ type: 'comment', raw: rawLine });
  }

  return {
    fileType,
    version,
    frequency,
    preset,
    protocol,
    bit,
    key,
    rawTimes: rawTimes.length > 0 ? rawTimes : undefined,
    lines
  };
}

export function serializeSubGhzFile(card: SubGhzCard): string {
  const outputLines: string[] = [];

  for (const line of card.lines) {
    if (line.type === 'empty' || line.type === 'comment') {
      outputLines.push(line.raw);
    } else if (line.type === 'header') {
      let val = line.value || '';
      if (line.key === 'Filetype') val = card.fileType;
      else if (line.key === 'Version') val = card.version.toString();
      else if (line.key === 'Frequency') val = card.frequency ? card.frequency.toString() : '';
      else if (line.key === 'Preset') val = card.preset || '';
      else if (line.key === 'Protocol') val = card.protocol || '';
      else if (line.key === 'Bit') val = card.bit ? card.bit.toString() : '';
      else if (line.key === 'Key') val = card.key || '';
      else if (line.key === 'RAW_Data') {
        continue;
      }

      outputLines.push(`${line.key}: ${val}`);
    }
  }

  if (card.rawTimes && card.rawTimes.length > 0) {
    const CHUNK_SIZE = 512;
    for (let i = 0; i < card.rawTimes.length; i += CHUNK_SIZE) {
      const chunk = card.rawTimes.slice(i, i + CHUNK_SIZE);
      outputLines.push(`RAW_Data: ${chunk.join(' ')}`);
    }
  }

  return outputLines.join('\n') + (outputLines.length > 0 && !outputLines[outputLines.length - 1].endsWith('\n') ? '\n' : '');
}

// ==========================================
// 5. DALLAS 1-WIRE FILE SYSTEM (1WFS)
// ==========================================

export interface DallasFile {
  name: string;
  ext: string;
  startPage: number;
  pageCount: number;
  contentHex: string[];
  contentAscii: string;
}

export function parse1WfsDirectory(bytes: string[], totalPages: number): DallasFile[] {
  const pageSize = 32;
  const files: DallasFile[] = [];

  const raw = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const val = parseInt(bytes[i], 16);
    raw[i] = isNaN(val) ? 0 : val;
  }

  const offsets = [4, 12, 20, 28, 36, 44, 52, 60];

  for (const offset of offsets) {
    if (offset + 8 > raw.length) break;

    const nameBytes = raw.slice(offset, offset + 4);
    const name = Array.from(nameBytes).map(b => String.fromCharCode(b)).join('').trim();

    const isPrintable = /^[a-zA-Z0-9_\-.]{1,4}$/.test(name);
    if (!isPrintable || nameBytes[0] === 0) continue;

    const extVal = raw[offset + 4];
    const ext = extVal === 0 ? 'TXT' : String.fromCharCode(extVal).match(/^[a-zA-Z0-9]$/) ? String.fromCharCode(extVal) : extVal.toString(16).toUpperCase();
    const startPage = raw[offset + 5];
    const pageCount = raw[offset + 6];

    if (startPage === 0 || startPage >= totalPages || pageCount === 0 || startPage + pageCount > totalPages) {
      continue;
    }

    const fileStart = startPage * pageSize;
    const fileEnd = Math.min((startPage + pageCount) * pageSize, raw.length);
    const fileBytes = raw.slice(fileStart, fileEnd);

    const contentHex = Array.from(fileBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase());
    
    const contentAscii = Array.from(fileBytes)
      .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
      .join('');

    files.push({
      name,
      ext,
      startPage,
      pageCount,
      contentHex,
      contentAscii
    });
  }

  if (files.length === 0) {
    for (let p = 1; p < totalPages; p++) {
      const start = p * pageSize;
      const fileBytes = raw.slice(start, start + pageSize);
      const isZero = fileBytes.every(b => b === 0);
      if (!isZero) {
        const contentAscii = Array.from(fileBytes)
          .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
          .join('');
        const printableCount = Array.from(fileBytes).filter(b => b >= 32 && b <= 126).length;
        if (printableCount > 5) {
          const contentHex = Array.from(fileBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase());
          files.push({
            name: `PAGE_${p}`,
            ext: 'RAW',
            startPage: p,
            pageCount: 1,
            contentHex,
            contentAscii
          });
        }
      }
    }
  }

  return files;
}
