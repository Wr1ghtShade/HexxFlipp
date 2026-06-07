import React, { useState } from 'react';
import type { IButtonCard } from '../types';
import { calculateDallasCrc, parse1WfsDirectory } from '../utils/flipperParsers';
import { Folder, FileText, ChevronRight, X } from 'lucide-react';

interface IButtonSidebarProps {
  card: IButtonCard;
  onChangeCard: (updatedCard: IButtonCard) => void;
}

export const IButtonSidebar: React.FC<IButtonSidebarProps> = ({ card, onChangeCard }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'files'>('config');
  const [selectedFileIdx, setSelectedFileIdx] = useState<number | null>(null);

  const isDallas = card.protocol.startsWith('DS') || card.protocol === 'DSGeneric';
  const hasSram = card.protocol === 'DS1992' || card.protocol === 'DS1996';

  // Calcul du CRC pour Dallas
  let crcCalculated: number | null = null;
  let crcMatches = false;
  
  if (isDallas && card.romData && card.romData.length === 8) {
    const bytes = card.romData.map(b => parseInt(b, 16));
    if (bytes.every(b => !isNaN(b))) {
      crcCalculated = calculateDallasCrc(bytes);
      const expectedCrc = bytes[7];
      crcMatches = crcCalculated === expectedCrc;
    }
  }

  const handleProtocolChange = (val: string) => {
    const updated = { ...card, protocol: val };
    
    // Si on passe d'un format SRAM à un format sans SRAM, ou inversement
    if (val === 'DS1992' && !updated.sramData) {
      updated.sramData = new Array(128).fill('00');
      updated.eepromData = undefined;
      updated.data = undefined;
    } else if (val === 'DS1996' && (!updated.sramData || updated.sramData.length !== 1024)) {
      updated.sramData = new Array(1024).fill('00');
      updated.eepromData = undefined;
      updated.data = undefined;
    } else if (val === 'DS1971' && !updated.eepromData) {
      updated.eepromData = new Array(32).fill('00');
      updated.sramData = undefined;
      updated.data = undefined;
    } else if ((val === 'Cyfral' || val === 'Metakom') && !updated.data) {
      updated.data = new Array(8).fill('00');
      updated.romData = undefined;
      updated.sramData = undefined;
      updated.eepromData = undefined;
    }

    // Réaligner les lignes brutes
    updated.lines = card.lines.map(line => {
      if (line.key === 'Protocol' || line.key === 'Key type') {
        return { ...line, value: val, raw: `${line.key}: ${val}` };
      }
      return line;
    });

    onChangeCard(updated);
  };

  const handleRomChange = (idx: number, hex: string) => {
    if (!card.romData) return;
    const cleanHex = hex.trim().slice(-2).toUpperCase();
    if (cleanHex.length === 0) return;

    const newRom = [...card.romData];
    newRom[idx] = cleanHex.padStart(2, '0');
    
    const updated = { ...card, romData: newRom };
    onChangeCard(updated);
  };

  const generateRandomRom = () => {
    if (!card.romData) return;
    const newRom = new Array(8).fill(0).map(() => Math.floor(Math.random() * 256));
    const crc = calculateDallasCrc(newRom);
    newRom[7] = crc;

    const hexRom = newRom.map(b => b.toString(16).padStart(2, '0').toUpperCase());
    const updated = { ...card, romData: hexRom };
    onChangeCard(updated);
  };

  // Parser les fichiers 1WFS de la SRAM
  const parsedFiles = React.useMemo(() => {
    if (!hasSram || !card.sramData) return [];
    const totalPages = card.protocol === 'DS1996' ? 32 : 4;
    return parse1WfsDirectory(card.sramData, totalPages);
  }, [card.sramData, card.protocol, hasSram]);

  const selectedFile = selectedFileIdx !== null ? parsedFiles[selectedFileIdx] : null;

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Sélecteur d'Onglets si SRAM */}
      {hasSram && (
        <div className="mode-toggle" style={{ width: '100%', marginBottom: '0.8rem', flexShrink: 0 }}>
          <button 
            className={`mode-btn ${activeTab === 'config' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => {
              setActiveTab('config');
              setSelectedFileIdx(null);
            }}
          >
            Configuration
          </button>
          <button 
            className={`mode-btn ${activeTab === 'files' ? 'active' : ''}`}
            style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setActiveTab('files')}
          >
            <Folder size={14} />
            Fichiers (1WFS)
            {parsedFiles.length > 0 && (
              <span style={{ background: 'var(--accent-cyan)', color: '#060913', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {parsedFiles.length}
              </span>
            )}
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {activeTab === 'config' || !hasSram ? (
          <>
            {/* Panel Principal de Configuration */}
            <div className="panel">
              <h3 className="panel-title">Clé iButton</h3>
              
              <div className="form-group">
                <label className="form-label">Protocole</label>
                <select 
                  className="form-input" 
                  value={card.protocol}
                  onChange={(e) => handleProtocolChange(e.target.value)}
                  style={{ background: 'var(--bg-dark-well)', color: 'var(--text-primary)' }}
                >
                  <option value="DS1990">DS1990 (ROM seule)</option>
                  <option value="DS1992">DS1992 (ROM + 1Kb SRAM)</option>
                  <option value="DS1996">DS1996 (ROM + 8Kb SRAM)</option>
                  <option value="DS1971">DS1971 (ROM + 256b EEPROM)</option>
                  <option value="DSGeneric">DSGeneric (Générique 1-Wire)</option>
                  <option value="Cyfral">Cyfral</option>
                  <option value="Metakom">Metakom</option>
                </select>
              </div>

              {isDallas && card.romData && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Identifiant ROM (8 octets)
                    <span 
                      style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem', textTransform: 'none' }}
                      onClick={generateRandomRom}
                    >
                      Générer aléatoire
                    </span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {card.romData.map((byte, idx) => (
                      <div key={`rom-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={byte}
                          onChange={(e) => handleRomChange(idx, e.target.value)}
                          style={{ textAlign: 'center', padding: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                          maxLength={2}
                        />
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {idx === 0 ? 'Fam' : idx === 7 ? 'CRC' : `D${idx}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Statut CRC */}
                  {crcCalculated !== null && (
                    <div 
                      className={`alert ${crcMatches ? 'alert-warning' : 'alert-danger'}`}
                      style={{ 
                        marginTop: '0.5rem', 
                        padding: '6px 10px', 
                        borderLeftColor: crcMatches ? 'var(--accent-green)' : 'var(--accent-red)',
                        color: crcMatches ? 'var(--accent-green)' : 'var(--accent-red)',
                        background: crcMatches ? 'rgba(0, 230, 118, 0.05)' : 'rgba(255, 51, 102, 0.05)'
                      }}
                    >
                      <strong>Statut CRC :</strong> {crcMatches ? 'Valide ✓' : `Invalide (Calculé: ${crcCalculated.toString(16).toUpperCase().padStart(2, '0')})`}
                    </div>
                  )}
                </div>
              )}

              {!isDallas && card.data && (
                <div className="form-group">
                  <label className="form-label">Données de Clé</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {card.data.map((byte, idx) => (
                      <input
                        key={`data-${idx}`}
                        type="text"
                        className="form-input"
                        value={byte}
                        onChange={(e) => {
                          const newData = [...card.data!];
                          newData[idx] = e.target.value.toUpperCase().slice(-2).padStart(2, '0');
                          onChangeCard({ ...card, data: newData });
                        }}
                        style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                        maxLength={2}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Specifications Dallas */}
            {isDallas && (
              <div className="panel">
                <h3 className="panel-title">Spécifications Dallas</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div>Famille ROM (Octet 0) : <strong style={{ color: 'var(--accent-cyan)' }}>{card.romData ? card.romData[0] : 'N/A'}</strong></div>
                  <div>Numéro de Série (Octets 1-6) : <strong>{card.romData ? card.romData.slice(1, 7).join(' ') : 'N/A'}</strong></div>
                  <div>Somme de contrôle (Octet 7) : <strong style={{ color: crcMatches ? 'var(--accent-green)' : 'var(--accent-red)' }}>{card.romData ? card.romData[7] : 'N/A'}</strong></div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Onglet 1WFS - Explorateur de fichiers */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            
            {/* Visualiseur de fichier sélectionné */}
            {selectedFile ? (
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <h3 className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                    {selectedFile.name}.{selectedFile.ext}
                  </span>
                  <button 
                    className="btn btn-icon" 
                    onClick={() => setSelectedFileIdx(null)}
                    style={{ border: 'none', background: 'transparent', padding: '2px', color: 'var(--accent-red)' }}
                  >
                    <X size={16} />
                  </button>
                </h3>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Page départ: <strong>{selectedFile.startPage}</strong> | Taille: <strong>{selectedFile.pageCount} page(s)</strong>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

                {/* Contenu ASCII */}
                <div style={{ fontSize: '0.75rem' }}>
                  <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Contenu Texte (ASCII)</span>
                  <div style={{ background: 'var(--bg-dark-well)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                    {selectedFile.contentAscii}
                  </div>
                </div>

                {/* Contenu Hexa */}
                <div style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Données Brutes (Hex)</span>
                  <div style={{ background: 'var(--bg-dark-well)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', maxHeight: '100px', overflowY: 'auto', textAlign: 'center', fontSize: '0.7rem' }}>
                    {selectedFile.contentHex.map((byte, i) => (
                      <span key={`fb-${i}`} style={{ opacity: byte === '00' ? 0.25 : 1 }}>{byte}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Liste des fichiers de l'explorateur */}
            <div className="panel">
              <h3 className="panel-title">Fichiers SRAM Détectés</h3>
              
              {parsedFiles.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2rem 0' }}>
                  Aucun fichier ou page lisible détecté dans la SRAM.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {parsedFiles.map((file, i) => (
                    <div 
                      key={`file-${i}`} 
                      className={`permission-item ${selectedFileIdx === i ? 'selected' : ''}`}
                      onClick={() => setSelectedFileIdx(i)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.5rem 0.6rem', 
                        cursor: 'pointer',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: selectedFileIdx === i ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                        background: selectedFileIdx === i ? 'rgba(0, 242, 254, 0.05)' : 'var(--bg-dark-well)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                          {file.name}.{file.ext}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        <span>P.{file.startPage} ({file.pageCount}p)</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
