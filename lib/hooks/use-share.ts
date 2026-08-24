"use client";

export type ShareResult = "shared" | "copied" | "failed";

/**
 * Share an item using the Web Share API where available, falling back to
 * copying the absolute URL to the clipboard. This is the single sharing
 * primitive reused by the dashboard action menus — it never bypasses RLS or
 * moderation because callers only pass a URL for publicly visible items.
 */
export function useShare() {
  return {
    async share(opts: {
      title: string;
      text?: string;
      url: string;
    }): Promise<ShareResult> {
      try {
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function"
        ) {
          await navigator.share({
            title: opts.title,
            text: opts.text,
            url: opts.url,
          });
          return "shared";
        }
      } catch {
        // User cancelled or the native share failed — fall through to copy.
      }

      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(opts.url);
          return "copied";
        }
      } catch {
        return "failed";
      }

      return "failed";
    },
  };
}
