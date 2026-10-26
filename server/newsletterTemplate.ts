/**
 * Elegant Publication-Grade Email Newsletter Theme for Viralhoods (Server-Side).
 * Renders bulletproof HTML compatible with Gmail, Apple Mail, Outlook, and webmail clients.
 *
 * Enforces: Contains ONLY the single latest news from each of the 10 sectors.
 */

export interface NewsletterStory {
  id: string;
  title: string;
  summary: string;
  category: string;
  date?: string;
  image?: string;
  url?: string;
  keyTakeaways?: string[];
  subSector?: string;
}

export const SECTOR_LIST = [
  'World',
  'Politics',
  'Finance',
  'Health',
  'Entertainment',
  'Research',
  'Science',
  'AI',
  'Tech',
  'Sports',
] as const;

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  World: { bg: '#e0f2fe', text: '#0369a1', icon: '🌍' },
  Politics: { bg: '#fef3c7', text: '#b45309', icon: '🏛️' },
  Finance: { bg: '#dcfce7', text: '#15803d', icon: '📈' },
  Health: { bg: '#fee2e2', text: '#b91c1c', icon: '🏥' },
  Entertainment: { bg: '#f3e8ff', text: '#7e22ce', icon: '🎬' },
  Research: { bg: '#ffedd5', text: '#c2410c', icon: '🔬' },
  Science: { bg: '#cffafe', text: '#0e7490', icon: '🧬' },
  AI: { bg: '#ede9fe', text: '#6d28d9', icon: '🤖' },
  Tech: { bg: '#dbeafe', text: '#1d4ed8', icon: '💻' },
  Sports: { bg: '#fae8ff', text: '#a21caf', icon: '⚽' },
};

/**
 * Filters the stories collection so the newsletter contains ONLY the single latest news
 * item from each of the 10 monitored sectors.
 */
