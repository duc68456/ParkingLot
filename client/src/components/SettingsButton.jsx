import '../styles/components/SettingsButton.css';

export default function SettingsButton({ onClick }) {
  return (
    <button
      className="settings-button"
      onClick={onClick}
      aria-label="Settings"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="settings-icon">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
