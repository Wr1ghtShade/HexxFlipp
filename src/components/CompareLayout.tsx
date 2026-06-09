/**
 * Layout du mode comparaison (côte à côte A/B).
 * Extrait d'App.tsx (lignes ~1278-1436), réduit en réutilisant deux sous-composants
 * (PanePreview).
 */
import React, { useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import type { HexEditorState, IrCard, SubGhzCard } from '../types';
import { HexGrid } from './HexGrid';

interface CompareLayoutProps {
  state: HexEditorState;
  compareGridState: HexEditorState | null;
  compareBytesForA?: string[];
  compareBytesForB?: string[];
  onChangeBytes: (newBytes: string[] | Uint8Array) => void;
  onSelectByte: (index: number | null, isEditingAscii?: boolean) => void;
  onLoadCompareFile: (file: File) => void;
  onUnloadCompare: () => void;
}

interface SubGhzSummaryProps {
  card: SubGhzCard;
  color: string;
  title: string;
}

const SubGhzSummary: React.FC<SubGhzSummaryProps> = ({ card, color, title }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--bg-dark-well)', padding: '1rem', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color }}>{title} :</div>
    <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)' }}>
      <div>Frequency: <strong>{(card.frequency ? card.frequency / 1000000 : 433.92).toFixed(2)} MHz</strong></div>
      <div>Modulation / Preset: <strong>{card.preset?.replace('FuriHalSubGhzPreset', '') || 'OOK'}</strong></div>
      <div>Protocol: <strong>{card.protocol || 'RAW'}</strong></div>
      {card.bit !== undefined && <div>Bits: <strong>{card.bit}</strong></div>}
      {card.key && <div>Key (hex): <strong style={{ fontFamily: 'var(--font-mono)' }}>{card.key}</strong></div>}
      {card.rawTimes && (
        <div>RAW pulses: <strong>{card.rawTimes.length} ({Math.round(card.rawTimes.reduce((a, b) => a + Math.abs(b), 0) / 1000)} ms)</strong></div>
      )}
    </div>
  </div>
);

interface IrSummaryProps {
  card: IrCard;
  color: string;
  title: string;
}

const IrSummary: React.FC<IrSummaryProps> = ({ card, color, title }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-dark-well)', padding: '1rem', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color }}>{title} :</div>
    {card.buttons.map((btn, i) => (
      <div key={i} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '0.75rem' }}>
        <div><strong>{btn.name}</strong> ({btn.type})</div>
        {btn.type === 'parsed' ? (
          <div style={{ color: 'var(--text-muted)' }}>Proto: {btn.protocol} | Addr: {btn.address} | Cmd: {btn.command}</div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>Freq: {btn.frequency} Hz | Data: {btn.data?.slice(0, 30)}...</div>
        )}
      </div>
    ))}
  </div>
);

export const CompareLayout: React.FC<CompareLayoutProps> = ({
  state, compareGridState, compareBytesForA, compareBytesForB,
  onChangeBytes, onSelectByte, onLoadCompareFile, onUnloadCompare
}) => {
  const scrollARef = useRef<HTMLDivElement | null>(null);
  const scrollBRef = useRef<HTMLDivElement | null>(null);
  const activeScroll = useRef<'A' | 'B' | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleScrollA = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeScroll.current === 'B') return;
    activeScroll.current = 'A';
    if (scrollBRef.current) scrollBRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  const handleScrollB = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeScroll.current === 'A') return;
    activeScroll.current = 'B';
    if (scrollARef.current) scrollARef.current.scrollTop = e.currentTarget.scrollTop;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onLoadCompareFile(f);
  };

  const renderPaneA = () => {
    if (state.fileMode === 'badusb') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-dark-well)', padding: '1rem', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          {state.badusbScript}
        </div>
      );
    }
    if (state.fileMode === 'ir' && state.irCard) {
      return <IrSummary card={state.irCard} color="var(--accent-orange)" title="IR Signals A" />;
    }
    if (state.fileMode === 'sub' && state.subGhzCard) {
      return <SubGhzSummary card={state.subGhzCard} color="var(--accent-green)" title="Sub-GHz Settings A" />;
    }
    return (
      <HexGrid
        state={state}
        onChangeBytes={onChangeBytes}
        onSelectByte={onSelectByte}
        compareBytes={compareBytesForA}
        scrollRef={scrollARef}
        onScroll={handleScrollA}
        onMouseEnter={() => { activeScroll.current = 'A'; }}
        hideAscii={true}
      />
    );
  };

  const renderPaneB = () => {
    if (!state.compareState) return null;
    const cs = state.compareState;
    if (state.fileMode === 'badusb') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-dark-well)', padding: '1rem', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          {cs.badusbScript}
        </div>
      );
    }
    if (state.fileMode === 'ir' && cs.irCard) {
      return <IrSummary card={cs.irCard} color="var(--accent-orange)" title="IR Signals B" />;
    }
    if (state.fileMode === 'sub' && cs.subGhzCard) {
      return <SubGhzSummary card={cs.subGhzCard} color="var(--accent-purple)" title="Sub-GHz Settings B" />;
    }
    if (!compareGridState) return null;
    return (
      <HexGrid
        state={compareGridState}
        onSelectByte={onSelectByte}
        compareBytes={compareBytesForB}
        scrollRef={scrollBRef}
        onScroll={handleScrollB}
        onMouseEnter={() => { activeScroll.current = 'B'; }}
        isReadOnly={true}
        hideAscii={true}
      />
    );
  };

  return (
    <div className="main-content compare-layout">
      {/* Colonne A : fichier actif */}
      <div className="compare-pane">
        <div className="compare-pane-header">
          <span>File A: <strong style={{ color: 'var(--accent-cyan)' }}>{state.fileName}</strong> ({state.fileSize} bytes)</span>
        </div>
        {renderPaneA()}
      </div>

      {/* Colonne B : fichier de comparaison */}
      <div className="compare-pane">
        {state.compareState ? (
          <>
            <div className="compare-pane-header">
              <span>File B: <strong style={{ color: 'var(--accent-purple)' }}>{state.compareState.fileName}</strong> ({state.compareState.fileSize} bytes)</span>
              <button
                className="btn btn-icon"
                style={{ border: 'none', background: 'transparent', color: 'var(--accent-red)', padding: '2px' }}
                onClick={onUnloadCompare}
                title="Unload file B"
              >
                <X size={16} />
              </button>
            </div>
            {renderPaneB()}
          </>
        ) : (
          <div
            className={`compare-upload-zone ${dragOver ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('compare-file-input')?.click()}
          >
            <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.8rem' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Load File B</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
              Drag and drop the comparison file here, or click to browse.
            </p>
            <input
              type="file"
              id="compare-file-input"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLoadCompareFile(f);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
