"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { MarkdownPreview } from "@/components/ui/markdown-preview";

export default function SubmitPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application",
        variant: "destructive",
      });
      return;
    }

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

      // Process tags
      const tags =
        formData
          .get("tags")
          ?.toString()
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean) || [];

      // Create the application
      const { data: app, error } = await supabase
        .from("applications")
        .insert({
          title: formData.get("title"),
          description: description,
          url: formData.get("url"),
          screenshot_url: screenshotUrl,
          tags,
          creator_id: profile.id,
          comments_enabled: true,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Get all admin users
      const { data: admins, error: adminError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (adminError) throw adminError;

      // Create notifications for all admins
      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          user_id: admin.id,
          title: "New Application Submission",
          message: `${profile.user_id} submitted "${formData.get(
            "title"
          )}" for review`,
          application_id: app.id,
          type: "submission",
          action_user_id: profile.id,
          read: false,
        }));

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(adminNotifications);

        if (notificationError) throw notificationError;
      }

      toast({
        title: "Success",
        description: "Your application has been submitted for review",
      });

      router.push("/profile");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-4">
              You need to be logged in to submit an application.
            </p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-6">Submit Your Application</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Application Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter your application title"
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
                placeholder="https://your-app.com"
                required
              />
            </div>

            <FileUpload onUploadComplete={setScreenshotUrl} />

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="react, typescript, web3"
              />
            </div>

            {/* never enable comments and remove this */}
            {/* <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="comments_enabled">Enable Comments</Label>
              <Switch
                id="comments_enabled"
                name="comments_enabled"
                defaultChecked={true}
              />
            </div> */}

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
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
