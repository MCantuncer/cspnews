import { describe, expect, it } from 'vitest';

import { decodeEntities, toPlainText } from './text.js';

describe('toPlainText', () => {
  it('removes tags, scripts and extra whitespace', () => {
    expect(toPlainText('<p>Hello <b>world</b></p>\n<script>alert(1)</script>  <i>again</i>')).toBe(
      'Hello world again',
    );
  });

  it('decodes named and numeric entities', () => {
    expect(decodeEntities('A &amp; B &#8211; &#x131; &quot;q&quot; &unknown;')).toBe(
      'A & B – ı "q" &unknown;',
    );
  });
});
