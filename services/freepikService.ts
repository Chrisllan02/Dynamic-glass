
// Using Google's public favicon service which is free, secure, and reliable for Google Apps.
// This replaces the Freepik API which was failing.

export const searchIcon = async (query: string, url?: string): Promise<string | null> => {
  if (url) {
    // Google's favicon service (Size 128 for high quality)
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=128`;
  }
  return null;
};
