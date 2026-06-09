import React, { useState, useMemo } from 'react';
import { HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface BadUsbEditorProps {
  text: string;
  onChangeText: (newText: string) => void;
}

interface ValidationResult {
  lineNum: number;
  type: 'error' | 'warning';
  message: string;
}

const DUCKY_COMMANDS = new Set([
  'REM', 'DELAY', 'DEFAULT_DELAY', 'DEFAULTDELAY', 'STRING', 'STRINGLN',
  'STRING_DELAY', 'STRINGDELAY', 'DEFAULT_STRING_DELAY', 'DEFAULTSTRINGDELAY',
  'REPEAT', 'ALTCHAR', 'ALTSTRING', 'ALTCODE', 'SYSRQ', 'MEDIA', 'GLOBE',
  'WAIT_FOR_BUTTON_PRESS', 'ID', 'LEFTCLICK', 'LEFT_CLICK', 'RIGHTCLICK',
  'RIGHT_CLICK', 'MOUSEMOVE', 'MOUSE_MOVE', 'MOUSESCROLL', 'MOUSE_SCROLL',
  'CTRL', 'CONTROL', 'SHIFT', 'ALT', 'GUI', 'WINDOWS', 'ENTER', 'DELETE',
  'BACKSPACE', 'DOWN', 'DOWNARROW', 'LEFT', 'LEFTARROW', 'RIGHT', 'RIGHTARROW',
  'UP', 'UPARROW', 'END', 'HOME', 'ESC', 'ESCAPE', 'INSERT', 'PAGEUP',
  'PAGEDOWN', 'CAPSLOCK', 'NUMLOCK', 'SCROLLLOCK', 'PRINTSCREEN', 'BREAK',
  'PAUSE', 'SPACE', 'TAB', 'MENU', 'APP', 'HOLD', 'RELEASE'
]);

export const BadUsbEditor: React.FC<BadUsbEditorProps> = ({ text, onChangeText }) => {
  const [activeTab, setActiveTab] = useState<'cheat' | 'errors'>('cheat');

  // Analyse syntaxique simplifiée du script Duckyscript
  const validationResults = useMemo((): ValidationResult[] => {
    const results: ValidationResult[] = [];
    const lines = text.split('\n');

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) return;

      const firstWord = trimmed.split(/\s+/)[0].toUpperCase();

      // Vérifier si c'est un bouton de fonction (F1-F12)
      const isFunctionKey = /^F(1[0-2]|[1-9])$/i.test(firstWord);
      
      // Vérifier si c'est un modificateur combiné (ex: CTRL-ALT-DELETE)
      const isCombo = firstWord.includes('-');

      if (!DUCKY_COMMANDS.has(firstWord) && !isFunctionKey && !isCombo) {
        results.push({
          lineNum: idx + 1,
          type: 'error',
          message: `Unknown command '${firstWord}'.`
        });
        return;
      }

      // Validations spécifiques
      if (firstWord === 'DELAY' || firstWord === 'DEFAULT_DELAY' || firstWord === 'DEFAULTDELAY') {
        const valStr = trimmed.split(/\s+/)[1];
        const val = parseInt(valStr, 10);
        if (!valStr || isNaN(val) || val <= 0) {
          results.push({
            lineNum: idx + 1,
            type: 'error',
            message: `Delay must be a positive integer.`
          });
        }
      }

      if (firstWord === 'ID') {
        const params = trimmed.substring(2).trim();
        if (!params.match(/^[0-9A-Fa-f]{4}:[0-9A-Fa-f]{4}/)) {
          results.push({
            lineNum: idx + 1,
            type: 'warning',
            message: `Recommended USB ID format: VID:PID (e.g. 1234:abcd).`
          });
        }
      }
    });

    return results;
  }, [text]);

  const lineCount = text.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: '1.5rem' }}>
      
      {/* 1. Zone Centrale: Éditeur avec Numéros de Lignes */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          background: 'var(--bg-dark-well)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          lineHeight: '20px'
        }}
      >
        {/* Colonne des numéros de ligne */}
        <div 
          style={{ 
            padding: '1rem 0.5rem 1rem 0.8rem', 
            color: 'var(--text-muted)', 
            textAlign: 'right', 
            background: 'rgba(0,0,0,0.2)', 
            borderRight: '1px solid var(--border-color)', 
            userSelect: 'none',
            whiteSpace: 'pre'
          }}
        >
          {lineNumbers}
        </div>

        {/* Zone de saisie de texte */}
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            padding: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: '20px',
            outline: 'none',
            resize: 'none',
            height: '100%',
            overflowY: 'auto'
          }}
          placeholder="Enter your BadUSB script (Duckyscript) here...&#10;Example:&#10;REM My Script&#10;DELAY 500&#10;GUI r&#10;DELAY 200&#10;STRING notepad.exe&#10;ENTER"
        />
      </div>

      {/* 2. Zone Droite: Aide et Rapport de validation */}
      <div className="sidebar" style={{ width: '380px', flexShrink: 0 }}>
        
        {/* Onglets de la Sidebar */}
        <div className="mode-toggle" style={{ width: '100%' }}>
          <button 
            className={`mode-btn ${activeTab === 'cheat' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab('cheat')}
          >
            Help (Cheat Sheet)
          </button>
          <button 
            className={`mode-btn ${activeTab === 'errors' ? 'active' : ''}`}
            style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}
            onClick={() => setActiveTab('errors')}
          >
            Validation
            {validationResults.length > 0 && (
              <span style={{ background: 'var(--accent-red)', color: 'white', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>
                {validationResults.length}
              </span>
            )}
          </button>
        </div>

        {/* Contenu Onglet : Aide */}
        {activeTab === 'cheat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '75vh', paddingRight: '4px' }}>
            <div className="panel" style={{ gap: '0.5rem' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={16} />
                Key Commands
              </h4>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><code>REM &lt;comment&gt;</code>: Line ignored by the interpreter.</div>
                <div><code>DELAY &lt;ms&gt;</code>: Pause execution (e.g. <code>DELAY 500</code>).</div>
                <div><code>STRING &lt;text&gt;</code>: Types the specified text.</div>
                <div><code>STRINGLN &lt;text&gt;</code>: Types the text and presses Enter.</div>
                <div><code>ENTER</code> / <code>SPACE</code> / <code>TAB</code>: Special keys.</div>
                <div><code>ESCAPE</code> / <code>BACKSPACE</code> / <code>DELETE</code>: Deletion keys.</div>
              </div>
            </div>

            <div className="panel" style={{ gap: '0.5rem' }}>
              <h4 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem' }}>Shortcuts & Modifiers</h4>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><code>GUI</code> / <code>WINDOWS</code>: System Key (Windows/Mac Cmd).</div>
                <div><code>CTRL</code> / <code>SHIFT</code> / <code>ALT</code>: Modifier keys.</div>
                <div>Multiple combinations: <code>CTRL-ALT-DELETE</code> ou <code>ALT-TAB</code>.</div>
              </div>
            </div>

            <div className="panel" style={{ gap: '0.5rem' }}>
              <h4 style={{ color: 'var(--accent-orange)', fontSize: '0.85rem' }}>Advanced Flipper Commands</h4>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><code>ID &lt;VID:PID&gt; &lt;Product&gt;</code>: Sets the USB identity on line 1.</div>
                <div><code>WAIT_FOR_BUTTON_PRESS</code>: Suspends until Flipper button press.</div>
                <div><code>MOUSEMOVE &lt;x&gt; &lt;y&gt;</code>: Mouse movement.</div>
                <div><code>LEFTCLICK</code> / <code>RIGHTCLICK</code>: Mouse clicks.</div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu Onglet : Validation */}
        {activeTab === 'errors' && (
          <div className="panel">
            <h4 style={{ fontSize: '0.85rem' }}>Syntax Analysis Report</h4>
            
            {validationResults.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0', color: 'var(--accent-green)' }}>
                <CheckCircle size={32} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>No errors detected!</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>The script is ready to execute.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                {validationResults.map((err, i) => (
                  <div 
                    key={`err-${i}`}
                    className="alert"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '8px', 
                      borderLeftWidth: '3px',
                      borderLeftColor: err.type === 'error' ? 'var(--accent-red)' : 'var(--accent-orange)',
                      background: err.type === 'error' ? 'rgba(255, 51, 102, 0.04)' : 'rgba(255, 145, 0, 0.04)',
                      color: err.type === 'error' ? '#ff80a0' : '#ffb86c',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} />
                      Ligne {err.lineNum} ({err.type === 'error' ? 'Error' : 'Warning'})
                    </div>
                    <div>{err.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
