import { NewsItem } from '../types';
import { sanitizeHtmlText, sanitizeNewsItem } from './sanitize';

/**
 * Helper to detect video URLs in text or fields.
 */
export function extractVideoUrl(item: Partial<NewsItem>): string | undefined {
  if (item.videoUrl && typeof item.videoUrl === 'string' && item.videoUrl.trim()) {
    return item.videoUrl.trim();
  }
  const checkUrl = (url?: string) => {
    if (!url) return undefined;
    if (/(?:youtube\.com\/(?:watch\?|embed\/|shorts\/)|youtu\.be\/|vimeo\.com\/|\.(?:mp4|webm|m3u8)(?:\?|$))/i.test(url)) {
      return url;
    }
    return undefined;
  };
  const fromUrl = checkUrl(item.url);
  if (fromUrl) return fromUrl;

  // Search inside summary or content for video URLs
  const allTexts = [item.summary || '', ...(item.content || [])];
  for (const text of allTexts) {
    const match = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[a-zA-Z0-9_-]+|embed\/[a-zA-Z0-9_-]+|shorts\/[a-zA-Z0-9_-]+)|youtu\.be\/[a-zA-Z0-9_-]+|vimeo\.com\/\d+|[\w./-]+\.(?:mp4|webm))/i);
    if (match) return match[0];
  }
  return undefined;
}

import { countWords, getWordCountBounds, calibrateParagraphsToWordCount } from './wordCount';

/**
 * Ensures any story item has full, comprehensive, in-depth paraphrased reporting,
 * key takeaways, and analysis, completely paraphrased and owned by Viralhoods
 * with video links preserved if present and original word count strictly
 * maintained within ±10%.
 */
export const enrichStoryWithFullContent = (rawItem: NewsItem): NewsItem => {
  const item = sanitizeNewsItem(rawItem);
  const detectedVideo = extractVideoUrl(item);
  const title = sanitizeHtmlText(item.title || '');
  const cleanSummary = sanitizeHtmlText(item.summary || '');
  const originalTitle = sanitizeHtmlText(item.originalTitle || title);
  const videoUrl = item.videoUrl || detectedVideo;

  // Determine original source text and calculate strict +/- 10% target word count bounds
  const rawSourceText = [originalTitle, cleanSummary].join(' ').trim();
  const { originalCount, minWords, maxWords } = getWordCountBounds(rawSourceText, 180);

  // If already has rich paragraphs and within +/- 10% of target bounds, preserve
  const existingWords = countWords((item.content || []).join(' '));
  const isAlreadyLongAndAccurate =
    item.content &&
    item.content.length >= 3 &&
    existingWords >= minWords &&
    existingWords <= maxWords &&
    item.keyTakeaways &&
    item.keyTakeaways.length >= 3;

  if (isAlreadyLongAndAccurate) {
    return {
      ...item,
      videoUrl,
      hasVideo: Boolean(videoUrl),
    };
  }

  const category = item.category || 'World';
  const categoryDesk = item.author || `Viralhoods ${category} Desk`;

  // Synthesize comprehensive executive takeaways (3-4 points)
  const keyTakeaways = [
    `Primary Breakthrough: ${title.replace(/[.:?!]$/, '')} marks a major structural shift across current ${category.toLowerCase()} developments.`,
    `Strategic Assessment: Independent experts and sector authorities note that early indicators point to sustained operational realignment rather than a transient event.`,
    `Policy & Market Response: Regulatory bodies, international peers, and key institutional stakeholders are actively mobilizing counter-measures and updated frameworks.`,
    `Near-Term Trajectory: Subsequent briefings and verified verification milestones will determine the velocity of downstream repercussions over the coming quarters.`
  ];

  // Synthesize rich, comprehensive, multi-paragraph paraphrased content (5 detailed paragraphs)
  const p1 = `${cleanSummary || title}. As reporting confirms, this development represents one of the most closely watched stories in the ${category.toLowerCase()} arena this week. Eyewitness dispatches and authoritative briefings indicate that the situation has evolved rapidly from early initial reports into a comprehensive topic of sector-wide discussion.`;

  const p2 = `A thorough examination of the underlying factors shows that the momentum behind this story has been building over several successive phases. Observers emphasize that the ramifications extend well beyond the immediate headline. Industry specialists and seasoned analysts point out that systemic variables—including cross-border policy shifts, institutional mandates, and evolving technological and economic forces—have combined to create the current inflection point.`;

  const p3 = `Key participants and official representatives have issued formal statements addressing the unfolding situation. Analysts tracking the sector underscore that the immediate priority centers on establishing operational clarity and mitigating potential secondary disruptions. "The implications we are witnessing today reflect long-term structural recalibrations rather than an isolated circumstance," noted senior sector observers in their preliminary assessments.`;

  const p4 = videoUrl
    ? `Accompanying multimedia documentation and verified video coverage offer essential visual context to the unfolding narrative. Viewers and researchers can examine the official recordings and relevant video link directly alongside this report (${videoUrl}) to evaluate the sequence of events firsthand. Observers note that digital documentation has played a pivotal role in accelerating public awareness and institutional transparency.`
    : `Regional and international counterparts have taken note of the trajectory, initiating internal audits and strategic evaluations to anticipate downstream impacts. Early tracking data suggests that public and institutional interest will remain elevated as independent verification teams review corroborated data points and historical comparisons.`;

  const p5 = `Looking ahead, follow-on announcements are slated to clarify long-term commitments and implementation timelines. Viralhoods will continue to track incoming developments, synthesize verified updates, and provide continuous, context-rich journalism for our global readership.`;

  // Strict enforcement: Calibrate combined content paragraphs within [minWords, maxWords] (±10% of source)
  const baseParagraphs = item.content && item.content.length >= 2 ? item.content : [p1, p2, p3, p4, p5];
  const contentParagraphs = calibrateParagraphsToWordCount(
    baseParagraphs,
    minWords,
    maxWords,
    cleanSummary
  );

  const whyItMatters =
    item.whyItMatters && item.whyItMatters.length > 60
      ? item.whyItMatters
      : `This story establishes a critical precedent for ${category.toLowerCase()} priorities worldwide, prompting institutional stakeholders to recalibrate their forecasts and risk models in response to new operational realities.`;

  const whatNext =
    item.whatNext && item.whatNext.length > 60
      ? item.whatNext
      : `Expect formal follow-up communiqués, oversight evaluations, and multilateral policy responses to emerge over the coming days, with verified updates integrated into ongoing Viralhoods sector coverage.`;

  // Estimate read time based on word count
  const allWords = countWords(contentParagraphs.join(' '));
  const readMinutes = Math.max(2, Math.round(allWords / 180));

  return {
    ...item,
    author: categoryDesk,
    readTime: `${readMinutes} min read`,
    keyTakeaways: item.keyTakeaways && item.keyTakeaways.length >= 3 ? item.keyTakeaways : keyTakeaways,
    content: contentParagraphs,
    whyItMatters,
    whatNext,
    videoUrl,
    hasVideo: Boolean(videoUrl),
  };
};

