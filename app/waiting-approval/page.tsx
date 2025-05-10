"use client";

import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function WaitingApprovalPage() {
  const { user, profile, isApproved } = useAuth();
  const router = useRouter();

  useEffect(() => {
      // When the user becomes *both* authenticated *and* approved → go home
      if (user && isApproved) {
        router.push("/");
      }
    }, [user, isApproved, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // let the effect below handle navigation instead of pushing in render
  if (!user) return null;
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">Waiting for Approval</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for registering! Your account is currently pending
            approval by an administrator. We will notify you once your account
            has been approved.
          </p>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Logged in as: {profile?.email}
            </p>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
