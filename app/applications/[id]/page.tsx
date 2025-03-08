"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Heart,
  RefreshCw,
  Pencil,
  Trash2,
  Share2,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Application } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { CommentSection } from "@/components/comment-section";

type Reply = {
  id: string;
  content: string;
  created_at: string;
  user: {
    user_id: string;
  };
};

// Raw data type from Supabase
type SupabaseRawComment = {
  id: string;
  content: string;
  created_at: string;
  user: {
    user_id: string;
    email: string;
  };
  replies: {
    id: string;
    content: string;
    created_at: string;
    user: {
      user_id: string;
      email: string;
    };
  }[];
};

// Our desired formatted type
type Comment = {
  id: string;
  content: string;
  created_at: string;
  user: {
    user_id: string;
    email: string;
  };
  replies: {
    id: string;
    content: string;
    created_at: string;
    user: {
      user_id: string;
      email: string;
    };
  }[];
};

type ApplicationWithDetails = Application & {
  likes: number;
  isLiked: boolean;
  creator_user_id?: string;
  creator?: {
    user_id: string;
    role?: string;
  };
  comments: Comment[];
  comments_enabled: boolean;
  review_requested_at?: string | null;
};

export default function ApplicationPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationWithDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUserCreator, setIsUserCreator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id, profile]);

  const fetchApplication = async () => {
    try {
      // First check admin status directly within this function
      let adminStatus = false;
      if (profile) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", profile.id)
          .single();

        if (!profileError) {
          adminStatus = profileData?.role === "admin";
          setIsAdmin(adminStatus); // Update the state for use elsewhere
        }
      }

      const { data: app, error: appError } = await supabase
        .from("applications")
        .select(
          `
          *,
          likes(count),
          creator:profiles!creator_id(user_id, role)
        `
        )
        .eq("id", id)
        .single();

      if (appError) throw appError;

      // Check if application exists
      if (!app) {
        toast({
          title: "Error",
          description: "Application not found",
          variant: "destructive",
        });
        router.push("/applications");
        return;
      }

      // Access control logic
      const isCreator = profile?.id === app.creator_id;
      setIsUserCreator(isCreator);

      // Use the directly fetched admin status for access control
      if (app.status !== "approved" && !isCreator && !adminStatus) {
        toast({
          title: "Access Denied",
          description: "This application is not publicly available",
          variant: "destructive",
        });
        router.push("/applications");
        return;
      }

      // Get user's like status if logged in
      let isLiked = false;
      if (profile) {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("application_id", id)
          .eq("user_id", profile.id)
          .single();
        isLiked = !!likeData;
      }

      // Updated comment query to include user profile information
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          user:profiles!inner(
            user_id,
            email
          ),
          replies:comment_replies(
            id,
            content,
            created_at,
            user:profiles!inner(
              user_id,
              email
            )
          )
        `
        )
        .eq("application_id", id)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Add console.log to see the actual data structure
      // console.log("Raw comments data:", commentsData);

      // Format the comments with proper user information
      const formattedComments: Comment[] =
        (commentsData as unknown as SupabaseRawComment[])?.map((comment) => {
          if (!comment.user) {
            // console.error("Missing user data for comment:", comment);
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              user: {
                user_id: "deleted-user",
                email: "deleted@user.com",
              },
              replies: comment.replies
                .filter((reply) => reply.user)
                .map((reply) => ({
                  id: reply.id,
                  content: reply.content,
                  created_at: reply.created_at,
                  user: reply.user || {
                    user_id: "deleted-user",
                    email: "deleted@user.com",
                  },
                })),
            };
          }

          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            user: comment.user,
            replies: comment.replies
              .filter((reply) => reply.user)
              .map((reply) => ({
                id: reply.id,
                content: reply.content,
                created_at: reply.created_at,
                user: reply.user,
              })),
          };
        }) || [];

      setComments(formattedComments);

      setApplication({
        ...app,
        likes: app.likes[0]?.count || 0,
        isLiked,
        creator_user_id: app.creator?.user_id,
        comments_enabled: app.comments_enabled,
      });
    } catch (error: any) {
      // console.error("Error fetching application:", error);
      toast({
        title: "Error",
        description: "Failed to fetch application details",
        variant: "destructive",
      });
      router.push("/applications");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please log in to like applications",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if the user is trying to like their own application
      const isOwnApplication = application?.creator_id === profile.id;

      // First, handle the like/unlike action
      if (application?.isLiked) {
        const { error: unlikeError } = await supabase
          .from("likes")
          .delete()
          .eq("application_id", id)
          .eq("user_id", profile.id);

        if (unlikeError) throw unlikeError;

        setApplication((prev) => ({
          ...prev!,
          likes: prev!.likes - 1,
          isLiked: false,
        }));
      } else {
        const { error: likeError } = await supabase.from("likes").insert({
          application_id: id,
          user_id: profile.id,
        });

        if (likeError) throw likeError;

        setApplication((prev) => ({
          ...prev!,
          likes: prev!.likes + 1,
          isLiked: true,
        }));

        // Only create notification if the user is not liking their own application
        if (!isOwnApplication) {
          // Check for existing notification to prevent duplicates
          const { data: existingNotification } = await supabase
            .from("notifications")
            .select()
            .eq("user_id", application?.creator_id)
            .eq("type", "like")
            .eq("application_id", id)
            .eq("action_user_id", profile.id)
            .single();

          if (!existingNotification) {
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert({
                user_id: application?.creator_id,
                title: "New Like",
                message: `${profile.user_id} liked your application "${application?.title}"`,
                type: "like",
                application_id: id,
                action_user_id: profile.id,
                read: false,
              });

            if (notificationError) throw notificationError;
          }
        }
      }
    } catch (error: any) {
      console.error("Error handling like:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmittingComment(true);

    try {
      const { error } = await supabase.from("comments").insert({
        application_id: id,
        user_id: profile.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      // Add notification for the app owner
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: application?.creator_id,
          type: "comment",
          title: "New Comment",
          message: `${profile.user_id} commented on your application "${application?.title}"`,
          application_id: application?.id,
          action_user_id: profile.id,
          read: false,
        });

      if (notificationError) throw notificationError;

      setNewComment("");
      await fetchApplication(); // Refresh comments

      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!profile || !application) return;

    setIsSubmittingReply(true);
    try {
      const { error } = await supabase.from("comment_replies").insert({
        comment_id: commentId,
        user_id: profile.id,
        content: replyContent.trim(),
      });

      if (error) throw error;

      // Get the original comment's author
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", commentId)
        .single();

      if (commentError) throw commentError;

      // Add notification for the comment author
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: comment.user_id,
          type: "comment",
          title: "New Reply",
          message: `${profile.user_id} replied to your comment on "${application.title}"`,
          application_id: application.id,
          action_user_id: profile.id,
          read: false,
        });

      if (notificationError) throw notificationError;

      setReplyContent("");
      setReplyingTo(null);
      await fetchApplication(); // Refresh comments and replies

      toast({
        title: "Success",
        description: "Reply posted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleRequestReview = async () => {
    if (!isUserCreator || !profile) return;

    try {
      const { error } = await supabase
        .from("applications")
        .update({
          review_requested_at: new Date().toISOString(),
          status: "pending",
        })
        .eq("id", id)
        .eq("creator_id", profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review requested successfully",
      });

      // Refresh the application data
      fetchApplication();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!isUserCreator || !profile) return;

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id)
        .eq("creator_id", profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application deleted successfully",
      });

      router.push("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!application) return;

    try {
      await navigator.share({
        title: application.title,
        url: window.location.href,
      });
    } catch (error: any) {
      // Fallback to copying to clipboard if Web Share API is not supported
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Application link copied to clipboard",
      });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, add the comment
      const { error: commentError } = await supabase.from("comments").insert({
        application_id: id,
        user_id: profile.id,
        content: newComment,
      });

      if (commentError) throw commentError;

      // Create notification for the application owner
      if (application?.creator_id !== profile.id) {
        // Don't notify if commenting on own app
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: application?.creator_id,
            type: "comment",
            title: "New Comment",
            message: `${profile.user_id} commented on your application "${application?.title}"`,
            application_id: id,
            action_user_id: profile.id,
          });

        if (notificationError) throw notificationError;
      }

      setNewComment("");
      await fetchApplication();

      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      // console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!application) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden">
          {/* Add status banner with admin context */}
          {application?.status !== "approved" && (
            <div
              className={`p-2 text-center text-sm ${
                application?.status === "pending"
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isAdmin ? "(Admin View) " : ""}
              {application?.status === "pending"
                ? "This application is pending approval"
                : "This application has been rejected"}
            </div>
          )}

          {/* Hero Image */}
          <div className="relative h-[400px] w-full">
            <Image
              src={application.screenshot_url}
              alt={application.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-3xl font-bold">{application.title}</h1>

              <div className="flex items-center gap-2">
                {application.creator?.user_id && (
                  <Link
                    href={`/users/${application.creator.user_id}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary px-3 py-2 bg-muted rounded-md hover:bg-muted"
                  >
                    @{application.creator.user_id}
                  </Link>
                )}

                {(isUserCreator || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isUserCreator && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/applications/${application.id}/edit`}
                              className="flex items-center"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>

                          {application.status === "rejected" && (
                            <DropdownMenuItem
                              onClick={() => {
                                document
                                  .getElementById("review-dialog-trigger")
                                  ?.click();
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Request Review
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              document
                                .getElementById("delete-dialog-trigger")
                                ?.click();
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}

                      {isAdmin && !isUserCreator && (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/applications/${application.id}`}
                            className="flex items-center"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Admin Edit
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {/* <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          document
                            .getElementById("delete-dialog-trigger")
                            ?.click();
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem> */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-6">
              {application.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {application.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Actions - Updated layout */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`gap-2 ${application.isLiked ? "text-red-500" : ""}`}
              >
                <Heart
                  className={`h-4 w-4 ${
                    application.isLiked ? "fill-current" : ""
                  }`}
                />
                {application.likes}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>

                <Button
                  size="sm"
                  onClick={() => window.open(application.url, "_blank")}
                  className="gap-2"
                >
                  Visit <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Comments Section */}
        {application.comments_enabled ? (
          <Card className="mt-6 p-6">
            <h2 className="text-2xl font-semibold mb-6">Comments</h2>

            {profile && (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    className="min-h-[100px]"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                  >
                    {isSubmittingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b pb-4 last:border-0">
                    {/* Comment Content */}
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        href={`/users/${comment.user.user_id}`}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {comment.user.user_id}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mb-2">{comment.content}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(comment.id)}
                      >
                        Reply
                      </Button>
                    </div>

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSubmitReply(comment.id);
                        }}
                        className="mt-4"
                      >
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            required
                            className="min-h-[100px]"
                          />
                          <Button
                            type="submit"
                            disabled={isSubmittingReply || !replyContent.trim()}
                          >
                            {isSubmittingReply ? "Posting..." : "Post Reply"}
                          </Button>
                        </div>
                      </form>
                    )}

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="border-l-2 pl-4">
                            <div className="flex justify-between items-start mb-2">
                              <Link
                                href={`/users/${reply.user.user_id}`}
                                className="text-sm text-muted-foreground hover:text-primary"
                              >
                                {reply.user.user_id}
                              </Link>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(reply.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p>{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : (
          <Card className="mt-6 p-6">
            <p className="text-muted-foreground text-center py-4">
              Comments are disabled for this application.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
