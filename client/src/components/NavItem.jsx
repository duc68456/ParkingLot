import '../styles/components/NavItem.css';

export default function NavItem({ icon, label, isActive, onClick, isCollapsed }) {
  return (
    <button 
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={isCollapsed ? label : ''}
    >
      <img src={icon} alt="" className="nav-item-icon" />
      {!isCollapsed && <span className="nav-item-label">{label}</span>}
    </button>
  );
}
