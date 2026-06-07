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
  { color: 'var(--accent-cyan)',   label: '📡 Flipper NFC (.nfc)',         desc: "Analyse des secteurs, clés A/B, bits d'accès (Mifare Classic, Ultralight, DESFire)." },
  { color: 'var(--accent-orange)', label: '🔑 Clés iButton (.ibtn)',       desc: 'Dallas ROM/SRAM/EEPROM, protocoles Cyfral & Metakom, calcul de CRC8.' },
  { color: 'var(--accent-purple)', label: '🆔 LF RFID (.rfid)',            desc: 'Badges basse fréquence (EM4100, H10301, etc.) et décodage Wiegand 26.' },
  { color: 'var(--accent-red)',    label: '📟 Infrarouge (.ir)',           desc: 'Télécommande virtuelle interactive, édition de signaux Parsed et Raw.' },
  { color: 'var(--accent-cyan)',   label: '💻 Scripts BadUSB (.txt)',      desc: 'Éditeur Duckyscript avec numérotation de lignes, cheat sheet et validateur.' },
  { color: 'var(--accent-green)',  label: '📁 Binaires bruts (.bin)',       desc: 'Édition hexadécimale classique (.bin, .dat) avec pagination de grille.' }
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
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Faites glisser un fichier ici</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '0.85rem', marginBottom: '1.2rem', lineHeight: '1.4' }}>
          Glissez-déposez vos dumps NFC Flipper ou vos fichiers binaires bruts pour démarrer l'exploration.
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
            Parcourir...
          </button>
        </div>
      </div>
    </div>
  );
};
