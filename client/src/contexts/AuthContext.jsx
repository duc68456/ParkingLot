import { useState } from 'react';
import { createContext, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'admin' or 'staff'

  const login = (userData, type = 'admin') => {
    setIsAuthenticated(true);
    setUser(userData);
    setUserType(type);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, userType, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
