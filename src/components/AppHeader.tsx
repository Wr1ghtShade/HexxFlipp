/**
 * En-tête principal de l'application (logo + actions + sélecteur de thème).
 * Extrait d'App.tsx (lignes ~1058-1220).
 */
import React from 'react';
import {
  Save, RotateCcw, RotateCw, UploadCloud, Sun, Moon, Zap, Columns,
  FileCode, Binary, Key
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
    ? (state.isCompareMode ? `Sauvegarder A (${saveExt})` : `Sauvegarder (${saveExt})`)
    : (state.isCompareMode ? 'Sauvegarder A' : 'Sauvegarder');

  const showNfcExtras = state.fileMode === 'nfc' && state.nfcCard;
  const showRawToNfcExport = state.fileMode === 'raw' && (state.fileSize === 1024 || state.fileSize === 4096);
  const showKeysButton = state.fileMode === 'nfc' && state.nfcCard && state.nfcCard.deviceType !== 'NTAG/Ultralight';

  return (
    <header className="header">
      <div className="brand">
        <div className="logo-icon">H</div>
        <div className="title-container">
          <h1>HexFlipp</h1>
          <p>Explorateur Hexadécimal & NFC Flipper</p>
        </div>
      </div>

      <div className="actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {isFileLoaded && (
          <>
            <button
              className="btn"
              onClick={onOpenFile}
              title="Ouvrir un autre fichier principal (Fichier A)"
              style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
            >
              <UploadCloud size={16} />
              Ouvrir...
            </button>

            {showModeToggle && (
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${state.fileMode !== 'raw' ? 'active' : ''}`}
                  onClick={() => onModeToggle('nfc')}
                >
                  Analyseur Flipper
                </button>
                <button
                  className={`mode-btn ${state.fileMode === 'raw' ? 'active' : ''}`}
                  onClick={() => onModeToggle('raw')}
                >
                  Hex Brut
                </button>
              </div>
            )}

            <button
              className={`btn btn-compare ${state.isCompareMode ? 'active' : ''}`}
              onClick={onToggleCompareMode}
              title="Activer/Désactiver le mode comparaison (Diff)"
            >
              <Columns size={16} />
              {state.isCompareMode ? 'Fermer Diff' : 'Comparer'}
            </button>

            {showKeysButton && (
              <button
                className="btn"
                onClick={onShowKeys}
                title="Afficher la liste des clés A et B"
                style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', background: 'rgba(0, 242, 254, 0.05)' }}
              >
                <Key size={16} />
                Clés
              </button>
            )}

            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-dark-well)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
              <button
                className="btn btn-icon"
                onClick={onUndo}
                disabled={!canUndo}
                style={{ border: 'none', background: 'transparent', padding: '4px 8px', opacity: canUndo ? 1 : 0.3 }}
                title="Annuler (Ctrl+Z)"
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="btn btn-icon"
                onClick={onRedo}
                disabled={!canRedo}
                style={{ border: 'none', background: 'transparent', padding: '4px 8px', opacity: canRedo ? 1 : 0.3 }}
                title="Rétablir (Ctrl+Y)"
              >
                <RotateCw size={16} />
              </button>
            </div>

            <button className="btn btn-primary" onClick={onSave} title={`Enregistrer le fichier principal (${state.fileName || ''})`}>
              <Save size={16} />
              {saveLabel}
            </button>

            {showNfcExtras && (
              <button className="btn" onClick={onExportToBinary} title="Exporter les blocs de données brutes en .bin">
                <Binary size={16} />
                {state.isCompareMode ? 'Export .bin (A)' : 'Export .bin'}
              </button>
            )}

            {showRawToNfcExport && (
              <button
                className="btn"
                onClick={onExportToNfc}
                style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                title="Convertir et exporter en format NFC Flipper"
              >
                <FileCode size={16} />
                {state.isCompareMode ? 'Export .nfc (A)' : 'Export .nfc'}
              </button>
            )}

            <button className="btn" onClick={onCloseFile} style={{ color: 'var(--accent-red)' }}>
              Fermer
            </button>
          </>
        )}

        <div className="mode-toggle">
          <button className={`mode-btn ${theme === 'cyberpunk' ? 'active' : ''}`} onClick={() => onChangeTheme('cyberpunk')} title="Thème Cyberpunk (Obsidienne)">
            <Zap size={16} />
          </button>
          <button className={`mode-btn ${theme === 'dracula' ? 'active' : ''}`} onClick={() => onChangeTheme('dracula')} title="Thème Dracula">
            <Moon size={16} />
          </button>
          <button className={`mode-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => onChangeTheme('light')} title="Thème Clair">
            <Sun size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
