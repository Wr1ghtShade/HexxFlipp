import React, { useState } from 'react';
import type { IrCard, IrButton } from '../types';
import { Plus, Trash, Zap } from 'lucide-react';

interface IrRemoteConsoleProps {
  card: IrCard;
  onChangeCard: (updatedCard: IrCard) => void;
}

const SUPPORTED_IR_PROTOCOLS = [
  'NEC', 'NECext', 'NEC42', 'NEC42ext', 'Samsung32', 
  'RC6', 'RC5', 'RC5X', 'SIRC', 'SIRC15', 'SIRC20', 
  'Kaseikyo', 'RCA'
];

export const IrRemoteConsole: React.FC<IrRemoteConsoleProps> = ({ card, onChangeCard }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const selectedButton = card.buttons[selectedIdx] || null;

  // Déclencher une simulation de transmission infrarouge
  const handleTransmit = () => {
    setIsTransmitting(true);
    setTimeout(() => setIsTransmitting(false), 300);
  };

  const handleButtonChange = (updatedBtn: IrButton) => {
    const newButtons = [...card.buttons];
    newButtons[selectedIdx] = updatedBtn;
    onChangeCard({ ...card, buttons: newButtons });
  };

  const handleAddButton = () => {
    const newBtn: IrButton = {
      name: `Bouton_${card.buttons.length + 1}`,
      type: 'parsed',
      protocol: 'NEC',
      address: '00 00 00 00',
      command: '00 00 00 00'
    };
    const newButtons = [...card.buttons, newBtn];
    onChangeCard({ ...card, buttons: newButtons });
    setSelectedIdx(newButtons.length - 1);
  };

  const handleDeleteButton = () => {
    if (card.buttons.length <= 1) {
      alert("Il faut conserver au moins un bouton sur la télécommande.");
      return;
    }
    const newButtons = card.buttons.filter((_, idx) => idx !== selectedIdx);
    onChangeCard({ ...card, buttons: newButtons });
    setSelectedIdx(Math.max(0, selectedIdx - 1));
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: '1.5rem' }}>
      
      {/* 1. Zone Centrale: Télécommande Virtuelle */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', minWidth: 0, position: 'relative' }}>
        
        {/* LED Infrarouge Virtuelle */}
        <div style={{ position: 'absolute', top: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: isTransmitting ? 'var(--accent-red)' : '#1e293b', 
              boxShadow: isTransmitting ? '0 0 15px var(--accent-red)' : 'none',
              transition: 'all 0.1s ease-out' 
            }} 
          />
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Transmetteur IR
          </span>
        </div>

        {/* Boîtier de la télécommande Flipper */}
        <div 
          style={{ 
            width: '260px', 
            background: 'var(--bg-dark-well)', 
            border: '2px solid var(--border-color)', 
            borderRadius: '24px', 
            padding: '2rem 1.2rem 1.5rem 1.2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.5rem', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            marginTop: '30px'
          }}
        >
          {/* Écran LCD minimaliste de la télécommande */}
          <div 
            style={{ 
              background: 'var(--accent-orange)', 
              color: '#060913', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.75rem', 
              padding: '0.5rem 0.8rem', 
              borderRadius: '6px', 
              border: '2px solid #000',
              fontWeight: 'bold',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
            }}
          >
            {selectedButton ? (
              <div>
                <div>[ {selectedButton.name} ]</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                  {selectedButton.type === 'parsed' ? `${selectedButton.protocol}` : `${selectedButton.frequency || 38000} Hz Raw`}
                </div>
              </div>
            ) : (
              "Aucun Bouton"
            )}
          </div>

          {/* Grille des boutons de la télécommande */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
            {card.buttons.map((btn, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <button
                  key={`btn-${idx}`}
                  style={{
                    padding: '0.8rem 0.5rem',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-color)',
                    background: isSelected ? 'rgba(0, 242, 254, 0.1)' : 'var(--bg-card)',
                    color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? 'var(--shadow-neon)' : 'none',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onClick={() => {
                    setSelectedIdx(idx);
                    handleTransmit();
                  }}
                  title={`Sélectionner et transmettre ${btn.name}`}
                >
                  {btn.name}
                </button>
              );
            })}
          </div>

          {/* Bouton d'ajout */}
          <button 
            className="btn" 
            style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
            onClick={handleAddButton}
          >
            <Plus size={16} />
            Ajouter Bouton
          </button>
        </div>

      </div>

      {/* 2. Zone Droite: Formulaire d'édition de bouton */}
      <div className="sidebar" style={{ width: '400px', flexShrink: 0 }}>
        {selectedButton ? (
          <div className="panel">
            <h3 className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Propriétés Bouton</span>
              <button 
                className="btn btn-icon" 
                style={{ border: 'none', background: 'transparent', color: 'var(--accent-red)', padding: '2px' }}
                onClick={handleDeleteButton}
                title="Supprimer ce bouton"
              >
                <Trash size={16} />
              </button>
            </h3>

            {/* Nom */}
            <div className="form-group">
              <label className="form-label">Nom du Bouton</label>
              <input
                type="text"
                className="form-input"
                value={selectedButton.name}
                onChange={(e) => handleButtonChange({ ...selectedButton, name: e.target.value })}
                maxLength={30}
              />
            </div>

            {/* Type */}
            <div className="form-group">
              <label className="form-label">Type de Signal</label>
              <div className="mode-toggle" style={{ width: '100%' }}>
                <button
                  className={`mode-btn ${selectedButton.type === 'parsed' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => handleButtonChange({
                    ...selectedButton,
                    type: 'parsed',
                    protocol: selectedButton.protocol || 'NEC',
                    address: selectedButton.address || '00 00 00 00',
                    command: selectedButton.command || '00 00 00 00'
                  })}
                >
                  Parsed
                </button>
                <button
                  className={`mode-btn ${selectedButton.type === 'raw' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => handleButtonChange({
                    ...selectedButton,
                    type: 'raw',
                    frequency: selectedButton.frequency || 38000,
                    dutyCycle: selectedButton.dutyCycle || 0.33,
                    data: selectedButton.data || '500 500 500 500'
                  })}
                >
                  Raw
                </button>
              </div>
            </div>

            {/* Champs conditionnels */}
            {selectedButton.type === 'parsed' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Protocole IR</label>
                  <select
                    className="form-input"
                    value={selectedButton.protocol}
                    onChange={(e) => handleButtonChange({ ...selectedButton, protocol: e.target.value })}
                    style={{ background: 'var(--bg-dark-well)', color: 'var(--text-primary)' }}
                  >
                    {SUPPORTED_IR_PROTOCOLS.map(proto => (
                      <option key={proto} value={proto}>{proto}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Adresse (4 octets hex)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedButton.address}
                    onChange={(e) => handleButtonChange({ ...selectedButton, address: e.target.value.toUpperCase() })}
                    placeholder="EE 87 00 00"
                    maxLength={11}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Commande (4 octets hex)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedButton.command}
                    onChange={(e) => handleButtonChange({ ...selectedButton, command: e.target.value.toUpperCase() })}
                    placeholder="5D A0 00 00"
                    maxLength={11}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Fréquence porteuse (Hz)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={selectedButton.frequency}
                    onChange={(e) => handleButtonChange({ ...selectedButton, frequency: parseInt(e.target.value, 10) || 38000 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rapport Cyclique (Duty Cycle)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={selectedButton.dutyCycle}
                    onChange={(e) => handleButtonChange({ ...selectedButton, dutyCycle: parseFloat(e.target.value) || 0.33 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Données brutes (Timings en µs)</label>
                  <textarea
                    className="form-input"
                    value={selectedButton.data}
                    onChange={(e) => handleButtonChange({ ...selectedButton, data: e.target.value })}
                    style={{ minHeight: '120px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: '1.4', resize: 'vertical' }}
                  />
                </div>
              </>
            )}

            {/* Test de signal */}
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
              onClick={() => {
                handleTransmit();
              }}
            >
              <Zap size={16} />
              Simuler l'émission
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Aucun bouton sélectionné
          </div>
        )}
      </div>

    </div>
  );
};
