import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, getCurrentUserProfile, subscribeAuthProfile } from '../domains/d01_auth';

interface UserContextValue {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {}
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const profile = await getCurrentUserProfile();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    const unsubscribe = subscribeAuthProfile((profile) => {
      setUser(profile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  // Also provide fallback if used outside UserProvider
  const [fallbackUser, setFallbackUser] = useState<UserProfile | null>(context.user);

  useEffect(() => {
    if (!context.user) {
      subscribeAuthProfile(setFallbackUser);
    }
  }, [context.user]);

  if (context.user) {
    return context;
  }

  return {
    user: fallbackUser,
    loading: false,
    refreshUser: async () => {
      const p = await getCurrentUserProfile();
      setFallbackUser(p);
    }
  };
}
