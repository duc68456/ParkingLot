import { useRef, useEffect } from 'react';
import '../styles/components/PinInput.css';

export default function PinInput({ length = 6, value, onChange }) {
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, newValue) => {
    // Only allow single digit
    const digit = newValue.slice(-1);
    
    if (digit && !/^\d$/.test(digit)) {
      return; // Only allow numbers
    }

    const newPin = [...value];
    newPin[index] = digit;
    onChange(newPin);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    const digits = pastedData.match(/\d/g)?.slice(0, length) || [];
    
    const newPin = [...value];
    digits.forEach((digit, i) => {
      if (i < length) {
        newPin[i] = digit;
      }
    });
    onChange(newPin);

    // Focus last filled input or next empty one
    const nextIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="pin-input-container">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="pin-digit-input"
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          aria-label={`PIN digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
