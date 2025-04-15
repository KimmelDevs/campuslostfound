'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  logout as firebaseLogout,
  onAuthStateChange
} from '@/lib/auth';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      await firebaseSignIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email, password) => {
    try {
      await firebaseSignUp(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}