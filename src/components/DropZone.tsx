/**
 * Zone de dépose initiale (vue affichée quand aucun fichier n'est chargé).
 * Extrait d'App.tsx (lignes ~1226-1276).
 */
import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
}

interface FormatHint {
  color: string;
  label: string;
  desc: string;
}

const FORMATS: FormatHint[] = [
  { color: 'var(--accent-cyan)',   label: '📡 Flipper NFC (.nfc)',         desc: "Sector analysis, A/B keys, access bits (Mifare Classic, Ultralight, DESFire)." },
  { color: 'var(--accent-orange)', label: '🔑 iButton Keys (.ibtn)',       desc: 'Dallas ROM/SRAM/EEPROM, Cyfral & Metakom protocols, CRC8 calculation.' },
  { color: 'var(--accent-purple)', label: '🆔 LF RFID (.rfid)',            desc: 'Low-frequency badges (EM4100, H10301, etc.) and Wiegand 26 decoding.' },
  { color: 'var(--accent-red)',    label: '📟 Infrared (.ir)',             desc: 'Interactive virtual remote, Parsed and Raw signal editing.' },
  { color: 'var(--accent-cyan)',   label: '💻 BadUSB Scripts (.txt)',      desc: 'Duckyscript editor with line numbering, cheat sheet and validator.' },
  { color: 'var(--accent-green)',  label: '📁 Raw Binaries (.bin)',        desc: 'Classic hex editing (.bin, .dat) with grid pagination.' }
];

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected }) => {
  const [over, setOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  };

  return (
    <div className="main-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        className={`dropzone ${over ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        style={{ maxWidth: '650px', width: '100%', padding: '2rem 1.5rem', minHeight: '440px' }}
      >
        <div className="dropzone-icon" style={{ marginBottom: '0.5rem' }}>
          <UploadCloud size={40} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Drop a file here</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '0.85rem', marginBottom: '1.2rem', lineHeight: '1.4' }}>
          Drag and drop your Flipper Zero dumps or raw binary files to start exploring.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', width: '100%', textAlign: 'left', margin: '0 auto 1.5rem auto', fontSize: '0.75rem' }}>
          {FORMATS.map(f => (
            <div key={f.label} style={{ background: 'var(--bg-dark-well)', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: f.color, display: 'block', marginBottom: '2px' }}>{f.label}</strong>
              {f.desc}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); document.getElementById('file-input')?.click(); }}
          >
            Browse...
          </button>
        </div>
      </div>
    </div>
  );
};
