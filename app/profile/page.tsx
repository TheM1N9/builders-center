"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Pencil,
  Trash2,
  Save,
  X,
  Mail,
  User,
  Check,
  RefreshCw,
  Heart,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import type { Application } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Profile = {
  user_id: string;
  email: string;
  public_email: boolean;
};

type ProfileApplication = Application & {
  likes: number;
  creator?: {
    user_id: string;
    role?: string;
  };
};

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [myApplications, setMyApplications] = useState<ProfileApplication[]>(
    []
  );
  const [likedApplications, setLikedApplications] = useState<
    ProfileApplication[]
  >([]);
  const [commentedApplications, setCommentedApplications] = useState<
    ProfileApplication[]
  >([]);
  const [activeTab, setActiveTab] = useState<"my" | "liked" | "commented">(
    "my"
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUserId, setEditedUserId] = useState("");
  const [editedPublicEmail, setEditedPublicEmail] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      // console.log("Profile data:", profile);
      setMyProfile(profile);
      setEditedUserId(profile.user_id || "");
      setEditedPublicEmail(profile.public_email || false);
      fetchUserData();
    } else if (!user && !loading) {
      router.push("/login");
    }
  }, [user, profile, loading]);

  const fetchUserData = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Fetch user's applications
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          *,
          likes(count)
        `
        )
        .eq("creator_id", profile.id)
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;

      // Fetch liked applications
      const { data: likedApps, error: likedError } = await supabase
        .from("likes")
        .select(
          `
          application_id,
          applications!inner(
            *,
            likes(count),
            profiles!inner(user_id)
          )
        `
        )
        .eq("user_id", profile.id);

      if (likedError) throw likedError;

      // Fetch commented applications
      const { data: commentedApps, error: commentedError } = await supabase
        .from("comments")
        .select(
          `
          application_id,
          applications!inner(
            *,
            likes(count),
            profiles!inner(user_id)
          )
        `
        )
        .eq("user_id", profile.id);

      if (commentedError) throw commentedError;

      // Format applications
      const formattedApps = (apps || []).map((app) => ({
        ...app,
        likes: app.likes[0]?.count || 0,
      }));

      // Format liked applications
      const formattedLikedApps = (likedApps || []).map((item: any) => ({
        ...item.applications,
        likes: item.applications.likes?.[0]?.count || 0,
        creator_user_id: item.applications.profiles?.user_id,
      }));

      // Format commented applications (removing duplicates)
      const commentedAppIds = new Set();
      const formattedCommentedApps = (commentedApps || [])
        .filter((item: any) => {
          if (commentedAppIds.has(item.application_id)) return false;
          commentedAppIds.add(item.application_id);
          return true;
        })
        .map((item: any) => ({
          ...item.applications,
          likes: item.applications.likes?.[0]?.count || 0,
          creator_user_id: item.applications.profiles?.user_id,
        }));

      setMyApplications(formattedApps);
      setLikedApplications(formattedLikedApps);
      setCommentedApplications(formattedCommentedApps);
    } catch (error) {
      // console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load your profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    try {
      // console.log("Updating profile with ID:", profile.id);
      // console.log("New values:", {
      //   user_id: editedUserId,
      //   public_email: editedPublicEmail,
      // });

      const { error } = await supabase
        .from("profiles")
        .update({
          user_id: editedUserId,
          public_email: editedPublicEmail,
        })
        .eq("id", profile.id);

      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }

      // Update local state
      setMyProfile({
        ...myProfile!,
        user_id: editedUserId,
        public_email: editedPublicEmail,
      });

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id)
        .eq("creator_id", profile.id);

      if (error) throw error;

      setMyApplications(myApplications.filter((app) => app.id !== id));
      toast({
        title: "Success",
        description: "Application deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return null;
  }

  if (loading && !profile) {
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
        <Card className="mb-8">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">My Profile</h1>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={!editedUserId.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedUserId(profile?.user_id || "");
                      setEditedPublicEmail(profile?.public_email || false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Username</span>
                </div>
                {isEditing ? (
                  <Input
                    value={editedUserId}
                    onChange={(e) => setEditedUserId(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <p className="font-medium">@{profile?.user_id}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedPublicEmail}
                      onCheckedChange={setEditedPublicEmail}
                      className="scale-75"
                    />
                  ) : (
                    <Badge
                      variant={profile?.public_email ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {profile?.public_email ? "Public" : "Private"}
                    </Badge>
                  )}
                </div>
                <p className="font-medium">{profile?.email}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "my" ? "default" : "outline"}
            onClick={() => setActiveTab("my")}
          >
            My Applications ({myApplications.length})
          </Button>
          <Button
            variant={activeTab === "liked" ? "default" : "outline"}
            onClick={() => setActiveTab("liked")}
          >
            Liked ({likedApplications.length})
          </Button>
          <Button
            variant={activeTab === "commented" ? "default" : "outline"}
            onClick={() => setActiveTab("commented")}
          >
            Commented ({commentedApplications.length})
          </Button>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {(activeTab === "my"
            ? myApplications
            : activeTab === "liked"
            ? likedApplications
            : commentedApplications
          ).map((app) => (
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
                      <Badge
                        variant={
                          app.status === "approved" ? "default" : "secondary"
                        }
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

        {/* Empty State */}
        {((activeTab === "my" && myApplications.length === 0) ||
          (activeTab === "liked" && likedApplications.length === 0) ||
          (activeTab === "commented" &&
            commentedApplications.length === 0)) && (
          <div className="text-center text-muted-foreground py-12">
            No applications found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
