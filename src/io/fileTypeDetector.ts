/**
 * Détection unifiée du format Flipper (M3 — supprime les magic-strings dupliquées
 * dans handleModeToggle/loadFileContent).
 *
 * Deux stratégies :
 *  - detectByExtension(name)  → rapide, basée sur le suffixe du fichier
 *  - detectByContent(text)    → robuste, parse strictement la 1re ligne `Filetype:`
 */
import type { FileMode } from '../types';

const EXT_MAP: Record<string, FileMode> = {
  '.nfc': 'nfc',
  '.ibtn': 'ibtn',
  '.rfid': 'rfid',
  '.ir': 'ir',
  '.sub': 'sub',
  '.txt': 'badusb',
  '.badusb': 'badusb'
};

const TEXT_EXTS = new Set<string>(Object.keys(EXT_MAP));

export function detectByExtension(fileName: string): FileMode | null {
  const lower = fileName.toLowerCase();
  for (const ext of Object.keys(EXT_MAP)) {
    if (lower.endsWith(ext)) return EXT_MAP[ext];
  }
  return null;
}

export function isTextExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  for (const ext of TEXT_EXTS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Détecte le format Flipper en analysant le contenu textuel.
 * Cherche la 1re ligne non-vide non-commentée commençant par "Filetype:".
 * Tolère espaces/tabs autour, casse exacte (Flipper produit toujours "Filetype: X").
 */
export function detectByContent(text: string): FileMode | null {
  // On limite la recherche aux 16 premières lignes pour rester rapide sur gros fichiers
  const head = text.split(/\r?\n/, 16);
  for (const rawLine of head) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^Filetype\s*:\s*(.+)$/);
    if (!m) {
      // Premier non-commentaire qui n'est pas Filetype → probablement pas un fichier Flipper
      return null;
    }
    const value = m[1].trim();
    return mapFiletypeValue(value);
  }
  return null;
}

function mapFiletypeValue(value: string): FileMode | null {
  // Reproduit les en-têtes officiels Flipper Zero
  if (value === 'Flipper NFC device') return 'nfc';
  if (value === 'Flipper iButton key') return 'ibtn';
  if (value === 'Flipper RFID key') return 'rfid';
  if (value === 'IR signals file' || value === 'IR library file') return 'ir';
  if (value === 'Flipper SubGhz Key File' || value === 'Flipper SubGhz RAW File' || value.startsWith('Flipper SubGhz')) return 'sub';
  return null;
}