export function selectLatestStoryPerSector(stories: NewsletterStory[]): NewsletterStory[] {
  const result: NewsletterStory[] = [];

  for (const sector of SECTOR_LIST) {
    const matching = stories
      .filter((s) => {
        if (!s.category) return false;
        const c = s.category.trim().toLowerCase();
        const target = sector.toLowerCase();
        if (c === target) return true;
        if (target === 'ai' && (c === 'ai' || c === 'artificial intelligence' || c === 'ai & tech')) return true;
        if (target === 'tech' && (c === 'tech' || c === 'technology')) return true;
        return false;
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    if (matching.length > 0) {
      result.push(matching[0]);
    }
  }

  return result;
}

export function generateElegantNewsletterHtml(
  rawStories: NewsletterStory[],
  options?: {
    siteUrl?: string;
    editionDate?: string;
    recipientEmail?: string;
  }
): string {
  // Ensure the newsletter contains ONLY the latest news from each of the 10 sectors
  const sectorStories = selectLatestStoryPerSector(rawStories);
  const stories = sectorStories.length > 0 ? sectorStories : rawStories.slice(0, 10);

  const siteUrl = (options?.siteUrl || process.env.SITE_URL || 'https://viralhoods.com').replace(/\/$/, '');
  const todayStr =
    options?.editionDate ||
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

  const leadStory = stories[0] || null;
  const secondaryStories = stories.slice(1);

  // Group secondary stories by category
  const headlinesHtml = secondaryStories
    .map((story) => {
      const catStyle = CATEGORY_COLORS[story.category] || { bg: '#e2e8f0', text: '#334155', icon: '📰' };
      const storyUrl = story.id ? `${siteUrl}/#story-${story.id}` : siteUrl;

      return `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 18px 0; vertical-align: top;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 6px;">
                  <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${catStyle.bg}; color: ${catStyle.text}; padding: 3px 8px; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${catStyle.icon} LATEST IN ${story.category.toUpperCase()}
                  </span>
                  ${
                    story.date
                      ? `<span style="font-size: 12px; color: #94a3b8; margin-left: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${new Date(
                          story.date
                        ).toLocaleDateString()}</span>`
                      : ''
                  }
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 6px;">
                  <a href="${storyUrl}" style="text-decoration: none; font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.35; font-family: 'Georgia', serif; display: block;">
                    ${story.title}
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${story.summary || ''}
                  </p>
                  <a href="${storyUrl}" style="color: #0284c7; font-size: 13px; font-weight: 700; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Read full report &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viralhoods Daily Morning Dispatch</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Wrapper Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <!-- Top Gold Accent Line -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #0284c7 0%, #eab308 50%, #10b981 100%);"></td>
          </tr>

          <!-- Deep Navy Masthead Header -->
          <tr>
            <td style="background-color: #090d16; padding: 32px 32px 28px; text-align: center;">
              <!-- Edition Badge -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 12px;">
                <tr>
                  <td style="background-color: rgba(2, 132, 199, 0.2); border: 1px solid rgba(2, 132, 199, 0.4); padding: 4px 12px; border-radius: 20px;">
                    <span style="color: #38bdf8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      DAILY MORNING DISPATCH
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Masthead Brand Title -->
              <h1 style="margin: 0 0 6px; font-size: 32px; font-weight: 900; letter-spacing: 0.12em; color: #ffffff; font-family: 'Georgia', serif; text-transform: uppercase;">
                VIRALHOODS
              </h1>

              <!-- Subtitle & Date Ticker -->
              <p style="margin: 0 0 14px; font-size: 13px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.04em;">
                10-SECTOR EXECUTIVE BRIEFING &bull; ONE LATEST STORY PER SECTOR
              </p>

              <div style="display: inline-block; padding: 6px 14px; background-color: rgba(255, 255, 255, 0.07); border-radius: 6px; font-size: 12px; color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                📅 <strong>${todayStr}</strong> &bull; ${stories.length} Sectors Represented
              </div>
            </td>
          </tr>

          <!-- Intro Welcome Banner -->
          <tr>
            <td style="padding: 20px 32px 16px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Good morning. Here is today's curated briefing featuring <strong>only the single latest verified development</strong> from each of our 10 monitored sectors: World, Politics, Finance, Health, Entertainment, Research, Science, AI, Tech, and Sports.
              </p>
            </td>
          </tr>

          ${
            leadStory
              ? `
          <!-- LEAD FEATURED STORY SECTION -->
          <tr>
            <td style="padding: 28px 32px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0284c7; background-color: #e0f2fe; padding: 3px 8px; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ★ TOP FEATURED HEADLINE &bull; ${leadStory.category.toUpperCase()}
                    </span>
                  </td>
                </tr>

                ${
                  leadStory.image
                    ? `
                <tr>
                  <td style="padding-bottom: 16px;">
                    <a href="${leadStory.id ? `${siteUrl}/#story-${leadStory.id}` : siteUrl}" style="text-decoration: none;">
                      <img src="${leadStory.image}" alt="${leadStory.title}" width="556" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; display: block; border: 1px solid #e2e8f0;" />
                    </a>
                  </td>
                </tr>
                `
                    : ''
                }

                <tr>
                  <td style="padding-bottom: 10px;">
                    <a href="${leadStory.id ? `${siteUrl}/#story-${leadStory.id}` : siteUrl}" style="text-decoration: none; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.35; font-family: 'Georgia', serif; display: block;">
                      ${leadStory.title}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 18px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${leadStory.summary || ''}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #0284c7; border-radius: 6px; text-align: center;">
                          <a href="${leadStory.id ? `${siteUrl}/#story-${leadStory.id}` : siteUrl}" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Read Full Report on Viralhoods &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ''
          }

          <!-- SECTION DIVIDER: ALL SECTORS LATEST NEWS -->
          <tr>
            <td style="padding: 16px 32px 10px; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top: 2px solid #0f172a; padding-top: 14px;">
                    <h2 style="margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'Georgia', serif; letter-spacing: 0.02em;">
                      Latest Story From Each Sector
                    </h2>
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      One verified breakthrough per category, updated continuously.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HEADLINES LIST (EXACTLY 1 STORY PER SECTOR) -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                ${headlinesHtml}
              </table>
            </td>
          </tr>

          <!-- QUICK ACCESS BUTTON BAR -->
          <tr>
            <td style="padding: 20px 32px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Explore all 10 live sectors, AI tools & community discussions on the site
              </p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="background-color: #0f172a; border-radius: 6px; text-align: center;">
                    <a href="${siteUrl}" style="display: inline-block; padding: 11px 24px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Visit Viralhoods Live Feed &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ELEGANT EDITORIAL FOOTER -->
          <tr>
            <td style="background-color: #090d16; padding: 28px 32px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: 0.08em;">
                VIRALHOODS
              </p>
              <p style="margin: 0 0 12px; color: #94a3b8;">
                Autonomous News Aggregation &amp; Paraphrasing Intelligence Platform.<br>
                Automated daily dispatch triggered following the 12:00 AM UTC scraping routine.
              </p>
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                You are receiving this morning briefing because you enrolled at <a href="${siteUrl}" style="color: #38bdf8; text-decoration: none;">Viralhoods.com</a>.<br>
                ${options?.recipientEmail ? `Sent to: ${options.recipientEmail} &bull; ` : ''}
                <a href="${siteUrl}/#all" style="color: #38bdf8; text-decoration: none;">Home Feed</a> &bull;
                <a href="${siteUrl}/#about" style="color: #38bdf8; text-decoration: none;">About</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
