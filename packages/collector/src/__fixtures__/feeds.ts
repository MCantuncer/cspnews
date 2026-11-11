/** Small but realistic feed documents, one per format the collector reads. */

export const RSS_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Örnek Haber</title>
    <item>
      <title><![CDATA[Merkez Bankası faizi sabit tuttu]]></title>
      <link>https://example.com.tr/ekonomi/faiz?utm_source=rss&amp;utm_medium=feed#top</link>
      <description><![CDATA[<p>Para Politikası Kurulu politika faizini <b>%35</b> seviyesinde sabit tuttu.</p>]]></description>
      <pubDate>Wed, 11 Nov 2026 11:00:00 +0300</pubDate>
      <media:content url="https://cdn.example.com.tr/faiz.jpg" medium="image" />
    </item>
    <item>
      <title>Deprem: Kandilli 4,6 büyüklüğünde sarsıntı kaydetti</title>
      <link>https://example.com.tr/gundem/deprem</link>
      <description>Sarsıntı &amp;quot;hafif&amp;quot; olarak hissedildi &#8211; can kaybı yok.</description>
      <dc:date>2026-11-11T07:15:00Z</dc:date>
      <enclosure url="https://cdn.example.com.tr/deprem.jpg" type="image/jpeg" length="1000" />
    </item>
    <item>
      <title></title>
      <link>https://example.com.tr/bos-baslik</link>
    </item>
  </channel>
</rss>`;

export const ATOM_FEED = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Tech</title>
  <entry>
    <title type="html">New open model tops &lt;em&gt;reasoning&lt;/em&gt; benchmark</title>
    <link rel="replies" href="https://tech.example.com/model#comments" />
    <link rel="alternate" href="https://tech.example.com/model" />
    <summary>A lab released weights for a model that leads several benchmarks.</summary>
    <published>2026-11-10T18:30:00Z</published>
    <updated>2026-11-10T19:00:00Z</updated>
  </entry>
</feed>`;

export const RDF_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://world.example.org/"><title>World</title></channel>
  <item rdf:about="https://world.example.org/summit">
    <title>Leaders agree on ceasefire talks</title>
    <link>https://world.example.org/summit</link>
    <description>Talks start next week.</description>
    <dc:date>2026-11-11T06:00:00Z</dc:date>
  </item>
</rdf:RDF>`;

export const HTML_PAGE = '<!doctype html><html><body><h1>Not a feed</h1></body></html>';
