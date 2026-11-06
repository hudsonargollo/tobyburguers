import path from "node:path";

// Admin-uploaded product images live OUTSIDE `public/`: a production server
// (`next start` / standalone) only serves files that were in `public/` at build
// time. They're stored in UPLOAD_DIR (default `<project>/uploads`) and served by
// the `/uploads/products/[file]` route. Mount this folder as a persistent volume
// in Docker so images survive redeploys.
export const UPLOAD_ROOT = path.resolve(
  /* turbopackIgnore: true */ process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
);
export const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, "products");

/** "products" = admin product images; "references" = customers' custom-design photos. */
export type UploadFolder = "products" | "references";

export const IMAGE_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const;

export type ImageExt = keyof typeof IMAGE_TYPES;

// Identify an image by its magic bytes — never trust the client's MIME type
// or file extension.
export function sniffImage(buf: Buffer): ImageExt | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buf.toString("ascii", 8, 12))) return "avif";
  return null;
}

// Only names this app generates: lowercase slug + timestamp + known extension.
export const SAFE_UPLOAD_NAME = /^[a-z0-9-]{1,80}\.(jpg|png|webp|avif)$/;

// ---------- Storage backends ----------
//  - Vercel: Vercel Blob (needs a Blob store connected to the project). Newer
//    connections authenticate with OIDC (BLOB_STORE_ID + Vercel's OIDC token);
//    older ones set BLOB_READ_WRITE_TOKEN. @vercel/blob picks whichever exists.
//    Files get a public CDN URL that is stored as-is.
//  - Netlify: Netlify Blobs (store "product-uploads"), served by /uploads/products/[file].
//  - VPS / local: disk (UPLOAD_DIR), served by /uploads/products/[file].

const BLOB_STORE = "product-uploads";

/** True when a Vercel Blob store is connected (OIDC store id or read-write token). */
export function vercelBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function onNetlify(): boolean {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY_LOCAL);
}

async function blobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: BLOB_STORE, consistency: "strong" });
}

// Netlify Blobs keys: product images keep their original bare names.
const blobKey = (folder: UploadFolder, filename: string) =>
  folder === "products" ? filename : `${folder}/${filename}`;

/** Saves an uploaded image and returns its public URL. */
export async function saveUpload(
  filename: string,
  bytes: Buffer,
  ext: ImageExt,
  folder: UploadFolder = "products"
): Promise<string> {
  if (vercelBlobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${filename}`, bytes, {
      access: "public",
      contentType: IMAGE_TYPES[ext],
      addRandomSuffix: false,
    });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error("Image uploads on Vercel need a Blob store: Vercel → Storage → Create → Blob, then connect it to this project.");
  }
  if (!onNetlify()) {
    try {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const dir = path.join(UPLOAD_ROOT, folder);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), bytes);
      return `/uploads/${folder}/${filename}`;
    } catch (err) {
      console.warn("[upload] disk write failed, trying Netlify Blobs:", err);
    }
  }
  const store = await blobStore();
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  await store.set(blobKey(folder, filename), ab);
  return `/uploads/${folder}/${filename}`;
}

export async function readUpload(filename: string, folder: UploadFolder = "products"): Promise<Buffer | null> {
  if (!onNetlify()) {
    try {
      const { readFile } = await import("node:fs/promises");
      return await readFile(path.join(UPLOAD_ROOT, folder, filename));
    } catch {
      /* not on disk — maybe stored in Blobs */
    }
  }
  try {
    const store = await blobStore();
    const data = await store.get(blobKey(folder, filename), { type: "arrayBuffer" });
    return data ? Buffer.from(data) : null;
  } catch {
    return null; // Blobs not available (local dev without Netlify)
  }
}

/** HTTP response for a disk / Netlify-stored upload (served by /uploads/<folder>/[file]). */
export async function uploadResponse(file: string, folder: UploadFolder): Promise<Response> {
  if (!SAFE_UPLOAD_NAME.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readUpload(file, folder);
    if (!data) return new Response("Not found", { status: 404 });
    const ext = file.split(".").pop() as ImageExt;
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": IMAGE_TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
