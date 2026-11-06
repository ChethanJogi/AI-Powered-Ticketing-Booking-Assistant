import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService.js';
import { db, USE_MOCK } from '../services/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = db.get('user', null);
    // A saved user without a token can't talk to a real backend - make them log in again.
    if (u && !USE_MOCK && !db.get('token', null)) {
      db.remove('user');
      return null;
    }
    return u;
  });

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('ticketai:unauthorized', onExpired);
    return () => window.removeEventListener('ticketai:unauthorized', onExpired);
  }, []);

  const save = (u) => {
    setUser(u);
    u ? db.set('user', u) : db.remove('user');
  };

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password);
    save(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const u = await authService.register(data);
    save(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    db.remove('token');
    save(null);
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      const u = await authService.updateProfile(user.id, patch);
      save(u);
      return u;
    },
    [user]
  );

  const isVendor = user?.role === 'vendor';
  const isOrganizer = user?.role === 'organizer' || isVendor;

  return (
    <AuthContext.Provider
      value={{
        user,
        isVendor,
        isOrganizer,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
