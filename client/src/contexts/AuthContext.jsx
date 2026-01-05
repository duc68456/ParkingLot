import { useEffect, useMemo, useState } from 'react';
import { createContext, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'admin' or 'staff'

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('auth')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.token && parsed?.user) {
        setToken(parsed.token)
        setUser(parsed.user)
        setUserType(parsed.userType || parsed.user?.type || null)
        setIsAuthenticated(true)
      }
    } catch {
      // ignore corrupted storage
    }
  }, [])

  const login = (userData, type = 'admin', jwtToken = null) => {
    setIsAuthenticated(true)
    setUser(userData)
    setUserType(type)
    setToken(jwtToken)
    try {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ token: jwtToken, user: userData, userType: type })
      )
    } catch {
      // ignore storage full
    }
  };

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    setUserType(null)
    setToken(null)
    try {
      window.localStorage.removeItem('auth')
    } catch {
      // ignore
    }
  };

  const authHeaders = useMemo(() => {
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [token])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, userType, token, authHeaders, login, logout }}>
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
