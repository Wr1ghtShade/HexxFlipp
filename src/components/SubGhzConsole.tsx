import React, { useState, useMemo } from 'react';
import type { SubGhzCard } from '../types';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface SubGhzConsoleProps {
  card: SubGhzCard;
  onChangeCard: (updatedCard: SubGhzCard) => void;
}

const SUPPORTED_SUB_PROTOCOLS = [
  'RAW', 'Came', 'Came24', 'KeeLoq', 'NiceFlo', 'Somfy', 'Securitas', 'Princeton', 'Linear', 'Faac'
];

const SUPPORTED_PRESETS = [
  'FuriHalSubGhzPresetKeyLoq_650Khz',
  'FuriHalSubGhzPreset2FSKDev238Khz',
  'FuriHalSubGhzPreset2FSKDev476Khz',
  'FuriHalSubGhzPresetOOK',
  'FuriHalSubGhzPresetOOK_225Khz'
];

export const SubGhzConsole: React.FC<SubGhzConsoleProps> = ({ card, onChangeCard }) => {
  const [zoom, setZoom] = useState<number>(100); // Nombre de pulses visibles à la fois (10 à 1000)
  const [panIndex, setPanIndex] = useState<number>(0); // Index de départ du panoramique
  const [isTransmitting, setIsTransmitting] = useState(false);

  const rawTimes = card.rawTimes || [];
  const maxPan = Math.max(0, rawTimes.length - zoom);
  const currentPan = Math.min(panIndex, maxPan);

  // Déclencher une simulation de transmission
  const handleTransmit = () => {
    setIsTransmitting(true);
    setTimeout(() => setIsTransmitting(false), 800);
  };

  const handleParamChange = (k: keyof SubGhzCard, val: string | number) => {
    const updated = { ...card, [k]: val };
    
    // Aligner dans lines pour que la sauvegarde écrive la nouvelle valeur
    updated.lines = card.lines.map(line => {
      const fieldKey = k === 'frequency' ? 'Frequency' : k === 'preset' ? 'Preset' : k === 'protocol' ? 'Protocol' : k === 'bit' ? 'Bit' : k === 'key' ? 'Key' : '';
      if (fieldKey && line.key === fieldKey) {
        return { ...line, value: val.toString(), raw: `${fieldKey}: ${val}` };
      }
      return line;
    });

    onChangeCard(updated);
  };

  // Construire le chemin SVG du chronogramme pour le segment visible
  const waveformPath = useMemo(() => {
    if (rawTimes.length === 0) return '';

    const visibleTimes = rawTimes.slice(currentPan, currentPan + zoom);
    
    let path = '';
    let currentX = 0;
    
    // Configurer des proportions d'affichage
    const totalDuration = visibleTimes.reduce((acc, t) => acc + Math.abs(t), 0) || 1;
    const widthUnit = 1000 / totalDuration; // Largeur totale SVG = 1000
    const highY = 10;
    const lowY = 80;
    
    let lastY = lowY;

    visibleTimes.forEach((t, i) => {
      const isHigh = t > 0;
      const duration = Math.abs(t);
      const w = duration * widthUnit;
      const newY = isHigh ? highY : lowY;

      if (i === 0) {
        path += `M 0 ${newY} `;
      } else if (newY !== lastY) {
        // Ligne verticale de transition
        path += `L ${currentX} ${newY} `;
      }

      // Ligne horizontale pour la durée de l'impulsion
      currentX += w;
      path += `L ${currentX} ${newY} `;
      lastY = newY;
    });

    return path;
  }, [rawTimes, currentPan, zoom]);

  // Statistiques simples sur le signal visible
  const stats = useMemo(() => {
    if (rawTimes.length === 0) return null;
    const totalCount = rawTimes.length;
    const highPulses = rawTimes.filter(t => t > 0);
    const lowPulses = rawTimes.filter(t => t < 0);
    const avgHigh = highPulses.length ? Math.round(highPulses.reduce((a, b) => a + b, 0) / highPulses.length) : 0;
    const avgLow = lowPulses.length ? Math.round(lowPulses.reduce((a, b) => a + Math.abs(b), 0) / lowPulses.length) : 0;
    
    return {
      totalCount,
      avgHigh,
      avgLow,
      durationMs: Math.round(rawTimes.reduce((a, b) => a + Math.abs(b), 0) / 1000)
    };
  }, [rawTimes]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: '1.5rem' }}>
      
      {/* 1. Zone Centrale : Waveform et Console Virtuelle */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem', minWidth: 0 }}>
        
        {/* Écran Flipper SubGhz */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.2rem', gap: '1.5rem', alignItems: 'center', position: 'relative' }}>
          
          {/* Flipper LCD Panel */}
          <div style={{ width: '220px', background: 'var(--accent-orange)', color: '#060913', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '2px solid #000', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', paddingBottom: '3px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>[ SUB-GHZ ]</span>
              <span style={{ animation: isTransmitting ? 'pulse 0.4s infinite' : 'none' }}>
                {isTransmitting ? '⚡ TX...' : 'Ready'}
              </span>
            </div>
            <div>Freq: {(card.frequency ? card.frequency / 1000000 : 433.92).toFixed(2)} MHz</div>
            <div style={{ fontSize: '0.65rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              Mod: {card.preset ? card.preset.replace('FuriHalSubGhzPreset', '') : 'OOK'}
            </div>
            <div>Proto: {card.protocol || 'RAW'}</div>
            {card.key && <div style={{ fontSize: '0.65rem' }}>Key: {card.key}</div>}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
              Sub-GHz Radio Console
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Visualise the radio timing spectrum and manage transmission. The RAW signal consists of a sequence of high (positive) and low (negative) states measured in microseconds.
            </p>

            <button 
              className="btn btn-primary"
              style={{ marginTop: '0.8rem' }}
              onClick={handleTransmit}
              disabled={isTransmitting}
            >
              <Zap size={16} />
              {isTransmitting ? 'Transmitting...' : 'Transmit signal'}
            </button>
          </div>
        </div>

        {/* Waveform Chronogram */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-dark-well)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', position: 'relative', minHeight: '260px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              Waveform Chronogram {rawTimes.length > 0 ? `(View: index ${currentPan} to ${currentPan + zoom - 1})` : ''}
            </span>
            
            {/* Outils de Zoom */}
            {rawTimes.length > 0 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="btn btn-icon" 
                  onClick={() => setZoom(z => Math.max(10, Math.round(z / 1.5)))} 
                  title="Zoom In"
                  style={{ padding: '2px 6px' }}
                >
                  <ZoomIn size={14} />
                </button>
                <button 
                  className="btn btn-icon" 
                  onClick={() => setZoom(z => Math.min(rawTimes.length, Math.round(z * 1.5)))} 
                  title="Zoom Out"
                  style={{ padding: '2px 6px' }}
                >
                  <ZoomOut size={14} />
                </button>
              </div>
            )}
          </div>

          {/* SVG Canvas de la Waveform */}
          <div style={{ flex: 1, position: 'relative', minHeight: '120px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            {rawTimes.length === 0 ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>No RAW timing data</span>
                <span style={{ fontSize: '0.7rem' }}>This file contains a static decoded key.</span>
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* Grille horizontale de niveau */}
                <line x1="0" y1="10" x2="1000" y2="10" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="80" x2="1000" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                
                {/* Effet Neon Glow */}
                <path
                  d={waveformPath}
                  fill="none"
                  stroke="var(--accent-green)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.3, filter: 'blur(2px)' }}
                />
                
                {/* Tracé principal */}
                <path
                  d={waveformPath}
                  fill="none"
                  stroke="var(--accent-green)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {/* Contrôle de Pan (Défilement horizontal) */}
          {rawTimes.length > zoom && (
            <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                className="btn btn-icon" 
                onClick={() => setPanIndex(p => Math.max(0, p - Math.round(zoom / 2)))}
                disabled={currentPan === 0}
                style={{ border: 'none', padding: '4px' }}
              >
                <ChevronLeft size={16} />
              </button>
              
              <input
                type="range"
                min="0"
                max={maxPan}
                value={currentPan}
                onChange={(e) => setPanIndex(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: 'var(--accent-green)' }}
              />

              <button 
                className="btn btn-icon" 
                onClick={() => setPanIndex(p => Math.min(maxPan, p + Math.round(zoom / 2)))}
                disabled={currentPan === maxPan}
                style={{ border: 'none', padding: '4px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Pied de chronogramme */}
          {rawTimes.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              <span>Start (Pulse #{currentPan})</span>
              <span>Zoom: {zoom} visible pulses</span>
              <span>End (Pulse #{currentPan + zoom - 1})</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Zone Droite : Sidebar de Configuration */}
      <div className="sidebar" style={{ width: '380px', flexShrink: 0 }}>
        <div className="panel">
          <h3 className="panel-title">Radio Settings</h3>

          {/* Fréquence */}
          <div className="form-group">
            <label className="form-label">Carrier Frequency (Hz)</label>
            <input
              type="number"
              className="form-input"
              value={card.frequency || 433920000}
              onChange={(e) => handleParamChange('frequency', parseInt(e.target.value, 10) || 433920000)}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
              Common frequencies: 433 920 000 Hz, 868 350 000 Hz, 315 000 000 Hz.
            </span>
          </div>

          {/* Preset Modulation */}
          <div className="form-group">
            <label className="form-label">Modulation / Preset</label>
            <select
              className="form-input"
              value={card.preset || 'FuriHalSubGhzPresetOOK'}
              onChange={(e) => handleParamChange('preset', e.target.value)}
              style={{ background: 'var(--bg-dark-well)', color: 'var(--text-primary)' }}
            >
              {SUPPORTED_PRESETS.map(preset => (
                <option key={preset} value={preset}>
                  {preset.replace('FuriHalSubGhzPreset', '')}
                </option>
              ))}
            </select>
          </div>

          {/* Protocole */}
          <div className="form-group">
            <label className="form-label">Encoding Protocol</label>
            <select
              className="form-input"
              value={card.protocol || 'RAW'}
              onChange={(e) => handleParamChange('protocol', e.target.value)}
              style={{ background: 'var(--bg-dark-well)', color: 'var(--text-primary)' }}
            >
              {SUPPORTED_SUB_PROTOCOLS.map(proto => (
                <option key={proto} value={proto}>{proto}</option>
              ))}
            </select>
          </div>

          {/* Nombre de Bits */}
          {card.protocol !== 'RAW' && card.bit !== undefined && (
            <div className="form-group">
              <label className="form-label">Number of bits (Bit size)</label>
              <input
                type="number"
                className="form-input"
                value={card.bit}
                onChange={(e) => handleParamChange('bit', parseInt(e.target.value, 10) || 12)}
              />
            </div>
          )}

          {/* Clé Statique */}
          {card.protocol !== 'RAW' && card.key !== undefined && (
            <div className="form-group">
              <label className="form-label">Transmission Key (Key hex)</label>
              <input
                type="text"
                className="form-input"
                value={card.key}
                onChange={(e) => handleParamChange('key', e.target.value.toUpperCase())}
                placeholder="00 00 00 00 00 00 00 00"
              />
            </div>
          )}
        </div>

        {/* Panel Statistiques signal */}
        {stats && (
          <div className="panel">
            <h3 className="panel-title">RAW Signal Statistics</h3>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total pulse count:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{stats.totalCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated capture duration:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{stats.durationMs} ms</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Average high pulse:</span>
                <strong style={{ color: 'var(--accent-green)' }}>{stats.avgHigh} µs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Average low pulse:</span>
                <strong style={{ color: 'var(--accent-red)' }}>{stats.avgLow} µs</strong>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
