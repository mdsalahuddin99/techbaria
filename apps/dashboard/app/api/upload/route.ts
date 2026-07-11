export const runtime = "nodejs";

import { z } from "zod";
import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { ServiceError } from "@/server/lib/errors";

/** Cloudinary upload response returned to the client. */
export interface UploadSignatureResponse {
  api_key: string;
  cloud_name: string;
}

const signSchema = z.object({
  preset: z.string().min(1, "Upload preset is required"),
  folder: z.string().min(1, "Folder is required"),
});

/** Safely get a Cloudinary config value — returns null instead of throwing. */
function cloudinaryConfig(key: string): string | null {
  const value = process.env[key];
  return value && !value.includes("your-") ? value : null;
}

export const POST = apiHandler(async (_ctx, req) => {
  const { preset, folder } = await parseBody(req, signSchema);

  const cloudName = cloudinaryConfig("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  const apiKey = cloudinaryConfig("CLOUDINARY_API_KEY");

  if (!cloudName || !apiKey) {
    throw new ServiceError(
      "CONFIG_ERROR",
      "Cloudinary not configured — set CLOUDINARY_API_KEY and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local",
      503,
    );
  }

  // Return just the credentials — unsigned preset doesn't need a signature
  return {
    api_key: apiKey,
    cloud_name: cloudName,
  } satisfies Pick<UploadSignatureResponse, "api_key" | "cloud_name">;
});
