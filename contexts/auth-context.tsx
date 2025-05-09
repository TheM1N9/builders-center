"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function ensureProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // 1. Check for a profile with the current UID
      let { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // 2. If not found, check for a profile with the same email (old UUID)
      if (!existing) {
        const { data: oldProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();

        if (oldProfile) {
          // 3. Migrate: update the id to the new UID
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ id: user.id })
            .eq("email", user.email);

          if (updateError) {
            console.error("Error migrating profile:", updateError);
          } else {
            existing = { ...oldProfile, id: user.id };
          }
        } else {
          // 4. If no profile, create a new one
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email,
              user_id: user.user_metadata?.user_id || user.email?.split("@")[0],
              role: "user",
              public_email: true,
            });
          if (insertError) {
            console.error("Error creating profile:", insertError);
          } else {
            existing = {
              id: user.id,
              email: user.email,
              user_id: user.user_metadata?.user_id || user.email?.split("@")[0],
              role: "user",
              public_email: true,
            };
          }
        }
      }

      setProfile(existing);
      setLoading(false);
    }

    ensureProfile();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
