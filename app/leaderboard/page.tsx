"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Star, Users } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
type LeaderboardApp = {
  id: string;
  title: string;
  description: string;
  image: string;
  score: number;
  stars: number;
  creator_name: string;
  admin_ratings?: { score: number }[];
  review_count: number;
};

export default function Leaderboard() {
  const [apps, setApps] = useState<LeaderboardApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to check the leaderboard",
        variant: "destructive",
      });
      return;
    }
    fetchLeaderboardApps();
    fetchTotalAdmins();
  }, [user, router]);

  const fetchTotalAdmins = async () => {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (error) throw error;
      setTotalAdmins(count || 0);
    } catch (error) {
      console.error("Error fetching total admins:", error);
    }
  };

  const fetchLeaderboardApps = async () => {
    try {
      const { data: apps, error } = await supabase
        .from("applications")
        .select(
          `
          *,
          stars(count),
          creator:profiles!creator_id(user_id, email),
          admin_ratings(score)
        `
        )
        .eq("status", "approved");

      if (error) throw error;

      const formattedApps = apps.map((app) => {
        // Calculate sum of all admin ratings
        const scores =
          app.admin_ratings?.map((rating: any) => rating.score) || [];
        const totalScore = scores.reduce((a: number, b: number) => a + b, 0);

        return {
          id: app.id,
          title: app.title,
          description: app.description,
          image: app.screenshot_url,
          score: Number(totalScore.toFixed(1)), // Round to 1 decimal place
          stars: app.stars[0]?.count || 0,
          creator_name: app.creator?.user_id || "Anonymous",
          review_count: scores.length,
        };
      });

      // Sort apps by total score in descending order
      const sortedApps = formattedApps.sort((a, b) => b.score - a.score);

      setApps(sortedApps);
    } catch (error) {
      console.error("Error fetching leaderboard apps:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-4">
              You need to be logged in to check the leaderboard.
            </p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#ef5a3c] mb-4">
            Leaderboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Top rated applications by our expert reviewers
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading
            ? [...Array(5)].map((_, i) => (
                <Card
                  key={i}
                  className="p-6 animate-pulse bg-card/50 backdrop-blur border-[#ef5a3c]/10"
                >
                  <div className="h-6 w-48 bg-muted rounded mb-4" />
                  <div className="h-4 w-full bg-muted rounded" />
                </Card>
              ))
            : apps.map((app, index) => (
                <Card
                  key={app.id}
                  className="p-6 hover:shadow-xl hover:shadow-[#ef5a3c]/5 transition-all duration-300 border-[#ef5a3c]/10 hover:border-[#ef5a3c]/20 bg-card/50 backdrop-blur"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-[#ef5a3c] w-12">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-1">
                          {app.title}
                        </h3>
                        <Link href={`/users/${app.creator_name}`}>
                          <p className="text-muted-foreground text-sm">
                            by {app.creator_name}
                          </p>
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center text-[#ef5a3c]">
                        <Star className="w-5 h-5 mr-1 fill-[#ef5a3c]" />
                        <span className="font-semibold">{app.stars}</span>
                      </div>
                      <div className="flex items-center text-[#ef5a3c]">
                        <Users className="w-5 h-5 mr-1" />
                        <span className="font-semibold">
                          {app.review_count}/{totalAdmins} reviews
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-[#ef5a3c]">
                        {app.score} points
                      </div>
                      <Button
                        className="bg-[#ef5a3c]/10 text-[#ef5a3c] hover:bg-[#ef5a3c]/20"
                        asChild
                      >
                        <Link href={`/applications/${app.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      </div>
    </div>
  );
}
