import { describe, expect, it } from 'vitest';

import { articlePhotoUrl, photoWidth } from './photo-size.js';

/** A PNG header with the given width. */
export function png(width: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, 100);
  return b;
}

/** A JPEG with an APP0 segment before the frame, as real files have. */
export function jpeg(width: number): Uint8Array {
  const app0 = [0xff, 0xe0, 0, 16, ...new Array<number>(14).fill(0)];
  const frame = [
    0xff,
    0xc0,
    0,
    17,
    8,
    0,
    100,
    width >> 8,
    width & 0xff,
    3,
    ...new Array<number>(9).fill(0),
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...frame]);
}

function webpLossy(width: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set(new TextEncoder().encode('RIFF'), 0);
  b.set(new TextEncoder().encode('WEBPVP8 '), 8);
  new DataView(b.buffer).setUint16(26, width, true);
  return b;
}

describe('photoWidth', () => {
  it('reads PNG, JPEG and WebP widths', () => {
    expect(photoWidth(png(1400))).toBe(1400);
    expect(photoWidth(jpeg(140))).toBe(140);
    expect(photoWidth(webpLossy(1200))).toBe(1200);
  });

  it('returns undefined for anything else', () => {
    expect(photoWidth(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeUndefined();
    expect(photoWidth(new TextEncoder().encode('<html></html>'))).toBeUndefined();
  });
});

describe('articlePhotoUrl', () => {
  it('prefers og:image, in either attribute order, and resolves it against the page', () => {
    const html = `<meta name="twitter:image" content="https://cdn.example/t.jpg">
      <meta content="/photos/big.jpg?w=1400&amp;q=85" property="og:image" />`;
    expect(articlePhotoUrl(html, 'https://news.example/a/1')).toBe(
      'https://news.example/photos/big.jpg?w=1400&q=85',
    );
  });

  it('falls back to twitter:image and ignores pages without one', () => {
    expect(
      articlePhotoUrl(
        '<meta name="twitter:image" content="https://cdn.example/t.jpg">',
        'https://x.example',
      ),
    ).toBe('https://cdn.example/t.jpg');
    expect(
      articlePhotoUrl('<meta property="og:title" content="Hi">', 'https://x.example'),
    ).toBeUndefined();
    expect(
      articlePhotoUrl(
        '<meta property="og:image" content="javascript:alert(1)">',
        'https://x.example',
      ),
    ).toBeUndefined();
  });
});
