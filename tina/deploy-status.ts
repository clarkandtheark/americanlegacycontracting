const REPO = 'clarkandtheark/americanlegacycontracting';
const API = `https://api.github.com/repos/${REPO}/actions/runs?branch=main&per_page=5`;
const ACTIVE_INTERVAL = 10_000;
const IDLE_INTERVAL = 60_000;
const AUTO_STOP_AFTER = 10 * 60_000;
const WIDGET_ID = 'deploy-status-widget';

type Run = {
  status: string;
  conclusion: string | null;
  display_title?: string;
  head_commit?: { message?: string };
  updated_at: string;
  run_started_at?: string;
  created_at: string;
  html_url: string;
};

function formatAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.round(secs)}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}

function firstLine(s?: string | null): string {
  return (s || '').split('\n')[0];
}

export function mountDeployStatusWidget() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(WIDGET_ID)) return;

  const root = document.createElement('div');
  root.id = WIDGET_ID;
  root.innerHTML = `
    <style>
      #${WIDGET_ID} {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #1a1a1a;
      }
      #${WIDGET_ID} .ds-pill {
        background: #ffffff;
        border: 1px solid #e4e1db;
        border-radius: 999px;
        padding: 8px 14px 8px 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.08);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        user-select: none;
        transition: box-shadow 0.15s ease;
      }
      #${WIDGET_ID} .ds-pill:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
      #${WIDGET_ID} .ds-dot {
        width: 10px; height: 10px; border-radius: 50%; background: #ccc; flex-shrink: 0;
      }
      #${WIDGET_ID} .ds-dot.live { background: #1f7a3a; box-shadow: 0 0 0 3px rgba(31,122,58,0.18); }
      #${WIDGET_ID} .ds-dot.building { background: #2a5fa0; box-shadow: 0 0 0 3px rgba(42,95,160,0.18); animation: ds-pulse 1.6s ease-in-out infinite; }
      #${WIDGET_ID} .ds-dot.queued { background: #b88100; box-shadow: 0 0 0 3px rgba(184,129,0,0.18); }
      #${WIDGET_ID} .ds-dot.failed { background: #b02020; box-shadow: 0 0 0 3px rgba(176,32,32,0.18); }
      @keyframes ds-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

      #${WIDGET_ID} .ds-panel {
        display: none;
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        width: 320px;
        background: #ffffff;
        border: 1px solid #e4e1db;
        border-radius: 10px;
        padding: 14px 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.14);
        font-size: 13px;
        line-height: 1.4;
      }
      #${WIDGET_ID}.open .ds-panel { display: block; }
      #${WIDGET_ID} .ds-panel h4 {
        margin: 0 0 4px;
        font-size: 15px;
        font-weight: 600;
      }
      #${WIDGET_ID} .ds-detail { color: #6b6b6b; margin-bottom: 12px; }
      #${WIDGET_ID} .ds-runs { border-top: 1px solid #e4e1db; padding-top: 10px; }
      #${WIDGET_ID} .ds-run { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; }
      #${WIDGET_ID} .ds-run .ds-dot { margin-top: 4px; box-shadow: none; width: 8px; height: 8px; }
      #${WIDGET_ID} .ds-msg { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #${WIDGET_ID} .ds-when { color: #6b6b6b; font-size: 12px; margin-top: 1px; }
      #${WIDGET_ID} .ds-link { margin-left: auto; color: #2a5fa0; text-decoration: none; font-size: 12px; flex-shrink: 0; }
      #${WIDGET_ID} .ds-link:hover { text-decoration: underline; }
      #${WIDGET_ID} .ds-foot { color: #9a9a9a; font-size: 11px; margin-top: 10px; text-align: right; }
      #${WIDGET_ID} .ds-err { color: #b02020; font-size: 12px; margin-top: 8px; }
    </style>
    <div class="ds-pill" role="button" aria-label="Deploy status">
      <div class="ds-dot"></div>
      <span class="ds-label">Checking…</span>
    </div>
    <div class="ds-panel" role="region" aria-label="Deploy details">
      <h4 class="ds-headline">Checking…</h4>
      <div class="ds-detail">Connecting to GitHub</div>
      <div class="ds-runs" aria-label="Recent builds"></div>
      <div class="ds-err" hidden></div>
      <div class="ds-foot"></div>
    </div>
  `;
  document.body.appendChild(root);

  const pill = root.querySelector<HTMLElement>('.ds-pill')!;
  const pillDot = root.querySelector<HTMLElement>('.ds-pill .ds-dot')!;
  const pillLabel = root.querySelector<HTMLElement>('.ds-label')!;
  const panelDot = null;
  const headline = root.querySelector<HTMLElement>('.ds-headline')!;
  const detail = root.querySelector<HTMLElement>('.ds-detail')!;
  const runsEl = root.querySelector<HTMLElement>('.ds-runs')!;
  const errEl = root.querySelector<HTMLElement>('.ds-err')!;
  const footEl = root.querySelector<HTMLElement>('.ds-foot')!;

  pill.addEventListener('click', () => root.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) root.classList.remove('open');
  });

  let timer: number | null = null;
  let lastActivityAt = Date.now();
  let stopped = false;

  function runClass(run: Run): string {
    if (run.status !== 'completed') return run.status === 'queued' ? 'queued' : 'building';
    return run.conclusion === 'success' ? 'live' : 'failed';
  }

  function runLabel(run: Run): string {
    if (run.status !== 'completed') return run.status === 'queued' ? 'Queued' : 'Building';
    if (run.conclusion === 'success') return 'Deployed';
    return `Build ${run.conclusion || 'failed'}`;
  }

  function render(runs: Run[]) {
    if (runs.length === 0) {
      pillDot.className = 'ds-dot';
      pillLabel.textContent = 'No recent builds';
      headline.textContent = 'No recent builds';
      detail.textContent = 'Nothing has been deployed recently.';
      runsEl.innerHTML = '';
      return;
    }
    const latest = runs[0];
    const active = runs.find((r) => r.status !== 'completed');
    if (active) {
      lastActivityAt = Date.now();
      const cls = active.status === 'queued' ? 'queued' : 'building';
      pillDot.className = `ds-dot ${cls}`;
      pillLabel.textContent = active.status === 'queued' ? 'Queued' : 'Building…';
      headline.textContent = active.status === 'queued' ? 'Queued' : 'Building…';
      detail.textContent = `"${firstLine(active.display_title || active.head_commit?.message)}" — started ${formatAgo(active.run_started_at || active.created_at)}`;
    } else if (latest.conclusion === 'success') {
      pillDot.className = 'ds-dot live';
      pillLabel.textContent = `Live · ${formatAgo(latest.updated_at)}`;
      headline.textContent = 'Live ✓';
      detail.textContent = `Last update: "${firstLine(latest.display_title || latest.head_commit?.message)}" — ${formatAgo(latest.updated_at)}`;
    } else {
      pillDot.className = 'ds-dot failed';
      pillLabel.textContent = `Build ${latest.conclusion || 'failed'}`;
      headline.textContent = `Build ${latest.conclusion || 'failed'}`;
      detail.textContent = `"${firstLine(latest.display_title || latest.head_commit?.message)}" — ${formatAgo(latest.updated_at)}. Previous version still live.`;
    }

    runsEl.innerHTML = '';
    for (const run of runs.slice(0, 5)) {
      const row = document.createElement('div');
      row.className = 'ds-run';
      row.innerHTML = `
        <div class="ds-dot ${runClass(run)}"></div>
        <div style="flex:1;min-width:0">
          <div class="ds-msg"></div>
          <div class="ds-when"></div>
        </div>
        <a class="ds-link" target="_blank" rel="noopener">view</a>
      `;
      row.querySelector('.ds-msg')!.textContent = firstLine(run.display_title || run.head_commit?.message) || '(no message)';
      row.querySelector('.ds-when')!.textContent = `${runLabel(run)} · ${formatAgo(run.updated_at)}`;
      (row.querySelector('.ds-link') as HTMLAnchorElement).href = run.html_url;
      runsEl.appendChild(row);
    }
  }

  function scheduleNext(runs: Run[]) {
    if (stopped) return;
    if (Date.now() - lastActivityAt > AUTO_STOP_AFTER) {
      stopped = true;
      footEl.textContent = 'Paused after 10 min idle. Click to resume.';
      return;
    }
    const active = runs.some((r) => r.status !== 'completed');
    const delay = active ? ACTIVE_INTERVAL : IDLE_INTERVAL;
    footEl.textContent = `Refreshing every ${delay / 1000}s`;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(refresh, delay);
  }

  async function refresh() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
      const data = await res.json();
      const runs: Run[] = data.workflow_runs || [];
      errEl.hidden = true;
      render(runs);
      scheduleNext(runs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errEl.textContent = `Couldn't reach GitHub: ${msg}`;
      errEl.hidden = false;
      scheduleNext([]);
    }
  }

  pill.addEventListener('click', () => {
    if (stopped) {
      stopped = false;
      lastActivityAt = Date.now();
      refresh();
    }
  });

  refresh();
}
