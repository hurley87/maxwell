import { watch } from "chokidar";
import { join } from "path";

/**
 * Server-Sent Events endpoint for file change notifications.
 * Watches the notes directory and pushes refresh events to connected clients.
 * Only active in development mode.
 */
export async function GET(): Promise<Response> {
  // Only enable in development
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not available in production", { status: 404 });
  }

  const encoder = new TextEncoder();
  const notesDir = join(process.cwd(), "notes");

  // Store references outside stream for proper cleanup
  let watcher: ReturnType<typeof watch> | null = null;
  let pingInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      // Set up file watcher
      watcher = watch(notesDir, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      const sendRefresh = (path: string) => {
        const data = JSON.stringify({ path, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`event: change\ndata: ${data}\n\n`));
      };

      watcher.on("change", sendRefresh);
      watcher.on("add", sendRefresh);
      watcher.on("unlink", sendRefresh);

      // Keep connection alive with periodic pings
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Connection closed
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 30000);
    },
    cancel() {
      if (pingInterval) clearInterval(pingInterval);
      watcher?.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
