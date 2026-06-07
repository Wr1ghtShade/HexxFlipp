/**
 * HexFlipp — composant racine.
 *
 * Après le refactor : ce fichier est ~330 lignes (vs 1648 avant) et se concentre
 * sur l'état applicatif + l'orchestration. Toute la logique métier vit dans :
 *   - hooks/useTheme, hooks/useHistory
 *   - io/fileLoader, io/fileSaver, io/modeConverter, io/fileTypeDetector, io/limits
 *   - components/AppHeader, DropZone, StatusBar, KeysModal, FileNameModal, CompareLayout
 *   - utils/deepClone, utils/nfcParser, utils/flipperParsers
 */
import React, { useState, useRef, useCallback } from 'react';
import type {
  FileMode, HexEditorState, MifareClassicCard, IButtonCard, RfidCard, IrCard, SubGhzCard
} from './types';

// Hooks
import { useTheme } from './hooks/useTheme';
import { useHistory } from './hooks/useHistory';

// I/O
import { readFile, buildStateFromContent, buildCompareState, FileTooLargeError } from './io/fileLoader';
import {
  defaultSaveName, buildSaveBlob, buildExportToBinaryBlob, buildExportToNfcBlob, triggerDownload
} from './io/fileSaver';
import { toRaw, fromRaw, ModeConversionError } from './io/modeConverter';
import { formatBytes, MAX_FILE_SIZE } from './io/limits';
import { updateIButtonFromBinary, updateRfidFromBinary } from './utils/flipperParsers';

// Composants
import { HexGrid } from './components/HexGrid';
import { NfcSidebar } from './components/NfcSidebar';
import { StatsPanel } from './components/StatsPanel';
import { IButtonSidebar } from './components/IButtonSidebar';
import { RfidSidebar } from './components/RfidSidebar';
import { IrRemoteConsole } from './components/IrRemoteConsole';
import { BadUsbEditor } from './components/BadUsbEditor';
import { SubGhzConsole } from './components/SubGhzConsole';
import { AppHeader } from './components/AppHeader';
import { DropZone } from './components/DropZone';
import { StatusBar } from './components/StatusBar';
import { KeysModal } from './components/KeysModal';
import { FileNameModal } from './components/FileNameModal';
import { CompareLayout } from './components/CompareLayout';

declare const __APP_VERSION__: string;

const EMPTY_STATE: HexEditorState = {
  fileMode: 'nfc',
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
  isCompareMode: false
};

interface SaveDialogState {
  open: boolean;
  title: string;
  defaultName: string;
  enforceExtension?: string;
  onConfirm: (name: string) => void;
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [state, setState] = useState<HexEditorState>(EMPTY_STATE);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>({
    open: false, title: '', defaultName: '', onConfirm: () => {}
  });

  const history = useHistory();
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── Manipulation de l'historique ────────────────────────────────────────
  const applyState = useCallback((newState: HexEditorState, previousState?: HexEditorState) => {
    setState(newState);
    history.push(newState, previousState ?? stateRef.current);
  }, [history]);

  const handleUndo = useCallback(() => {
    const next = history.undo(stateRef.current);
    if (next) setState(next);
  }, [history]);

  const handleRedo = useCallback(() => {
    const next = history.redo(stateRef.current);
    if (next) setState(next);
  }, [history]);

