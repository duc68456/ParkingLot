import { useState } from 'react';
import NavItem from './NavItem';
import '../styles/components/Sidebar.css';

const logoIcon = "http://localhost:3845/assets/a8ca772dbbf61997217d0a90cf4574fa8cefb7cf.svg";
const dashboardIcon = "http://localhost:3845/assets/d7ded56d7680f988b4fa9ee6d1a91e0ced26f302.svg";
const purchaseIcon = "http://localhost:3845/assets/cd8a1275cff7628ece0ac7c869b4c0cb895043f6.svg";
const peopleIcon = "http://localhost:3845/assets/5d5d3a4944eb57523233f0560defded7a238da47.svg";
const vehiclesIcon = "http://localhost:3845/assets/13e93e63e6b4b1ba58c12f76fc0554ad543cfc3d.svg";
const cardsIcon = "http://localhost:3845/assets/82afebbb7c79dd2ea0e2f926411660b34ef3c82a.svg";
const subscriptionsIcon = "http://localhost:3845/assets/5b7d6a32d99d3861ef018bdfe577f7a7a93b83a1.svg";
const entryIcon = "http://localhost:3845/assets/284eb9cd0a597275a6764b13ccf8552e47f9a36a.svg";
const returnsIcon = "http://localhost:3845/assets/44c73e1229f34e8f21d184b426c1ea73cf4ffc60.svg";
const pricingIcon = "http://localhost:3845/assets/7965f892c1fada56862501f6f52401ec9d7d023e.svg";
const shiftsIcon = "http://localhost:3845/assets/6f442bc1aec0ebba203901fd1fec913cd3f3f741.svg";
const reportsIcon = "http://localhost:3845/assets/657f19e5417e054edb357b8896da6dce9becfd33.svg";
const collapseIcon = "http://localhost:3845/assets/3b5195ed26fde6fbac2df1905bb387074ac74c69.svg";
const logoutIcon = "http://localhost:3845/assets/9bd56683fafd1fcbf8990b5aaa6315a6a9e1fd53.svg";

export default function Sidebar({ currentPage = 'Dashboard', onLogout, isCollapsed, onToggleCollapse, activeItem, onNavClick }) {
  const [activePage, setActivePage] = useState(activeItem || currentPage);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: dashboardIcon },
    { id: 'Purchase Card', label: 'Purchase Card', icon: purchaseIcon },
    { id: 'People', label: 'People', icon: peopleIcon },
    { id: 'Vehicles', label: 'Vehicles', icon: vehiclesIcon },
    { id: 'Cards', label: 'Cards', icon: cardsIcon },
    { id: 'Subscriptions', label: 'Subscriptions', icon: subscriptionsIcon },
    { id: 'Entry Sessions', label: 'Entry Sessions', icon: entryIcon },
    { id: 'Returns', label: 'Returns', icon: returnsIcon },
    { id: 'Pricing', label: 'Pricing', icon: pricingIcon },
    { id: 'Shifts', label: 'Shifts', icon: shiftsIcon },
    { id: 'Reports', label: 'Reports', icon: reportsIcon },
  ];

  const handleNavClick = (label) => {
    setActivePage(label);
    if (onNavClick) {
      onNavClick(label);
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={logoIcon} alt="ParkingPro" />
        </div>
        {!isCollapsed && (
          <div className="sidebar-brand">
            <p className="sidebar-brand-name">ParkingPro</p>
            <p className="sidebar-brand-subtitle">Admin Panel</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activePage === item.label}
            onClick={() => handleNavClick(item.label)}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-footer-button" onClick={onToggleCollapse}>
          <img src={collapseIcon} alt="" />
          {!isCollapsed && <span>Collapse</span>}
        </button>
        <button className="sidebar-footer-button logout" onClick={onLogout}>
          <img src={logoutIcon} alt="" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
