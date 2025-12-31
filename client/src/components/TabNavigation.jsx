import '../styles/components/TabNavigation.css';

export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tab-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && typeof tab.icon === 'string' ? (
            <img src={tab.icon} alt="" className="tab-icon" />
          ) : tab.icon ? (
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
          ) : null}
          <span className="tab-label">{tab.label}</span>
          <span className={`tab-count ${activeTab === tab.id ? 'active' : ''}`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
