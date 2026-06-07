/**
 * Conversion entre mode "Analyseur Flipper" (parsé) et mode "Hex Brut".
 * Centralise la logique d'`handleModeToggle` d'App.tsx (lignes ~861-979),
 * et utilise `detectByContent` pour une détection unifiée (M3).
 */
import type { FileMode, HexEditorState } from '../types';
import {
  serializeNfcFile, parseNfcFile
} from '../utils/nfcParser';
import {
  serializeIButtonFile, parseIButtonFile, convertIButtonToBinary,
  serializeRfidFile, parseRfidFile, convertRfidToBinary,
  serializeIrFile, parseIrFile,
  serializeSubGhzFile, parseSubGhzFile
} from '../utils/flipperParsers';
import { detectByContent } from './fileTypeDetector';

export class ModeConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModeConversionError';
  }
}

/**
 * Convertit l'état courant vers le mode "raw" (Hex Brut).
 * Sérialise la carte parsée en texte UTF-8 puis l'expose comme Uint8Array.
 */
export function toRaw(state: HexEditorState): HexEditorState {
  let textContent = '';
  if (state.fileMode === 'nfc' && state.nfcCard) textContent = serializeNfcFile(state.nfcCard);
  else if (state.fileMode === 'ibtn' && state.ibtnCard) textContent = serializeIButtonFile(state.ibtnCard);
  else if (state.fileMode === 'rfid' && state.rfidCard) textContent = serializeRfidFile(state.rfidCard);
  else if (state.fileMode === 'ir' && state.irCard) textContent = serializeIrFile(state.irCard);
  else if (state.fileMode === 'sub' && state.subGhzCard) textContent = serializeSubGhzFile(state.subGhzCard);
  else if (state.fileMode === 'badusb' && state.badusbScript !== null) textContent = state.badusbScript;
  else return state;

  const raw = new TextEncoder().encode(textContent);
  return {
    ...state,
    fileMode: 'raw',
    fileSize: raw.length,
    rawBytes: raw,
    cursorIndex: 0,
    compareState: null
  };
}

/**
 * Convertit l'état courant depuis le mode "raw" vers le mode "Analyseur Flipper".
 * Détecte le format par analyse du contenu (header `Filetype:`).
 * Si rien n'est reconnu, bascule en mode BadUSB (texte libre).
 */
export function fromRaw(state: HexEditorState): HexEditorState {
  if (!state.rawBytes) return state;
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(state.rawBytes);
  } catch {
    throw new ModeConversionError('Erreur de décodage textuel pour le format Flipper.');
  }

  const detected: FileMode | null = detectByContent(text);

  if (detected === 'nfc') {
    const card = parseNfcFile(text);
    const blockCount = card.lines.filter(l => l.type === 'block').length;
    return { ...state, fileMode: 'nfc', fileSize: blockCount * 16, nfcCard: card, rawBytes: null, cursorIndex: 0 };
  }
  if (detected === 'ibtn') {
    const card = parseIButtonFile(text);
    const binary = convertIButtonToBinary(card);
    return { ...state, fileMode: 'ibtn', fileSize: binary.length, ibtnCard: card, rawBytes: binary, cursorIndex: 0 };
  }
  if (detected === 'rfid') {
    const card = parseRfidFile(text);
    const binary = convertRfidToBinary(card);
    return { ...state, fileMode: 'rfid', fileSize: binary.length, rfidCard: card, rawBytes: binary, cursorIndex: 0 };
  }
  if (detected === 'ir') {
    const card = parseIrFile(text);
    return { ...state, fileMode: 'ir', fileSize: 0, irCard: card, rawBytes: null, cursorIndex: null };
  }
  if (detected === 'sub') {
    const card = parseSubGhzFile(text);
    return { ...state, fileMode: 'sub', fileSize: card.rawTimes ? card.rawTimes.length : 0, subGhzCard: card, rawBytes: null, cursorIndex: null };
  }

  // Inconnu → BadUSB texte libre
  return { ...state, fileMode: 'badusb', fileSize: text.length, badusbScript: text, rawBytes: null, cursorIndex: null };
}
