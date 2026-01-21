import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthz } from "../contexts/AuthzContext";
import Sidebar from "../components/Sidebar";
import AdminHeader from "../components/AdminHeader";
import PeoplePage from "./PeoplePage";
import VehiclesPage from "./VehiclesPage";
import PurchaseCardPage from "./PurchaseCardPage";
import CardsPage from "./CardsPage";
import SubscriptionsPage from "./SubscriptionsPage";
import EntrySessionsPage from "./EntrySessionsPage";
import PricingPage from "./PricingPage";
import Dashboard from "./Dashboard";
import ReportsPage from "./ReportsPage";
import ShiftsPage from "./ShiftsPage";
import RolesPage from "./RolesPage";
import SystemConfigPage from "./SystemConfigPage";
import "../styles/pages/AdminLayout.css";
import { useSearchParams } from "react-router-dom";

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();
  const { hasAnyPermission, loading: authzLoading } = useAuthz();

  // Permission map for each page
  const pagePermissions = {
    'Dashboard': ['DASHBOARD.VIEW'],
    'Purchase Card': ['PURCHASE_CARD.FULL'],
    'People': ['PEOPLE.VIEW', 'PEOPLE.FULL', 'PEOPLE.ACCESS_MANAGEMENT_HUB'],
    'Vehicles': ['VEHICLES.VIEW', 'VEHICLES.FULL'],
    'Cards': ['CARDS.VIEW', 'CARDS.FULL'],
    'Subscriptions': ['SUBSCRIPTIONS.VIEW', 'SUBSCRIPTIONS.FULL'],
    'Entry Sessions': ['ENTRY_SESSIONS.VIEW'],
    'Pricing': ['PRICING.VIEW', 'PRICING.FULL'],
    'Shifts': ['SHIFTS.VIEW', 'SHIFTS.FULL'],
    'Reports': ['REPORTS.VIEW'],
    'Roles': ['ROLES.VIEW', 'ROLES.FULL'],
    'System Config': ['SYSTEM_CONFIG.VIEW', 'SYSTEM_CONFIG.FULL'],
  };

  // Get default landing page based on permissions
  const getDefaultPage = () => {
    const pageOrder = [
      'Dashboard',
      'Purchase Card',
      'People',
      'Vehicles',
      'Cards',
      'Subscriptions',
      'Entry Sessions',
      'Pricing',
      'Shifts',
      'Reports',
      'Roles',
      'System Config'
    ];

    for (const page of pageOrder) {
      if (hasAnyPermission(pagePermissions[page] || [])) {
        return page;
      }
    }

    return 'Dashboard'; // fallback
  };

  useEffect(function () {
    const currentTab = searchParams.get("tab");

    if (!currentTab) {
      // Set default landing page based on permissions
      const defaultPage = getDefaultPage();
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("tab", defaultPage);
      setSearchParams(newSearchParams);
    } else {
      // Validate current tab permission
      const requiredPerms = pagePermissions[currentTab];
      if (requiredPerms && !hasAnyPermission(requiredPerms)) {
        // Redirect to default page if no permission
        const defaultPage = getDefaultPage();
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set("tab", defaultPage);
        setSearchParams(newSearchParams);
      }
    }
  }, [searchParams, hasAnyPermission]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
    // Clear all URL params and redirect to root
    window.location.href = '/';
  };

  const handleNavClick = (label) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", label);
    setSearchParams(newSearchParams);
  };

  const renderContent = () => {
    if (children) return children;

    // Show loading while permissions are being fetched
    if (authzLoading) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Arimo, sans-serif', fontSize: '14px', color: '#64748b' }}>
            Loading permissions...
          </p>
        </div>
      );
    }

    const currentTab = searchParams.get("tab");
    const requiredPerms = pagePermissions[currentTab];

    // Check permission before rendering
    if (requiredPerms && !hasAnyPermission(requiredPerms)) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Arimo, sans-serif', fontSize: '20px', color: '#0f172b', marginBottom: '8px' }}>
            Access Denied
          </h2>
          <p style={{ fontFamily: 'Arimo, sans-serif', fontSize: '14px', color: '#64748b' }}>
            You don't have permission to access this page.
          </p>
        </div>
      );
    }

    switch (currentTab) {
      case "Purchase Card":
        return <PurchaseCardPage />;
      case "People":
        return <PeoplePage />;
      case "Vehicles":
        return <VehiclesPage />;
      case "Cards":
        return <CardsPage />;
      case "Subscriptions":
        return <SubscriptionsPage />;
      case "Entry Sessions":
        return <EntrySessionsPage />;
      case "Pricing":
        return <PricingPage />;
      case "Shifts":
        return <ShiftsPage />;
      case "Reports":
        return <ReportsPage />;
      case "Roles":
        return <RolesPage />;
      case "System Config":
        return <SystemConfigPage />;
      case "Dashboard":
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar
        onLogout={handleLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        activeItem={searchParams.get("tab") ?? "Dashboard"}
        onNavClick={handleNavClick}
      />
      <div className="admin-main">
        <AdminHeader title={searchParams.get("tab") ?? "Dashboard"} />
        <main className="admin-content">{renderContent()}</main>
      </div>
    </div>
  );
}
