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
  const { user } = useAuth();
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setIsAdmin(profile?.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id, user]);

  const fetchApplication = async () => {
    try {
      // First, check if user is admin (if logged in)
      let isAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        isAdmin = profile?.role === "admin";
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
      const isCreator = user?.id === app.creator_id;
      if (app.status !== "approved" && !isCreator && !isAdmin) {
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
      if (user) {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("application_id", id)
          .eq("user_id", user.id)
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
      console.log("Raw comments data:", commentsData);

      // Format the comments with proper user information
      const formattedComments: Comment[] =
        (commentsData as unknown as SupabaseRawComment[])?.map((comment) => {
          if (!comment.user) {
            console.error("Missing user data for comment:", comment);
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
      console.error("Error fetching application:", error);
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
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like applications",
        variant: "destructive",
      });
      return;
    }

    if (!application) return;

    try {
      if (application.isLiked) {
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

      setApplication((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
          isLiked: !prev.isLiked,
        };
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from("comments").insert({
        application_id: id,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

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
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to reply",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReply(true);
    try {
      const { error } = await supabase.from("comment_replies").insert({
        comment_id: commentId,
        user_id: user.id,
        content: replyContent.trim(),
      });

      if (error) throw error;

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
    try {
      const { error } = await supabase
        .from("applications")
        .update({
          review_requested_at: new Date().toISOString(),
          status: "pending",
        })
        .eq("id", application?.id)
        .eq("creator_id", user?.id);

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
    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", application?.id)
        .eq("creator_id", user?.id);

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

                {application?.creator_id === user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/applications/${application.id}/edit`}
                          className="flex items-center"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>

                      {(application.status === "rejected" ||
                        (application.status === "pending" &&
                          !application.review_requested_at)) && (
                        <>
                          <DropdownMenuSeparator />
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
                        </>
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

            {user && (
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
                        href={`/users/${
                          comment.user?.user_id || "deleted-user"
                        }`}
                        className="font-medium hover:text-primary"
                      >
                        @{comment.user?.user_id || "deleted-user"}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap mb-2">
                      {comment.content}
                    </p>

                    {/* Reply Button */}
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id
                          )
                        }
                        className="mb-2"
                      >
                        Reply
                      </Button>
                    )}

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSubmitReply(comment.id);
                        }}
                        className="mb-4 pl-6 border-l-2"
                      >
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            required
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={
                                isSubmittingReply || !replyContent.trim()
                              }
                            >
                              {isSubmittingReply ? "Posting..." : "Post Reply"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="pl-6 mt-4 space-y-4 border-l-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="relative">
                            <div className="flex justify-between items-start mb-1">
                              <Link
                                href={`/users/${reply.user.user_id}`}
                                className="font-medium hover:text-primary"
                              >
                                @{reply.user.user_id}
                              </Link>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(reply.created_at),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </span>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap text-sm">
                              {reply.content}
                            </p>
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
            <p className="text-center text-muted-foreground">
              Comments are disabled for this application
            </p>
          </Card>
        )}
      </div>

      {/* Add AlertDialogs outside the main content */}
      {application?.creator_id === user?.id && (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button id="review-dialog-trigger" className="hidden">
                Request Review
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request Review</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to request a review? This will notify
                  our moderators to review your application.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRequestReview}>
                  Request Review
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button id="delete-dialog-trigger" className="hidden">
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Application</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this application? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
