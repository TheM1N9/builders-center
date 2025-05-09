"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <Button onClick={handleGoogleLogin} className="w-full">
          Login with Google
        </Button>
        <p className="text-center mt-4 text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <span className="text-primary">Register with Google</span>
        </p>
      </Card>
    </div>
  );
}
