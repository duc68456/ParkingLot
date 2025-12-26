import '../styles/components/NotificationButton.css';

const notificationIcon = "http://localhost:3845/assets/4511833fd8ad1f29228a8f5d1f986b1bf0dcd809.svg";

export default function NotificationButton({ notificationCount = 0, onClick }) {
  return (
    <button 
      className="notification-button" 
      onClick={onClick}
      aria-label="Notifications"
    >
      <img src={notificationIcon} alt="Notifications" className="notification-icon" />
      {notificationCount > 0 && (
        <span className="notification-badge" aria-label={`${notificationCount} new notifications`} />
      )}
    </button>
  );
}
