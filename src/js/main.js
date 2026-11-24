const CHROME_EXTENSION_ID = "apgkphplddmjkoogmoijendkdjaaeiii";
const FIREFOX_ADDON_SLUG = "cerolingo";
const GITHUB_REPO = "ancym0n/Cerolingo";

const STATS_CACHE_KEY = "cerolingo:stats-v2";
const STATS_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 3200;

function parseCount(raw) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw !== "string") return null;

  const cleaned = raw.trim().toLowerCase().replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*([km])?\+?$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (!Number.isFinite(num) || num < 0) return null;

  if (match[2] === "k") return Math.round(num * 1000);
  if (match[2] === "m") return Math.round(num * 1000000);
  return Math.round(num);
}

function parseRating(raw) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.min(5, raw);
  }
  if (typeof raw !== "string") return null;

  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*5)?/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.min(5, num);
}

function parseVersionTag(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.match(/v?(\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?)/i);
  return match ? `v${match[1]}` : null;
}

async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const res = await fetchWithTimeout(url, timeoutMs);
  return res.json();
}

async function fetchShieldsValue(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const data = await fetchJson(url, timeoutMs);
  if (!data || data.isError) return null;
  const val = data.value ?? data.message;
  if (typeof val !== "string") return null;
  if (
    /invalid|not found|inaccessible|unparseable|unavailable|error|unknown/i.test(
      val,
    )
  ) {
    return null;
  }
  return val.trim();
}

async function fetchBadgenValue(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const res = await fetchWithTimeout(url, timeoutMs);
  const svg = await res.text();
  const titleMatch =
    svg.match(/<title>([^<]+)<\/title>/i) ||
    svg.match(/aria-label="([^"]+)"/i);
  if (!titleMatch) return null;
  const raw = titleMatch[1];
  const colonIdx = raw.indexOf(":");
  const val = (colonIdx >= 0 ? raw.slice(colonIdx + 1) : raw).trim();
  if (!val || /unknown|not found|error|invalid|n\/a/i.test(val)) return null;
  return val;
}

// Return the first non-null result from parallel tasks
function raceValid(tasks) {
  if (!tasks.length) return Promise.resolve(null);
  return new Promise((resolve) => {
    let remaining = tasks.length;
    let settled = false;

    const done = (val) => {
      if (settled) return;
      if (val !== null && val !== undefined) {
        settled = true;
        resolve(val);
        return;
      }
      remaining -= 1;
      if (remaining === 0) {
        settled = true;
        resolve(null);
      }
    };

    for (const task of tasks) {
      Promise.resolve()
        .then(task)
        .then(done, () => done(null));
    }
  });
}

function setVersionText(rawTag) {
  const versionEl = document.getElementById("version");
  const tag = parseVersionTag(rawTag);
  if (!versionEl || !tag) return;
  versionEl.textContent = tag;
}

function readCachedStats() {
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.at !== "number" ||
      Date.now() - parsed.at > STATS_CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    return parsed.data || null;
  } catch {
    return null;
  }
}

function writeCachedStats(data) {
  try {
    localStorage.setItem(
      STATS_CACHE_KEY,
      JSON.stringify({ data, at: Date.now() }),
    );
  } catch {
    /* ignore storage quota / privacy mode errors */
  }
}

