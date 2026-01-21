import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const AuthzContext = createContext(null);

const normalizePermissions = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from(
    new Set(list.map((p) => String(p || '').trim().toUpperCase()).filter(Boolean))
  );
};

export function AuthzProvider({ children }) {
  const { authHeaders, user } = useAuth();

  const tokenPermissions = useMemo(() => {
    return normalizePermissions(user?.permissions || user?.Permissions || []);
  }, [user]);

  const [permissions, setPermissions] = useState(tokenPermissions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/authz/me`, { headers: authHeaders });
        if (!res.ok) throw new Error('Failed to load authz');
        const json = await res.json();
        const perms = normalizePermissions(json?.data?.permissions || json?.permissions || []);
        if (!cancelled) setPermissions(perms.length ? perms : tokenPermissions);
      } catch {
        if (!cancelled) setPermissions(tokenPermissions);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // If not logged in yet, consider authz loaded.
    if (!authHeaders?.Authorization) {
      setPermissions(tokenPermissions);
      setLoading(false);
      return;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, tokenPermissions]);

  const hasPermission = (code) => {
    if (!code) return true;
    if (loading) return true; // don't block UI while loading; backend is source of truth
    const normalized = String(code).trim().toUpperCase();
    return permissions.includes(normalized);
  };

  const hasAnyPermission = (codes) => {
    const list = Array.isArray(codes) ? codes : [];
    if (!list.length) return true;
    if (loading) return true;
    return list.some((c) => hasPermission(c));
  };

  const value = useMemo(
    () => ({ permissions, loading, hasPermission, hasAnyPermission }),
    [permissions, loading]
  );

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>;
}

export function useAuthz() {
  const ctx = useContext(AuthzContext);
  if (!ctx) throw new Error('useAuthz must be used within an AuthzProvider');
  return ctx;
}
