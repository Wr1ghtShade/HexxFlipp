/**
 * Helpers de clonage profond pour les structures de cartes Flipper.
 * Centralise le code dédupliqué dans App.tsx (pushToHistory, undo, redo).
 */
import type {
  MifareClassicCard,
  IButtonCard,
  RfidCard,
  IrCard,
  SubGhzCard,
  CompareState
} from '../types';

export function cloneNfcCard(card: MifareClassicCard | null): MifareClassicCard | null {
  if (!card) return null;
  return {
    ...card,
    lines: card.lines.map(line => ({
      ...line,
      bytes: line.bytes ? [...line.bytes] : undefined
    }))
  };
}

export function cloneIButtonCard(card: IButtonCard | null): IButtonCard | null {
  if (!card) return null;
  return {
    ...card,
    romData: card.romData ? [...card.romData] : undefined,
    sramData: card.sramData ? [...card.sramData] : undefined,
    eepromData: card.eepromData ? [...card.eepromData] : undefined,
    data: card.data ? [...card.data] : undefined,
    lines: card.lines.map(line => ({
      ...line,
      bytes: line.bytes ? [...line.bytes] : undefined
    }))
  };
}

export function cloneRfidCard(card: RfidCard | null): RfidCard | null {
  if (!card) return null;
  return {
    ...card,
    data: [...card.data],
    lines: card.lines.map(line => ({
      ...line,
      bytes: line.bytes ? [...line.bytes] : undefined
    }))
  };
}

export function cloneIrCard(card: IrCard | null): IrCard | null {
  if (!card) return null;
  return {
    ...card,
    buttons: card.buttons.map(btn => ({ ...btn })),
    lines: card.lines.map(line => ({
      ...line,
      bytes: line.bytes ? [...line.bytes] : undefined
    }))
  };
}

export function cloneSubGhzCard(card: SubGhzCard | null): SubGhzCard | null {
  if (!card) return null;
  return {
    ...card,
    rawTimes: card.rawTimes ? [...card.rawTimes] : undefined,
    lines: card.lines.map(line => ({
      ...line,
      bytes: line.bytes ? [...line.bytes] : undefined
    }))
  };
}

export function cloneCompareState(cs: CompareState | null): CompareState | null {
  if (!cs) return null;
  return {
    fileName: cs.fileName,
    fileSize: cs.fileSize,
    rawBytes: cs.rawBytes ? new Uint8Array(cs.rawBytes) : null,
    nfcCard: cloneNfcCard(cs.nfcCard),
    ibtnCard: cloneIButtonCard(cs.ibtnCard),
    rfidCard: cloneRfidCard(cs.rfidCard),
    irCard: cloneIrCard(cs.irCard),
    badusbScript: cs.badusbScript,
    subGhzCard: cloneSubGhzCard(cs.subGhzCard)
  };
}
