import '../styles/components/NavItem.css';

export default function NavItem({ icon: Icon, label, isActive, onClick, isCollapsed }) {
  return (
    <button 
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={isCollapsed ? label : ''}
    >
      {Icon ? <Icon className="nav-item-icon" aria-hidden="true" focusable="false" /> : null}
      {!isCollapsed && <span className="nav-item-label">{label}</span>}
    </button>
  );
}