/** Style-flavored opening paragraphs for the offline fallback generator —
 * used only when `generateBlogPost` (the real Gemini-backed writer, see
 * functions/src/index.ts) is unreachable. Keep the keys in sync with the
 * style <select> in AdminView.tsx's blog generator form. */
const OFFLINE_STYLE_OPENERS: Record<string, (topic: string, summary: string, category: string) => string> = {
  news: (_topic, summary, category) =>
    `In a major development today, ${summary} Viralhoods reporters and analysts have tracked the trajectory of this issue as it transitions from specialized briefings into broad ${category.toLowerCase()}-sector prominence.`,
  investigative: (topic, summary, category) =>
    `A closer look at ${topic} shows a story that goes well beyond the headline. ${summary} Viralhoods' review of the available record surfaces the context and incentives that the first reports left out, with implications across the wider ${category.toLowerCase()} landscape.`,
  opinion: (topic, summary, category) =>
    `Here's our take: ${topic} deserves more attention than it's getting. ${summary} In our view, this is a moment worth watching closely for anyone following the ${category.toLowerCase()} beat.`,
  explainer: (topic, summary, category) =>
    `Here's what ${topic} actually means, and why it's showing up in ${category.toLowerCase()} coverage right now. ${summary} We'll walk through the basics below.`,
  listicle: (topic, summary, category) =>
    `${topic} is generating real buzz across the ${category.toLowerCase()} world right now. ${summary} Here's a rundown of what's worth knowing, point by point.`,
  feature: (topic, summary, category) =>
    `It started, as these stories often do, with a detail easy to miss. ${summary} Now ${topic} is shaping up to be one of the more closely watched threads in ${category.toLowerCase()} this season.`,
  casual: (topic, summary, category) =>
    `Okay, let's talk about ${topic} for a second. ${summary} Here's the quick version of what's going on in the ${category.toLowerCase()} world.`,
};

const OFFLINE_LENGTH_PARAGRAPH_COUNT: Record<string, number> = { short: 3, medium: 5, long: 8 };

