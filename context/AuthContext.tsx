import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { isFirebaseConfigured } from '../config/firebaseKeys';
import { mapAuthError } from '../lib/authErrors';
import { getFirebaseAuth } from '../lib/firebase';
import { ensureUserProfile } from '../services/userSettings';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  // Mientras se registra, la app se queda en la pantalla de registro hasta que
  // el perfil quede guardado en Firestore (evita entrar sin documento en `users`).
  const [registering, setRegistering] = useState(false);

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
      user: registering ? null : user,
      loading,
      configured,
      signIn: async (email, password) => {
        let credentialUser: User;
        try {
          const credential = await signInWithEmailAndPassword(
            getFirebaseAuth(),
            email.trim(),
            password,
          );
          credentialUser = credential.user;
        } catch (error) {
          throw new Error(mapAuthError(error));
        }

        // Si el usuario se creó antes de existir la colección `users`, se completa aquí.
        try {
          await ensureUserProfile(credentialUser);
        } catch (error) {
          console.warn('No se pudo verificar el perfil del usuario', error);
        }
      },
      signUp: async (displayName, email, password) => {
        setRegistering(true);
        try {
          let newUser: User;
          try {
            const credential = await createUserWithEmailAndPassword(
              getFirebaseAuth(),
              email.trim(),
              password,
            );
            newUser = credential.user;
          } catch (error) {
            throw new Error(mapAuthError(error));
          }

          try {
            await updateProfile(newUser, { displayName: displayName.trim() });
            await ensureUserProfile(newUser, displayName);
          } catch (error) {
            // Revertimos para no dejar una cuenta sin perfil en Firestore.
            await deleteUser(newUser).catch(() => signOut(getFirebaseAuth()));
            console.warn('No se pudo guardar el perfil en Firestore', error);
            throw new Error(
              `No pudimos guardar tu perfil. ${mapAuthError(error)} Inténtalo de nuevo.`,
            );
          }

          sendEmailVerification(newUser).catch((error) => {
            console.warn('No se pudo enviar el correo de verificación', error);
          });
        } finally {
          setRegistering(false);
        }
      },
      resetPassword: async (email) => {
        try {
          await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      logout: async () => {
        await signOut(getFirebaseAuth());
      },
    }),
    [configured, loading, registering, user],
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
