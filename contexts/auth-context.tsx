"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: any | null;
  loading: boolean;
  profile: any | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState(null);
  const loading = status === "loading";
  const user = session?.user || null;

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.email) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    }

    fetchProfile();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
