import React from 'react';
import type { RfidCard } from '../types';

interface RfidSidebarProps {
  card: RfidCard;
  onChangeCard: (updatedCard: RfidCard) => void;
}

const SUPPORTED_PROTOCOLS = [
  'EM4100', 'H10301', 'Idteck', 'Indala26', 'IOProxXSF', 
  'AWID', 'FDX-A', 'FDX-B', 'HIDProx', 'HIDExt', 
  'Pyramid', 'Viking', 'Jablotron', 'Paradox', 
  'PAC/Stanley', 'Keri', 'Gallagher', 'GProxII'
];

export const RfidSidebar: React.FC<RfidSidebarProps> = ({ card, onChangeCard }) => {

  const handleProtocolChange = (val: string) => {
    const updated = { ...card, keyType: val };
    
    // Aligner dans la structure des lignes
    updated.lines = card.lines.map(line => {
      if (line.key === 'Key type') {
        return { ...line, value: val, raw: `Key type: ${val}` };
      }
      return line;
    });

    onChangeCard(updated);
  };

  const handleDataByteChange = (idx: number, hex: string) => {
    const cleanHex = hex.trim().slice(-2).toUpperCase();
    if (cleanHex.length === 0) return;

    const newData = [...card.data];
    newData[idx] = cleanHex.padStart(2, '0');
    
    // Réaligner la ligne Data brute dans lines
    const updatedLines = card.lines.map(line => {
      if (line.key === 'Data') {
        return { ...line, value: newData.join(' '), raw: `Data: ${newData.join(' ')}` };
      }
      return line;
    });

    onChangeCard({ ...card, data: newData, lines: updatedLines });
  };

  // Décodage RFID Wiegand 26 si EM4100, H10301, Indala26 ou AWID
  const getDecodedInfo = () => {
    if (card.data.length < 3) return null;

    // Parser les octets
    const bytes = card.data.map(b => parseInt(b, 16));
    if (bytes.some(b => isNaN(b))) return null;

    const len = bytes.length;
    
    // Wiegand 26 classique avec 3 octets de poids faible (ex: FC + CN)
    const wiegandFC = bytes[len - 3] || 0;
    const wiegandCN = ((bytes[len - 2] || 0) << 8) | (bytes[len - 1] || 0);

    // Entier complet
    let fullInteger = 0;
    for (let i = 0; i < bytes.length; i++) {
      fullInteger = (fullInteger * 256) + bytes[i];
    }

    return {
      wiegandFC,
      wiegandCN,
      fullInteger
    };
  };

  const decoded = getDecodedInfo();

  // Mettre à jour Wiegand FC/CN bidirectionnellement
  const handleWiegandChange = (fc: number, cn: number) => {
    const newData = [...card.data];
    const len = newData.length;
    if (len >= 3) {
      newData[len - 3] = (fc & 0xFF).toString(16).toUpperCase().padStart(2, '0');
      newData[len - 2] = ((cn >> 8) & 0xFF).toString(16).toUpperCase().padStart(2, '0');
      newData[len - 1] = (cn & 0xFF).toString(16).toUpperCase().padStart(2, '0');

      const updatedLines = card.lines.map(line => {
        if (line.key === 'Data') {
          return { ...line, value: newData.join(' '), raw: `Data: ${newData.join(' ')}` };
        }
        return line;
      });

      onChangeCard({ ...card, data: newData, lines: updatedLines });
    }
  };

  // Le protocole supporte-t-il le format Wiegand 26 ?
  const isWiegandSupported = ['EM4100', 'H10301', 'Indala26', 'AWID'].includes(card.keyType);

  return (
    <div className="sidebar">
      <div className="panel">
        <h3 className="panel-title">Badge LF RFID</h3>

        <div className="form-group">
          <label className="form-label">Type de Badge (Protocole)</label>
          <select
            className="form-input"
            value={card.keyType}
            onChange={(e) => handleProtocolChange(e.target.value)}
            style={{ background: 'var(--bg-dark-well)', color: 'var(--text-primary)' }}
          >
            {SUPPORTED_PROTOCOLS.map(proto => (
              <option key={proto} value={proto}>{proto}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Données Hexadécimales</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {card.data.map((byte, idx) => (
              <div key={`rfid-byte-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={byte}
                  onChange={(e) => handleDataByteChange(idx, e.target.value)}
                  style={{ textAlign: 'center', padding: '4px', fontFamily: 'var(--font-mono)' }}
                  maxLength={2}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {idx === 0 ? 'H' : `D${idx}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isWiegandSupported && decoded && (
        <div className="panel">
          <h3 className="panel-title">Décodage & Édition Wiegand</h3>
          <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-secondary)' }}>
            
            {/* Formulaire Facility Code */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>Code Site (Facility Code - 0 à 255)</label>
              <input
                type="number"
                min="0"
                max="255"
                className="form-input"
                value={decoded.wiegandFC}
                onChange={(e) => {
                  const val = Math.min(255, Math.max(0, parseInt(e.target.value, 10) || 0));
                  handleWiegandChange(val, decoded.wiegandCN);
                }}
              />
            </div>

            {/* Formulaire Card Number */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>Numéro de Carte (0 à 65535)</label>
              <input
                type="number"
                min="0"
                max="65535"
                className="form-input"
                value={decoded.wiegandCN}
                onChange={(e) => {
                  const val = Math.min(65535, Math.max(0, parseInt(e.target.value, 10) || 0));
                  handleWiegandChange(decoded.wiegandFC, val);
                }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
            
            {/* Représentation décimale globale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>ID Décimal Unique (Entier Complet) :</span>
              <strong style={{ color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                {decoded.fullInteger}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
