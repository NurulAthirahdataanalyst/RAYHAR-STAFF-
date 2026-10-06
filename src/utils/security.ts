export const safeUrl = (url: string | null | undefined, fallback: string = "#") => {
  if (!url) return fallback;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || url.startsWith("/")) {
      return parsed.href;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

export const safeRedirectUrl = (url: string | null | undefined, fallback: string = "/") => {
  if (!url) return fallback;
  // Only allow relative URLs to prevent open redirect
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return fallback;
};
