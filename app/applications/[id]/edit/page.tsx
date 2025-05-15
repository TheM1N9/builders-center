"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
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
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { MarkdownHelp } from "@/components/ui/markdown-help";

type Application = {
  title: string;
  description: string;
  url: string;
  screenshot_url: string;
  tags: string[];
  comments_enabled: boolean;
};

export default function EditApplicationPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (user && profile && id) {
      fetchApplication();
    }
  }, [user, profile, id]);

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .eq("creator_id", profile?.id)
        .single();

      if (error) throw error;
      if (!data) {
        router.push("/profile");
        return;
      }

      setApplication(data);
      setScreenshotUrl(data.screenshot_url);
      setDescription(data.description);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch application",
        variant: "destructive",
      });
      router.push("/profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile || !application) return;

    if (!screenshotUrl) {
      toast({
        title: "Error",
        description: "Please upload a screenshot of your application",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const tags =
        formData
          .get("tags")
          ?.toString()
          .split(",")
          .map((tag) => tag.trim()) || [];

      const { error } = await supabase
        .from("applications")
        .update({
          title: formData.get("title"),
          description: formData.get("description"),
          url: formData.get("url"),
          screenshot_url: screenshotUrl,
          tags,
          comments_enabled: true,
        })
        .eq("id", id)
        .eq("creator_id", profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application updated successfully",
      });
      router.push("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // First, delete all related notifications
      const { error: notificationsError } = await supabase
        .from("notifications")
        .delete()
        .eq("application_id", id);

      if (notificationsError) throw notificationsError;

      // Then, delete all related stars
      const { error: starsError } = await supabase
        .from("stars")
        .delete()
        .eq("application_id", id);

      if (starsError) throw starsError;

      // Then, delete all related comments
      const { error: commentsError } = await supabase
        .from("comments")
        .delete()
        .eq("application_id", id);

      if (commentsError) throw commentsError;

      // Finally, delete the application
      const { error: applicationError } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

      if (applicationError) throw applicationError;

      toast({
        title: "Success",
        description: "Application deleted successfully",
      });

      router.push("/profile");
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !application) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-1/3 bg-muted rounded" />
              <div className="h-[400px] bg-muted rounded" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Edit Application</h1>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Application</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this application? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Application Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={application.title}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="description">Description</Label>
                <MarkdownHelp />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[200px]"
                  required
                />
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Preview</h3>
                  <MarkdownPreview content={description} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Application URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={application.url}
                required
              />
            </div>

            <FileUpload
              onUploadComplete={setScreenshotUrl}
              currentUrl={application.screenshot_url}
              folder={`applications/${id}`}
            />

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={application.tags.join(", ")}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/profile")}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
