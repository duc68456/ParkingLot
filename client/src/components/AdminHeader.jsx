import UserProfile from './UserProfile';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/AdminHeader.css';

export default function AdminHeader({ title = 'Dashboard' }) {
  const { user, userType } = useAuth();

  const displayName =
    user?.employee?.person?.FullName ||
    user?.employee?.person?.fullName ||
    user?.employee?.person?.name ||
    user?.Username ||
    user?.username ||
    user?.FullName ||
    user?.fullName ||
    user?.name ||
    (userType === 'staff' ? 'Staff' : 'Admin');

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <h1 className="admin-header-title">{title}</h1>

        <div className="admin-header-actions">
          <UserProfile
            name={displayName}
          />
        </div>
      </div>
    </header>
  );
}
