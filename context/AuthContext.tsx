import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { isFirebaseConfigured } from '../config/firebaseKeys';
import { mapAuthError } from '../lib/authErrors';
import { getFirebaseAuth } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      signUp: async (displayName, email, password) => {
        try {
          const credential = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            email.trim(),
            password,
          );
          await updateProfile(credential.user, { displayName: displayName.trim() });
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      logout: async () => {
        await signOut(getFirebaseAuth());
      },
    }),
    [configured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