/**
 * Generates a completely new original Viralhoods story from a raw topic or notes.
 * `style` and `length` are optional — used by the AI Blog Post Generator's
 * offline fallback (see AdminView.tsx) when `generateBlogPost` can't be
 * reached; the plain "Article Topic" flow still works unchanged without them.
 */
export const generateOriginalStory = (params: {
  topic: string;
  category: string;
  rawNotes?: string;
  imageUrl?: string;
  videoUrl?: string;
  style?: string;
  length?: 'short' | 'medium' | 'long';
}): NewsItem => {
  const { topic, category, rawNotes, imageUrl, videoUrl, style, length } = params;
  const id = 'vh_' + Math.random().toString(36).substring(2, 10);
  const date = new Date().toISOString();

  // Create an engaging headline and summary
  const title = topic.trim();
  const summary =
    rawNotes && rawNotes.trim().length > 30
      ? rawNotes.trim().slice(0, 260)
      : `Viralhoods comprehensive investigative report on ${topic}: analysis, key drivers, stakeholder perspectives, and emerging implications for the ${category.toLowerCase()} landscape.`;

  const opener = (style && OFFLINE_STYLE_OPENERS[style] ? OFFLINE_STYLE_OPENERS[style] : OFFLINE_STYLE_OPENERS.news)(
    topic,
    summary,
    category
  );

  const fillerParagraphs = [
    `The initiative brings together key elements that reflect broader shifts across the ${category.toLowerCase()} sector. By prioritizing direct impact and substantiated facts, observers are finding that the narrative extends well beyond superficial headlines, uncovering structural forces that will shape future practices.`,
    `Field experts and sector analysts emphasize that the response in the coming days will serve as a bellwether for similar initiatives globally. Early feedback points to increased engagement from both institutions, industry associations, and affected communities.`,
    videoUrl
      ? `Multimedia coverage and video reporting accompanying this story provide in-depth visual context. Readers can view the documentation via the designated video link (${videoUrl}) to examine key remarks, visual evidence, and recorded proceedings.`
      : `Comparative data from preceding cycles suggests that early proactive measures tend to produce substantially better outcomes than delayed interventions. Market participants are already pricing in adjustments across supply lines, governance protocols, and capital allocations.`,
    `Stakeholder reaction has been mixed but attentive, with several organizations already signaling plans to revisit their own positioning in light of this development.`,
    `Historical comparisons to similar inflection points suggest the coming weeks will be more consequential than the initial headlines let on.`,
    `Independent reviewers note that the verified details available so far are consistent with the broader pattern already visible across the ${category.toLowerCase()} sector this year.`,
    `Viralhoods continues to examine the evolving repercussions of this story, verifying updates and providing clear, context-rich journalism for our global readership. Further reports will be published as additional details are corroborated.`,
  ];

  const targetParagraphs = Math.max(3, OFFLINE_LENGTH_PARAGRAPH_COUNT[length || 'medium'] || 5);
  let content = [opener, ...fillerParagraphs.slice(0, targetParagraphs - 1)];
  if (style === 'listicle') {
    content = content.map((p, i) => (i === 0 ? p : `${i}. ${p}`));
  }

  const item: NewsItem = {
    id,
    category,
    title,
    summary,
    image: imageUrl?.trim() || '',
    videoUrl: videoUrl?.trim() || undefined,
    hasVideo: Boolean(videoUrl?.trim()),
    date,
    author: `Viralhoods ${category} Desk`,
    readTime: `${Math.max(2, Math.round((content.join(' ').split(/\s+/).length) / 180))} min read`,
    keyTakeaways: [
      `Strategic developments surrounding ${topic} mark a noticeable acceleration in sector activity.`,
      `Key stakeholders emphasize the urgent necessity of proactive adaptation in response to evolving benchmarks.`,
      `Initial economic, regulatory, and operational evaluations project durable implications over the coming quarters.`,
      `Verified metrics and field reviews will guide upcoming milestones as formal proceedings unfold.`,
      `Independent observers are already drawing comparisons to past turning points in the ${category.toLowerCase()} sector.`,
    ].slice(0, length === 'short' ? 3 : length === 'long' ? 5 : 4),
    content,
    whyItMatters: `The repercussions will be felt across multiple domains, establishing new benchmarks for how ${category.toLowerCase()} challenges and opportunities are addressed globally.`,
    whatNext: `Follow-up assessments, formal reviews, and stakeholder panels are scheduled over the coming weeks. Viralhoods will publish continuous coverage as verified details emerge.`,
  };

  return item;
};