async function fetchGitHubStats() {
  const apiReleasesPromise = fetchJson(
    `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=100`,
    2800,
  ).catch(() => null);

  const apiRepoPromise = fetchJson(
    `https://api.github.com/repos/${GITHUB_REPO}`,
    2800,
  ).catch(() => null);

  const versionPromise = raceValid([
    async () => {
      const releases = await apiReleasesPromise;
      if (Array.isArray(releases) && releases[0]?.tag_name) {
        return parseVersionTag(releases[0].tag_name);
      }
      return null;
    },
    async () =>
      parseVersionTag(
        await fetchShieldsValue(
          `https://img.shields.io/github/v/release/${GITHUB_REPO}.json`,
        ),
      ),
    async () =>
      parseVersionTag(
        await fetchBadgenValue(
          `https://badgen.net/github/release/${GITHUB_REPO}`,
        ),
      ),
  ]);

  const downloadsPromise = raceValid([
    async () => {
      const releases = await apiReleasesPromise;
      if (!Array.isArray(releases) || releases.length === 0) return null;
      let total = 0;
      for (const rel of releases) {
        if (Array.isArray(rel?.assets)) {
          for (const asset of rel.assets) {
            if (typeof asset?.download_count === "number") {
              total += asset.download_count;
            }
          }
        }
      }
      return total;
    },
    async () =>
      parseCount(
        await fetchShieldsValue(
          `https://img.shields.io/github/downloads/${GITHUB_REPO}/total.json`,
        ),
      ),
  ]);

  const starsPromise = raceValid([
    async () => {
      const repo = await apiRepoPromise;
      return typeof repo?.stargazers_count === "number"
        ? repo.stargazers_count
        : null;
    },
    async () =>
      parseCount(
        await fetchShieldsValue(
          `https://img.shields.io/github/stars/${GITHUB_REPO}.json`,
        ),
      ),
    async () =>
      parseCount(
        await fetchBadgenValue(
          `https://badgen.net/github/stars/${GITHUB_REPO}`,
        ),
      ),
  ]);

  const [version, downloads, stars] = await Promise.all([
    versionPromise,
    downloadsPromise,
    starsPromise,
  ]);

  if (version) setVersionText(version);
  return { version, downloads, stars };
}

async function fetchChromeUsersOnce(timeoutMs = REQUEST_TIMEOUT_MS) {
  return raceValid([
    async () => {
      const val = await fetchShieldsValue(
        `https://img.shields.io/chrome-web-store/users/${CHROME_EXTENSION_ID}.json`,
        timeoutMs,
      );
      const count = parseCount(val);
      return count !== null && count > 0 ? count : null;
    },
    async () => {
      const val = await fetchBadgenValue(
        `https://badgen.net/chrome-web-store/users/${CHROME_EXTENSION_ID}`,
        timeoutMs,
      );
      const count = parseCount(val);
      return count !== null && count > 0 ? count : null;
    },
  ]);
}

async function fetchChromeRatingOnce(timeoutMs = REQUEST_TIMEOUT_MS) {
  return raceValid([
    async () =>
      parseRating(
        await fetchShieldsValue(
          `https://img.shields.io/chrome-web-store/rating/${CHROME_EXTENSION_ID}.json`,
          timeoutMs,
        ),
      ),
    async () =>
      parseRating(
        await fetchBadgenValue(
          `https://badgen.net/chrome-web-store/rating/${CHROME_EXTENSION_ID}`,
          timeoutMs,
        ),
      ),
  ]);
}

async function fetchChromeStats() {
  const [users, rating] = await Promise.all([
    fetchChromeUsersOnce(),
    fetchChromeRatingOnce(),
  ]);

  return {
    users,
    downloads: users,
    rating,
  };
}

async function fetchFirefoxUsersBackup(timeoutMs = REQUEST_TIMEOUT_MS) {
  return raceValid([
    async () =>
      parseCount(
        await fetchShieldsValue(
          `https://img.shields.io/amo/users/${FIREFOX_ADDON_SLUG}.json`,
          timeoutMs,
        ),
      ),
    async () =>
      parseCount(
        await fetchBadgenValue(
          `https://badgen.net/amo/users/${FIREFOX_ADDON_SLUG}`,
          timeoutMs,
        ),
      ),
  ]);
}

async function fetchFirefoxRatingBackup(timeoutMs = REQUEST_TIMEOUT_MS) {
  return raceValid([
    async () =>
      parseRating(
        await fetchShieldsValue(
          `https://img.shields.io/amo/rating/${FIREFOX_ADDON_SLUG}.json`,
          timeoutMs,
        ),
      ),
    async () =>
      parseRating(
        await fetchBadgenValue(
          `https://badgen.net/amo/rating/${FIREFOX_ADDON_SLUG}`,
          timeoutMs,
        ),
      ),
  ]);
}

async function fetchFirefoxWeeklyBackup(timeoutMs = REQUEST_TIMEOUT_MS) {
  return raceValid([
    async () => {
      const val = await fetchShieldsValue(
        `https://img.shields.io/amo/dw/${FIREFOX_ADDON_SLUG}.json`,
        timeoutMs,
      );
      if (!val) return null;
      return parseCount(val.replace(/\/week/i, ""));
    },
  ]);
}

