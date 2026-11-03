// Cloudflare Pages Function — GET /api/github-stats
//
// Why this exists (PERF-02): GitHubActivity.jsx used to call
// api.github.com directly from every visitor's browser, unauthenticated.
// GitHub's unauthenticated rate limit is 60 requests/hour *per source IP*,
// shared across everyone behind the same NAT/corporate proxy/campus
// network — a real risk for this site's audience, since recruiters and
// hiring managers are disproportionately likely to be on a shared
// corporate egress IP. When the limit was hit, the widget silently fell
// back to an error state, with no visibility into how often that happened.
//
// The fix: proxy the request through this function, authenticated with a
// GitHub personal access token (raises the limit to 5,000/hour) and cached
// at Cloudflare's edge for 10 minutes, so a burst of visitors only costs
// one upstream GitHub call instead of one per visitor.
//
// Setup required in GitHub:
//   Settings > Developer settings > Personal access tokens > Fine-grained
//   tokens > Generate new token. No special scopes needed for public
//   profile/repo data — a token with no repository access still raises
//   the rate limit for public endpoints.
//
// Setup required in Cloudflare Pages:
//   Settings > Environment variables > Production (and Preview)
//     GITHUB_TOKEN = <the token from the step above>
//   If GITHUB_TOKEN isn't set, this function still works — it just falls
//   back to the same unauthenticated 60/hour limit the frontend used to
//   hit directly, so nothing breaks in local dev without the token.

const GITHUB_USERNAME = 'kleo2006';
const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_TTL_SECONDS = 600; // 10 minutes

export async function onRequestGet(context) {
  const { env, waitUntil, request } = context;

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/github-stats', request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kleo-portfolio-github-stats',
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}`, { headers }),
      fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?sort=pushed&per_page=100`, { headers }),
    ]);

    if (!profileRes.ok || !reposRes.ok) {
      console.error('[api/github-stats] Upstream GitHub request failed', {
        profileStatus: profileRes.status,
        reposStatus: reposRes.status,
      });
      return jsonResponse({ error: 'GitHub request failed' }, 502);
    }

    const profile = await profileRes.json();
    const repos = await reposRes.json();

    const languageCounts = repos.reduce((acc, repo) => {
      if (!repo.language) return acc;
      acc[repo.language] = (acc[repo.language] || 0) + 1;
      return acc;
    }, {});

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const lastPushed = repos[0];

    const payload = {
      publicRepos: profile.public_repos,
      followers: profile.followers,
      profileUrl: profile.html_url,
      topLanguages,
      lastPushed: lastPushed
        ? {
            name: lastPushed.name,
            url: lastPushed.html_url,
            updatedAt: lastPushed.pushed_at,
          }
        : null,
    };

    const response = jsonResponse(payload, 200, {
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
    });

    // Populate the edge cache in the background so this response isn't
    // held up by the cache write.
    waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    console.error('[api/github-stats] Unexpected error', error);
    return jsonResponse({ error: 'Unexpected server error' }, 500);
  }
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
