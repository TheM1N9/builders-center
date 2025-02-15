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

type Application = {
  title: string;
  description: string;
  url: string;
  screenshot_url: string;
  tags: string[];
  comments_enabled: boolean;
};

export default function EditApplicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchApplication();
    }
  }, [user, id]);

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .eq("creator_id", user?.id)
        .single();

      if (error) throw error;
      if (!data) {
        router.push("/profile");
        return;
      }

      setApplication(data);
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
    if (!user || !application) return;

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
          screenshot_url: formData.get("screenshot"),
          tags,
          comments_enabled: formData.get("comments_enabled") === "on",
        })
        .eq("id", id)
        .eq("creator_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your application has been updated",
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
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id)
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={application.description}
                className="min-h-[100px]"
                required
              />
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

            <div className="space-y-2">
              <Label htmlFor="screenshot">Screenshot URL</Label>
              <Input
                id="screenshot"
                name="screenshot"
                type="url"
                defaultValue={application.screenshot_url}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={application.tags.join(", ")}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="comments_enabled">Enable Comments</Label>
              <Switch
                id="comments_enabled"
                name="comments_enabled"
                defaultChecked={application.comments_enabled}
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
