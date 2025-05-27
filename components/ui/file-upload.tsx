import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  folder?: string;
}

export function FileUpload({
  onUploadComplete,
  currentUrl,
  folder = "applications",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentUrl || null
  );
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Create a unique file name with user ID to ensure uniqueness
      const fileExt = file.name.split(".").pop();
      // Validate extension is safe
      const safeExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!fileExt || !safeExtensions.includes(fileExt.toLowerCase())) {
        toast({
          title: "Error",
          description:
            "Invalid file extension. Please upload a valid image file.",
          variant: "destructive",
        });
        return;
      }
      const fileName = `${user.id}/${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      console.log("Attempting to upload file:", {
        path: filePath,
        type: file.type,
        size: file.size,
        userId: user.id,
      });

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", data);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("uploads").getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
    } catch (error: any) {
      console.error("Detailed error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete("");
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change event
      handleFileChange({ target: { files: [file] } } as any);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Application Logo</Label>
      <div className="flex flex-col gap-4">
        {previewUrl ? (
          <div
            className="relative flex justify-center items-center bg-muted rounded-lg"
            style={{ minHeight: 120, minWidth: 120 }}
          >
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: 200,
                height: "auto",
                width: "auto",
                display: "block",
              }}
              className="rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading
                  ? "Uploading..."
                  : isDragActive
                  ? "Drop the image here"
                  : "Click or drag an image to upload"}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
