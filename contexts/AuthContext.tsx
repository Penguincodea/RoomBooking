import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '../services/firebase';
import type { AuthContextValue, UserProfile } from '../types/user';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<NonNullable<AuthContextValue['user']> | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let active = true;
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (nextUser) => {
      stopProfile?.();
      stopProfile = undefined;
      if (!active) return;
      setUser(nextUser);
      setProfile(null);
      setProfileError('');

      if (!nextUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      stopProfile = onSnapshot(
        doc(db, 'users', nextUser.uid),
        (snapshot) => {
          if (!active) return;
          if (!snapshot.exists()) {
            setProfile(null);
            setLoading(false);
            return;
          }
          const data = snapshot.data();
          if (data.role === 'guest' || data.role === 'manager') {
            setProfile({
              uid: nextUser.uid,
              email: typeof data.email === 'string' ? data.email : nextUser.email ?? '',
              displayName: typeof data.displayName === 'string' ? data.displayName : '',
              role: data.role,
            });
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          if (!active) return;
          setProfileError(error.message || 'Không đọc được hồ sơ vai trò.');
          setLoading(false);
        },
      );
    });

    return () => {
      active = false;
      stopProfile?.();
      stopAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
