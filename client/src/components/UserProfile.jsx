import { useState } from 'react';
import '../styles/components/UserProfile.css';

const chevronIcon = "http://localhost:3845/assets/576f3afeb315c88345b0812bf4010526d76b3d5b.svg";

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
        <img src={chevronIcon} alt="" className="user-chevron" />
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
