import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const mediaStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { libraryStatus, openLibrary } = await import("./media-library");
  const status = libraryStatus();
  if (!status.local) return status;
  try {
    await openLibrary(process.env.MEDIA_ROOT!.trim());
  } catch (error) {
    const reason = error instanceof Error ? error.message : "MEDIA_ROOT is not a folder.";
    return { local: false as const, reason };
  }
  return { local: true as const };
});

async function rootOrReason(): Promise<{ ok: true; root: string } | { ok: false; reason: string }> {
  const { libraryStatus, openLibrary } = await import("./media-library");
  const status = libraryStatus();
  if (!status.local) return { ok: false, reason: status.reason ?? "The music folder is not available on this site." };
  try {
    return { ok: true, root: await openLibrary(process.env.MEDIA_ROOT!.trim()) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "MEDIA_ROOT is not a folder." };
  }
}

export const listMedia = createServerFn({ method: "POST" })
  .validator(z.object({ path: z.string().max(400) }))
  .handler(async ({ data }) => {
    const opened = await rootOrReason();
    if (!opened.ok) return opened;
    const { listLibrary } = await import("./media-library");
    return listLibrary(opened.root, data.path);
  });

export const searchMedia = createServerFn({ method: "POST" })
  .validator(z.object({ term: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const opened = await rootOrReason();
    if (!opened.ok) return { files: [] as { name: string; path: string }[] };
    const { searchLibrary } = await import("./media-library");
    return { files: await searchLibrary(opened.root, data.term) };
  });

export const folderAsAlbum = createServerFn({ method: "POST" })
  .validator(z.object({ path: z.string().max(400), recursive: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const opened = await rootOrReason();
    if (!opened.ok) return opened;
    const { folderAlbums } = await import("./media-library");
    return folderAlbums(opened.root, data.path, data.recursive === true);
  });
