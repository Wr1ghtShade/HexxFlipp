/**
 * Limites I/O et utilitaires de sécurité côté fichiers.
 * (m2 — borne la taille des fichiers chargés pour éviter le freeze du tab.)
 */

// 100 Mo max. Au-delà, on bloque pour éviter d'allouer 1 Go en clones d'historique.
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

export function isFileTooLarge(file: File): boolean {
  return file.size > MAX_FILE_SIZE;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}
