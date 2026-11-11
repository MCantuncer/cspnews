/**
 * Reads a photo's width from its first bytes (JPEG, PNG or WebP), without decoding it.
 * Returns undefined for other formats or broken files: the caller then keeps the photo as is.
 */
export function photoWidth(bytes: Uint8Array): number | undefined {
  return jpegWidth(bytes) ?? pngWidth(bytes) ?? webpWidth(bytes);
}

const u16be = (b: Uint8Array, i: number) => ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0);
const u16le = (b: Uint8Array, i: number) => (b[i] ?? 0) | ((b[i + 1] ?? 0) << 8);
const ascii = (b: Uint8Array, i: number, length: number) =>
  String.fromCharCode(...b.subarray(i, i + length));

function pngWidth(b: Uint8Array): number | undefined {
  if (b.length < 24 || ascii(b, 1, 3) !== 'PNG' || ascii(b, 12, 4) !== 'IHDR') return undefined;
  return (((b[16] ?? 0) << 24) | ((b[17] ?? 0) << 16) | u16be(b, 18)) >>> 0;
}

/** Walks the JPEG markers to the first start-of-frame, which holds the size. */
function jpegWidth(b: Uint8Array): number | undefined {
  if (b[0] !== 0xff || b[1] !== 0xd8) return undefined;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return undefined;
    const marker = b[i + 1] ?? 0;
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) return u16be(b, i + 7);
    i += 2 + u16be(b, i + 2);
  }
  return undefined;
}

function webpWidth(b: Uint8Array): number | undefined {
  if (b.length < 30 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') return undefined;
  const chunk = ascii(b, 12, 4);
  if (chunk === 'VP8 ') return u16le(b, 26) & 0x3fff;
  if (chunk === 'VP8L') return 1 + (u16le(b, 21) & 0x3fff);
  if (chunk === 'VP8X') return 1 + ((b[24] ?? 0) | ((b[25] ?? 0) << 8) | ((b[26] ?? 0) << 16));
  return undefined;
}

/**
 * The article's own share photo (`og:image`, else `twitter:image`), resolved against the page
 * URL. Outlets put a full-size photo there, while feeds often carry a small thumbnail.
 */
export function articlePhotoUrl(html: string, pageUrl: string): string | undefined {
  for (const name of ['og:image', 'twitter:image']) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
      const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (key !== name || !content) continue;
      try {
        const url = new URL(content.replaceAll('&amp;', '&'), pageUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      } catch {
        // A broken URL: try the next tag.
      }
    }
  }
  return undefined;
}
