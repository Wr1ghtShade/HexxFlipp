/**
 * En-tête principal de l'application (logo + actions + sélecteur de thème).
 * Extrait d'App.tsx (lignes ~1058-1220).
 */
import React from 'react';
import {
  Save, RotateCcw, RotateCw, UploadCloud, Sun, Moon, Zap, Columns,
  FileCode, Binary, Key, Eclipse
} from 'lucide-react';
import type { FileMode, HexEditorState } from '../types';
import type { Theme } from '../hooks/useTheme';

interface AppHeaderProps {
  state: HexEditorState;
  theme: Theme;
  isFileLoaded: boolean;
  canUndo: boolean;
  canRedo: boolean;

  onOpenFile: () => void;
  onModeToggle: (mode: FileMode) => void;
  onToggleCompareMode: () => void;
  onShowKeys: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExportToBinary: () => void;
  onExportToNfc: () => void;
  onCloseFile: () => void;
  onChangeTheme: (t: Theme) => void;
}

const SAVE_EXT_LABEL: Record<FileMode, string> = {
  nfc: '.nfc',
  ibtn: '.ibtn',
  rfid: '.rfid',
  ir: '.ir',
  sub: '.sub',
  badusb: '.txt',
  raw: ''
};

function isRawContentingFlipper(state: HexEditorState): boolean {
  if (state.fileMode !== 'raw' || !state.rawBytes) return false;
  try {
    const text = new TextDecoder().decode(state.rawBytes);
    return text.includes('Filetype: Flipper') || text.includes('Filetype: IR');
  } catch {
    return false;
  }
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  state, theme, isFileLoaded, canUndo, canRedo,
  onOpenFile, onModeToggle, onToggleCompareMode, onShowKeys,
  onUndo, onRedo, onSave, onExportToBinary, onExportToNfc, onCloseFile,
  onChangeTheme
}) => {
  const showModeToggle = state.fileMode !== 'raw' || isRawContentingFlipper(state);

  const saveExt = SAVE_EXT_LABEL[state.fileMode];
  const saveLabel = saveExt
    ? (state.isCompareMode ? `Save A (${saveExt})` : `Save (${saveExt})`)
    : (state.isCompareMode ? 'Save A' : 'Save');

  const showNfcExtras = state.fileMode === 'nfc' && state.nfcCard;
  const showRawToNfcExport = state.fileMode === 'raw' && (state.fileSize === 1024 || state.fileSize === 4096);
  const showKeysButton = state.fileMode === 'nfc' && state.nfcCard && state.nfcCard.deviceType !== 'NTAG/Ultralight';

  return (
    <header className="header">
      <div className="brand">
        <div className="logo-icon">H</div>
        <div className="title-container">
          <h1>HexFlipp</h1>
          <p>Hex &amp; NFC Flipper Explorer</p>
        </div>
      </div>

      <div className="actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {isFileLoaded && (
          <>
            <button
              className="btn"
              onClick={onOpenFile}
              title="Open another main file (File A)"
              style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
            >
              <UploadCloud size={16} />
              Open...
            </button>

            {showModeToggle && (
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${state.fileMode !== 'raw' ? 'active' : ''}`}
                  onClick={() => onModeToggle('nfc')}
                >
                  Flipper Analyser
                </button>
                <button
                  className={`mode-btn ${state.fileMode === 'raw' ? 'active' : ''}`}
                  onClick={() => onModeToggle('raw')}
                >
                  Raw Hex
                </button>
              </div>
            )}

            <button
              className={`btn btn-compare ${state.isCompareMode ? 'active' : ''}`}
              onClick={onToggleCompareMode}
              title="Enable/Disable compare mode (Diff)"
            >
              <Columns size={16} />
              {state.isCompareMode ? 'Close Diff' : 'Compare'}
            </button>

            {showKeysButton && (
              <button
                className="btn"
                onClick={onShowKeys}
                title="Show A and B key list"
                style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', background: 'rgba(0, 242, 254, 0.05)' }}
              >
                <Key size={16} />
                Keys
              </button>
            )}

            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-dark-well)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
              <button
                className="btn btn-icon"
                onClick={onUndo}
                disabled={!canUndo}
                style={{ border: 'none', background: 'transparent', padding: '4px 8px', opacity: canUndo ? 1 : 0.3 }}
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="btn btn-icon"
                onClick={onRedo}
                disabled={!canRedo}
                style={{ border: 'none', background: 'transparent', padding: '4px 8px', opacity: canRedo ? 1 : 0.3 }}
                title="Redo (Ctrl+Y)"
              >
                <RotateCw size={16} />
              </button>
            </div>

            <button className="btn btn-primary" onClick={onSave} title={`Save main file (${state.fileName || ''})`}>
              <Save size={16} />
              {saveLabel}
            </button>

            {showNfcExtras && (
              <button className="btn" onClick={onExportToBinary} title="Export raw data blocks as .bin">
                <Binary size={16} />
                {state.isCompareMode ? 'Export .bin (A)' : 'Export .bin'}
              </button>
            )}

            {showRawToNfcExport && (
              <button
                className="btn"
                onClick={onExportToNfc}
                style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                title="Convert and export as Flipper NFC format"
              >
                <FileCode size={16} />
                {state.isCompareMode ? 'Export .nfc (A)' : 'Export .nfc'}
              </button>
            )}

            <button className="btn" onClick={onCloseFile} style={{ color: 'var(--accent-red)' }}>
              Close
            </button>
          </>
        )}

        <div className="mode-toggle">
          <button className={`mode-btn ${theme === 'cyberpunk' ? 'active' : ''}`} onClick={() => onChangeTheme('cyberpunk')} title="Cyberpunk theme (Obsidian)">
            <Zap size={16} />
          </button>
          <button className={`mode-btn ${theme === 'dracula' ? 'active' : ''}`} onClick={() => onChangeTheme('dracula')} title="Dracula theme">
            <Moon size={16} />
          </button>
          <button className={`mode-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => onChangeTheme('dark')} title="Dark theme (minimal)">
            <Eclipse size={16} />
          </button>
          <button className={`mode-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => onChangeTheme('light')} title="Light theme">
            <Sun size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
