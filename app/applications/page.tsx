"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import type { Application } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ApplicationWithProfile = Application & {
  likes: number;
  isLiked: boolean;
  creator_user_id?: string;
  creator?: {
    user_id: string;
    role?: string;
  };
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      app.title.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      app.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const fetchApplications = async () => {
    try {
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          *,
          likes:likes(count),
          creator:profiles!creator_id(
            user_id,
            role
          )
        `
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;

      let userLikes: string[] = [];
      if (user) {
        const { data: likes, error: likesError } = await supabase
          .from("likes")
          .select("application_id")
          .eq("user_id", user.id);

        if (!likesError && likes) {
          userLikes = likes.map((like) => like.application_id);
        }
      }

      const formattedApps: ApplicationWithProfile[] = (apps || []).map(
        (app) => ({
          ...app,
          likes: app.likes[0]?.count || 0,
          isLiked: userLikes.includes(app.id),
          creator_user_id: app.creator?.user_id,
          creator: {
            user_id: app.creator?.user_id || "",
            role: app.creator?.role,
          },
        })
      );

      setApplications(formattedApps);
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

  const handleLike = async (id: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like applications",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("application_id", id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ application_id: id, user_id: user.id });
      }

      setApplications((apps) =>
        apps.map((app) =>
          app.id === id
            ? {
                ...app,
                likes: isLiked ? app.likes - 1 : app.likes + 1,
                isLiked: !isLiked,
              }
            : app
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="h-[200px] w-full bg-muted animate-pulse rounded-lg mb-4" />
                <div className="h-4 w-3/4 bg-muted animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {searchQuery
              ? "No applications found matching your search."
              : "No applications found. Be the first to submit one!"}
          </div>
        ) : (
          <>
            {/* Admin Applications Section */}
            {filteredApplications.some(
              (app) => app.creator?.role === "admin"
            ) && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Featured Apps</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredApplications
                    .filter((app) => app.creator?.role === "admin")
                    .map((app) => (
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
                                <div className="flex items-center gap-2">
                                  {app.creator?.role === "admin" && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Admin⚡
                                    </Badge>
                                  )}
                                </div>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleLike(app.id, app.isLiked);
                                  }}
                                  className={app.isLiked ? "text-red-500" : ""}
                                >
                                  <Heart
                                    className={`h-4 w-4 mr-1 ${
                                      app.isLiked ? "fill-current" : ""
                                    }`}
                                  />
                                  <span className="text-xs">{app.likes}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(app.url, "_blank");
                                  }}
                                  className="text-xs"
                                >
                                  Visit{" "}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Regular Applications Section */}
            {filteredApplications.some(
              (app) => app.creator?.role !== "admin"
            ) && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Community Apps</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredApplications
                    .filter((app) => app.creator?.role !== "admin")
                    .map((app) => (
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
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/users/${app.creator_user_id}`}
                                    className="text-xs text-muted-foreground hover:text-primary whitespace-nowrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    @{app.creator_user_id}
                                  </Link>
                                </div>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleLike(app.id, app.isLiked);
                                  }}
                                  className={app.isLiked ? "text-red-500" : ""}
                                >
                                  <Heart
                                    className={`h-4 w-4 mr-1 ${
                                      app.isLiked ? "fill-current" : ""
                                    }`}
                                  />
                                  <span className="text-xs">{app.likes}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(app.url, "_blank");
                                  }}
                                  className="text-xs"
                                >
                                  Visit{" "}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
