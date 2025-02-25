import NextAuth, { User, Account, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: "jwt" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax" as const,
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    callbacks: {
        async signIn({ user, account, profile, email }: {
            user: User;
            account: Account | null;
            profile?: Profile;
            email?: { verificationRequest?: boolean };
        }) {
            if (!user?.email) return false;

            try {
                // Check if user exists in Supabase by email
                const { data: existingUser, error: fetchError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("email", user.email)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    console.error("Error checking for existing user:", fetchError);
                    return false;
                }

                if (!existingUser) {
                    // Create a new user profile without foreign key constraint
                    const { error: insertError } = await supabase
                        .from("profiles")
                        .insert({
                            id: crypto.randomUUID(), // Generate a UUID for the profile
                            email: user.email,
                            user_id: user.email.split('@')[0], // Simple username from email
                            next_auth_id: user.id,
                            public_email: false,
                            role: 'user'
                        });

                    if (insertError) {
                        console.error("Error creating user profile:", insertError);
                        return false;
                    }
                } else if (!existingUser.next_auth_id) {
                    // Update existing user with NextAuth ID
                    const { error: updateError } = await supabase
                        .from("profiles")
                        .update({ next_auth_id: user.id })
                        .eq("id", existingUser.id);

                    if (updateError) {
                        console.error("Error updating user profile:", updateError);
                        return false;
                    }
                }

                return true;
            } catch (error) {
                console.error("Error in signIn callback:", error);
                return false;
            }
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session?.user) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }: { token: any; user: any }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
        error: "/error",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };