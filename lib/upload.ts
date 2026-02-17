import { promises as fs } from "fs";
import path from "path";

export async function saveUpload(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Vercel serverless has ephemeral/readonly constraints for local file storage.
  // Fall back to data URL storage so uploads work without external object storage.
  if (process.env.VERCEL === "1") {
    const mime = file.type || "application/octet-stream";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = path.join(uploadsDir, safeName);

  await fs.writeFile(filePath, buffer);
  return `/uploads/${safeName}`;
}
