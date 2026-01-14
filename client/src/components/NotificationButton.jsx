import '../styles/components/NotificationButton.css';

export default function NotificationButton({ notificationCount = 0, onClick }) {
  return (
    <button
      className="notification-button"
      onClick={onClick}
      aria-label="Notifications"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="notification-icon">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {notificationCount > 0 && (
        <span className="notification-badge" aria-label={`${notificationCount} new notifications`} />
      )}
    </button>
  );
}
