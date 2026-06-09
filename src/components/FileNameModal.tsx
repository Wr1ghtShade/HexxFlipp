/**
 * Modal de saisie de nom de fichier (M5 — remplace les `prompt()` natifs).
 * Style cohérent avec le reste de l'app, non-bloquant, fermeture Echap/clic-outside.
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface FileNameModalProps {
  open: boolean;
  title: string;
  defaultValue: string;
  /** Si défini, l'extension sera ajoutée si l'utilisateur ne l'a pas tapée. */
  enforceExtension?: string;
  onConfirm: (finalName: string) => void;
  onCancel: () => void;
}

export const FileNameModal: React.FC<FileNameModalProps> = ({
  open,
  title,
  defaultValue,
  enforceExtension,
  onConfirm,
  onCancel
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    let finalName = value.trim();
    if (!finalName) return;
    if (enforceExtension && !finalName.toLowerCase().endsWith(enforceExtension.toLowerCase())) {
      finalName += enforceExtension;
    }
    onConfirm(finalName);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-card"
        style={{ width: '420px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="panel-title"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.5rem'
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{title}</h2>
          <button
            className="btn btn-icon"
            onClick={onCancel}
            style={{ border: 'none', background: 'transparent', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          style={{
            background: 'var(--bg-dark-well)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.6rem 0.8rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
          placeholder={defaultValue}
        />

        {enforceExtension && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Extension <code>{enforceExtension}</code> added automatically if omitted.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!value.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
