import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminHeader from '../components/AdminHeader';
import PeoplePage from './PeoplePage';
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
      case 'People':
        return <PeoplePage />;
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
