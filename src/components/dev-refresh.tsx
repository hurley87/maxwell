"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Development-only component that auto-refreshes the page when
 * markdown files in the notes directory change.
 * 
 * Connects to a Server-Sent Events endpoint that watches for file changes.
 */
export function DevRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      let debounceTimer: NodeJS.Timeout | null = null;
      eventSource = new EventSource("/api/watch");

      eventSource.addEventListener("change", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[DevRefresh] File changed:", data.path);
        } catch {
          console.warn("[DevRefresh] Invalid event data");
        }
        // Debounce rapid changes
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => router.refresh(), 100);
      });

      eventSource.addEventListener("connected", () => {
        console.log("[DevRefresh] Connected to file watcher");
      });

      eventSource.onerror = () => {
        console.log("[DevRefresh] Connection lost, reconnecting...");
        eventSource?.close();
        // Reconnect after a delay
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [router]);

  // This component renders nothing
  return null;
}
