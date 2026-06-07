/**
 * Historique undo/redo des modifications, avec deux modes :
 *  - "full"   → snapshot complet de l'état (utilisé pour NFC, iButton, RFID, IR, SubGhz, BadUSB)
 *  - "diff"   → uniquement les octets modifiés (mode "raw" — M2, évite l'OOM sur gros fichiers)
 *
 * MAX_HISTORY = 50 entrées max.
 */
import { useRef, useState, useCallback } from 'react';
import type { HexEditorState } from '../types';
import {
  cloneNfcCard,
  cloneIButtonCard,
  cloneRfidCard,
  cloneIrCard,
  cloneSubGhzCard,
  cloneCompareState
} from '../utils/deepClone';

export const MAX_HISTORY = 50;

// Une entrée d'historique peut être un snapshot complet ou un diff binaire.
type HistorySnapshot = Omit<HexEditorState, 'cursorIndex' | 'isEditingAscii'>;

interface RawDiffEntry {
  kind: 'rawDiff';
  // Position et tailles pour pouvoir reconstruire l'état précédent
  fileName: string;
  fileSize: number;
  // Liste des octets changés : [offset, ancien, nouveau]
  changes: Array<[number, number, number]>;
  compareSnapshot: HistorySnapshot['compareState'];
  isCompareMode: boolean;
}

type HistoryEntry = { kind: 'full'; snapshot: HistorySnapshot } | RawDiffEntry;

function snapshotFromState(s: HexEditorState): HistorySnapshot {
  return {
    fileMode: s.fileMode,
    fileName: s.fileName,
    fileSize: s.fileSize,
    rawBytes: s.rawBytes ? new Uint8Array(s.rawBytes) : null,
    nfcCard: cloneNfcCard(s.nfcCard),
    ibtnCard: cloneIButtonCard(s.ibtnCard),
    rfidCard: cloneRfidCard(s.rfidCard),
    irCard: cloneIrCard(s.irCard),
    badusbScript: s.badusbScript,
    subGhzCard: cloneSubGhzCard(s.subGhzCard),
    selectionStart: s.selectionStart,
    selectionEnd: s.selectionEnd,
    compareState: cloneCompareState(s.compareState),
    isCompareMode: s.isCompareMode
  };
}

function diffRawBytes(prev: Uint8Array | null, next: Uint8Array | null): Array<[number, number, number]> {
  if (!prev || !next || prev.length !== next.length) return [];
  const changes: Array<[number, number, number]> = [];
  for (let i = 0; i < next.length; i++) {
    if (prev[i] !== next[i]) {
      changes.push([i, prev[i], next[i]]);
    }
  }
  return changes;
}

export interface UseHistoryApi {
  canUndo: boolean;
  canRedo: boolean;
  reset(initial: HexEditorState): void;
  push(newState: HexEditorState, previousState: HexEditorState): void;
  undo(current: HexEditorState): HexEditorState | null;
  redo(current: HexEditorState): HexEditorState | null;
  clear(): void;
}

export function useHistory(): UseHistoryApi {
  const historyRef = useRef<HistoryEntry[]>([]);
  const [indexState, setIndexState] = useState(-1);
  const indexRef = useRef(-1);

  const setIndex = useCallback((i: number) => {
    indexRef.current = i;
    setIndexState(i);
  }, []);

  const reset = useCallback((initial: HexEditorState) => {
    historyRef.current = [{ kind: 'full', snapshot: snapshotFromState(initial) }];
    setIndex(0);
  }, [setIndex]);

  const clear = useCallback(() => {
    historyRef.current = [];
    setIndex(-1);
  }, [setIndex]);

  const push = useCallback((newState: HexEditorState, previousState: HexEditorState) => {
    // Tronquer le futur (Redo annulé par une nouvelle action)
    let next = historyRef.current.slice(0, indexRef.current + 1);

    // Pour le mode raw : tenter un diff si la structure est identique
    let entry: HistoryEntry;
    if (
      newState.fileMode === 'raw' &&
      previousState.fileMode === 'raw' &&
      previousState.rawBytes &&
      newState.rawBytes &&
      previousState.rawBytes.length === newState.rawBytes.length &&
      newState.fileName === previousState.fileName
    ) {
      const changes = diffRawBytes(previousState.rawBytes, newState.rawBytes);
      entry = {
        kind: 'rawDiff',
        fileName: newState.fileName,
        fileSize: newState.fileSize,
        changes,
        compareSnapshot: cloneCompareState(newState.compareState),
        isCompareMode: newState.isCompareMode
      };
    } else {
      entry = { kind: 'full', snapshot: snapshotFromState(newState) };
    }

    if (next.length >= MAX_HISTORY) {
      next = next.slice(next.length - MAX_HISTORY + 1);
    }
    historyRef.current = [...next, entry];
    setIndex(historyRef.current.length - 1);
  }, [setIndex]);

  const reconstructAt = useCallback((targetIdx: number, current: HexEditorState): HexEditorState | null => {
    // Trouver le dernier "full" snapshot ≤ targetIdx, puis rejouer les diffs.
    if (targetIdx < 0 || targetIdx >= historyRef.current.length) return null;
    let baseIdx = targetIdx;
    while (baseIdx >= 0 && historyRef.current[baseIdx].kind !== 'full') baseIdx--;
    if (baseIdx < 0) return null;

    const baseEntry = historyRef.current[baseIdx];
    if (baseEntry.kind !== 'full') return null;
    let snap = baseEntry.snapshot;
    let rawBytes = snap.rawBytes ? new Uint8Array(snap.rawBytes) : null;

    for (let i = baseIdx + 1; i <= targetIdx; i++) {
      const e = historyRef.current[i];
      if (e.kind === 'rawDiff' && rawBytes) {
        for (const [off, , newVal] of e.changes) {
          rawBytes[off] = newVal;
        }
        snap = {
          ...snap,
          fileName: e.fileName,
          fileSize: e.fileSize,
          rawBytes,
          compareState: e.compareSnapshot,
          isCompareMode: e.isCompareMode
        };
      } else if (e.kind === 'full') {
        snap = e.snapshot;
        rawBytes = snap.rawBytes ? new Uint8Array(snap.rawBytes) : null;
      }
    }

    return {
      ...current,
      ...snap,
      rawBytes: rawBytes ? new Uint8Array(rawBytes) : snap.rawBytes,
      nfcCard: cloneNfcCard(snap.nfcCard),
      ibtnCard: cloneIButtonCard(snap.ibtnCard),
      rfidCard: cloneRfidCard(snap.rfidCard),
      irCard: cloneIrCard(snap.irCard),
      subGhzCard: cloneSubGhzCard(snap.subGhzCard),
      compareState: cloneCompareState(snap.compareState),
      cursorIndex: current.cursorIndex !== null && current.cursorIndex < snap.fileSize ? current.cursorIndex : null
    };
  }, []);

  const undo = useCallback((current: HexEditorState): HexEditorState | null => {
    if (indexRef.current <= 0) return null;
    const target = indexRef.current - 1;
    const next = reconstructAt(target, current);
    if (!next) return null;
    setIndex(target);
    return next;
  }, [reconstructAt, setIndex]);

  const redo = useCallback((current: HexEditorState): HexEditorState | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    const target = indexRef.current + 1;
    const next = reconstructAt(target, current);
    if (!next) return null;
    setIndex(target);
    return next;
  }, [reconstructAt, setIndex]);

  return {
    canUndo: indexState > 0,
    canRedo: indexState < historyRef.current.length - 1,
    reset,
    push,
    undo,
    redo,
    clear
  };
}
