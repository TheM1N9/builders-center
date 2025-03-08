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
import { Switch } from "@/components/ui/switch";

export default function SubmitPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application",
        variant: "destructive",
      });
      router.push("/login");
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

      const { error } = await supabase.from("applications").insert({
        title: formData.get("title"),
        description: formData.get("description"),
        url: formData.get("url"),
        screenshot_url: formData.get("screenshot"),
        tags,
        creator_id: profile.id,
        status: "pending",
        // comments_enabled: formData.get("comments_enabled") === "on",
        comments_enabled: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your application has been submitted for review",
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your application..."
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
                placeholder="https://your-app.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Screenshot URL</Label>
              <Input
                id="screenshot"
                name="screenshot"
                type="url"
                placeholder="https://your-screenshot.com/image.png"
                required
              />
            </div>

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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
