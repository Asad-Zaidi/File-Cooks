/**
 * Single source of truth for every video conversion "pair" the site exposes:
 * NavBar mega-menu links, the dynamic `/video/:conversion` route resolver,
 * and page SEO titles/labels are all generated from this file instead of
 * being hand-duplicated across components (see FileCooks video-converter spec).
 */

export const VIDEO_CONTAINERS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'mpeg', 'mpg', 'ts', '3gp', 'ogv'];

export const VIDEO_TO_AUDIO_TARGETS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'opus'];

const LABEL_OVERRIDES = { ts: 'MPEG-TS', wmv: 'WMV', ogv: 'OGV', '3gp': '3GP' };

function labelFor(key) {
  return LABEL_OVERRIDES[key] || key.toUpperCase();
}

function slugify(source, target) {
  return `${source}-to-${target}`;
}

/**
 * Every video -> video conversion pair, generated from VIDEO_CONTAINERS.
 */
export const videoConversions = VIDEO_CONTAINERS.flatMap((source) =>
  VIDEO_CONTAINERS.filter((target) => target !== source).map((target) => ({
    source,
    target,
    category: 'video',
    slug: slugify(source, target),
    path: `/video/${slugify(source, target)}`,
    name: `${labelFor(source)} → ${labelFor(target)}`,
    desc: `Convert ${labelFor(source)} video to ${labelFor(target)}`,
    seoTitle: `Convert ${labelFor(source)} to ${labelFor(target)} Online — Free Video Converter`,
  }))
);

/**
 * Every video -> audio extraction pair, generated from VIDEO_CONTAINERS x
 * VIDEO_TO_AUDIO_TARGETS.
 */
export const videoToAudioConversions = VIDEO_CONTAINERS.flatMap((source) =>
  VIDEO_TO_AUDIO_TARGETS.map((target) => ({
    source,
    target,
    category: 'video-to-audio',
    slug: slugify(source, target),
    path: `/video/${slugify(source, target)}`,
    name: `${labelFor(source)} → ${labelFor(target)}`,
    desc: `Extract ${labelFor(target)} audio from ${labelFor(source)} video`,
    seoTitle: `Convert ${labelFor(source)} to ${labelFor(target)} — Extract Audio from Video`,
  }))
);

export const allVideoConversions = [...videoConversions, ...videoToAudioConversions];

/** Curated subsets shown in the NavBar mega-menu (spec section 30). */
export const popularVideoConversions = [
  ['mp4', 'mkv'], ['mp4', 'avi'], ['mp4', 'mov'], ['mp4', 'webm'],
  ['mkv', 'mp4'], ['mov', 'mp4'], ['avi', 'mp4'],
].map(([source, target]) => videoConversions.find((c) => c.source === source && c.target === target));

export const popularVideoToAudioConversions = [
  ['mp4', 'mp3'], ['mp4', 'wav'], ['mp4', 'flac'], ['mp4', 'm4a'],
  ['mkv', 'mp3'], ['mov', 'mp3'], ['avi', 'mp3'], ['webm', 'mp3'],
].map(([source, target]) => videoToAudioConversions.find((c) => c.source === source && c.target === target));

/** Look up a `/video/:conversion` slug (e.g. "mp4-to-mkv") in the config. */
export function resolveConversionSlug(slug) {
  if (!slug) return null;
  return allVideoConversions.find((c) => c.slug === slug.toLowerCase()) || null;
}
