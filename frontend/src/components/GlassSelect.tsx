import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GlassSelect = ({ label, options, value, onChange, errorMessage, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find((opt: any) => String(opt.id) === String(value));

  return (
    <div className="glass-input-wrapper" ref={containerRef}>
      {/* Select Header: Shows selected option or placeholder. */}
      <div 
        className={`glass-select-header ${isOpen ? 'active' : ''} ${value ? 'has-value' : ''} ${errorMessage ? 'error' : ''} ${disabled ? 'glass-select-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-disabled={disabled ? true : undefined}
      >
        <span className="selected-text">{selectedOption ? selectedOption.name : ""}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="select-arrow">▼</motion.span>
      </div>

      {/* Label: Shows error if present, otherwise label text. */}
      <label className={`glass-label ${errorMessage ? 'error' : ''}`}>
        {/* {(errorMessage && !value) ? errorMessage : label} */}
        {errorMessage ? errorMessage : label}
      </label>
      
      {/* Dropdown Menu: Shows options when open. */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 5 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-dropdown-menu"
          >
            {options.map((opt: any) => (
              <li 
                key={opt.id} 
                className={`glass-option ${String(opt.id) === String(value) ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
              >
                {opt.name}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
