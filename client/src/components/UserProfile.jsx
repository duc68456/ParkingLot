import '../styles/components/UserProfile.css';

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function UserProfile({ name }) {
  const initials = getInitials(name);

  return (
    <div className="user-profile">
      <div className="user-profile-plain" aria-label="Signed in user">
        <div className="user-avatar" aria-hidden="true">
          <span className="user-initials">{initials}</span>
        </div>
        <div className="user-info">
          <p className="user-name">{name || 'User'}</p>
        </div>
      </div>
    </div>
  );
}
