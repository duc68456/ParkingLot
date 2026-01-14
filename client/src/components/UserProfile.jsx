import { useState } from 'react';
import '../styles/components/UserProfile.css';

export default function UserProfile({ name, email, initials, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    if (onLogout) onLogout();
    // Add logout logic here
  };

  return (
    <div className="user-profile">
      <button className="user-profile-button" onClick={handleToggle}>
        <div className="user-avatar">
          <span className="user-initials">{initials}</span>
        </div>
        <div className="user-info">
          <p className="user-name">{name}</p>
          <p className="user-email">{email}</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="user-chevron">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="user-dropdown">
          <button className="user-dropdown-item" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