  // ─── Chargement de fichier ───────────────────────────────────────────────
  const handleFileSelected = useCallback(async (file: File) => {
    try {
      const { name, content } = await readFile(file);
      const next = buildStateFromContent(name, content);
      setState(next);
      history.reset(next);
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        alert(`Fichier trop volumineux (${formatBytes(file.size)}). Taille max : ${formatBytes(MAX_FILE_SIZE)}.`);
      } else {
        alert(err instanceof Error ? err.message : 'Erreur de lecture du fichier');
      }
    }
  }, [history]);

  const handleCompareFileSelected = useCallback(async (file: File) => {
    try {
      const { name, content } = await readFile(file);
      const compareState = buildCompareState(name, content, stateRef.current.fileMode);
      const next: HexEditorState = { ...stateRef.current, compareState };
      applyState(next);
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        alert(`Fichier trop volumineux (${formatBytes(file.size)}). Taille max : ${formatBytes(MAX_FILE_SIZE)}.`);
      } else {
        alert(err instanceof Error ? err.message : 'Erreur de lecture du fichier de comparaison');
      }
    }
  }, [applyState]);

  // ─── Édition d'octets / cartes ───────────────────────────────────────────
  const handleChangeBytes = useCallback((newBytesOrRaw: string[] | Uint8Array) => {
    const s = stateRef.current;
    const next: HexEditorState = { ...s };

    if (s.fileMode === 'nfc' && s.nfcCard && Array.isArray(newBytesOrRaw)) {
      const updatedLines = [...s.nfcCard.lines];
      let offset = 0;
      for (let i = 0; i < updatedLines.length; i++) {
        const line = updatedLines[i];
        if (line.type === 'block') {
          const blockBytes = newBytesOrRaw.slice(offset, offset + 16);
          updatedLines[i] = { ...line, bytes: blockBytes, raw: `Block ${line.blockIndex}: ${blockBytes.join(' ')}` };
          offset += 16;
        }
      }
      next.nfcCard = { ...s.nfcCard, lines: updatedLines };
    } else if (s.fileMode === 'ibtn' && s.ibtnCard && !Array.isArray(newBytesOrRaw)) {
      next.rawBytes = newBytesOrRaw;
      next.ibtnCard = updateIButtonFromBinary(s.ibtnCard, newBytesOrRaw);
    } else if (s.fileMode === 'rfid' && s.rfidCard && !Array.isArray(newBytesOrRaw)) {
      next.rawBytes = newBytesOrRaw;
      next.rfidCard = updateRfidFromBinary(s.rfidCard, newBytesOrRaw);
    } else if (s.fileMode === 'raw' && !Array.isArray(newBytesOrRaw)) {
      next.rawBytes = newBytesOrRaw;
    }

    applyState(next, s);
  }, [applyState]);

  const handleChangeCard = useCallback((card: MifareClassicCard | IButtonCard | RfidCard | IrCard | SubGhzCard) => {
    const s = stateRef.current;
    const next: HexEditorState = { ...s };
    if (s.fileMode === 'nfc') next.nfcCard = card as MifareClassicCard;
    else if (s.fileMode === 'ibtn') next.ibtnCard = card as IButtonCard;
    else if (s.fileMode === 'rfid') next.rfidCard = card as RfidCard;
    else if (s.fileMode === 'ir') next.irCard = card as IrCard;
    else if (s.fileMode === 'sub') next.subGhzCard = card as SubGhzCard;
    applyState(next, s);
  }, [applyState]);

  const handleSelectByte = useCallback((index: number | null, isEditingAscii?: boolean) => {
    setState(curr => ({
      ...curr,
      cursorIndex: index,
      isEditingAscii: isEditingAscii !== undefined ? isEditingAscii : curr.isEditingAscii
    }));
  }, []);

  const handleJumpToBlock = useCallback((blockIndex: number) => {
    handleSelectByte(blockIndex * 16);
    setTimeout(() => {
      const cell = document.querySelector('.hex-cell.selected');
      cell?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [handleSelectByte]);

  // ─── Comparaison ─────────────────────────────────────────────────────────
  const handleToggleCompareMode = useCallback(() => {
    const s = stateRef.current;
    const next: HexEditorState = {
      ...s,
      isCompareMode: !s.isCompareMode,
      compareState: !s.isCompareMode ? null : s.compareState
    };
    applyState(next, s);
  }, [applyState]);

  const handleUnloadCompare = useCallback(() => {
    const s = stateRef.current;
    const next: HexEditorState = { ...s, compareState: null };
    applyState(next, s);
  }, [applyState]);

  // ─── Sauvegarde / exports ────────────────────────────────────────────────
  const openSaveDialog = (title: string, defaultName: string, enforceExtension: string | undefined, onConfirm: (name: string) => void) => {
    setSaveDialog({ open: true, title, defaultName, enforceExtension, onConfirm });
  };

  const closeSaveDialog = () => setSaveDialog(prev => ({ ...prev, open: false }));

  const handleSave = useCallback(() => {
    const { name } = defaultSaveName(stateRef.current);
    openSaveDialog("Enregistrer le fichier", name, undefined, (finalName) => {
      const blob = buildSaveBlob(stateRef.current);
      if (!blob) { closeSaveDialog(); return; }
      triggerDownload(blob, finalName);
      setState(curr => ({ ...curr, fileName: finalName }));
      closeSaveDialog();
    });
  }, []);

  const handleExportToBinary = useCallback(() => {
    const built = buildExportToBinaryBlob(stateRef.current);
    if (!built) return;
    openSaveDialog("Exporter en .bin", built.defaultName, '.bin', (finalName) => {
      triggerDownload(built.blob, finalName);
      closeSaveDialog();
    });
  }, []);

  const handleExportToNfc = useCallback(() => {
    const built = buildExportToNfcBlob(stateRef.current);
    if (!built) return;
    openSaveDialog("Exporter en .nfc Flipper", built.defaultName, '.nfc', (finalName) => {
      triggerDownload(built.blob, finalName);
      closeSaveDialog();
    });
  }, []);

  // ─── Bascule de mode (Hex Brut ↔ Analyseur Flipper) ──────────────────────
  const handleModeToggle = useCallback((mode: FileMode) => {
    const s = stateRef.current;
    if (mode === s.fileMode) return;

    try {
      if (mode === 'raw') {
        const next = toRaw(s);
        if (next !== s) applyState(next, s);
      } else {
        const next = fromRaw(s);
        if (next !== s) applyState(next, s);
      }
    } catch (err) {
      if (err instanceof ModeConversionError) alert(err.message);
      else alert("Erreur lors du changement de mode.");
    }
  }, [applyState]);

  // ─── Fermeture ───────────────────────────────────────────────────────────
  const handleCloseFile = useCallback(() => {
    setState(EMPTY_STATE);
    history.clear();
  }, [history]);

  const handleOpenFile = useCallback(() => {
    document.getElementById('file-input')?.click();
  }, []);

  // ─── Dérivés pour le rendu ───────────────────────────────────────────────
  const isFileLoaded =
    state.rawBytes !== null ||
    state.nfcCard !== null ||
    state.ibtnCard !== null ||
    state.rfidCard !== null ||
    state.irCard !== null ||
    state.badusbScript !== null ||
    state.subGhzCard !== null;

  const compareGridState: HexEditorState | null = state.compareState ? {
    ...state,
    fileName: state.compareState.fileName,
    fileSize: state.compareState.fileSize,
    rawBytes: state.compareState.rawBytes,
    nfcCard: state.compareState.nfcCard,
    ibtnCard: state.compareState.ibtnCard,
    rfidCard: state.compareState.rfidCard,
    irCard: state.compareState.irCard,
    badusbScript: state.compareState.badusbScript,
    subGhzCard: state.compareState.subGhzCard,
    selectionStart: null,
    selectionEnd: null,
    compareState: null,
    isCompareMode: false
  } : null;

  // Helpers pour les bytes affichés dans CompareLayout
  const getNfcCardBytes = (card: MifareClassicCard | null): string[] | undefined => {
    if (!card) return undefined;
    const blocks = [...card.lines].filter(l => l.type === 'block').sort((a, b) => a.blockIndex! - b.blockIndex!);
    return blocks.flatMap(l => l.bytes ?? []);
  };
  const compareBytesForA = state.fileMode === 'nfc'
    ? getNfcCardBytes(state.compareState?.nfcCard ?? null)
    : (state.compareState?.rawBytes ? Array.from(state.compareState.rawBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()) : undefined);
  const compareBytesForB = state.fileMode === 'nfc'
    ? getNfcCardBytes(state.nfcCard)
    : (state.rawBytes ? Array.from(state.rawBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()) : undefined);

  return (
    <div className="app-container">
      <input
        type="file"
        id="file-input"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFileSelected(f);
        }}
      />

      <AppHeader
        state={state}
        theme={theme}
        isFileLoaded={isFileLoaded}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onOpenFile={handleOpenFile}
        onModeToggle={handleModeToggle}
        onToggleCompareMode={handleToggleCompareMode}
        onShowKeys={() => setShowKeysModal(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onExportToBinary={handleExportToBinary}
        onExportToNfc={handleExportToNfc}
        onCloseFile={handleCloseFile}
        onChangeTheme={setTheme}
      />

      <div className="workspace">
        {!isFileLoaded ? (
          <DropZone onFileSelected={handleFileSelected} />
        ) : state.isCompareMode ? (
          <CompareLayout
            state={state}
            compareGridState={compareGridState}
            compareBytesForA={compareBytesForA}
            compareBytesForB={compareBytesForB}
            onChangeBytes={handleChangeBytes}
            onSelectByte={handleSelectByte}
            onLoadCompareFile={handleCompareFileSelected}
            onUnloadCompare={handleUnloadCompare}
          />
        ) : (
          <ActiveEditor
            state={state}
            onChangeBytes={handleChangeBytes}
            onSelectByte={handleSelectByte}
            onChangeCard={handleChangeCard}
            onJumpToBlock={handleJumpToBlock}
            onChangeBadusb={(text) => {
              const s = stateRef.current;
              applyState({ ...s, badusbScript: text }, s);
            }}
          />
        )}
      </div>

      <StatusBar state={state} isFileLoaded={isFileLoaded} version={__APP_VERSION__} />

      {showKeysModal && state.nfcCard && (
        <KeysModal card={state.nfcCard} onClose={() => setShowKeysModal(false)} />
      )}

      <FileNameModal
        open={saveDialog.open}
        title={saveDialog.title}
        defaultValue={saveDialog.defaultName}
        enforceExtension={saveDialog.enforceExtension}
        onConfirm={saveDialog.onConfirm}
        onCancel={closeSaveDialog}
      />
    </div>
  );
}

// ─── Editeur actif simple (non-comparaison) ────────────────────────────────
interface ActiveEditorProps {
  state: HexEditorState;
  onChangeBytes: (newBytes: string[] | Uint8Array) => void;
  onSelectByte: (index: number | null, isEditingAscii?: boolean) => void;
  onChangeCard: (card: MifareClassicCard | IButtonCard | RfidCard | IrCard | SubGhzCard) => void;
  onJumpToBlock: (blockIndex: number) => void;
  onChangeBadusb: (text: string) => void;
}

const ActiveEditor: React.FC<ActiveEditorProps> = ({
  state, onChangeBytes, onSelectByte, onChangeCard, onJumpToBlock, onChangeBadusb
}) => {
  if (state.fileMode === 'ir' && state.irCard) {
    return <IrRemoteConsole card={state.irCard} onChangeCard={onChangeCard} />;
  }
  if (state.fileMode === 'badusb') {
    return <BadUsbEditor text={state.badusbScript || ''} onChangeText={onChangeBadusb} />;
  }
  if (state.fileMode === 'sub' && state.subGhzCard) {
    return <SubGhzConsole card={state.subGhzCard} onChangeCard={onChangeCard} />;
  }

  const isUltralightOrNtag = !!(state.nfcCard && (
    state.nfcCard.deviceType.toLowerCase().includes('ultralight') ||
    state.nfcCard.deviceType.toLowerCase().includes('ntag')
  ));
  const hasDoubleSidebar = state.fileMode === 'nfc' && state.nfcCard && !isUltralightOrNtag;
  const sidebarWidth = hasDoubleSidebar ? '380px' : '400px';
  const sidebarStyle: React.CSSProperties = {
    borderLeft: hasDoubleSidebar ? '1px solid var(--border-color)' : '',
    width: sidebarWidth
  };

  return (
    <>
      <div className="main-content">
        <HexGrid state={state} onChangeBytes={onChangeBytes} onSelectByte={onSelectByte} />
      </div>

      {state.fileMode === 'nfc' && state.nfcCard && !isUltralightOrNtag && (
        <NfcSidebar card={state.nfcCard} onJumpToBlock={onJumpToBlock} onChangeCard={onChangeCard} />
      )}

      <div className="sidebar" style={sidebarStyle}>
        {state.fileMode === 'ibtn' && state.ibtnCard ? (
          <IButtonSidebar card={state.ibtnCard} onChangeCard={onChangeCard} />
        ) : state.fileMode === 'rfid' && state.rfidCard ? (
          <RfidSidebar card={state.rfidCard} onChangeCard={onChangeCard} />
        ) : state.fileMode === 'nfc' && state.nfcCard && isUltralightOrNtag ? (
          <NfcSidebar card={state.nfcCard} onJumpToBlock={onJumpToBlock} onChangeCard={onChangeCard} />
        ) : (
          <StatsPanel state={state} onChangeCard={onChangeCard} />
        )}
      </div>
    </>
  );
};
