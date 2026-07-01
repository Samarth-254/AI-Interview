import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * RoleSelect — minimal custom dropdown replacing the bulky native <select>.
 * Renders as a clean single-line trigger that opens a compact list panel.
 * Closes on outside click or Escape.
 */
const RoleSelect = ({ options, value, onChange, placeholder = 'Select a role...', id }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border-hairline)'}`,
          borderRadius: 4,
          padding: '11px 14px',
          color: value ? 'var(--text-primary)' : 'var(--text-dim)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.95rem',
          cursor: 'pointer',
          transition: 'border-color 150ms ease',
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 200,
            maxHeight: 260,
            overflowY: 'auto',
            // Custom minimal scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-hairline) transparent',
          }}
        >
          {options.map((option) => {
            const isSelected = option === value;
            const isOther = option === 'Other';
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 14px',
                  background: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                  border: 'none',
                  borderTop: isOther ? '1px solid var(--border-hairline)' : 'none',
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>{option}</span>
                {isSelected && <Check size={13} strokeWidth={2.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoleSelect;
