import { uploadResponse } from "@/lib/uploads";

export const runtime = "nodejs";

// Serves admin-uploaded product images from UPLOAD_DIR (see lib/uploads.ts).
export async function GET(_request: Request, ctx: RouteContext<"/uploads/products/[file]">) {
  const { file } = await ctx.params;
  return uploadResponse(file, "products");
}
