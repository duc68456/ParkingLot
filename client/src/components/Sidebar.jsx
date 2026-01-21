import { useState } from 'react';
import NavItem from './NavItem';
import { useAuthz } from '../contexts/AuthzContext';
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
import SystemConfigIcon from '../assets/icons/system-config.svg?react';
import collapseIcon from '../assets/icons/collapse.svg';
import logoutIcon from '../assets/icons/logout.svg';

export default function Sidebar({ currentPage = 'Dashboard', onLogout, isCollapsed, onToggleCollapse, activeItem, onNavClick }) {
  const [activePage, setActivePage] = useState(activeItem || currentPage);
  const { hasAnyPermission, loading: authzLoading } = useAuthz();

  // Sidebar visibility contract:
  // - VIEW => can see page in sidebar
  // - FULL => can see page + do mutations
  // - Special cases: PURCHASE_CARD requires PURCHASE_CARD.FULL; Roles requires PEOPLE.ACCESS_MANAGEMENT_HUB
  const navPermissions = {
    Dashboard: ['DASHBOARD.VIEW'],
    'Purchase Card': ['PURCHASE_CARD.FULL'],
    People: ['PEOPLE.VIEW', 'PEOPLE.FULL', 'PEOPLE.ACCESS_MANAGEMENT_HUB'],
    Vehicles: ['VEHICLES.VIEW', 'VEHICLES.FULL'],
    Cards: ['CARDS.VIEW', 'CARDS.FULL'],
    Subscriptions: ['SUBSCRIPTIONS.VIEW', 'SUBSCRIPTIONS.FULL'],
    'Entry Sessions': ['ENTRY_SESSIONS.VIEW'],
    Returns: ['CARDS.FULL'],
    Pricing: ['PRICING.VIEW', 'PRICING.FULL'],
    Shifts: ['SHIFTS.VIEW', 'SHIFTS.FULL'],
    Roles: ['ROLES.VIEW', 'ROLES.FULL'],
    'System Config': ['SYSTEM_CONFIG.VIEW', 'SYSTEM_CONFIG.FULL'],
    Reports: ['REPORTS.VIEW']
  };

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
    { id: 'Roles', label: 'Roles', icon: ReportsIcon },
    { id: 'Reports', label: 'Reports', icon: ReportsIcon },
    { id: 'System Config', label: 'System Config', icon: SystemConfigIcon },
  ];

  const visibleNavItems = authzLoading
    ? navItems
    : navItems.filter((item) => hasAnyPermission(navPermissions[item.label] || []));

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
        {visibleNavItems.map((item) => (
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
