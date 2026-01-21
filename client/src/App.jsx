import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthzProvider } from './contexts/AuthzContext';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import StaffGatePage from './pages/StaffGatePage';
import ExitGatePage from './pages/ExitGatePage';
import './styles/App.css';

function AppContent() {
  const { isAuthenticated, user, getStaffGateType } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Route based on user type
  if (user?.type === 'staff') {
    const gateType = getStaffGateType();
    return gateType === 'exit' ? <ExitGatePage /> : <StaffGatePage />;
  }

  return <AdminLayout />;
}

function App() {
  return (
    <AuthProvider>
      <AuthzProvider>
        <AppContent />
      </AuthzProvider>
    </AuthProvider>
  );
}

export default App
