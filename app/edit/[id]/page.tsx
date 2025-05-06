"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import type { Application } from "@/types";
import { FileUpload } from "@/components/ui/file-upload";
import { MarkdownPreview } from "@/components/ui/markdown-preview";

export default function EditPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchApplication();
  }, [user, params.id]);

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;

      // Check if the user owns this application
      if (data.creator_id !== user?.id) {
        toast({
          title: "Error",
          description: "You don't have permission to edit this application",
          variant: "destructive",
        });
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
    if (!screenshotUrl) {
      toast({
        title: "Error",
        description: "Please upload a screenshot of your application",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
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
        })
        .eq("id", params.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application updated successfully!",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-3/4 bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-4 w-1/4 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-1/4 bg-muted rounded" />
                <div className="h-32 bg-muted rounded" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!application) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-6">Edit Application</h1>

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
              <Label htmlFor="description">
                Description (Markdown supported)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[200px]"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Supports: <code>**bold**</code>, <code>*italic*</code>,{" "}
                    <code>[links](url)</code>, <code># headings</code>,{" "}
                    <code>- lists</code>
                  </p>
                </div>
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
              folder={`applications/${application.id}`}
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
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
