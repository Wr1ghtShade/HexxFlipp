import React from 'react';
import type { HexEditorState, MifareClassicCard } from '../types';
import { calculateShannonEntropy, convertNfcToBinary } from '../utils/nfcParser';

interface StatsPanelProps {
  state: HexEditorState;
  onChangeCard?: (updatedCard: MifareClassicCard) => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ state, onChangeCard }) => {
  const { fileMode, rawBytes, nfcCard, cursorIndex, isCompareMode } = state;

  // Obtenir les données binaires brutes pour le calcul des statistiques
  const getBinaryData = (): Uint8Array => {
    if (fileMode === 'nfc' && nfcCard) {
      return convertNfcToBinary(nfcCard);
    } else if (rawBytes) {
      return rawBytes;
    }
    return new Uint8Array(0);
  };

  const binaryData = getBinaryData();

  // 1. Calcul de l'entropie
  const entropy = calculateShannonEntropy(binaryData);
  
  // Qualifier l'entropie
  const getEntropyDescription = (val: number) => {
    if (binaryData.length === 0) return 'No data';
    if (val < 1.0) return 'Highly structured / Repetitive (empty)';
    if (val < 4.0) return 'Simple structure / Text';
    if (val < 6.8) return 'Executable code / Structured data';
    if (val < 7.8) return 'Compressed data';
    return 'Encrypted / Random / Very high entropy';
  };

  // 2. Calcul des fréquences d'octets
  const getByteFrequencies = (): number[] => {
    const freqs = new Array(256).fill(0);
    for (let i = 0; i < binaryData.length; i++) {
      freqs[binaryData[i]]++;
    }
    return freqs;
  };

  const frequencies = getByteFrequencies();
  const maxFrequency = Math.max(...frequencies, 1);

  // 3. Inspecteur d'octets au curseur
  const getInspectorData = () => {
    if (cursorIndex === null) return null;

    // Obtenir le tableau uniforme d'octets (hex str)
    const displayBytes: string[] = [];
    if (fileMode === 'nfc' && nfcCard) {
      const blockLines = nfcCard.lines.filter(l => l.type === 'block')
        .sort((a, b) => a.blockIndex! - b.blockIndex!);
      for (const line of blockLines) {
        if (line.bytes) displayBytes.push(...line.bytes);
      }
    } else if (rawBytes) {
      for (let i = 0; i < rawBytes.length; i++) {
        displayBytes.push(rawBytes[i].toString(16).padStart(2, '0').toUpperCase());
      }
    }

    const totalLength = displayBytes.length;

    // Récupérer jusqu'à 4 octets à partir du curseur
    const bytes: (number | null)[] = [];
    for (let i = 0; i < 4; i++) {
      const idx = cursorIndex + i;
      if (idx >= totalLength) {
        bytes.push(null);
      } else {
        const hex = displayBytes[idx];
        if (hex === '??') {
          bytes.push(null);
        } else {
          bytes.push(parseInt(hex, 16));
        }
      }
    }

    const b0 = bytes[0];
    const b1 = bytes[1];
    const b2 = bytes[2];
    const b3 = bytes[3];

    // Décoder
    const isAvailable = (b: number | null): b is number => b !== null;

    // 8-bit
    const ui8 = isAvailable(b0) ? b0 : null;
    const i8 = isAvailable(b0) ? (b0 & 0x7f) - (b0 & 0x80) : null;

    // 16-bit
    const has16 = isAvailable(b0) && isAvailable(b1);
    const ui16le = has16 ? b0! | (b1! << 8) : null;
    const ui16be = has16 ? (b0! << 8) | b1! : null;
    
    const i16le = has16 ? (ui16le! & 0x7fff) - (ui16le! & 0x8000) : null;
    const i16be = has16 ? (ui16be! & 0x7fff) - (ui16be! & 0x8000) : null;

    // 32-bit
    const has32 = has16 && isAvailable(b2) && isAvailable(b3);
    
    // Raccourcis pour les buffers Float/Int32
    let float32le = null;
    let float32be = null;
    let ui32le = null;
    let ui32be = null;
    let i32le = null;
    let i32be = null;

    if (has32) {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      
      // Little Endian
      view.setUint8(0, b0!);
      view.setUint8(1, b1!);
      view.setUint8(2, b2!);
      view.setUint8(3, b3!);
      float32le = view.getFloat32(0, true);
      ui32le = view.getUint32(0, true);
      i32le = view.getInt32(0, true);

      // Big Endian
      float32be = view.getFloat32(0, false);
      ui32be = view.getUint32(0, false);
      i32be = view.getInt32(0, false);
    }

    // Représentation binaire
    const binary = isAvailable(b0) ? b0.toString(2).padStart(8, '0') : null;
    
    // ASCII
    const ascii = isAvailable(b0) 
      ? (b0 >= 32 && b0 <= 126 ? String.fromCharCode(b0) : '.')
      : null;

    return {
      index: cursorIndex,
      hexIndex: `0x${cursorIndex.toString(16).toUpperCase().padStart(4, '0')}`,
      ui8, i8,
      ui16le, ui16be, i16le, i16be,
      ui32le, ui32be, i32le, i32be,
      float32le, float32be,
      binary,
      ascii
    };
  };

  const inspector = getInspectorData();

  // Pour le rendu du graphique SVG
  const chartWidth = 340;
  const chartHeight = 80;
  const padding = 2;
  const barWidth = (chartWidth - padding * 2) / 256;

  const card = nfcCard;
  const compareCard = state.compareState?.nfcCard;
  const uidDiff = compareCard && card && card.uid !== compareCard.uid;
  const atqaDiff = compareCard && card && card.atqa !== compareCard.atqa;
  const sakDiff = compareCard && card && card.sak !== compareCard.sak;
  const atsDiff = compareCard && card && card.ats !== compareCard.ats;

  const handleHeaderChange = (key: string, value: string) => {
    if (!card || !onChangeCard) return;
    const updatedCard = { ...card };
    
    // Mettre à jour l'en-tête dans la liste des lignes pour la sauvegarde
    let keyFound = false;
    updatedCard.lines = card.lines.map(line => {
      if (line.type === 'header' && line.key === key) {
        keyFound = true;
        return {
          ...line,
          value,
          raw: `${key}: ${value}`
        };
      }
      return line;
    });

    if (!keyFound) {
      const lastHeaderIdx = updatedCard.lines.map(l => l.type).lastIndexOf('header');
      const newHeaderLine = { type: 'header' as const, key, value, raw: `${key}: ${value}` };
      if (lastHeaderIdx !== -1) {
        updatedCard.lines.splice(lastHeaderIdx + 1, 0, newHeaderLine);
      } else {
        updatedCard.lines.push(newHeaderLine);
      }
    }

    // Mettre à jour l'objet principal
    if (key === 'Device type') updatedCard.deviceType = value;
    else if (key === 'UID') updatedCard.uid = value;
    else if (key === 'ATQA') updatedCard.atqa = value;
    else if (key === 'SAK') updatedCard.sak = value;
    else if (key === 'ATS') updatedCard.ats = value;
    else if (key === 'Mifare Classic type') updatedCard.mifareClassicType = value;

    onChangeCard(updatedCard);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Informations du Tag NFC (mis tout à droite, au-dessus de l'inspecteur) */}
      {fileMode === 'nfc' && card && !isCompareMode && (
        <div className="panel">
          <h3 className="panel-title">NFC Tag Information</h3>

          <div className="form-group">
            <label className="form-label">Device Type</label>
            <input
              type="text"
              className="form-input"
              value={card.deviceType}
              onChange={(e) => handleHeaderChange('Device type', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              UID (Unique Identifier)
              {uidDiff && compareCard && <span style={{ color: 'var(--accent-red)', marginLeft: '6px', fontSize: '0.75rem' }}>(B: {compareCard.uid})</span>}
            </label>
            <input
              type="text"
              className={`form-input ${uidDiff ? 'diff-input' : ''}`}
              style={uidDiff ? { borderColor: 'var(--accent-red)' } : {}}
              value={card.uid}
              onChange={(e) => handleHeaderChange('UID', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div className="form-group">
              <label className="form-label">
                ATQA
                {atqaDiff && compareCard && <span style={{ color: 'var(--accent-red)', marginLeft: '4px', fontSize: '0.75rem' }}>(B: {compareCard.atqa})</span>}
              </label>
              <input
                type="text"
                className={`form-input ${atqaDiff ? 'diff-input' : ''}`}
                style={atqaDiff ? { borderColor: 'var(--accent-red)' } : {}}
                value={card.atqa || ''}
                onChange={(e) => handleHeaderChange('ATQA', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                SAK
                {sakDiff && compareCard && <span style={{ color: 'var(--accent-red)', marginLeft: '4px', fontSize: '0.75rem' }}>(B: {compareCard.sak})</span>}
              </label>
              <input
                type="text"
                className={`form-input ${sakDiff ? 'diff-input' : ''}`}
                style={sakDiff ? { borderColor: 'var(--accent-red)' } : {}}
                value={card.sak || ''}
                onChange={(e) => handleHeaderChange('SAK', e.target.value)}
              />
            </div>
          </div>

          {card.deviceType === 'Mifare DESFire' && (
            <div className="form-group">
              <label className="form-label">
                ATS (Answer to Select)
                {atsDiff && compareCard && <span style={{ color: 'var(--accent-red)', marginLeft: '4px', fontSize: '0.75rem' }}>(B: {compareCard.ats})</span>}
              </label>
              <input
                type="text"
                className={`form-input ${atsDiff ? 'diff-input' : ''}`}
                style={atsDiff ? { borderColor: 'var(--accent-red)' } : {}}
                value={card.ats || ''}
                onChange={(e) => handleHeaderChange('ATS', e.target.value)}
              />
            </div>
          )}

          {card.deviceType !== 'NTAG/Ultralight' && card.deviceType !== 'Mifare DESFire' && (
            <div className="form-group">
              <label className="form-label">Mifare Classic Type</label>
              <input
                type="text"
                className="form-input"
                value={card.mifareClassicType || ''}
                disabled
              />
            </div>
          )}
        </div>
      )}
      
      {/* 1. Inspecteur d'octets */}
      {!isCompareMode && (
        <div className="panel">
          <h3 className="panel-title">Data Inspector</h3>

          {inspector === null ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
              Select a byte in the editor to inspect it.
            </div>
          ) : (
            <div className="sector-detail" style={{ gap: '0.6rem' }}>
              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Cursor Index
                  <span className="info-tooltip-icon" title="Position of the selected byte in the file (decimal and hexadecimal)">i</span>
                </span>
                <span className="detail-value" style={{ color: 'var(--accent-purple)' }}>
                  {inspector.index} ({inspector.hexIndex})
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Binary (8-bit)
                  <span className="info-tooltip-icon" title="Binary representation of the byte as 8 bits (0s and 1s)">i</span>
                </span>
                <span className="detail-value">{inspector.binary ?? 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  ASCII
                  <span className="info-tooltip-icon" title="Text character corresponding to the byte value (ASCII character table)">i</span>
                </span>
                <span className="detail-value">{inspector.ascii ?? 'N/A'}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Signed 8-bit Integer
                  <span className="info-tooltip-icon" title="Byte value interpreted as a signed integer ranging from -128 to 127">i</span>
                </span>
                <span className="detail-value">{inspector.i8 !== null ? inspector.i8 : 'N/A'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Unsigned 8-bit Integer
                  <span className="info-tooltip-icon" title="Byte value interpreted as an unsigned integer ranging from 0 to 255">i</span>
                </span>
                <span className="detail-value">{inspector.ui8 !== null ? inspector.ui8 : 'N/A'}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  16-bit Integer (Little Endian)
                  <span className="info-tooltip-icon" title="Integer encoded on 2 bytes (16 bits) with least significant byte first (Intel/ARM)">i</span>
                </span>
                <span className="detail-value">{inspector.i16le !== null ? inspector.i16le : 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  16-bit Integer (Big Endian)
                  <span className="info-tooltip-icon" title="Integer encoded on 2 bytes (16 bits) with most significant byte first (Network/Motorola)">i</span>
                </span>
                <span className="detail-value">{inspector.i16be !== null ? inspector.i16be : 'N/A'}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  32-bit Integer (Little Endian)
                  <span className="info-tooltip-icon" title="Integer encoded on 4 bytes (32 bits) with least significant byte first">i</span>
                </span>
                <span className="detail-value">{inspector.i32le !== null ? inspector.i32le : 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  32-bit Integer (Big Endian)
                  <span className="info-tooltip-icon" title="Integer encoded on 4 bytes (32 bits) with most significant byte first">i</span>
                </span>
                <span className="detail-value">{inspector.i32be !== null ? inspector.i32be : 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Float 32 (Little Endian)
                  <span className="info-tooltip-icon" title="Standard floating-point number (IEEE 754) encoded on 4 bytes in Little Endian">i</span>
                </span>
                <span className="detail-value">
                  {inspector.float32le !== null ? inspector.float32le.toFixed(6).replace(/\.?0+$/, '') : 'N/A'}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Float 32 (Big Endian)
                  <span className="info-tooltip-icon" title="Standard floating-point number (IEEE 754) encoded on 4 bytes in Big Endian">i</span>
                </span>
                <span className="detail-value">
                  {inspector.float32be !== null ? inspector.float32be.toFixed(6).replace(/\.?0+$/, '') : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Entropie globale du fichier */}
      <div className="panel">
        <h3 className="panel-title">Shannon Entropy</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Entropy value:</span>
            <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {entropy.toFixed(4)} / 8.0000
            </strong>
          </div>
          
          <div className="entropy-meter">
            <div 
              className="entropy-bar" 
              style={{ width: `${(entropy / 8) * 100}%` }}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
            {getEntropyDescription(entropy)}
          </div>
        </div>
      </div>

      {/* 3. Graphique de distribution des fréquences d'octets */}
      <div className="panel">
        <h3 className="panel-title">Byte Distribution</h3>

        {binaryData.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
            No bytes to analyse.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="stats-chart" style={{ display: 'block', padding: 0 }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                {frequencies.map((freq, idx) => {
                  const barHeight = (freq / maxFrequency) * (chartHeight - 4);
                  const x = padding + idx * barWidth;
                  const y = chartHeight - barHeight;

                  return (
                    <rect
                      key={`bar-${idx}`}
                      x={x}
                      y={y}
                      width={Math.max(barWidth - 0.2, 0.5)}
                      height={barHeight}
                      fill="url(#chartGrad)"
                    >
                      <title>{`Byte 0x${idx.toString(16).toUpperCase().padStart(2, '0')}: ${freq} occurrences`}</title>
                    </rect>
                  );
                })}
              </svg>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>0x00 (0)</span>
              <span>Distribution (0x00–0xFF)</span>
              <span>0xFF (255)</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
