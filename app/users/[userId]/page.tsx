"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Application } from "@/types";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

type UserProfile = {
  user_id: string;
  email: string;
  public_email: boolean;
  applications: (Application & { likes: number })[];
};

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          user_id,
          email,
          public_email,
          applications!applications_creator_id_fkey (
            id,
            title,
            description,
            url,
            screenshot_url,
            tags,
            status,
            created_at,
            likes:likes(count)
          )
        `
        )
        .eq("user_id", userId)
        .eq("applications.status", "approved")
        .single();

      if (profileError) throw profileError;

      // Format the applications data
      const formattedApps = (profileData.applications || []).map(
        (app: any) => ({
          ...app,
          likes: app.likes[0]?.count || 0,
        })
      );

      setProfile({
        user_id: profileData.user_id,
        email: profileData.email,
        public_email: profileData.public_email,
        applications: formattedApps,
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-muted-foreground">
              The user you're looking for doesn't exist.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Profile Card */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">@{profile.user_id}</h1>
                {profile.public_email && (
                  <p className="text-muted-foreground mt-2">
                    <span className="font-medium">Email:</span> {profile.email}
                  </p>
                )}
                <p className="text-muted-foreground mt-1">
                  <span className="font-medium">Applications:</span>{" "}
                  {profile.applications.length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Applications Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Applications</h2>

          {profile.applications.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                This user hasn't submitted any applications yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profile.applications.map((app) => (
                <Link
                  href={`/applications/${app.id}`}
                  key={app.id}
                  className="block group"
                >
                  <Card className="overflow-hidden w-full max-w-[280px] justify-self-center transition-transform hover:scale-[1.02] h-[370px]">
                    <div className="flex flex-col h-full">
                      <div className="relative w-full aspect-square max-h-[200px]">
                        <Image
                          src={app.screenshot_url}
                          alt={app.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-3 flex flex-col h-[200px]">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-semibold text-base line-clamp-1 group-hover:text-primary">
                            {app.title}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs px-2 py-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {app.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{app.tags.length - 3}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {app.description}
                        </p>

                        <div className="flex justify-between items-center mt-auto">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Heart className="h-4 w-4" />
                            <span>{app.likes}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(app.url, "_blank");
                            }}
                            className="text-xs"
                          >
                            Visit <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
