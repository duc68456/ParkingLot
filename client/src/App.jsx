import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import StaffGatePage from './pages/StaffGatePage';
import './styles/App.css';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Route based on user type
  if (user?.type === 'staff') {
    return <StaffGatePage />;
  }

  return <AdminLayout />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
