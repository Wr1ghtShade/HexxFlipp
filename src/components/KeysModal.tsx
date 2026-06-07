/**
 * Modal d'affichage des clés A/B Mifare Classic.
 * Extrait d'App.tsx (lignes ~1546-1645).
 * m6 — `decodedSectors` mémoïsé : decodeSector n'est plus appelé à chaque re-render.
 */
import React, { useMemo } from 'react';
import { Key, X } from 'lucide-react';
import type { MifareClassicCard } from '../types';
import { decodeSector } from '../utils/nfcParser';

interface KeysModalProps {
  card: MifareClassicCard;
  onClose: () => void;
}

export const KeysModal: React.FC<KeysModalProps> = ({ card, onClose }) => {
  const decoded = useMemo(() => {
    const totalBlocks = card.lines.filter(l => l.type === 'block').length;
    const totalSectors = totalBlocks === 256 ? 40 : 16;
    const list = [];
    for (let i = 0; i < totalSectors; i++) {
      list.push(decodeSector(card, i));
    }
    return list;
  }, [card]);

  const copyAll = () => {
    const out = decoded
      .map(d => `Secteur ${d.sectorIndex.toString().padStart(2, '0')} | A: ${d.keyA.replace(/\s/g, '')} | B: ${d.keyB.replace(/\s/g, '')}`)
      .join('\n');
    void navigator.clipboard.writeText(out);
  };

  const copyUnique = () => {
    const uniq = new Set<string>();
    for (const d of decoded) {
      const a = d.keyA.replace(/\s/g, '');
      const b = d.keyB.replace(/\s/g, '');
      if (!a.includes('?')) uniq.add(a.toUpperCase());
      if (!b.includes('?')) uniq.add(b.toUpperCase());
    }
    void navigator.clipboard.writeText(Array.from(uniq).join('\n'));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ width: '480px', maxHeight: '80vh', padding: '1.2rem', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="panel-title"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.5rem',
            marginBottom: '0.4rem'
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
            <Key size={18} />
            Clés A et B du tag NFC
          </h2>
          <button
            className="btn btn-icon"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', margin: '0.2rem 0', paddingRight: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '0.3rem 0.4rem', fontWeight: 600 }}>Secteur</th>
                <th style={{ padding: '0.3rem 0.4rem', fontWeight: 600 }}>Clé A (Key A)</th>
                <th style={{ padding: '0.3rem 0.4rem', fontWeight: 600 }}>Clé B (Key B)</th>
              </tr>
            </thead>
            <tbody>
              {decoded.map(d => (
                <tr key={`sector-key-${d.sectorIndex}`} style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '0.25rem 0.4rem', fontWeight: 'bold' }}>Secteur {d.sectorIndex}</td>
                  <td style={{ padding: '0.25rem 0.4rem', fontFamily: 'var(--font-mono)', color: d.keyA.includes('??') ? 'var(--text-muted)' : 'var(--accent-cyan)' }}>
                    {d.keyA}
                  </td>
                  <td style={{ padding: '0.25rem 0.4rem', fontFamily: 'var(--font-mono)', color: d.keyB.includes('??') ? 'var(--text-muted)' : 'var(--accent-green)' }}>
                    {d.keyB}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: '0.4rem' }}>
          <button className="btn" onClick={copyAll} title="Copier toutes les clés par secteur">
            Copier tout
          </button>
          <button className="btn" onClick={copyUnique} title="Copier uniquement la liste des clés uniques sans doublons (pour fichier dictionnaire)">
            Copier clés uniques
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