async function fetchFirefoxStats() {
  let users = null;
  let weeklyDownloads = null;
  let rating = null;

  try {
    const data = await fetchJson(
      `https://addons.mozilla.org/api/v5/addons/addon/${FIREFOX_ADDON_SLUG}/`,
      2600,
    );
    if (typeof data?.average_daily_users === "number") {
      users = Math.round(data.average_daily_users);
    }
    if (typeof data?.weekly_downloads === "number") {
      weeklyDownloads = Math.round(data.weekly_downloads);
    }
    const avgRating = parseRating(data?.ratings?.average);
    if (avgRating !== null) {
      rating = avgRating;
    }
  } catch (_) {}

  // Fetch backups only for missing fields
  const [backupUsers, backupWeekly, backupRating] = await Promise.all([
    users === null ? fetchFirefoxUsersBackup() : Promise.resolve(users),
    weeklyDownloads === null
      ? fetchFirefoxWeeklyBackup()
      : Promise.resolve(weeklyDownloads),
    rating === null ? fetchFirefoxRatingBackup() : Promise.resolve(rating),
  ]);

  users = backupUsers;
  weeklyDownloads = backupWeekly;
  rating = backupRating;

  const downloads =
    users !== null
      ? Math.max(users + (weeklyDownloads || 0), users)
      : weeklyDownloads;

  return { users, downloads, rating };
}

function updateStatDividers() {
  const statsContainer = document.getElementById("stats");
  if (!statsContainer || statsContainer.hidden) return;

  const markRowStarts = (items) => {
    let prevTop = null;
    for (const item of items) {
      const top = item.offsetTop;
      const isRowStart = prevTop === null || Math.abs(top - prevTop) > 4;
      item.classList.toggle("is-row-start", isRowStart);
      prevTop = top;
    }
  };

  const skeletons = Array.from(
    statsContainer.querySelectorAll(".stat-skeleton"),
  ).filter((el) => el.offsetParent !== null);
  if (skeletons.length > 0) markRowStarts(skeletons);

  const realItems = Array.from(
    statsContainer.querySelectorAll(".stat-item:not([hidden])"),
  ).filter((el) => el.offsetParent !== null);
  if (realItems.length > 0) markRowStarts(realItems);
}

function mergeStatsState(base, incoming) {
  const next = { ...(base || {}) };
  for (const [key, val] of Object.entries(incoming || {})) {
    if (val !== null && val !== undefined) {
      next[key] = val;
    }
  }
  return next;
}

function buildPendingItems(state) {
  const activeUsersEl = document.getElementById("active-users");
  const totalDownloadsEl = document.getElementById("total-downloads");
  const githubStarsEl = document.getElementById("github-stars");
  const chromeRatingEl = document.getElementById("chrome-rating");
  const firefoxRatingEl = document.getElementById("firefox-rating");

  const chromeUsers =
    typeof state.chromeUsers === "number" ? state.chromeUsers : null;
  const firefoxUsers =
    typeof state.firefoxUsers === "number" ? state.firefoxUsers : null;
  const ghDownloads =
    typeof state.ghDownloads === "number" ? state.ghDownloads : null;
  const chromeDownloads =
    typeof state.chromeDownloads === "number"
      ? state.chromeDownloads
      : chromeUsers;
  const firefoxDownloads =
    typeof state.firefoxDownloads === "number"
      ? state.firefoxDownloads
      : firefoxUsers;

  const totalActiveUsers = (chromeUsers || 0) + (firefoxUsers || 0);
  const totalDownloads =
    (ghDownloads || 0) + (chromeDownloads || 0) + (firefoxDownloads || 0);

  const pending = [];

  if (
    activeUsersEl &&
    (chromeUsers !== null || firefoxUsers !== null) &&
    totalActiveUsers > 0
  ) {
    pending.push({
      el: activeUsersEl,
      text: `Users: ${totalActiveUsers.toLocaleString()}`,
    });
  }

  if (
    totalDownloadsEl &&
    (ghDownloads !== null ||
      chromeDownloads !== null ||
      firefoxDownloads !== null) &&
    totalDownloads > 0
  ) {
    pending.push({
      el: totalDownloadsEl,
      text: `Downloads: ${totalDownloads.toLocaleString()}`,
    });
  }

  if (
    githubStarsEl &&
    typeof state.ghStars === "number" &&
    state.ghStars >= 0
  ) {
    pending.push({
      el: githubStarsEl,
      text: `GitHub: ★ ${state.ghStars.toLocaleString()}`,
    });
  }

  if (chromeRatingEl && typeof state.chromeRating === "number") {
    pending.push({
      el: chromeRatingEl,
      text: `Chrome: ★ ${state.chromeRating.toFixed(1)}`,
    });
  }

  if (firefoxRatingEl && typeof state.firefoxRating === "number") {
    pending.push({
      el: firefoxRatingEl,
      text: `Firefox: ★ ${state.firefoxRating.toFixed(1)}`,
    });
  }

  return pending;
}

