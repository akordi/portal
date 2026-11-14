// Pure helpers for syncing recognised chord segments to a YouTube player.
// Kept framework-free so they can be unit-tested without a DOM.

/**
 * Extract the 11-character YouTube video id from any common URL shape
 * (watch?v=, youtu.be/, /embed/, /shorts/). Returns '' when none is found.
 * @param {string} url
 * @returns {string}
 */
export function youtubeId(url) {
  if (!url) {
    return '';
  }
  const match = String(url).match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

/**
 * Index of the chord segment active at the given playback time (seconds).
 * A segment is active for start <= time < end. Once playback passes the last
 * segment's end we keep the final chord highlighted; before the first start we
 * return -1 (nothing active yet).
 * @param {Array<{start:number,end:number}>} segments
 * @param {number} time
 * @returns {number}
 */
export function activeSegmentIndex(segments, time) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return -1;
  }
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (time >= seg.start && time < seg.end) {
      return i;
    }
  }
  const last = segments[segments.length - 1];
  return time >= last.end ? segments.length - 1 : -1;
}

/**
 * The segment that comes after the active one, or null when there is none
 * (last segment, empty list, or no segment active yet).
 * @param {Array<{start:number,end:number,label:string}>} segments
 * @param {number} activeIndex index returned by activeSegmentIndex
 * @returns {{start:number,end:number,label:string}|null}
 */
export function nextSegment(segments, activeIndex) {
  if (!Array.isArray(segments) || activeIndex < 0) {
    return null;
  }
  const next = segments[activeIndex + 1];
  return next || null;
}

/**
 * Fraction (0..1) of a segment that has elapsed at the given time. Clamped so
 * the value never leaves [0, 1] even when time is before the segment starts or
 * after it ends. Returns 0 for an invalid index or a zero-length segment.
 * @param {Array<{start:number,end:number}>} segments
 * @param {number} index
 * @param {number} time seconds
 * @returns {number}
 */
export function segmentProgress(segments, index, time) {
  if (!Array.isArray(segments) || index < 0 || index >= segments.length) {
    return 0;
  }
  const seg = segments[index];
  const span = seg.end - seg.start;
  if (span <= 0) {
    return time >= seg.end ? 1 : 0;
  }
  const fraction = (time - seg.start) / span;
  return Math.min(1, Math.max(0, fraction));
}

/**
 * A bounded window of segments centred on the active one, so the live timeline
 * stays legible no matter how many chords the song has. Returns the sliced
 * segments (with their original indices) plus the window's time span, used to
 * lay blocks out proportionally *within the window* rather than the whole song.
 *
 * When nothing is active yet (activeIndex < 0) the window anchors at the start
 * so the opening chords are visible. Bounds are clamped at the song's ends.
 *
 * @param {Array<{start:number,end:number,label:string}>} segments
 * @param {number} activeIndex
 * @param {{before?:number, after?:number}} [opts] chords to keep on each side
 * @returns {{items: Array<{seg:object, index:number}>, start:number, end:number}}
 */
export function segmentWindow(segments, activeIndex, opts = {}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { items: [], start: 0, end: 0 };
  }
  const before = Number.isFinite(opts.before) ? opts.before : 1;
  const after = Number.isFinite(opts.after) ? opts.after : 5;
  const anchor = activeIndex < 0 ? 0 : Math.min(activeIndex, segments.length - 1);
  const lo = Math.max(0, anchor - before);
  const hi = Math.min(segments.length - 1, anchor + after);
  const items = [];
  for (let i = lo; i <= hi; i += 1) {
    items.push({ seg: segments[i], index: i });
  }
  return { items, start: segments[lo].start, end: segments[hi].end };
}

/**
 * Playback clock between player reports. The YouTube API reports the time
 * only every few hundred milliseconds; in between, the time is extrapolated
 * from the last report at the playback rate, so the timeline moves every frame
 * instead of in steps. A report that stops changing (stall, buffering) holds
 * the extrapolation to at most MAX_EXTRAPOLATION_SEC past it. After a seek,
 * reports far from the target are the player's stale pre-seek time and are
 * ignored until it catches up (or SEEK_SETTLE_MS passes).
 */
const MAX_EXTRAPOLATION_SEC = 1;
const SEEK_SETTLE_MS = 1000;
const SEEK_TOLERANCE_SEC = 1;

export function createPlaybackClock() {
  let reported = null;
  let reportedAt = 0;
  let seek = null;
  return {
    /** Playback time at `nowMs` (performance.now()), given the player's latest report. */
    time(report, nowMs, rate = 1) {
      let value = report;
      if (seek) {
        const settled =
          Math.abs(report - seek.time) <= SEEK_TOLERANCE_SEC || nowMs - seek.at > SEEK_SETTLE_MS;
        if (settled) {
          seek = null;
        } else {
          value = seek.time;
        }
      }
      if (value !== reported) {
        reported = value;
        reportedAt = nowMs;
      }
      const ahead = ((nowMs - reportedAt) / 1000) * rate;
      return reported + Math.min(ahead, MAX_EXTRAPOLATION_SEC);
    },
    /** Forget the last report's timing, e.g. when playback resumes after a pause. */
    restart() {
      reported = null;
    },
    /** Continue from `time` (a seek target) as of `nowMs`. */
    seekTo(time, nowMs) {
      seek = { time, at: nowMs };
      reported = time;
      reportedAt = nowMs;
    },
  };
}

/**
 * Position of a scrolling chord strip at playback time `t`, in percent of the
 * visible track (`viewSpan` seconds wide): how far the strip has scrolled and
 * where the playhead sits. The playhead rides in from the left edge until it
 * reaches `lead` of the track, then stays put while the strip scrolls.
 */
export function stripPosition(t, viewSpan, lead) {
  const scrolled = Math.max(0, t - lead * viewSpan);
  return {
    offset: (scrolled / viewSpan) * 100,
    playhead: ((t - scrolled) / viewSpan) * 100,
  };
}
