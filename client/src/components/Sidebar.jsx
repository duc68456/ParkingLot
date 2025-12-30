import { useState } from 'react';
import NavItem from './NavItem';
import '../styles/components/Sidebar.css';

import logoIcon from '../assets/icons/logo.svg';
import dashboardIcon from '../assets/icons/dashboard.svg';
import purchaseIcon from '../assets/icons/purchase-card.svg';
import peopleIcon from '../assets/icons/people.svg';
import vehiclesIcon from '../assets/icons/vehicles.svg';
import cardsIcon from '../assets/icons/cards.svg';
import subscriptionsIcon from '../assets/icons/subscriptions.svg';
import entryIcon from '../assets/icons/entry-sessions.svg';
import returnsIcon from '../assets/icons/returns.svg';
import pricingIcon from '../assets/icons/pricing.svg';
import shiftsIcon from '../assets/icons/shifts.svg';
import reportsIcon from '../assets/icons/reports.svg';
import collapseIcon from '../assets/icons/collapse.svg';
import logoutIcon from '../assets/icons/logout.svg';

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
