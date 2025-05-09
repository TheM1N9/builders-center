"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { useNotifications } from "@/contexts/notifications-context";

// Add this to your types/index.ts file if not already present
// export type AdminRole = 'admin' | 'user';

// Add this type if not already in your types/index.ts
type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "review_requested";

type AdminApplication = Application & {
  stars: number;
  creator_user_id?: string;
};

type PendingUser = {
  id: string;
  email: string;
  user_id: string;
};

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<ApplicationStatus>("pending");
  const { toast } = useToast();
  const router = useRouter();
  const { notifications, markAsRead } = useNotifications();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);

  useEffect(() => {
    if (user && profile) {
      checkAdminAccess();
    } else if (!user && !loading) {
      router.push("/login");
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (isAdmin) {
      fetchApplications();
      fetchPendingUsers();

      // Subscribe to new user notifications
      const channel = supabase
        .channel("new_users")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "profiles",
            filter: "approved=eq.false",
          },
          () => {
            fetchPendingUsers();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isAdmin, statusFilter]);

  const checkAdminAccess = async () => {
    try {
      // Check if the profile has admin role directly
      if (profile?.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
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
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          *,
          stars(count),
          creator:profiles!creator_id(user_id)
        `
        )
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedApps = data.map((app: any) => ({
        ...app,
        stars: app.stars[0]?.count || 0,
        creator_user_id: app.creator?.user_id,
      }));

      setApplications(formattedApps);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      const { data: app, error: fetchError } = await supabase
        .from("applications")
        .select("title, creator_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("applications")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Create notification for the application creator
      const notificationType = status === "approved" ? "approval" : "rejection";
      const notificationTitle =
        status === "approved" ? "Application Approved" : "Application Rejected";
      const notificationMessage =
        status === "approved"
          ? `Your application "${app.title}" has been approved and is now public.`
          : `Your application "${app.title}" has been rejected. Please check the requirements and try again.`;

      // console.log("Creating notification for user:", app.creator_id);

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: app.creator_id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          application_id: id,
          action_user_id: profile?.id,
          read: false,
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      setApplications(applications.filter((app) => app.id !== id));

      toast({
        title: "Success",
        description: `Application ${status}`,
      });
    } catch (error) {
      console.error("Error updating application status:", error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      // Update user's approval status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ approved: true })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Get user's email and user_id
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Send approval email through API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'approval',
          userEmail: userData.email,
          userName: userData.user_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send approval email');
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Account Approved',
          message: 'Your account has been approved. You can now access all features.',
          type: 'success',
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Success",
        description: "User approved successfully",
      });
      fetchPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      // Get user's email and user_id before deleting
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Send rejection email through API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'rejection',
          userEmail: userData.email,
          userName: userData.user_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send rejection email');
      }

      // Delete user's profile
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "User rejected successfully",
      });
      fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, user_id")
        .eq("approved", false)
        .returns<PendingUser[]>();

      if (error) throw error;

      setPendingUsers(data || []);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      toast({
        title: "Error",
        description: "Failed to load pending users",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ApplicationStatus)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="review_requested">Review Requested</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {applications.map((app) => (
            <Link href={`/applications/${app.id}`} key={app.id}>
              <Card className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex gap-4">
                  <div className="w-24 h-24 relative rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={app.screenshot_url}
                      alt={app.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{app.title}</h2>
                        <p className="text-sm text-muted-foreground mb-2">
                          by {app.creator_user_id}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {app.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        {(statusFilter === "pending" ||
                          statusFilter === "review_requested") && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusChange(app.id, "approved");
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-red-600 hover:bg-red-700"
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusChange(app.id, "rejected");
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {statusFilter === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              handleStatusChange(app.id, "rejected");
                            }}
                          >
                            Reject
                          </Button>
                        )}
                        {statusFilter === "rejected" && (
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

        {/* Pending Users Section */}
        <Card className="mt-8">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Pending Users</h2>
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{user.user_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRejectUser(user.id)}
                    >
                      Reject
                    </Button>
                    <Button onClick={() => handleApproveUser(user.id)}>
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
              {pendingUsers.length === 0 && (
                <p className="text-muted-foreground">No pending users</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
