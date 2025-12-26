import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminHeader from '../components/AdminHeader';
import PeoplePage from './PeoplePage';
import VehiclesPage from './VehiclesPage';
import PurchaseCardPage from './PurchaseCardPage';
import CardsPage from './CardsPage';
import SubscriptionsPage from './SubscriptionsPage';
import EntrySessionsPage from './EntrySessionsPage';
import PricingPage from './PricingPage';
import '../styles/pages/AdminLayout.css';

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('Dashboard');
  const { logout } = useAuth();

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
  };

  const handleNavClick = (label) => {
    setActiveView(label);
  };

  const renderContent = () => {
    if (children) return children;
    
    switch (activeView) {
      case 'Purchase Card':
        return <PurchaseCardPage />;
      case 'People':
        return <PeoplePage />;
      case 'Vehicles':
        return <VehiclesPage />;
      case 'Cards':
        return <CardsPage />;
      case 'Subscriptions':
        return <SubscriptionsPage />;
      case 'Entry Sessions':
        return <EntrySessionsPage />;
      case 'Pricing':
        return <PricingPage />;
      case 'Dashboard':
      default:
        return <h1>Dashboard Content</h1>;
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar 
        onLogout={handleLogout} 
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        activeItem={activeView}
        onNavClick={handleNavClick}
      />
      <div className="admin-main">
        <AdminHeader title={activeView} />
        <main className="admin-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
