import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { HexEditorState } from '../types';

interface HexGridProps {
  state: HexEditorState;
  onChangeBytes?: (newBytes: string[] | Uint8Array) => void;
  onSelectByte: (index: number | null, isEditingAscii?: boolean) => void;
  compareBytes?: string[];
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  isReadOnly?: boolean;
  hideAscii?: boolean;
}

export const HexGrid: React.FC<HexGridProps> = ({ 
  state, 
  onChangeBytes, 
  onSelectByte,
  compareBytes,
  scrollRef,
  onScroll,
  onMouseEnter,
  isReadOnly = false,
  hideAscii = false
}) => {
  const { fileMode, rawBytes, nfcCard, cursorIndex, isEditingAscii } = state;
  const localRef = useRef<HTMLDivElement>(null);
  const activeRef = scrollRef || localRef;
  const [activeNibble, setActiveNibble] = useState<0 | 1>(0); // 0 = poids fort, 1 = poids faible
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination pour les gros fichiers bruts (4096 octets par page)
  const [page, setPage] = useState(0);
  const [prevCursorIndex, setPrevCursorIndex] = useState<number | null>(cursorIndex);
  const pageSize = 4096;

  // Nombre d'octets par ligne (16 par défaut, 4 pour Mifare Ultralight/NTAG)
  const bytesPerRow = useMemo(() => {
    if (fileMode === 'nfc' && nfcCard && nfcCard.deviceType === 'NTAG/Ultralight') {
      return 4;
    }
    return 16;
  }, [fileMode, nfcCard]);

  // Calcul du nombre total d'octets
  const totalBytes = fileMode === 'nfc' 
    ? (nfcCard ? nfcCard.lines.filter(l => l.type === 'block').length * bytesPerRow : 0)
    : (rawBytes ? rawBytes.length : 0);

  const totalPages = Math.ceil(totalBytes / pageSize);

  // Obtenir les octets sous forme de tableau de chaînes pour l'affichage uniforme (Memoized pour la compatibilité avec le compilateur React)
  const displayBytes = useMemo((): string[] => {
    if (fileMode === 'nfc' && nfcCard) {
      const blockLines = [...nfcCard.lines]
        .filter(l => l.type === 'block')
        .sort((a, b) => a.blockIndex! - b.blockIndex!);
      const all: string[] = [];
      for (const line of blockLines) {
        if (line.bytes) {
          all.push(...line.bytes);
        }
      }
      return all;
    } else if (rawBytes) {
      // Mode brut : convertir Uint8Array en string[] hex
      const all: string[] = [];
      for (let i = 0; i < rawBytes.length; i++) {
        all.push(rawBytes[i].toString(16).padStart(2, '0').toUpperCase());
      }
      return all;
    }
    return [];
  }, [fileMode, nfcCard, rawBytes]);

  // Filtrer les octets pour la page courante (uniquement en mode brut)
  const getPagedRange = () => {
    if (fileMode === 'nfc') {
      return { start: 0, end: totalBytes };
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, totalBytes);
    return { start, end };
  };

  const { start: pagedStart, end: pagedEnd } = getPagedRange();
  const visibleBytes = displayBytes.slice(pagedStart, pagedEnd);

  // Re-calculer les index visibles
  const visibleRowsCount = Math.ceil(visibleBytes.length / bytesPerRow);

  // Ajuster la page en fonction du curseur (Derived state pour éviter useEffect cascading renders)
  if (cursorIndex !== prevCursorIndex) {
    setPrevCursorIndex(cursorIndex);
    if (cursorIndex !== null && fileMode === 'raw') {
      const cursorPage = Math.floor(cursorIndex / pageSize);
      if (cursorPage !== page) {
        setPage(cursorPage);
      }
    }
  }

  // Met à jour la valeur d'un octet à un index spécifique.
  // M4 — validation explicite : en mode raw on rejette toute entrée non-hex
  //        (en mode NFC, `??` et `?X` sont autorisés pour les octets inconnus).
  const updateByteAt = useCallback((index: number, newByteVal: string) => {
    if (isReadOnly || !onChangeBytes) return;

    if (fileMode === 'nfc' && nfcCard) {
      const newBytes = [...displayBytes];
      newBytes[index] = newByteVal.toUpperCase();
      onChangeBytes(newBytes);
      return;
    }

    if (rawBytes) {
      // Mode brut : rejet strict de tout ce qui n'est pas un octet hex valide (00-FF).
      if (!/^[0-9A-Fa-f]{1,2}$/.test(newByteVal)) {
        // Saisie invalide → on ignore silencieusement (le listener clavier
        // filtre déjà mais on garde un garde-fou en cas d'appel programmatique).
        return;
      }
      const val = parseInt(newByteVal, 16);
      if (Number.isNaN(val) || val < 0 || val > 0xFF) return;
      const newRaw = new Uint8Array(rawBytes);
      newRaw[index] = val;
      onChangeBytes(newRaw);
    }
  }, [isReadOnly, onChangeBytes, fileMode, nfcCard, displayBytes, rawBytes]);

  // Derived state pour les résultats de recherche (useMemo)
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.trim().toUpperCase();
    const results: number[] = [];

    // Recherche de chaîne de caractères ASCII
    const queryAscii = searchQuery;
    
    // Recherche Hexadécimale (ex: "47 B7" ou "47B7")
    const cleanHexQuery = query.replace(/\s+/g, '');
    
    // Parcourir les octets
    if (cleanHexQuery.length >= 2 && cleanHexQuery.length % 2 === 0) {
      // Recherche de séquence hexadécimale
      const queryBytes: string[] = [];
      for (let i = 0; i < cleanHexQuery.length; i += 2) {
        queryBytes.push(cleanHexQuery.substring(i, i + 2));
      }

      for (let i = 0; i <= displayBytes.length - queryBytes.length; i++) {
        let match = true;
        for (let j = 0; j < queryBytes.length; j++) {
          if (displayBytes[i + j] !== '??' && queryBytes[j] !== '??' && displayBytes[i + j] !== queryBytes[j]) {
            match = false;
            break;
          }
        }
        if (match) results.push(i);
      }
    }

    // Recherche ASCII text également
    if (queryAscii.length > 0) {
      for (let i = 0; i <= displayBytes.length - queryAscii.length; i++) {
        let match = true;
        for (let j = 0; j < queryAscii.length; j++) {
          const byteVal = displayBytes[i + j];
          if (byteVal === '??') {
            match = false;
            break;
          }
          const char = String.fromCharCode(parseInt(byteVal, 16));
          if (char.toUpperCase() !== queryAscii[j].toUpperCase()) {
            match = false;
            break;
          }
        }
        if (match && !results.includes(i)) results.push(i);
      }
    }

    return results;
  }, [searchQuery, displayBytes]);

  // Derived state pour l'index de recherche
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(-1);

  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setCurrentSearchIdx(searchResults.length > 0 ? 0 : -1);
  }

  // Se déplacer vers le résultat de recherche suivant
  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentSearchIdx + 1) % searchResults.length;
    setCurrentSearchIdx(nextIdx);
    const targetByteIndex = searchResults[nextIdx];
    onSelectByte(targetByteIndex);
    
    // Ajuster la page si nécessaire en mode brut
    if (fileMode === 'raw') {
      const targetPage = Math.floor(targetByteIndex / pageSize);
      setPage(targetPage);
    }
  };

  // Écouteur de touches clavier pour l'édition et la navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cursorIndex === null) return;

      // Ignorer si l'utilisateur saisit du texte dans un input ou textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignorer les raccourcis avec Ctrl/Cmd (ex: Ctrl+C, Ctrl+Z)
      if (e.ctrlKey || e.metaKey) return;

      // Empêcher le défilement par défaut pour les flèches et espace
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Space'].includes(e.key)) {
        e.preventDefault();
      }

      // 1. Navigation
      if (e.key === 'ArrowLeft') {
        setActiveNibble(0);
        onSelectByte(Math.max(0, cursorIndex - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        setActiveNibble(0);
        onSelectByte(Math.min(totalBytes - 1, cursorIndex + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        setActiveNibble(0);
        onSelectByte(Math.max(0, cursorIndex - bytesPerRow));
        return;
      }
      if (e.key === 'ArrowDown') {
        setActiveNibble(0);
        onSelectByte(Math.min(totalBytes - 1, cursorIndex + bytesPerRow));
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        onSelectByte(cursorIndex, !isEditingAscii);
        return;
      }

      // 2. Suppression (touche Backspace ou Delete)
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (isReadOnly) return;
        const fallbackValue = fileMode === 'nfc' ? '??' : '00';
        updateByteAt(cursorIndex, fallbackValue);
        setActiveNibble(0);
        if (e.key === 'Backspace') {
          onSelectByte(Math.max(0, cursorIndex - 1));
        }
        return;
      }

      // 3. Saisie dans la colonne ASCII
      if (isEditingAscii) {
        if (e.key.length === 1) {
          if (isReadOnly) return;
          const asciiCode = e.key.charCodeAt(0);
          if (asciiCode >= 32 && asciiCode <= 126) {
            const hexVal = asciiCode.toString(16).toUpperCase();
            updateByteAt(cursorIndex, hexVal);
            onSelectByte(Math.min(totalBytes - 1, cursorIndex + 1));
          }
        }
        return;
      }

      // 4. Saisie dans la colonne Hex
      const key = e.key.toUpperCase();
      const isHexChar = /^[0-9A-F]$/.test(key);
      const isQuestionMark = key === '?' && fileMode === 'nfc';

      if (isHexChar || isQuestionMark) {
        if (isReadOnly) return;
        const currentByte = displayBytes[cursorIndex] || '00';
        let newByte: string;

        if (isQuestionMark) {
          if (activeNibble === 0) {
            newByte = '?0';
            setActiveNibble(1);
          } else {
            newByte = '??';
            setActiveNibble(0);
            onSelectByte(Math.min(totalBytes - 1, cursorIndex + 1));
          }
        } else {
          // Caractère Hex normal
          if (activeNibble === 0) {
            newByte = key + '0';
            setActiveNibble(1);
          } else {
            newByte = currentByte.charAt(0) + key;
            setActiveNibble(0);
            onSelectByte(Math.min(totalBytes - 1, cursorIndex + 1));
          }
        }

        updateByteAt(cursorIndex, newByte);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cursorIndex, displayBytes, activeNibble, isEditingAscii, fileMode, totalBytes, isReadOnly, onSelectByte, updateByteAt, bytesPerRow]);

  // Convertit un octet hex en caractère ASCII affichable
  const byteToAscii = (hex: string): string => {
    if (hex === '??') return '.';
    const val = parseInt(hex, 16);
    if (isNaN(val) || val < 32 || val > 126) return '.';
    return String.fromCharCode(val);
  };

  // Déterminer la classe CSS NFC d'une cellule
  const getNfcCellClass = (index: number): string => {
    if (fileMode !== 'nfc' || !nfcCard) return '';
    
    if (nfcCard.deviceType === 'NTAG/Ultralight') {
      const pageIndex = Math.floor(index / 4);
      // Pages 0 et 1 : UID / Serial Number
      if (pageIndex === 0 || pageIndex === 1) {
        return 'nfc-uid';
      }
      // Page 2 : Lock Bytes (Remorque / Sécurité)
      if (pageIndex === 2) {
        return 'nfc-trailer';
      }
      return '';
    }

    const blockIndex = Math.floor(index / 16);
    
    // Block 0 : UID / Bloc Constructeur
    if (blockIndex === 0) {
      return 'nfc-uid';
    }

    // Remorque de secteur (Trailer) : dernier bloc de chaque secteur
    // Pour Mifare Classic 1K, ce sont les blocs 3, 7, 11, ..., 63
    if ((blockIndex + 1) % 4 === 0) {
      return 'nfc-trailer';
    }

    return '';
  };

  // Rendu de la grille
  const renderRows = () => {
    const rows = [];
    const baseOffset = fileMode === 'raw' ? page * pageSize : 0;

    for (let r = 0; r < visibleRowsCount; r++) {
      const rowOffset = baseOffset + r * bytesPerRow;
      const rowBytes = visibleBytes.slice(r * bytesPerRow, (r + 1) * bytesPerRow);
      
      const blockIndex = fileMode === 'nfc' ? r : null;

      // Séparateur visuel de secteur NFC (tous les 4 blocs, uniquement pour Mifare Classic)
      const isSectorStart = fileMode === 'nfc' && nfcCard && nfcCard.deviceType !== 'NTAG/Ultralight' && r > 0 && r % 4 === 0;

      rows.push(
        <React.Fragment key={`row-${r}`}>
          {isSectorStart && (
            <div 
              style={{ 
                gridColumn: '1 / -1', 
                height: '1px', 
                background: 'var(--border-color)', 
                margin: '8px 0',
                opacity: 0.5 
              }} 
            />
          )}

          {/* 1. Adresse / Nom du bloc */}
          <div className="hex-row-offset">
            {fileMode === 'nfc' 
              ? (nfcCard && nfcCard.deviceType === 'NTAG/Ultralight' ? `Page ${blockIndex}` : `Block ${blockIndex}`) 
              : rowOffset.toString(16).padStart(8, '0').toUpperCase()}
          </div>

          {/* 2. Valeurs Hexadécimales */}
          <div className="hex-bytes-col" style={bytesPerRow === 4 ? { gridTemplateColumns: 'repeat(4, minmax(24px, 1fr))' } : {}}>
            {Array.from({ length: bytesPerRow }).map((_, c) => {
              const byteIdx = rowOffset + c;
              const isSelected = cursorIndex === byteIdx && !isEditingAscii;
              const byteStr = rowBytes[c];
              
              if (byteIdx >= totalBytes) {
                return <div key={`empty-hex-${c}`} />;
              }

              const isUnknown = byteStr === '??';
              const isDiff = compareBytes && byteIdx < compareBytes.length && compareBytes[byteIdx] !== byteStr;

              let cellClass = `hex-cell ${isSelected ? 'selected' : ''} ${getNfcCellClass(byteIdx)}`;
              if (isUnknown) cellClass += ' nfc-unknown';
              if (isDiff) cellClass += ' diff';

              // Styles additionnels de sélection / recherche
              const isSearchResult = searchResults.includes(byteIdx);
              const isCurrentSearchResult = isSearchResult && searchResults[currentSearchIdx] === byteIdx;
              
              let style: React.CSSProperties = {};
              if (isCurrentSearchResult) {
                style = { border: '2px solid var(--accent-cyan)', boxShadow: 'var(--shadow-neon)' };
              } else if (isSearchResult) {
                style = { background: 'rgba(0, 242, 254, 0.15)' };
              }

              return (
                <div
                  key={`hex-${byteIdx}`}
                  className={cellClass}
                  style={style}
                  onClick={() => {
                    setActiveNibble(0);
                    onSelectByte(byteIdx, false);
                  }}
                >
                  {byteStr}
                </div>
              );
            })}
          </div>

          {/* 3. Représentation ASCII */}
          {!hideAscii && (
            <div className="hex-ascii-col" style={bytesPerRow === 4 ? { gridTemplateColumns: 'repeat(4, 9px)' } : {}}>
              {Array.from({ length: bytesPerRow }).map((_, c) => {
                const byteIdx = rowOffset + c;
                const isSelected = cursorIndex === byteIdx && isEditingAscii;
                const byteStr = rowBytes[c];

                if (byteIdx >= totalBytes) {
                  return <div key={`empty-ascii-${c}`} />;
                }

                const isUnknown = byteStr === '??';
                const isDiff = compareBytes && byteIdx < compareBytes.length && compareBytes[byteIdx] !== byteStr;
                let cellClass = `hex-cell ${isSelected ? 'selected' : ''}`;
                if (isUnknown) cellClass += ' nfc-unknown';
                if (isDiff) cellClass += ' diff';

                const isSearchResult = searchResults.includes(byteIdx);
                const isCurrentSearchResult = isSearchResult && searchResults[currentSearchIdx] === byteIdx;

                let style: React.CSSProperties = {};
                if (isCurrentSearchResult) {
                  style = { border: '1px solid var(--accent-cyan)', boxShadow: 'var(--shadow-neon)' };
                } else if (isSearchResult) {
                  style = { background: 'rgba(0, 242, 254, 0.15)' };
                }

                return (
                  <div
                    key={`ascii-${byteIdx}`}
                    className={cellClass}
                    style={style}
                    onClick={() => {
                      setActiveNibble(0);
                      onSelectByte(byteIdx, true);
                    }}
                  >
                    {byteStr ? byteToAscii(byteStr) : '.'}
                  </div>
                );
              })}
            </div>
          )}
        </React.Fragment>
      );
    }
    return rows;
  };

  return (
    <div className="hex-editor-container">
      {/* Barre d'outils Hex */}
      <div className="hex-toolbar">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-box">
            <input
              type="text"
              placeholder="Rechercher Hex ou Texte..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginRight: '4px' }}>
                {currentSearchIdx + 1}/{searchResults.length}
              </span>
            )}
          </div>
          {searchResults.length > 0 && (
            <button className="btn" onClick={nextSearchResult} style={{ padding: '0.2rem 0.5rem' }}>
              Suivant
            </button>
          )}
        </div>

        {/* Contrôles de pagination pour le mode Brut */}
        {fileMode === 'raw' && totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              style={{ padding: '0.2rem 0.5rem', opacity: page === 0 ? 0.5 : 1 }}
            >
              Précédent
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Page {page + 1} / {totalPages}
            </span>
            <button
              className="btn"
              disabled={page === totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              style={{ padding: '0.2rem 0.5rem', opacity: page === totalPages - 1 ? 0.5 : 1 }}
            >
              Suivant
            </button>
          </div>
        )}

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Mode d'édition : <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{isEditingAscii ? 'ASCII' : 'HEXADÉCIMAL'}</span>
          <span style={{ marginLeft: '10px', color: 'var(--text-muted)' }}>(Appuyez sur Tab pour basculer)</span>
        </div>
      </div>

      {/* Zone de défilement de la grille */}
      <div 
        className="hex-scroll-area" 
        ref={activeRef}
        onScroll={onScroll}
        onMouseEnter={onMouseEnter}
      >
        {totalBytes === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 2rem', maxWidth: '500px', margin: '3rem auto', background: 'var(--bg-dark-well)', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 0 15px rgba(161, 84, 242, 0.1)' }}>
            {nfcCard && nfcCard.deviceType === 'Mifare DESFire' ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.8rem', fontWeight: 'bold', fontSize: '1.1rem' }}>Badge Mifare DESFire</h3>
                <p style={{ fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  Les puces Mifare DESFire utilisent un stockage sécurisé par fichiers chiffrés (AES/3DES). Le contenu de la mémoire n'est pas accessible sans clés d'authentification.
                </p>
                <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                  Vous pouvez éditer l'UID, le SAK, l'ATQA et l'ATS dans le panneau d'information à droite pour configurer l'émulation sur votre Flipper Zero.
                </p>
              </>
            ) : (
              "No data to display."
            )}
          </div>
        ) : (
          <div className={`hex-table ${hideAscii ? 'no-ascii' : ''}`} style={bytesPerRow === 4 ? { gridTemplateColumns: 'minmax(80px, auto) 1fr minmax(50px, auto)' } : {}}>
            {/* Titre des colonnes */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Offset</div>
            <div 
              className="hex-bytes-col" 
              style={bytesPerRow === 4 
                ? { gridTemplateColumns: 'repeat(4, minmax(24px, 1fr))', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' } 
                : { borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }
              }
            >
              {Array.from({ length: bytesPerRow }).map((_, i) => (
                <div key={`col-title-${i}`} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {i.toString(16).toUpperCase().padStart(2, '0')}
                </div>
              ))}
            </div>
            {!hideAscii && (
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', paddingLeft: '1rem' }}>ASCII</div>
            )}

            {renderRows()}
          </div>
        )}
      </div>
    </div>
  );
};
