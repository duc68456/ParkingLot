import '../styles/components/SettingsButton.css';

const settingsIcon = "http://localhost:3845/assets/3b1fd7a264c04d18910cf128ec5c8c34e71cbeef.svg";

export default function SettingsButton({ onClick }) {
  return (
    <button 
      className="settings-button" 
      onClick={onClick}
      aria-label="Settings"
    >
      <img src={settingsIcon} alt="Settings" className="settings-icon" />
    </button>
  );
}
