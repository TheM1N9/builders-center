"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Application } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";

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
  }[]; // Array because of the join
  replies: {
    id: string;
    content: string;
    created_at: string;
    user: {
      user_id: string;
    }[]; // Array because of the join
  }[];
};

// Our desired formatted type
type Comment = {
  id: string;
  content: string;
  created_at: string;
  user: {
    user_id: string;
  };
  replies: {
    id: string;
    content: string;
    created_at: string;
    user: {
      user_id: string;
    };
  }[];
};

type ApplicationWithDetails = Application & {
  likes: number;
  isLiked: boolean;
  creator?: {
    user_id: string;
  };
  comments: Comment[];
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

  useEffect(() => {
    fetchApplication();
  }, [id, user]);

  const fetchApplication = async () => {
    try {
      // Get application with creator and likes
      const { data: app, error: appError } = await supabase
        .from("applications")
        .select(
          `
          *,
          likes:likes(count),
          creator:profiles!creator_id(user_id)
        `
        )
        .eq("id", id)
        .eq("status", "approved")
        .single();

      if (appError) throw appError;

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

      // Fetch comments with proper type annotation
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          user:profiles!user_id (
            user_id
          ),
          replies:comment_replies(
            id,
            content,
            created_at,
            user:profiles!user_id (
              user_id
            )
          )
        `
        )
        .eq("application_id", id)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Format the data with proper type handling
      const formattedComments: Comment[] =
        (commentsData as SupabaseRawComment[])?.map((comment) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user: {
            user_id: comment.user[0]?.user_id || "", // Take first item from array
          },
          replies: comment.replies.map((reply) => ({
            id: reply.id,
            content: reply.content,
            created_at: reply.created_at,
            user: {
              user_id: reply.user[0]?.user_id || "", // Take first item from array
            },
          })),
        })) || [];

      setComments(formattedComments);

      setApplication({
        ...app,
        likes: app.likes[0]?.count || 0,
        isLiked,
      });
    } catch (error) {
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
        // Unlike
        await supabase
          .from("likes")
          .delete()
          .eq("application_id", id)
          .eq("user_id", user.id);
      } else {
        // Like
        await supabase
          .from("likes")
          .insert({ application_id: id, user_id: user.id });
      }

      // Update local state
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
        description: error.message,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-[400px] bg-muted rounded-lg" />
            <div className="h-8 w-2/3 bg-muted rounded" />
            <div className="h-4 w-1/3 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Application Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The application you're looking for doesn't exist or hasn't been
              approved yet.
            </p>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden">
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
              <div>
                <h1 className="text-3xl font-bold mb-2">{application.title}</h1>
                {application.creator?.user_id && (
                  <Link
                    href={`/users/${application.creator.user_id}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    by @{application.creator.user_id}
                  </Link>
                )}
              </div>
              <Button
                size="lg"
                onClick={() => window.open(application.url, "_blank")}
              >
                Visit Application <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {application.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-6">
              {application.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={handleLike}
                className={application.isLiked ? "text-red-500" : ""}
              >
                <Heart
                  className={`h-5 w-5 mr-2 ${
                    application.isLiked ? "fill-current" : ""
                  }`}
                />
                {application.likes}
              </Button>
            </div>
          </div>
        </Card>

        {/* Comments Section */}
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
                      href={`/users/${comment.user.user_id}`}
                      className="font-medium hover:text-primary"
                    >
                      @{comment.user.user_id}
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
                            disabled={isSubmittingReply || !replyContent.trim()}
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
                              {formatDistanceToNow(new Date(reply.created_at), {
                                addSuffix: true,
                              })}
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
      </div>
    </div>
  );
}
