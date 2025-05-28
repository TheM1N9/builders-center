"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

type Application = {
  id: string;
  title: string;
  description: string;
  image: string;
  score: number;
  creator_name: string;
  admin_ratings?: { score: number }[];
};

export default function ScoreApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: apps, error } = await supabase
        .from("applications")
        .select(
          `
          *,
          creator:profiles!creator_id(user_id, email),
          admin_ratings(score)
        `
        )
        .eq("status", "approved");

      if (error) throw error;

      const formattedApps = apps.map((app) => {
        // Get the current admin's rating if it exists
        const currentAdminRating = app.admin_ratings?.find(
          (rating: any) => rating.admin_id === profile?.id
        );

        return {
          id: app.id,
          title: app.title,
          description: app.description,
          image: app.screenshot_url,
          score: currentAdminRating?.score || 0,
          creator_name: app.creator?.user_id || "Anonymous",
          admin_ratings: app.admin_ratings,
        };
      });

      setApps(formattedApps);
      // Initialize scores with current admin's ratings
      const initialScores = formattedApps.reduce(
        (acc, app) => {
          acc[app.id] = app.score.toString();
          return acc;
        },
        {} as { [key: string]: string }
      );
      setScores(initialScores);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (appId: string, value: string) => {
    // Only allow numbers between 0 and 10
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 10) {
      return;
    }
    setScores((prev) => ({ ...prev, [appId]: value }));
  };

  const handleSubmit = async (appId: string) => {
    try {
      const score = parseFloat(scores[appId]);
      if (isNaN(score) || score < 0 || score > 10) {
        toast({
          title: "Invalid Score",
          description: "Score must be between 0 and 10",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("admin_ratings").upsert(
        {
          application_id: appId,
          admin_id: profile?.id,
          score,
        },
        {
          onConflict: "application_id,admin_id",
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Score updated successfully",
      });

      // Refresh the applications list
      await fetchApplications();
    } catch (error) {
      console.error("Error updating score:", error);
      toast({
        title: "Error",
        description: "Failed to update score",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#ef5a3c] mb-4">
            Score Applications
          </h1>
          <p className="text-xl text-muted-foreground">
            Review and score applications (0-10)
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
            : apps.map((app) => (
                <Card
                  key={app.id}
                  className="p-6 hover:shadow-xl hover:shadow-[#ef5a3c]/5 transition-all duration-300 border-[#ef5a3c]/10 hover:border-[#ef5a3c]/20 bg-card/50 backdrop-blur"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">
                        {app.title}
                      </h3>
                      <Link href={`/users/${app.creator_name}`}>
                        <p className="text-muted-foreground text-sm mb-2 hover:text-[#ef5a3c]">
                          by {app.creator_name}
                        </p>
                      </Link>
                      <p className="text-muted-foreground">{app.description}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-6">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={scores[app.id]}
                          onChange={(e) =>
                            handleScoreChange(app.id, e.target.value)
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">/10</span>
                      </div>
                      <Button
                        onClick={() => handleSubmit(app.id)}
                        className="bg-[#ef5a3c] hover:bg-[#ef5a3c]/90"
                      >
                        Update Score
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[#ef5a3c] text-[#ef5a3c] hover:bg-[#ef5a3c]/10"
                        asChild
                      >
                        <Link href={`/applications/${app.id}`}>View App</Link>
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
