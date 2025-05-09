"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: any | null;
  loading: boolean;
  profile: any | null;
  isApproved: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  isApproved: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setIsApproved(false);
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
        setIsApproved(false);
        setLoading(false);
        return;
      }

      try {
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
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email,
                user_id:
                  user.user_metadata?.user_id || user.email?.split("@")[0],
                role: "user",
                public_email: true,
                approved: false, // New users are not approved by default
              })
              .select()
              .single();

            if (insertError) {
              console.error("Error creating profile:", insertError);
              throw insertError;
            } else {
              existing = newProfile;

              // Notify admins about new user registration
              const { data: admins } = await supabase
                .from("profiles")
                .select("id")
                .eq("role", "admin");

              if (admins && admins.length > 0) {
                const notifications = admins.map((admin) => ({
                  user_id: admin.id,
                  type: "new_user",
                  title: "New User Registration",
                  message: `New user ${existing.user_id} (${existing.email}) has registered and needs approval.`,
                  read: false,
                }));

                await supabase.from("notifications").insert(notifications);
              }
            }
          }
        }

        if (!existing) {
          throw new Error("Failed to create or find profile");
        }

        setProfile(existing);
        setIsApproved(existing.approved);

        // Redirect unapproved users to the waiting page
        if (!existing.approved && existing.role !== "admin") {
          router.push("/waiting-approval");
        }
      } catch (error) {
        console.error("Error in ensureProfile:", error);
        toast({
          title: "Error",
          description:
            "Failed to load profile. Please try logging out and back in.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    ensureProfile();
  }, [user, router]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, isApproved }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
