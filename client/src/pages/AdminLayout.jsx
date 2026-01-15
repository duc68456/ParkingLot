import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
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
import "../styles/pages/AdminLayout.css";
import { useSearchParams } from "react-router-dom";

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();

  useEffect(function () {
    if (!searchParams.get("tab")) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("tab", "Dashboard");
      setSearchParams(newSearchParams);
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
  };

  const handleNavClick = (label) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", label);
    setSearchParams(newSearchParams);
  };

  const renderContent = () => {
    if (children) return children;

    switch (searchParams.get("tab")) {
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
