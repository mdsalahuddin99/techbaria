import { useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  fallbackEmoji?: string;
  size?: "sm" | "md" | "lg";
  /** When true, store as data URL if Cloudinary is not configured. */
  allowDataUrlFallback?: boolean;
}

/**
 * Reusable image picker. Uploads to Cloudinary when configured;
 * otherwise (when `allowDataUrlFallback` is set) falls back to an
 * inline base64 data URL so users can still see the image immediately.
 */
export default function ImageUpload({
  value,
  onChange,
  fallbackEmoji = "📦",
  size = "md",
  allowDataUrlFallback = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const dim =
    size === "sm" ? "h-16 w-16" : size === "lg" ? "h-32 w-32" : "h-24 w-24";

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

  async function signedUpload(file: File): Promise<string> {
    // 1. Get signature from our server
    const preset = "ml_default";
    const folder = "products";
    const signRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset, folder }),
    });
    // Cloudinary not configured — auto fallback to data URL if allowed
    if (signRes.status === 503 && allowDataUrlFallback) {
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
      toast.success("Image saved locally (Cloudinary not configured)");
      return dataUrl;
    }
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({}));
      throw new Error(err.message ?? "Failed to get upload signature");
    }
    const { api_key, cloud_name } = await signRes.json();

    // 2. Upload directly to Cloudinary (unsigned preset — no signature needed)
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", preset);
    fd.append("folder", folder);
    fd.append("api_key", api_key);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
      { method: "POST", body: fd },
    );
    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      throw new Error(`Upload failed (${uploadRes.status}): ${text || uploadRes.statusText}`);
    }
    const data = (await uploadRes.json()) as { secure_url?: string; url?: string };
    return data.secure_url || data.url || "";
  }

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await signedUpload(file);
      if (!url && allowDataUrlFallback) {
        const dataUrl = await readAsDataUrl(file);
        onChange(dataUrl);
        toast.success("Image saved locally");
      } else if (url) {
        onChange(url);
        toast.success("Image uploaded");
      } else {
        toast.error("Upload failed — check Cloudinary settings");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dim} rounded-md border bg-muted/30 grid place-items-center overflow-hidden relative`}
      >
        {value ? (
          <img src={value} alt="Preview" className="h-full w-full object-contain" />
        ) : (
          <span className="text-2xl opacity-70">{fallbackEmoji}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {value ? <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onChange(undefined)}
          >
            <X className="h-3.5 w-3.5 mr-1.5" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
