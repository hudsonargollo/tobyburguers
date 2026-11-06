import { uploadResponse } from "@/lib/uploads";

export const runtime = "nodejs";

// Serves customers' custom-design reference photos from UPLOAD_DIR (see lib/uploads.ts).
export async function GET(_request: Request, ctx: RouteContext<"/uploads/references/[file]">) {
  const { file } = await ctx.params;
  return uploadResponse(file, "references");
}
