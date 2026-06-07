/**
 * Barre d'état du bas. Extrait d'App.tsx (lignes ~1508-1543).
 */
import React from 'react';
import type { HexEditorState } from '../types';

interface StatusBarProps {
  state: HexEditorState;
  isFileLoaded: boolean;
  version: string;
}

const FILE_MODE_LABEL: Record<HexEditorState['fileMode'], string> = {
  nfc: 'Flipper NFC Device',
  ibtn: 'Flipper iButton Key',
  rfid: 'Flipper LF RFID Key',
  ir: 'Flipper IR Signals',
  badusb: 'BadUSB Script',
  sub: 'Flipper SubGhz Signal',
  raw: 'Raw Binary'
};

export const StatusBar: React.FC<StatusBarProps> = ({ state, isFileLoaded, version }) => {
  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        {isFileLoaded ? (
          <>
            <div className="info-chip">Nom: {state.fileName}</div>
            <div className={`info-chip ${state.fileMode}`}>
              Type: {FILE_MODE_LABEL[state.fileMode]}
            </div>
            <div className="info-chip">Taille: {state.fileSize} octets</div>
            {state.isCompareMode && (
              <div
                className="info-chip"
                style={{ background: 'var(--bg-dark-well)', color: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
              >
                Diff: {state.compareState ? `vs ${state.compareState.fileName}` : 'En attente du fichier B'}
              </div>
            )}
          </>
        ) : (
          <span>Prêt pour explorer</span>
        )}
      </div>
      <div>
        <span>Antigravity // HexFlipp v{version}</span>
      </div>
    </footer>
  );
};
