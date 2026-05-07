import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: any | null; 
  session: Session | null;
  loading: boolean;
  loginLocal: (userData: any) => void; 
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for Local Database User first
    const savedLocalUser = localStorage.getItem("user");
    if (savedLocalUser) {
      try {
        const parsedUser = JSON.parse(savedLocalUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse local user", e);
        localStorage.removeItem("user");
      }
    }

    // 2. Listen for Supabase Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      } else if (!localStorage.getItem("user")) {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // 3. Check Supabase session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Updated to ensure the full user object (with full_name) is saved
  const loginLocal = (userData: any) => {
    // This stores the object including 'full_name' into browser storage
    localStorage.setItem("user", JSON.stringify(userData));
    // This updates the state so RoleContext and Dashboard see the name immediately
    setUser(userData);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, loginLocal, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};