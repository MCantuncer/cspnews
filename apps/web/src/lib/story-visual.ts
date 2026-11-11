import type { LocalStory } from '@cspnews/core';

import { logoUrl, photoUrl } from './media.js';
import { visualFor, type Visual } from './visual.js';

/** The visual a published story shows, using the media saved next to the bulletins. */
export function storyVisual(story: LocalStory): Visual {
  return visualFor(story, { photo: photoUrl, logo: logoUrl });
}
