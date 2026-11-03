import { memo, useEffect, useState } from 'react';

import "./GitHubActivity.css";

const GITHUB_USERNAME = 'kleo2006';

// Cycles through the same signature spectrum used for tech chips
// elsewhere, so this reads as part of the same design system.
const CHIP_COLORS = ['var(--color-accent)', 'var(--color-violet)', 'var(--color-warm)', 'var(--color-signal)'];

function timeAgo(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function GitHubActivity() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profileRes, reposRes] = await Promise.all([
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}`),
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=pushed&per_page=100`),
        ]);

        if (!profileRes.ok || !reposRes.ok) throw new Error('GitHub request failed');

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

        if (!cancelled) {
          setStats({
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
          });
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="github-activity" aria-label="Live GitHub activity">
      <div className="github-activity__head">
        <span className="github-activity__pulse" aria-hidden="true" />
        <span>LIVE FROM GITHUB</span>
      </div>

      {status === 'loading' && (
        <div className="github-activity__skeleton" aria-hidden="true">
          <div className="github-activity__skeleton-row" />
          <div className="github-activity__skeleton-row" />
          <div className="github-activity__skeleton-row github-activity__skeleton-row--short" />
        </div>
      )}

      {status === 'error' && (
        <p className="github-activity__fallback">
          Live stats are unavailable right now —{' '}
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noreferrer"
          >
            view the GitHub profile directly
          </a>
          .
        </p>
      )}

      {status === 'ready' && stats && (
        <>
          <dl className="github-activity__stats">
            <div className="github-activity__stat">
              <dt>Public repos</dt>
              <dd>{stats.publicRepos}</dd>
            </div>
            <div className="github-activity__stat">
              <dt>Followers</dt>
              <dd>{stats.followers}</dd>
            </div>
          </dl>

          {stats.topLanguages.length > 0 && (
            <div className="github-activity__languages">
              <span className="github-activity__languages-label">
                Most-used languages
              </span>
              <ul>
                {stats.topLanguages.map((lang, i) => (
                  <li key={lang} style={{ '--chip-color': CHIP_COLORS[i % CHIP_COLORS.length] }}>
                    {lang}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.lastPushed && (
            <a
              href={stats.lastPushed.url}
              target="_blank"
              rel="noreferrer"
              className="github-activity__last-push"
            >
              <span className="github-activity__last-push-label">Last shipped</span>
              <span className="github-activity__last-push-repo">
                {stats.lastPushed.name}
                <span className="github-activity__last-push-time">
                  {timeAgo(stats.lastPushed.updatedAt)}
                </span>
              </span>
            </a>
          )}

          <a
            href={stats.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="github-activity__cta"
          >
            View full GitHub
          </a>
        </>
      )}
    </aside>
  );
}

export default memo(GitHubActivity);