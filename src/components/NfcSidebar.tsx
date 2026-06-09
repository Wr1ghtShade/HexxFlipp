import React, { useState } from 'react';
import type { MifareClassicCard } from '../types';
import { decodeSector } from '../utils/nfcParser';

interface NfcSidebarProps {
  card: MifareClassicCard;
  onJumpToBlock: (blockIndex: number) => void;
  compareCard?: MifareClassicCard;
  onChangeCard?: (updatedCard: MifareClassicCard) => void;
}

export const NfcSidebar: React.FC<NfcSidebarProps> = ({ card, onJumpToBlock, compareCard, onChangeCard }) => {
  const [selectedSector, setSelectedSector] = useState<number>(0);

  const isUltralight = card.deviceType.toLowerCase().includes('ultralight') || card.deviceType.toLowerCase().includes('ntag');

  if (isUltralight) {
    const getHeaderVal = (key: string): string => {
      const line = card.lines.find(l => l.type === 'header' && l.key === key);
      return line?.value || '';
    };

    const password = getHeaderVal('Password') || getHeaderVal('PWD') || '';
    const pack = getHeaderVal('PACK') || '';
    const signature = getHeaderVal('Signature') || '';

    const page2Line = card.lines.find(l => l.type === 'block' && l.blockIndex === 2);
    const page2Bytes = page2Line?.bytes || ['00', '00', '00', '00'];
    const l0 = parseInt(page2Bytes[2] || '00', 16) || 0;
    const l1 = parseInt(page2Bytes[3] || '00', 16) || 0;

    const lockBits = [
      { label: 'Page 3 (OTP)', byte: 0, bit: 0 },
      { label: 'Page 4', byte: 0, bit: 1 },
      { label: 'Page 5', byte: 0, bit: 2 },
      { label: 'Page 6', byte: 0, bit: 3 },
      { label: 'Page 7', byte: 0, bit: 4 },
      { label: 'Page 8', byte: 0, bit: 5 },
      { label: 'Page 9', byte: 0, bit: 6 },
      { label: 'Page 10', byte: 0, bit: 7 },
      { label: 'Page 11', byte: 1, bit: 0 },
      { label: 'Page 12', byte: 1, bit: 1 },
      { label: 'Page 13', byte: 1, bit: 2 },
      { label: 'Page 14', byte: 1, bit: 3 },
      { label: 'Page 15', byte: 1, bit: 4 },
      { label: 'Lock Pages 4-9 for writing', byte: 1, bit: 5 },
      { label: 'Lock Pages 10-15 for writing', byte: 1, bit: 6 },
      { label: 'Lock the Lock Bytes (R/O)', byte: 1, bit: 7 },
    ];

    const updateHeaderValue = (key: string, val: string) => {
      if (!onChangeCard) return;
      const lines = [...card.lines];
      const idx = lines.findIndex(l => l.type === 'header' && l.key === key);
      if (idx !== -1) {
        lines[idx] = { ...lines[idx], value: val, raw: `${key}: ${val}` };
      } else {
        const insertIdx = lines.findIndex(l => l.type === 'header' && l.key === 'Version');
        const newHeaderLine = { type: 'header' as const, key, value: val, raw: `${key}: ${val}` };
        if (insertIdx !== -1) {
          lines.splice(insertIdx + 1, 0, newHeaderLine);
        } else {
          lines.unshift(newHeaderLine);
        }
      }
      onChangeCard({ ...card, lines });
    };

    const updatePageBytes = (pageIdx: number, bytes: string[]) => {
      if (!onChangeCard) return;
      const lines = [...card.lines];
      const idx = lines.findIndex(l => l.type === 'block' && l.blockIndex === pageIdx);
      if (idx !== -1) {
        lines[idx] = { ...lines[idx], bytes, raw: `Page ${pageIdx}: ${bytes.join(' ')}` };
      } else {
        const newBlockLine = {
          type: 'block' as const,
          blockIndex: pageIdx,
          bytes,
          raw: `Page ${pageIdx}: ${bytes.join(' ')}`
        };
        lines.push(newBlockLine);
        lines.sort((a, b) => {
          if (a.type === 'block' && b.type === 'block') {
            return a.blockIndex! - b.blockIndex!;
          }
          return 0;
        });
      }
      onChangeCard({ ...card, lines });
    };

    const handleToggleLockBit = (byteIdx: number, bitIdx: number, currentVal: boolean) => {
      const newBytes = [...page2Bytes];
      let val = parseInt(newBytes[byteIdx === 0 ? 2 : 3] || '00', 16) || 0;
      
      if (currentVal) {
        val &= ~(1 << bitIdx);
      } else {
        val |= (1 << bitIdx);
      }
      
      newBytes[byteIdx === 0 ? 2 : 3] = val.toString(16).toUpperCase().padStart(2, '0');
      updatePageBytes(2, newBytes);
    };

    return (
      <div className="sidebar">
        
        {/* Paramètres NTAG */}
        <div className="panel">
          <h3 className="panel-title" style={{ color: 'var(--accent-orange)' }}>NTAG Configuration</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', marginBottom: '0.8rem', color: 'var(--text-secondary)' }}>
            <div>Component type: <strong style={{ color: 'var(--text-primary)' }}>{card.deviceType}</strong></div>
            <div>UID : <strong style={{ fontFamily: 'var(--font-mono)' }}>{card.uid}</strong></div>
            <div>ATQA : <strong>{card.atqa || 'N/A'}</strong> | SAK : <strong>{card.sak || 'N/A'}</strong></div>
          </div>
        </div>

        {/* Section Lock Bytes */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <h3 className="panel-title">Page Locks (Lock Bits)</h3>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0 }}>
            The lock bits configured on Page 2 control write access to blocks.
          </p>

          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-dark-well)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            {lockBits.map((item, index) => {
              const byteVal = item.byte === 0 ? l0 : l1;
              const isChecked = (byteVal & (1 << item.bit)) !== 0;

              return (
                <label key={`lock-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 0' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleLockBit(item.byte, item.bit, isChecked)}
                    style={{ accentColor: 'var(--accent-orange)' }}
                  />
                  <span style={{ color: isChecked ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {item.label} {isChecked ? '🔒' : '🔓'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Sécurité et Authentification */}
        <div className="panel">
          <h3 className="panel-title">Security & Authentication</h3>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password (PWD - 4 hex bytes)</label>
            <input
              type="text"
              className="form-input"
              value={password}
              onChange={(e) => updateHeaderValue('Password', e.target.value.toUpperCase())}
              placeholder="FF FF FF FF"
              maxLength={11}
            />
          </div>

          {/* PACK */}
          <div className="form-group">
            <label className="form-label">Signature / Acknowledge (PACK - 2 hex bytes)</label>
            <input
              type="text"
              className="form-input"
              value={pack}
              onChange={(e) => updateHeaderValue('PACK', e.target.value.toUpperCase())}
              placeholder="00 00"
              maxLength={5}
            />
          </div>

          {/* Signature ECC */}
          <div className="form-group">
            <label className="form-label">ECC Authenticity Signature (32 hex bytes)</label>
            <textarea
              className="form-input"
              value={signature}
              onChange={(e) => updateHeaderValue('Signature', e.target.value.toUpperCase())}
              placeholder="00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF..."
              style={{ minHeight: '60px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

      </div>
    );
  }

  // Nombre de secteurs dépend du type (1K = 16 secteurs, 4K = 40 secteurs)
  const totalBlocks = card.lines.filter(l => l.type === 'block').length;
  const totalSectors = totalBlocks === 256 ? 40 : 16;

  // Obtenir les informations du secteur sélectionné
  const decodedSector = decodeSector(card, selectedSector);

  // Analyser l'état d'un secteur pour l'affichage graphique
  const getSectorStatus = (sectorIdx: number) => {
    const isLargeSector = sectorIdx >= 32;
    const start = isLargeSector ? 128 + (sectorIdx - 32) * 16 : sectorIdx * 4;
    const blocksCount = isLargeSector ? 16 : 4;
    const end = start + blocksCount;

    const blockLines = card.lines.filter(l => l.type === 'block' && l.blockIndex! >= start && l.blockIndex! < end);
    
    let hasUnknown = false;
    let hasInvalidBits = false;
    let hasDiff = false;

    // Décoder pour vérifier la validité des bits d'accès
    const decoded = decodeSector(card, sectorIdx);
    if (!decoded.isValid && decoded.accessBytes.every(b => b !== '??')) {
      hasInvalidBits = true;
    }

    for (const line of blockLines) {
      if (line.bytes?.some(b => b === '??')) {
        hasUnknown = true;
      }
    }

    // Vérifier s'il y a des différences avec l'autre carte
    if (compareCard) {
      const compareBlockLines = compareCard.lines.filter(l => l.type === 'block' && l.blockIndex! >= start && l.blockIndex! < end);
      for (let i = 0; i < blocksCount; i++) {
        const bytesA = blockLines[i]?.bytes;
        const bytesB = compareBlockLines[i]?.bytes;
        if (bytesA && bytesB) {
          if (bytesA.some((b, idx) => b !== bytesB[idx])) {
            hasDiff = true;
            break;
          }
        } else if (bytesA || bytesB) {
          hasDiff = true;
          break;
        }
      }
    }

    return { hasUnknown, hasInvalidBits, hasDiff };
  };

  return (
    <div className="sidebar">

      {/* 2. Carte graphique des secteurs */}
      <div className="panel">
        <h3 className="panel-title">
          Sector Map
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            ({totalSectors} Sectors)
          </span>
        </h3>
        
        <div className="sector-grid">
          {Array.from({ length: totalSectors }).map((_, i) => {
            const isSelected = selectedSector === i;
            const { hasUnknown, hasInvalidBits, hasDiff } = getSectorStatus(i);
            
            let cardClass = `sector-card ${isSelected ? 'selected' : ''}`;
            if (hasInvalidBits) cardClass += ' invalid';
            if (hasDiff) cardClass += ' diff';

            const isLarge = i >= 32;
            const sectorStart = isLarge ? 128 + (i - 32) * 16 : i * 4;
            const sectorEnd = isLarge ? sectorStart + 15 : sectorStart + 3;

            return (
              <div
                key={`sector-${i}`}
                className={cardClass}
                onClick={() => setSelectedSector(i)}
                title={`Sector ${i}: Blocks ${sectorStart} to ${sectorEnd}`}
              >
                <span className="sector-num">{i}</span>
                <span className="sector-label">Sector</span>
                
                {/* Pastille de statut */}
                {hasInvalidBits ? (
                  <div className="sector-status-dot invalid" title="Corrupted access bits!" />
                ) : hasDiff ? (
                  <div className="sector-status-dot diff" style={{ backgroundColor: 'var(--accent-red)' }} title="Sector with differences" />
                ) : hasUnknown ? (
                  <div className="sector-status-dot unknown" style={{ backgroundColor: 'var(--accent-orange)' }} title="Unknown data (??)" />
                ) : (
                  <div className="sector-status-dot" title="Complete and valid sector" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Analyse détaillée du secteur sélectionné */}
      <div className="panel">
        <h3 className="panel-title">
          Sector {selectedSector} Details
          <span 
            style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', cursor: 'pointer' }}
            onClick={() => onJumpToBlock(decodedSector.startBlock)}
          >
            Go to block
          </span>
        </h3>

        <div className="sector-detail">
          <div className="detail-row">
            <span className="detail-label">Blocks</span>
            <span className="detail-value">{decodedSector.startBlock} to {decodedSector.endBlock}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Key A</span>
            <span className="detail-value" style={{ color: 'var(--accent-cyan)' }}>{decodedSector.keyA}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Key B</span>
            <span className="detail-value" style={{ color: 'var(--accent-green)' }}>{decodedSector.keyB}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Access Bits</span>
            <span className="detail-value" style={{ color: 'var(--accent-orange)' }}>
              {decodedSector.accessBytes.join(' ')}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">User Byte</span>
            <span className="detail-value">{decodedSector.userByte}</span>
          </div>

          {/* Alerte si les bits d'accès sont invalides */}
          {!decodedSector.isValid && decodedSector.accessBytes.every(b => b !== '??') && (
            <div className="alert alert-danger" style={{ marginTop: '0.5rem' }}>
              <strong>Warning:</strong> Inverted bits do not match normal bits. The sector will be locked/inaccessible on a real badge!
            </div>
          )}

          {decodedSector.accessBytes.some(b => b === '??') && (
            <div className="alert alert-warning" style={{ marginTop: '0.5rem' }}>
              <strong>Note:</strong> Keys and access bits unknown. Cannot decode permissions for this sector.
            </div>
          )}

          {/* Grille des permissions décodées */}
          {decodedSector.isValid && decodedSector.permissions.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Decoded Permissions</span>
              <div className="permission-list">
                {decodedSector.permissions.map((perm) => (
                  <div key={`perm-${perm.blockIndex}`} className="permission-item">
                    <div className={`permission-header ${perm.blockType === 'trailer' ? 'trailer' : ''}`}>
                      <span>Block {perm.blockIndex} ({perm.blockType === 'trailer' ? 'Trailer' : 'Data'})</span>
                    </div>
                    <div className="permission-grid">
                      <div>Read: <strong>{perm.read}</strong></div>
                      <div>Write: <strong>{perm.write}</strong></div>
                      {perm.blockType === 'data' && (
                        <>
                          <div>Increment: <strong>{perm.increment}</strong></div>
                          <div>Decrement: <strong>{perm.decrement}</strong></div>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                      {perm.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
