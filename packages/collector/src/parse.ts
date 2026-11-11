import { XMLParser } from 'fast-xml-parser';

/** One entry as it appears in a feed, before normalisation. */
export interface FeedItem {
  readonly title: string;
  readonly link: string;
  /** HTML or plain text, as published. */
  readonly summary: string;
  readonly published?: string;
  readonly imageUrl?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => ['item', 'entry', 'link', 'enclosure', 'media:content'].includes(name),
});

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The text of an element that may be a plain string or an object with attributes. */
function textOf(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (isNode(value)) {
    return textOf(value['#text']);
  }
  if (Array.isArray(value)) {
    return textOf(value[0]);
  }
  return '';
}

function attr(value: unknown, name: string): string | undefined {
  if (!isNode(value)) {
    return undefined;
  }
  const attribute = value[`@_${name}`];
  return typeof attribute === 'string' ? attribute : undefined;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** RSS `<link>` is text; Atom `<link>` is an element with `href`, preferably `rel="alternate"`. */
function linkOf(item: Node): string {
  const links = asArray(item.link);
  const alternate =
    links.find(
      (link) => attr(link, 'href') && (attr(link, 'rel') ?? 'alternate') === 'alternate',
    ) ?? links.find((link) => attr(link, 'href'));
  const href = attr(alternate, 'href');
  if (href) {
    return href;
  }
  const text = textOf(links[0]);
  if (text) {
    return text;
  }
  // Some RSS feeds only give a permalink guid.
  const guid = item.guid;
  return attr(guid, 'isPermaLink') === 'false' ? '' : textOf(guid);
}

function imageOf(item: Node): string | undefined {
  for (const media of asArray(item['media:content'])) {
    const url = attr(media, 'url');
    const medium = attr(media, 'medium');
    const type = attr(media, 'type');
    if (url && (medium === 'image' || type?.startsWith('image/') || (!medium && !type))) {
      return url;
    }
  }
  const thumbnail = attr(item['media:thumbnail'], 'url');
  if (thumbnail) {
    return thumbnail;
  }
  for (const enclosure of asArray(item.enclosure)) {
    const url = attr(enclosure, 'url');
    if (url && attr(enclosure, 'type')?.startsWith('image/')) {
      return url;
    }
  }
  return undefined;
}

function toFeedItem(item: Node): FeedItem {
  const published =
    textOf(item.pubDate) ||
    textOf(item.published) ||
    textOf(item['dc:date']) ||
    textOf(item.updated);
  const imageUrl = imageOf(item);
  return {
    title: textOf(item.title),
    link: linkOf(item),
    summary: textOf(item.description) || textOf(item.summary) || textOf(item.content),
    ...(published ? { published } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

/**
 * Reads the entries of an RSS 2.0, RSS 1.0 (RDF) or Atom feed.
 * Throws when the document isn't one of those formats.
 */
export function parseFeed(xml: string): FeedItem[] {
  const document: unknown = parser.parse(xml);
  if (!isNode(document)) {
    throw new Error('Feed is not XML');
  }
  const rss = document.rss;
  const atom = document.feed;
  const rdf = document['rdf:RDF'];

  let items: unknown[];
  if (isNode(rss) && isNode(rss.channel)) {
    items = asArray(rss.channel.item);
  } else if (isNode(atom)) {
    items = asArray(atom.entry);
  } else if (isNode(rdf)) {
    items = asArray(rdf.item);
  } else {
    throw new Error('Not an RSS, RDF or Atom feed');
  }
  return items.filter(isNode).map(toFeedItem);
}
