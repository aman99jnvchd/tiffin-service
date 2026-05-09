import { useState } from 'react';

interface Props {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errorMessage?: string;
  maxLength?: number;
  disabled?: boolean;
}

export const GlassInput = ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  errorMessage, 
  maxLength, 
  disabled,
}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // True, if focused OR has value
  const isFloating = (isFocused || value.length > 0);

  const currentLabel = errorMessage || label;
  const isError = !!errorMessage;

  return (
    <div className="input-container">
      <input
        type={type === 'password' && showPassword ? 'text' : type}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`glass-input ${type === 'time' ? 'glass-input--time' : ''} ${isError ? 'input-error' : ''} ${disabled ? 'input-disabled' : ''}`}
        placeholder=" "
        data-empty={type === 'time' && !value ? 'true' : undefined}
      />

      {/* Label floats if focused OR has value */}
      <label className={`floating-label ${isFloating ? 'active' : ''} ${isError ? 'label-error' : ''}`}>
        {currentLabel}
      </label>

      {/* Password visibility toggle button */}
      {type === 'password' && value.length > 0 && (
        <button
          type="button"
          className="eye-button"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          )}
        </button>
      )}
    </div>
  );
};
