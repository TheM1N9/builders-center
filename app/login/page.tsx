"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const redirectTo = `${window.location.origin}/profile`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <Button
          onClick={handleGoogleLogin}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Logging in ..." : "Login with Google"}
        </Button>
        <p className="text-center mt-4 text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <span
            className="text-primary cursor-pointer hover:underline"
            onClick={() => router.push("/register")}
          >
            Register
          </span>
        </p>
      </Card>
    </div>
  );
}
