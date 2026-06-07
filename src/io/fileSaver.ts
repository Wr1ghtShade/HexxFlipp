/**
 * Sauvegarde / exports vers le système de fichiers (téléchargements navigateur).
 */
import type { HexEditorState } from '../types';
import {
  serializeNfcFile, convertNfcToBinary, convertBinaryToNfc
} from '../utils/nfcParser';
import {
  serializeIButtonFile, serializeRfidFile, serializeIrFile, serializeSubGhzFile
} from '../utils/flipperParsers';

const EXT_BY_MODE: Record<HexEditorState['fileMode'], string> = {
  nfc: '.nfc',
  ibtn: '.ibtn',
  rfid: '.rfid',
  ir: '.ir',
  sub: '.sub',
  badusb: '.txt',
  raw: '.bin'
};

export function defaultSaveName(state: HexEditorState): { name: string; ext: string } {
  const ext = EXT_BY_MODE[state.fileMode];
  const name = state.fileName || `export${ext}`;
  return { name, ext };
}

/**
 * Construit le Blob à sauvegarder selon le mode courant.
 * Retourne null si rien n'est à sauvegarder.
 */
export function buildSaveBlob(state: HexEditorState): Blob | null {
  if (state.fileMode === 'nfc' && state.nfcCard) {
    return new Blob([serializeNfcFile(state.nfcCard)], { type: 'text/plain;charset=utf-8' });
  }
  if (state.fileMode === 'ibtn' && state.ibtnCard) {
    return new Blob([serializeIButtonFile(state.ibtnCard)], { type: 'text/plain;charset=utf-8' });
  }
  if (state.fileMode === 'rfid' && state.rfidCard) {
    return new Blob([serializeRfidFile(state.rfidCard)], { type: 'text/plain;charset=utf-8' });
  }
  if (state.fileMode === 'ir' && state.irCard) {
    return new Blob([serializeIrFile(state.irCard)], { type: 'text/plain;charset=utf-8' });
  }
  if (state.fileMode === 'sub' && state.subGhzCard) {
    return new Blob([serializeSubGhzFile(state.subGhzCard)], { type: 'text/plain;charset=utf-8' });
  }
  if (state.fileMode === 'badusb' && state.badusbScript !== null) {
    return new Blob([state.badusbScript], { type: 'text/plain;charset=utf-8' });
  }
  if (state.rawBytes) {
    return new Blob([state.rawBytes as BlobPart], { type: 'application/octet-stream' });
  }
  return null;
}

export function buildExportToBinaryBlob(state: HexEditorState): { blob: Blob; defaultName: string } | null {
  if (!state.nfcCard) return null;
  const bytes = convertNfcToBinary(state.nfcCard);
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const base = state.fileName ? state.fileName.replace(/\.nfc$/i, '') : 'export';
  return { blob, defaultName: `${base}.bin` };
}

export function buildExportToNfcBlob(state: HexEditorState): { blob: Blob; defaultName: string } | null {
  if (!state.rawBytes) return null;
  const card = convertBinaryToNfc(state.rawBytes);
  const text = serializeNfcFile(card);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const base = state.fileName ? state.fileName.replace(/\.bin$/i, '') : 'export';
  return { blob, defaultName: `${base}.nfc` };
}

/**
 * Déclenche un téléchargement navigateur (createObjectURL + click + revoke).
 */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Léger délai pour s'assurer que le navigateur a démarré le téléchargement avant le revoke
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