function renderStatsBar(state, { isFinal = false } = {}) {
  const statsContainer = document.getElementById("stats");
  if (!statsContainer || statsContainer.hidden) return;

  const pending = buildPendingItems(state);
  const hasAnyStat = pending.length > 0;

  // Update values in place after initial render
  if (statsContainer.classList.contains("is-loaded")) {
    if (!hasAnyStat) return;
    let changed = false;
    for (const { el, text } of pending) {
      if (el.textContent !== text || el.hidden) {
        el.textContent = text;
        el.hidden = false;
        changed = true;
      }
    }
    if (changed) updateStatDividers();
    return;
  }

  const STATS_RESIZE_MS = 450;
  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("is-booting");

  const measure = () => {
    const cs = getComputedStyle(statsContainer);
    return { width: parseFloat(cs.width), height: parseFloat(cs.height) };
  };

  const animateResize = (mutate, onDone) => {
    const from = measure();
    mutate();
    const to = measure();

    if (
      reduceMotion ||
      (Math.abs(from.width - to.width) < 1 &&
        Math.abs(from.height - to.height) < 1)
    ) {
      onDone();
      return;
    }

    statsContainer.classList.add("is-resizing");
    statsContainer.style.width = `${from.width}px`;
    statsContainer.style.height = `${from.height}px`;
    void statsContainer.offsetWidth;
    statsContainer.style.width = `${to.width}px`;
    statsContainer.style.height = `${to.height}px`;

    setTimeout(() => {
      statsContainer.style.width = "";
      statsContainer.style.height = "";
      statsContainer.classList.remove("is-resizing");
      onDone();
    }, STATS_RESIZE_MS);
  };

  if (hasAnyStat) {
    animateResize(
      () => {
        for (const { el, text } of pending) {
          el.textContent = text;
          el.hidden = false;
        }
        statsContainer.removeAttribute("aria-busy");
        statsContainer.classList.add("is-swapping");
        statsContainer.classList.remove("is-loading");
        updateStatDividers();
      },
      () => {
        updateStatDividers();
        statsContainer.classList.add("is-loaded");
        setTimeout(
          () => statsContainer.classList.remove("is-swapping"),
          reduceMotion ? 0 : 350,
        );
      },
    );
  } else if (isFinal) {
    statsContainer.removeAttribute("aria-busy");
    const gap = parseFloat(
      getComputedStyle(statsContainer.parentElement).rowGap || "0",
    );
    statsContainer.classList.add("is-resizing");
    statsContainer.style.height = `${statsContainer.offsetHeight}px`;
    void statsContainer.offsetWidth;
    statsContainer.classList.add("is-empty");
    statsContainer.style.height = "0px";
    statsContainer.style.minHeight = "0px";
    statsContainer.style.paddingTop = "0px";
    statsContainer.style.paddingBottom = "0px";
    statsContainer.style.borderWidth = "0px";
    statsContainer.style.marginTop = `${-gap}px`;
    statsContainer.style.marginBottom = "0px";
    setTimeout(
      () => {
        statsContainer.hidden = true;
        statsContainer.removeAttribute("style");
        statsContainer.classList.remove("is-resizing", "is-loading");
      },
      reduceMotion ? 0 : STATS_RESIZE_MS,
    );
  }
}

