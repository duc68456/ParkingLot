import { useState } from 'react';
import '../styles/components/PasswordInput.css';

import eyeIcon from '../assets/eye-icon.svg';
import eyeSlashIcon from '../assets/eye-slash-icon.svg';

export default function PasswordInput({ label, placeholder, value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="input-container">
      <label className="input-label">{label}</label>
      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          className="input-field password-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <div className="eye-icon">
            <img 
              src={eyeIcon} 
              alt="Toggle password visibility"
              className="eye-vector"
            />
            {!showPassword && (
              <img 
                src={eyeSlashIcon} 
                alt=""
                className="eye-slash"
              />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
