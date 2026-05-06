'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { authService } from '../services/authService';
import { AuthUser } from '../types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          console.log('🔐 Firebase user detected:', firebaseUser.email);
          const verifyRes = await authService.verifyToken();
          console.log('✅ Verify response:', verifyRes);

          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const companyId = tokenResult.claims.company_id as string || '';
          const employeeId = tokenResult.claims.employee_id as string || '';

          // Check Firestore for role if not in token claims
          let role = verifyRes.role as 'admin' | 'employee';
          if (!role || role === 'employee') {
            // Check if this email matches any company admin_email
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/role-check?email=${firebaseUser.email}`);
            if (res.ok) {
              const data = await res.json();
              role = data.role || 'employee';
            }
          }

          console.log('👤 User role:', role);

          setUser({
            uid: verifyRes.uid || firebaseUser.uid,
            email: verifyRes.email || firebaseUser.email || '',
            role,
            companyId,
            employeeId,
            displayName: firebaseUser.displayName || undefined,
          });

          // Redirect based on role
          if (role === 'admin') {
            console.log('➡️ Redirecting to /dashboard');
            router.push('/dashboard');
          } else {
            console.log('➡️ Redirecting to /chat');
            router.push('/chat');
          }

        } catch (error) {
          console.error('❌ Auth verification failed', error);
          setUser(null);
        }
      } else {
        console.log('🚪 No firebase user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    console.log('🔑 Attempting login for:', email);
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
