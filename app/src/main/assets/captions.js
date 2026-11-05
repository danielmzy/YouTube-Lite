/*!
 * YTPRO accessibility captions bridge.
 *
 * Native side (CaptioningController.java) pushes a JSON config reflecting Android's
 * system caption settings into window.__YTPRO_CAPTION_CFG__, then calls
 * window.YTPRO_CAPTIONS.apply(cfg). This runtime:
 *
 *   1. styles YouTube's caption segments with the system foreground/background
 *      colours, edge (outline/shadow) and font scale;
 *   2. turns captions on and selects the subtitle track matching the system
 *      caption language when captions are enabled in Android settings.
 *
 * It is deliberately defensive: YouTube ships DOM changes all the time and any
 * exception here must never break the page.
 */
(function () {
  'use strict';

  var W = window;
  if (W.__YTPRO_CAPTIONING_INSTALLED__) {
    if (W.__YTPRO_CAPTION_CFG__ && W.YTPRO_CAPTIONS) {
      try { W.YTPRO_CAPTIONS.apply(W.__YTPRO_CAPTION_CFG__); } catch (e) {}
    }
    return;
  }
  W.__YTPRO_CAPTIONING_INSTALLED__ = true;

  var STYLE_ID = 'ytpro-caption-style';
  var TICK_MS = 1200;
  var MAX_ATTEMPTS = 10;

  /* App-side "Default Subtitles" switch: force captions even when Android's
   * system captioning switch is off. Off = never interfere. */
  function forcedByApp() {
    try { return localStorage.getItem('defSubs') === 'true'; } catch (e) { return false; }
  }

  function wantCaptions() {
    return !!(state.cfg && state.cfg.enabled) || forcedByApp();
  }

  var state = {
    cfg: null,
    scale: 1,
    basePx: 0,
    cssBase: '',
    styleEl: null,
    videoKey: '',
    attempts: 0,
    successKey: '',
    autoEnabledKey: '',
    trackKey: '',
    trackTries: 0,
    lastMeasure: 0,
    timer: 0
  };

  /* ---------------------------------------------------------------- helpers */

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[YTPRO captions]');
      console.info.apply(console, args);
    } catch (e) {}
  }

  function q(sel, root) {
    try { return (root || document).querySelector(sel); } catch (e) { return null; }
  }

  function qa(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; }
  }

  function num(v, d) {
    var n = parseFloat(v);
    return isFinite(n) ? n : d;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function player() {
    return q('.html5-video-player') || q('#movie_player') || q('ytm-player');
  }

  function videoKey() {
    try { return (location.pathname || '') + (location.search || ''); } catch (e) { return ''; }
  }

  function isVideoPage() {
    var p = '';
    try { p = location.pathname || ''; } catch (e) {}
    if (p.indexOf('/watch') >= 0 || p.indexOf('/shorts') >= 0) return true;
    var el = player();
    try {
      return !!(el && typeof el.getVideoData === 'function' && el.getVideoData() && el.getVideoData().video_id);
    } catch (e) { return false; }
  }

  function isAd() {
    var el = player();
    if (!el || !el.classList) return false;
    return el.classList.contains('ad-showing') || el.classList.contains('ad-interrupting');
  }

  function menuOpen() {
    var m = q('.ytp-settings-menu');
    if (!m) return false;
    try {
      var r = m.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && m.style.display !== 'none';
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------ config push */

  function setVar(name, value) {
    try { document.documentElement.style.setProperty(name, value); } catch (e) {}
  }

  function ensureStyle() {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      try {
        el = document.createElement('style');
        el.id = STYLE_ID;
        el.type = 'text/css';
        (document.head || document.documentElement).appendChild(el);
        if (state.cfg) {
          try { el.textContent = buildCss(state.cfg); } catch (e) {}
        }
      } catch (e) {
        return null;
      }
    }
    state.styleEl = el;
    return el;
  }

  function isTransparent(c) {
    var m = /rgba?\(([^)]+)\)/.exec(String(c));
    if (!m) return false;
    var parts = m[1].split(',');
    if (parts.length < 4) return false;
    return parseFloat(parts[3]) <= 0.01;
  }

  function shadowFor(type, color) {
    switch (type) {
      case 1: /* outline */
        return '-1px -1px 0 ' + color + ',1px -1px 0 ' + color +
               ',-1px 1px 0 ' + color + ',1px 1px 0 ' + color +
               ',0 0 2px ' + color;
      case 2: /* drop shadow */
        return '0 1px 3px ' + color;
      case 3: /* raised */
        return '1px 1px 0 ' + color;
      case 4: /* depressed */
        return '-1px -1px 0 ' + color;
      default:
        return 'none';
    }
  }

  function buildCss(cfg) {
    var fg = cfg.foreground || 'rgba(255, 255, 255, 1.000)';
    var bg = cfg.background || 'rgba(0, 0, 0, 0.500)';
    var edgeColor = cfg.edgeColor || 'rgba(0, 0, 0, 1.000)';
    var hasEdge = cfg.hasEdge !== false;
    var shadow = hasEdge ? shadowFor(num(cfg.edgeType, 0) | 0, edgeColor) : 'none';
    var css = [];

    css.push('.ytp-caption-window-container .ytp-caption-segment,');
    css.push('.html5-video-player .ytp-caption-segment {');
    if (cfg.hasForeground !== false) css.push('  color: ' + fg + ' !important;');
    if (cfg.hasBackground !== false) css.push('  background-color: ' + bg + ' !important;');
    css.push('  font-size: calc(var(--ytpro-caption-base, 22px) * var(--ytpro-caption-scale, 1)) !important;');
    if (shadow !== 'none') css.push('  text-shadow: ' + shadow + ' !important;');
    css.push('}');

    if (cfg.hasWindow !== false && cfg.window && !isTransparent(cfg.window)) {
      css.push('.ytp-caption-window-container .caption-window {');
      css.push('  background-color: ' + cfg.window + ' !important;');
      css.push('}');
    }
    return css.join('\n');
  }

  function measureBase() {
    var el = q('.ytp-caption-window-container .ytp-caption-segment') ||
             q('.caption-window .ytp-caption-segment');
    if (!el) return 0;
    var sheet = state.styleEl || document.getElementById(STYLE_ID);
    var prev = sheet ? sheet.disabled : false;
    if (sheet) sheet.disabled = true;
    var px = 0;
    try { px = parseFloat(window.getComputedStyle(el).fontSize) || 0; } catch (e) { px = 0; }
    if (sheet) sheet.disabled = prev;
    return px;
  }

  function fallbackBase() {
    var el = player();
    var h = 0;
    try { h = el ? el.getBoundingClientRect().height : 0; } catch (e) { h = 0; }
    if (!h) h = (window.innerHeight || 640) * 0.5;
    return Math.max(14, Math.round(h * 0.048));
  }

  function updateBase(force) {
    if (!state.cfg) return;
    var now = Date.now();
    if (!force && now - state.lastMeasure < 1000) return;
    state.lastMeasure = now;
    var px = measureBase();
    if (px > 0) {
      state.basePx = px;
    } else if (!state.basePx) {
      state.basePx = fallbackBase();
    }
    var val = Math.round(state.basePx) + 'px';
    if (state.cssBase !== val) {
      state.cssBase = val;
      setVar('--ytpro-caption-base', val);
    }
  }

  /* ---------------------------------------------------------------- tracks */

  function nameOf(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v.simpleText) return v.simpleText;
    if (v.runs && v.runs.length) {
      var s = '';
      for (var i = 0; i < v.runs.length; i++) s += (v.runs[i].text || '');
      return s;
    }
    return '';
  }

  function normalizeTrack(t) {
    return {
      languageCode: t.languageCode,
      languageName: nameOf(t.name),
      kind: t.kind || '',
      displayName: nameOf(t.displayName) || nameOf(t.name),
      is_translateable: !!(t.isTranslateable || t.is_translatable),
      vss_id: t.vssId || t.vss_id || ''
    };
  }

  var trackSource = 'none';

  function allTracks() {
    var el = player();
    var list = [];
    if (el && typeof el.getOption === 'function') {
      try { list = el.getOption('captions', 'tracklist') || []; } catch (e) { list = []; }
      if (list && list.length) { trackSource = 'player'; return list; }
    }
    if (el && typeof el.getPlayerResponse === 'function') {
      try {
        var resp = el.getPlayerResponse() || {};
        var renderer = resp.captions && resp.captions.playerCaptionsTracklistRenderer;
        list = (renderer && renderer.captionTracks) || [];
      } catch (e) { list = []; }
    }
    trackSource = list && list.length ? 'response' : 'none';
    return list || [];
  }

  function currentTrack() {
    var el = player();
    if (!el || typeof el.getOption !== 'function') return null;
    try { return el.getOption('captions', 'track') || null; } catch (e) { return null; }
  }

  function captionsOn() {
    var t = currentTrack();
    if (t && t.languageCode) return true;
    var btn = captionButton();
    if (btn && btn.getAttribute('aria-pressed') === 'true') return true;
    var seg = q('.ytp-caption-window-container .ytp-caption-segment');
    return !!(seg && seg.textContent && seg.textContent.replace(/\s+/g, '').length > 0);
  }

  function pickTrack() {
    var loc = String((state.cfg && state.cfg.locale) || '').toLowerCase().replace(/_/g, '-');
    if (!loc) return null;
    var tracks = allTracks();
    if (!tracks.length) return null;
    var want = loc.split('-')[0];
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i] || {};
      var code = String(t.languageCode || '').toLowerCase().replace(/_/g, '-');
      if (!code) continue;
      var score;
      if (code === loc) score = 100;
      else if (code.split('-')[0] === want) score = 80;
      else continue;
      if (String(t.kind || '') !== 'asr') score += 5;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (!best) return null;
    return trackSource === 'player' ? best : normalizeTrack(best);
  }

  function selectTrack() {
    var el = player();
    var track = pickTrack();
    if (!el || !track || typeof el.setOption !== 'function') return false;
    try {
      el.setOption('captions', 'track', track);
      return true;
    } catch (e) {
      log('setOption failed', e);
      return false;
    }
  }

  /* ---------------------------------------------------------------- enable */

  function captionButton() {
    return q('.ytp-subtitles-button') ||
           q('.ytp-button[data-tooltip-target-id="ytp-subtitles-button"]') ||
           q('button[aria-label*="subtitles" i]') ||
           q('button[aria-label*="字幕"]');
  }

  function localeName(loc) {
    if (!loc) return '';
    var base = String(loc).split('-')[0];
    try {
      var dn = new Intl.DisplayNames([navigator.language || 'en', 'en'], { type: 'language' });
      return String(dn.of(base) || '').toLowerCase();
    } catch (e) {
      return base;
    }
  }

  function selectCaptionFromMenu() {
    var menu = q('.ytp-settings-menu');
    if (!menu) return false;
    var items = qa('.ytp-menuitem', menu);
    if (!items.length) return false;
    var titleEl = q('.ytp-panel-title', menu);
    var title = titleEl ? (titleEl.textContent || '') : '';
    var i, label, low;

    if (/subtitle|caption|字幕/i.test(title)) {
      var want = localeName(String((state.cfg && state.cfg.locale) || ''));
      var fallback = null;
      for (i = 0; i < items.length; i++) {
        label = (items[i].textContent || '').replace(/\s+/g, ' ').trim();
        low = label.toLowerCase();
        if (!label) continue;
        if (low === 'off' || low === '关闭' || low === '关') continue;
        if (want && low.indexOf(want) >= 0) { items[i].click(); return true; }
        if (!fallback) fallback = items[i];
      }
      if (fallback) { fallback.click(); return true; }
      return false;
    }

    for (i = 0; i < items.length; i++) {
      low = (items[i].textContent || '').toLowerCase();
      if (low.indexOf('subtitle') >= 0 || low.indexOf('caption') >= 0 || low.indexOf('字幕') >= 0) {
        items[i].click();
        return true;
      }
    }
    return false;
  }

  function finishSuccess(key) {
    state.successKey = key;
    state.autoEnabledKey = key;
    state.trackKey = key;
    log('captions enabled');
  }

  function clickCaptionButton(key) {
    if (captionsOn()) {
      selectTrack();
      finishSuccess(key);
      return;
    }
    var btn = captionButton();
    var clicked = false;
    if (btn) {
      try { btn.click(); clicked = true; } catch (e) {}
    }
    if (captionsOn()) {
      selectTrack();
      finishSuccess(key);
      return;
    }
    /* Last resort: set the track directly (may implicitly enable captions). */
    selectTrack();
    if (clicked) {
      setTimeout(function () { menuPass(0); }, 450);
    }
  }

  function menuPass(depth) {
    try {
      if (!wantCaptions() || depth > 2) return;
      if (captionsOn()) {
        selectTrack();
        finishSuccess(state.videoKey);
        return;
      }
      if (selectCaptionFromMenu()) {
        setTimeout(function () { menuPass(depth + 1); }, 500);
      }
    } catch (e) {}
  }

  function enableCaptions() {
    if (!wantCaptions()) return;
    if (!isVideoPage() || isAd()) return;
    var key = state.videoKey;
    if (key && key === state.successKey) return;
    if (state.attempts >= MAX_ATTEMPTS) return;
    state.attempts++;

    var el = player();
    if (!el) return;

    /* 1. Official player API: toggles captions. Give it a moment to update the
     * player state before deciding whether the CC button fallback is needed,
     * otherwise a slow API response makes us toggle twice and end up off. */
    var toggled = false;
    try {
      if (typeof el.toggleSubtitles === 'function') {
        el.toggleSubtitles();
        toggled = true;
      }
    } catch (e) {
      log('toggleSubtitles failed', e);
    }

    if (toggled) {
      setTimeout(function () {
        try {
          if (captionsOn()) {
            selectTrack();
            finishSuccess(key);
          } else {
            clickCaptionButton(key);
          }
        } catch (e) {}
      }, 350);
    } else {
      clickCaptionButton(key);
    }
  }

  function ensureTrack() {
    if (!wantCaptions()) return;
    if (state.trackKey === state.videoKey) return;
    if (state.trackTries >= 5) return;
    state.trackTries++;
    if (selectTrack() || !pickTrack()) state.trackKey = state.videoKey;
  }

  /* ------------------------------------------------------------------ tick */

  function disableCaptions() {
    state.successKey = '';
    state.autoEnabledKey = '';
    state.trackKey = '';
    var el = player();
    try {
      if (el && typeof el.toggleSubtitles === 'function') {
        el.toggleSubtitles();
        return;
      }
    } catch (e) {}
    var btn = captionButton();
    if (btn) {
      try { btn.click(); } catch (e) {}
    }
  }

  function tick() {
    try {
      if (!state.cfg) return;
      var key = videoKey();
      if (key !== state.videoKey) {
        state.videoKey = key;
        state.attempts = 0;
        state.successKey = '';
        if (state.autoEnabledKey && state.autoEnabledKey !== key) state.autoEnabledKey = '';
        state.trackKey = '';
        state.trackTries = 0;
        state.lastMeasure = 0;
      }
      if (!ensureStyle()) return;
      if (wantCaptions()) {
        if (!menuOpen() && !captionsOn()) enableCaptions();
        else if (captionsOn()) ensureTrack();
      } else if (state.autoEnabledKey && state.autoEnabledKey === key && captionsOn()) {
        /* The system caption switch was turned off: undo what we auto-enabled. */
        disableCaptions();
      }
      updateBase(false);
    } catch (e) {}
  }

  function startTimer() {
    if (state.timer) return;
    state.timer = setInterval(tick, TICK_MS);
  }

  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = 0;
    }
  }

  /* ----------------------------------------------------------------- apply */

  function apply(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    var wasEnabled = wantCaptions();
    state.cfg = cfg;
    state.scale = clamp(num(cfg.fontScale, 1), 0.5, 3);
    setVar('--ytpro-caption-scale', String(state.scale));

    var sheet = ensureStyle();
    if (sheet) {
      try { sheet.disabled = false; } catch (e) {}
      try { sheet.textContent = buildCss(cfg); } catch (e) {}
    }

    if (wantCaptions() && !wasEnabled) {
      state.attempts = 0;
      state.successKey = '';
      state.autoEnabledKey = '';
      state.trackKey = '';
      state.trackTries = 0;
    }
    if (!cfg.enabled && !forcedByApp()) {
      state.attempts = 0;
      if (state.autoEnabledKey && captionsOn()) disableCaptions();
    }

    updateBase(true);
    startTimer();
    state.videoKey = videoKey();
    if (wantCaptions() && !captionsOn()) enableCaptions();
    log('applied: enabled=' + !!cfg.enabled + ', scale=' + state.scale +
        ', locale=' + (cfg.locale || ''), cfg);
  }

  W.YTPRO_CAPTIONS = {
    version: 1,
    apply: apply,
    enableNow: function () {
      state.attempts = 0;
      state.successKey = '';
      enableCaptions();
    },
    current: function () { return { cfg: state.cfg, scale: state.scale, basePx: state.basePx }; }
  };

  document.addEventListener('visibilitychange', function () {
    try {
      if (document.hidden) stopTimer();
      else { startTimer(); tick(); }
    } catch (e) {}
  });

  document.addEventListener('play', function () { setTimeout(tick, 300); }, true);
  document.addEventListener('loadedmetadata', function () { setTimeout(tick, 300); }, true);
  document.addEventListener('yt-navigate-finish', function () {
    state.videoKey = '';
    setTimeout(tick, 400);
  });

  try { ensureStyle(); } catch (e) {}

  if (W.__YTPRO_CAPTION_CFG__) apply(W.__YTPRO_CAPTION_CFG__);
  log('runtime installed');
})();