async function loadAllStats() {
  const statsContainer = document.getElementById("stats");
  let state = readCachedStats() || {};

  if (state.version) {
    setVersionText(state.version);
  }

  // Render cached stats immediately while refreshing in the background
  const hasCachedRender =
    statsContainer &&
    !statsContainer.hidden &&
    buildPendingItems(state).length > 0;
  if (hasCachedRender) {
    renderStatsBar(state);
  }

  const refreshLive = async () => {
    const [github, chrome, firefox] = await Promise.all([
      fetchGitHubStats(),
      fetchChromeStats(),
      fetchFirefoxStats(),
    ]);

    state = mergeStatsState(state, {
      version: github.version,
      ghDownloads: github.downloads,
      ghStars: github.stars,
      chromeUsers: chrome.users,
      chromeDownloads: chrome.downloads,
      chromeRating: chrome.rating,
      firefoxUsers: firefox.users,
      firefoxDownloads: firefox.downloads,
      firefoxRating: firefox.rating,
    });

    if (state.version) setVersionText(state.version);

    const needsChromeUsersRetry = state.chromeUsers === null || state.chromeUsers === undefined;
    const needsChromeRatingRetry = state.chromeRating === null || state.chromeRating === undefined;
    const needsFirefoxUsersRetry = state.firefoxUsers === null || state.firefoxUsers === undefined;
    const needsFirefoxRatingRetry = state.firefoxRating === null || state.firefoxRating === undefined;
    const hasMissingStoreStat =
      needsChromeUsersRetry ||
      needsChromeRatingRetry ||
      needsFirefoxUsersRetry ||
      needsFirefoxRatingRetry;

    if (!hasMissingStoreStat || hasCachedRender) {
      renderStatsBar(state, { isFinal: !hasMissingStoreStat });
    }

    if (hasMissingStoreStat) {
      // Retry missing store stats
      await wait(650);
      const [rChromeUsers, rChromeRating, rFirefoxUsers, rFirefoxRating] =
        await Promise.all([
          needsChromeUsersRetry ? fetchChromeUsersOnce(4500) : null,
          needsChromeRatingRetry ? fetchChromeRatingOnce(4500) : null,
          needsFirefoxUsersRetry ? fetchFirefoxUsersBackup(4500) : null,
          needsFirefoxRatingRetry ? fetchFirefoxRatingBackup(4500) : null,
        ]);

      state = mergeStatsState(state, {
        chromeUsers: rChromeUsers,
        chromeDownloads: rChromeUsers,
        chromeRating: rChromeRating,
        firefoxUsers: rFirefoxUsers,
        firefoxDownloads:
          rFirefoxUsers !== null ? rFirefoxUsers : null,
        firefoxRating: rFirefoxRating,
      });
    }

    renderStatsBar(state, { isFinal: true });

    if (buildPendingItems(state).length > 0 || state.version) {
      writeCachedStats(state);
    }
  };

  // Do not block initial reveal if cached stats are already visible
  const livePromise = refreshLive();
  if (hasCachedRender) {
    return;
  }
  await livePromise;
}

// ---------- Privacy policy "last updated" date ----------
// Uses the latest commit on the `page` branch (any file, not just the policy).
const LAST_UPDATED_CACHE_KEY = "cerolingo:page-last-commit";
const LAST_UPDATED_CACHE_MS = 10 * 60 * 1000;

