"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import type { Application } from "@/types";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

// Add this to your types/index.ts file if not already present
// export type AdminRole = 'admin' | 'user';

// Add this type if not already in your types/index.ts
type ApplicationStatus = "pending" | "approved" | "rejected";

type AdminApplication = Application & {
  likes: number;
  creator_user_id?: string;
  review_requested_at?: string | null;
  reviewed_at?: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin && user) {
      fetchApplications();
    }
  }, [isAdmin, user, statusFilter]);

  const checkAdminAccess = async () => {
    try {
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!existingProfile) {
        toast({
          title: "Access Denied",
          description: "Profile not found",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      if (existingProfile?.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin panel",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error in admin check:", error);
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      let query = supabase
        .from("applications")
        .select(
          `
          *,
          likes(count),
          profiles!creator_id (
            user_id
          )
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: apps, error: appsError } = await query;

      if (appsError) throw appsError;

      const formattedApps = apps.map((app) => ({
        ...app,
        likes: app.likes[0]?.count || 0,
        creator_user_id: app.profiles?.user_id,
      }));

      setApplications(formattedApps);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
      const updateData = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        review_requested_at: null,
      } as const;

      const { error } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", applicationId);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, ...updateData } : app
        )
      );

      toast({
        title: "Success",
        description: `Application ${newStatus} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin || loading) {
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-2">
              {applications.length} application
              {applications.length !== 1 ? "s" : ""}{" "}
              {statusFilter !== "all" ? `${statusFilter}` : ""}
            </p>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Applications</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {applications.map((app) => (
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
                      <div className="flex-1">
                        <p className="font-semibold text-base line-clamp-1 group-hover:text-primary">
                          {app.title}
                        </p>
                        <Link
                          href={`/users/${app.creator_user_id}`}
                          className="text-xs text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{app.creator_user_id}
                        </Link>
                      </div>
                      <Badge
                        variant={
                          app.status === "approved"
                            ? "default"
                            : app.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                        className="shrink-0"
                      >
                        {app.status}
                      </Badge>
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
                      <div className="text-sm text-muted-foreground">
                        {app.likes} likes
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(app.url, "_blank");
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {app.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusChange(app.id, "approved");
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusChange(app.id, "rejected");
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {app.status === "rejected" &&
                          app.review_requested_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusChange(app.id, "pending");
                              }}
                            >
                              Review Again
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No applications found with the selected status.
          </div>
        )}
      </div>
    </div>
  );
}
