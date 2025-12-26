import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import './styles/App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {!isAuthenticated ? <LoginPage /> : <AdminLayout />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