async function fetchPageLastCommitDate() {
  try {
    const cached = JSON.parse(
      sessionStorage.getItem(LAST_UPDATED_CACHE_KEY) || "null",
    );
    if (cached && Date.now() - cached.at < LAST_UPDATED_CACHE_MS) {
      return cached.date;
    }
  } catch {
    /* storage unavailable: just fetch */
  }

  const commits = await fetchJson(
    `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=page&per_page=1`,
  );
  const commit = Array.isArray(commits) ? commits[0] : null;
  const date =
    commit?.commit?.committer?.date || commit?.commit?.author?.date || null;
  if (!date) throw new Error("No commit date");

  try {
    sessionStorage.setItem(
      LAST_UPDATED_CACHE_KEY,
      JSON.stringify({ date, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
  return date;
}

async function loadLastUpdated() {
  const wrapper = document.getElementById("last-updated");
  const dateEl = document.getElementById("last-updated-date");
  if (!wrapper || !dateEl) return;

  const [commitRes, tzRes] = await Promise.allSettled([
    fetchPageLastCommitDate(),
    fetchVisitorTimeZone(),
  ]);

  const iso =
    (commitRes.status === "fulfilled" && commitRes.value) ||
    dateEl.dataset.fallback ||
    "";
  const timeZone =
    (tzRes.status === "fulfilled" && tzRes.value) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (iso) {
    const date = new Date(iso);
    const time = document.createElement("time");
    time.dateTime = iso;
    time.textContent = formatTimestamp(date, timeZone);
    dateEl.replaceChildren(time);
    dateEl.title = `Time zone: ${timeZone}`;
  } else {
    dateEl.textContent = "see history on GitHub";
  }
  wrapper.removeAttribute("aria-busy");
  dateEl.classList.add("is-ready");
}

function formatTimestamp(date, timeZone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);
  } catch {
    return formatTimestamp(date, undefined);
  }
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.hour}:${p.minute}:${p.second} ${p.day}.${p.month}.${p.year}`;
}

const TZ_CACHE_KEY = "cerolingo:visitor-tz";

async function fetchVisitorTimeZone() {
  try {
    const cached = sessionStorage.getItem(TZ_CACHE_KEY);
    if (cached) return cached;
  } catch {
    /* ignore */
  }

  const lookups = [
    () => fetchJson("https://ipapi.co/json/", 2500).then((d) => d.timezone),
    () =>
      fetchJson("https://get.geojs.io/v1/ip/geo.json", 2500).then(
        (d) => d.timezone,
      ),
  ];

  for (const lookup of lookups) {
    try {
      const tz = await lookup();
      if (typeof tz === "string" && tz.includes("/")) {
        try {
          sessionStorage.setItem(TZ_CACHE_KEY, tz);
        } catch {
          /* ignore */
        }
        return tz;
      }
    } catch {
      /* try the next provider */
    }
  }
  throw new Error("IP time zone lookup failed");
}

// ---------- Loading screen ----------
const LOADER_MIN_MS = 320;
const LOADER_MAX_MS = 1400;
const LOADER_EXIT_MS = 360;
const loaderStart = performance.now();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setLoaderProgress(value) {
  const loader = document.getElementById("loader");
  if (loader) loader.style.setProperty("--progress", String(value));
}

function trackLoadTasks(tasks) {
  let done = 0;
  const bump = () => {
    done += 1;
    setLoaderProgress(0.12 + (done / tasks.length) * 0.78);
  };
  return Promise.allSettled(tasks.map((t) => Promise.resolve(t).finally(bump)));
}

async function hideLoader() {
  const root = document.documentElement;
  const loader = document.getElementById("loader");
  if (!loader || !root.classList.contains("is-booting")) {
    root.classList.remove("is-booting");
    return;
  }

  const elapsed = performance.now() - loaderStart;
  if (elapsed < LOADER_MIN_MS) await wait(LOADER_MIN_MS - elapsed);

  setLoaderProgress(1);
  await wait(160);

  loader.classList.add("is-leaving");
  loader.setAttribute("aria-hidden", "true");
  root.classList.remove("is-booting");
  await wait(LOADER_EXIT_MS);
  loader.remove();
}

function setupScrollCue() {
  const cueWrap = document.getElementById("scroll-cue-wrap");
  const target =
    document.getElementById("features") || document.getElementById("faq");
  if (!cueWrap || !target) return;

  const update = () => {
    const targetTop = target.getBoundingClientRect().top;
    const isTargetVisible = targetTop <= window.innerHeight - 36;
    cueWrap.classList.toggle("is-hidden", isTargetVisible);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  setLoaderProgress(0.12);
  setupScrollCue();
  updateStatDividers();
  window.addEventListener("resize", updateStatDividers, { passive: true });

  const pageLoaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const stats = loadAllStats();
  const lastUpdated = loadLastUpdated();

  const tasks = [pageLoaded, fontsReady];
  if (document.getElementById("stats")?.classList.contains("is-loading")) {
    tasks.push(stats);
  }
  if (document.getElementById("last-updated")) tasks.push(lastUpdated);

  Promise.race([trackLoadTasks(tasks), wait(LOADER_MAX_MS)]).then(hideLoader);
});
