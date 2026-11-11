import { describe, expect, it } from 'vitest';

import { findLogoUrl, logoExtension } from './logo.js';

describe('findLogoUrl', () => {
  it('prefers the largest apple-touch-icon', () => {
    const html = `
      <link rel="icon" href="/favicon-32.png" sizes="32x32">
      <link rel="apple-touch-icon" href="/touch-120.png" sizes="120x120">
      <link rel='apple-touch-icon' href='/touch-180.png' sizes='180x180'>`;
    expect(findLogoUrl(html, 'https://www.ntv.com.tr/')).toBe(
      'https://www.ntv.com.tr/touch-180.png',
    );
  });

  it('falls back to the largest icon, counting SVG as largest', () => {
    const html = `
      <link rel="shortcut icon" href="https://cdn.example/fav-16.png" sizes="16x16">
      <link rel="icon" type="image/svg+xml" href="/mark.svg">`;
    expect(findLogoUrl(html, 'https://www.bbc.com/turkce')).toBe('https://www.bbc.com/mark.svg');
  });

  it('resolves relative links against <base href>', () => {
    const html = `<base href="https://static.example.org/assets/"><link rel=icon href=logo.png>`;
    expect(findLogoUrl(html, 'https://example.org/')).toBe(
      'https://static.example.org/assets/logo.png',
    );
  });

  it('uses /favicon.ico when the page declares nothing', () => {
    expect(findLogoUrl('<html><head></head></html>', 'https://t24.com.tr/haber')).toBe(
      'https://t24.com.tr/favicon.ico',
    );
  });

  it('ignores links that are not icons', () => {
    const html = `<link rel="stylesheet" href="/site.css"><link rel="preload" href="/icon.png">`;
    expect(findLogoUrl(html, 'https://example.org/')).toBe('https://example.org/favicon.ico');
  });
});

describe('logoExtension', () => {
  it('uses the content type first, then the URL', () => {
    expect(logoExtension('image/svg+xml; charset=utf-8', 'https://x/logo')).toBe('svg');
    expect(logoExtension('image/vnd.microsoft.icon', 'https://x/favicon.ico')).toBe('ico');
    expect(logoExtension(null, 'https://x/logo.JPEG?v=2')).toBe('jpg');
    expect(logoExtension('application/octet-stream', 'https://x/logo')).toBe('png');
  });
});
