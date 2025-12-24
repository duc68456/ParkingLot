import './TabButtons.css';

export default function TabButtons({ activeTab, onTabChange }) {
  return (
    <div className="tab-buttons">
      <button 
        className={`tab-button ${activeTab === 'staff' ? 'active' : ''}`}
        onClick={() => onTabChange('staff')}
      >
        Staff Login
      </button>
      <button 
        className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
        onClick={() => onTabChange('admin')}
      >
        Admin Login
      </button>
    </div>
  );
}
