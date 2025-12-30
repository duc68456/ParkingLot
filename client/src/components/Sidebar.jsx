import { useState } from 'react';
import NavItem from './NavItem';
import '../styles/components/Sidebar.css';

import logoIcon from '../assets/icons/logo.svg';
import DashboardIcon from '../assets/icons/dashboard.svg?react';
import PurchaseIcon from '../assets/icons/purchase-card.svg?react';
import PeopleIcon from '../assets/icons/people.svg?react';
import VehiclesIcon from '../assets/icons/vehicles.svg?react';
import CardsIcon from '../assets/icons/cards.svg?react';
import SubscriptionsIcon from '../assets/icons/subscriptions.svg?react';
import EntryIcon from '../assets/icons/entry-sessions.svg?react';
import ReturnsIcon from '../assets/icons/returns.svg?react';
import PricingIcon from '../assets/icons/pricing.svg?react';
import ShiftsIcon from '../assets/icons/shifts.svg?react';
import ReportsIcon from '../assets/icons/reports.svg?react';
import collapseIcon from '../assets/icons/collapse.svg';
import logoutIcon from '../assets/icons/logout.svg';

export default function Sidebar({ currentPage = 'Dashboard', onLogout, isCollapsed, onToggleCollapse, activeItem, onNavClick }) {
  const [activePage, setActivePage] = useState(activeItem || currentPage);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'Purchase Card', label: 'Purchase Card', icon: PurchaseIcon },
    { id: 'People', label: 'People', icon: PeopleIcon },
    { id: 'Vehicles', label: 'Vehicles', icon: VehiclesIcon },
    { id: 'Cards', label: 'Cards', icon: CardsIcon },
    { id: 'Subscriptions', label: 'Subscriptions', icon: SubscriptionsIcon },
    { id: 'Entry Sessions', label: 'Entry Sessions', icon: EntryIcon },
    { id: 'Returns', label: 'Returns', icon: ReturnsIcon },
    { id: 'Pricing', label: 'Pricing', icon: PricingIcon },
    { id: 'Shifts', label: 'Shifts', icon: ShiftsIcon },
    { id: 'Reports', label: 'Reports', icon: ReportsIcon },
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
