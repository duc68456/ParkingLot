import SearchBar from './SearchBar';
import NotificationButton from './NotificationButton';
import SettingsButton from './SettingsButton';
import UserProfile from './UserProfile';
import '../styles/components/AdminHeader.css';

export default function AdminHeader({ title = 'Dashboard' }) {
  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <h1 className="admin-header-title">{title}</h1>
        
        <div className="admin-header-actions">
          <SearchBar />
          <NotificationButton notificationCount={1} />
          <SettingsButton />
          <UserProfile 
            name="Admin User"
            email="admin@parkingpro.com"
            initials="AD"
          />
        </div>
      </div>
    </header>
  );
}
