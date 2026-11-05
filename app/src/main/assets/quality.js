(function () {
    'use strict';

    if (window.__YTPRO_QUALITY_INSTALLED__) return;
    window.__YTPRO_QUALITY_INSTALLED__ = true;

    var VERSION = 1;
    var TICK_MS = 1500;
    var MAX_TRIES = 12;              // wait for the stream manifest before giving up
    var VERIFY_WINDOW_MS = 15000;    // after locking, keep an eye on it for a few seconds
    var MISMATCH_LIMIT = 15;         // give up on a level the player keeps refusing
    var LEVELS = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];

    var state = {
        videoKey: null,
        target: null,
        attempts: 0,
        lockedAt: 0,
        lastAttemptAt: 0,
        lastQuality: '',
        booted: false,
        adWasPlaying: false,
        mismatches: 0,
        accepted: null,
        applied: false
    };

    function player() {
        return document.querySelector('.html5-video-player') ||
            document.querySelector('#movie_player') ||
            document.getElementById('player');
    }

    function videoKey(p) {
        try {
            var data = p && p.getVideoData ? p.getVideoData() : null;
            if (data && data.video_id) return data.video_id;
        } catch (e) { }
        try {
            var match = (location.search || '').match(/[?&]v=([\w-]+)/);
            if (match) return match[1];
        } catch (e) { }
        return null;
    }

    function adPlaying(p) {
        try {
            if (p.classList && p.classList.contains('ad-showing')) return true;
        } catch (e) { }
        try {
            var data = p && p.getVideoData ? p.getVideoData() : null;
            if (data && data.isAd) return true;
        } catch (e) { }
        return false;
    }

    function availableLevels(p) {
        var levels = [];
        try {
            levels = p.getAvailableQualityLevels() || [];
        } catch (e) { }
        return levels;
    }

    function highestLevel(levels) {
        if (!levels || !levels.length) return null;
        for (var i = 0; i < LEVELS.length; i++) {
            if (levels.indexOf(LEVELS[i]) !== -1) return LEVELS[i];
        }
        return null;
    }

    function currentQuality(p) {
        try {
            return String(p.getPlaybackQuality() || '');
        } catch (e) {
            return '';
        }
    }

    // Map resolution -> frame rate for the qualities the video actually offers.
    function qualityFpsMap(p) {
        var labels = [];
        try {
            labels = p.getAvailableQualityLabels() || [];
        } catch (e) { }
        var fpsByLabel = {};
        try {
            var response = p.getPlayerResponse ? p.getPlayerResponse() : null;
            var formats = (response && response.streamingData && response.streamingData.adaptiveFormats) || [];
            for (var i = 0; i < formats.length; i++) {
                var label = formats[i].qualityLabel;
                if (label && !(label in fpsByLabel)) fpsByLabel[label] = formats[i].fps;
            }
        } catch (e) { }
        var map = {};
        for (var j = 0; j < labels.length; j++) {
            var match = /^(\d{3,4})p(\d+)?$/.exec(labels[j]);
            if (!match) continue;
            var fps = match[2] ? Number(match[2]) : Number(fpsByLabel[labels[j]] || 0);
            if (fps) map[Number(match[1])] = fps;
        }
        return map;
    }

    // YouTube's mobile menu only prints the resolution ("2160p"). Append the
    // real frame rate in the "2160P-60FPS" style so levels are distinguishable.
    function patchQualityMenu() {
        var p = player();
        if (!p) return;
        var sheet = document.querySelector('[class*=BottomSheetLayoutBottomSheetContent]');
        if (!sheet) return;
        var map = qualityFpsMap(p);
        if (!map || !Object.keys(map).length) return;
        var nodes = sheet.querySelectorAll('.ytListItemViewModelTitle, .ytListItemViewModelTrailingSelectionText');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var match = /^(\d{3,4})p(?:(\d+)(?:fps)?)?$/i.exec((el.textContent || '').trim());
            if (!match) continue;
            var fps = map[Number(match[1])];
            if (!fps) continue;
            var want = match[1] + 'P-' + fps + 'FPS';
            if (el.textContent !== want) el.textContent = want;
        }
    }

    var patchTimer = 0;
    function scheduleMenuPatch() {
        if (patchTimer) return;
        patchTimer = setTimeout(function () {
            patchTimer = 0;
            try { patchQualityMenu(); } catch (e) { }
        }, 150);
    }

    function applyRange(p, target) {
        var applied = false;
        if (typeof p.setPlaybackQualityRange === 'function') {
            try {
                p.setPlaybackQualityRange(target, target);
                applied = true;
            } catch (e) { }
            if (!applied) {
                try {
                    p.setPlaybackQualityRange(target);
                    applied = true;
                } catch (e) { }
            }
        }
        if (typeof p.setPlaybackQuality === 'function') {
            try {
                p.setPlaybackQuality(target);
                applied = true;
            } catch (e) { }
        }
        return applied;
    }

    function preferHighAudio(p) {
        // YouTube's web player always streams the best audio the account may use.
        // When the video carries a "higher quality audio" track (Premium), make sure
        // the account preference is set to it.
        try {
            if (typeof p.setUserAudioQualitySetting !== 'function') return;
            var current = typeof p.getUserAudioQualitySetting === 'function'
                ? Number(p.getUserAudioQualitySetting()) : 2;
            if (!(current >= 2)) p.setUserAudioQualitySetting(2);
        } catch (e) { }
    }

    function lock(p, key) {
        var levels = availableLevels(p);
        var target = highestLevel(levels);
        if (!target) return false;
        if (!applyRange(p, target)) return false;
        preferHighAudio(p);
        state.applied = true;
        state.target = target;
        state.lockedAt = Date.now();
        state.attempts += 1;
        return true;
    }

    function enabled() {
        try {
            return localStorage.getItem('maxQuality') !== 'false';
        } catch (e) {
            return true;
        }
    }

    // Hand quality control back to YouTube when the user turns the lock off.
    function releaseQualityLock(p) {
        try {
            if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange('auto', 'auto');
        } catch (e) { }
        try {
            if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality('default');
        } catch (e) { }
    }

    function tick() {
        var p = player();
        if (!p) return;

        if (!enabled()) {
            if (state.applied) {
                releaseQualityLock(p);
                state.applied = false;
                state.videoKey = null;
                state.target = null;
                state.attempts = 0;
                state.lockedAt = 0;
                state.lastAttemptAt = 0;
                state.mismatches = 0;
                state.accepted = null;
            }
            return;
        }

        var key = videoKey(p);
        if (!key) return;

        if (key !== state.videoKey) {
            state.videoKey = key;
            state.target = null;
            state.attempts = 0;
            state.lockedAt = 0;
            state.lastAttemptAt = 0;
            state.mismatches = 0;
            state.accepted = null;
        }

        if (adPlaying(p)) {
            state.adWasPlaying = true;
            return;
        }
        if (state.adWasPlaying) {
            // Ads can reset the player's quality range once they finish.
            state.adWasPlaying = false;
            state.target = null;
            state.attempts = 0;
            state.lockedAt = 0;
            state.lastAttemptAt = 0;
            state.mismatches = 0;
            state.accepted = null;
        }

        var now = Date.now();

        if (!state.target) {
            if (state.attempts >= MAX_TRIES && now - state.lastAttemptAt < 30000) return;
            if (state.attempts < MAX_TRIES && now - state.lastAttemptAt < 1000) return;
            state.lastAttemptAt = now;
            state.attempts += 1;
            lock(p, key);
            return;
        }

        // YouTube sometimes reveals more formats a little later (or the ABR
        // manifest grows): climb to a better level as soon as it shows up.
        var best = highestLevel(availableLevels(p));
        if (best && LEVELS.indexOf(best) < LEVELS.indexOf(state.target)) {
            state.attempts = 0;
            state.lastAttemptAt = 0;
            lock(p, key);
            return;
        }

        if (state.accepted) {
            // The player refused the target earlier but may still climb on its
            // own once bandwidth allows it.
            if (currentQuality(p) === state.target) {
                state.accepted = null;
                state.mismatches = 0;
            }
            return;
        }

        if (now - state.lockedAt > VERIFY_WINDOW_MS) return;
        if (now - state.lastAttemptAt < 1200) return;

        var quality = currentQuality(p);
        state.lastQuality = quality;
        if (quality && quality !== 'auto' && quality === state.target) {
            state.mismatches = 0;
            return;
        }
        if (!quality || quality === 'auto') return;

        // Do not judge a level while the video is paused or still buffering.
        var vid = document.querySelector('video');
        if (!vid || vid.paused || vid.readyState < 2) return;

        state.mismatches += 1;
        if (state.mismatches >= MISMATCH_LIMIT) {
            // The player keeps refusing this level, e.g. 2160p60 on hardware
            // that only decodes 1080p60. Accept what it settled on and stop
            // re-applying the range (which would switch quality over and over).
            state.accepted = quality;
            return;
        }

        // The player picked something else (ad transition, adaptive downgrade, ...).
        if (state.attempts >= MAX_TRIES * 2) return;
        state.lastAttemptAt = now;
        state.attempts += 1;
        lock(p, key);
    }

    function apply() {
        state.videoKey = null;
        state.target = null;
        state.attempts = 0;
        state.lockedAt = 0;
        state.lastAttemptAt = 0;
        state.mismatches = 0;
        state.accepted = null;
        tick();
    }

    function getState() {
        var p = player();
        var audio = null;
        if (p && typeof p.getUserAudioQualitySetting === 'function') {
            try {
                audio = {
                    setting: p.getUserAudioQualitySetting(),
                    hqa: typeof p.hasHqaAudioTrack === 'function' ? p.hasHqaAudioTrack() : null
                };
            } catch (e) { }
        }
        return {
            videoKey: state.videoKey,
            target: state.target,
            current: p ? currentQuality(p) : '',
            available: p ? availableLevels(p) : [],
            attempts: state.attempts,
            mismatches: state.mismatches,
            accepted: state.accepted,
            audio: audio
        };
    }

    // Called by the settings switch so a toggle takes effect immediately.
    function refresh() {
        var p = player();
        if (!enabled()) {
            if (p && state.applied) {
                releaseQualityLock(p);
                state.applied = false;
            }
            state.videoKey = null;
            state.target = null;
            state.attempts = 0;
            state.lockedAt = 0;
            state.lastAttemptAt = 0;
            state.mismatches = 0;
            state.accepted = null;
            return;
        }
        apply();
    }

    window.YTPRO_QUALITY = { version: VERSION, apply: apply, refresh: refresh, getState: getState };

    function bindPlayerEvents() {
        var p = player();
        if (!p || !p.addEventListener) return;
        try {
            p.addEventListener('onVideoDataChange', function () { tick(); });
        } catch (e) { }
        try {
            p.addEventListener('onStateChange', function () { tick(); });
        } catch (e) { }
    }

    function boot() {
        if (state.booted) return;
        state.booted = true;
        try {
            document.addEventListener('yt-navigate-finish', function () {
                bindPlayerEvents();
                tick();
            });
            document.addEventListener('yt-page-data-updated', function () { tick(); });
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden) tick();
            });
        } catch (e) { }
        try {
            var observer = new MutationObserver(scheduleMenuPatch);
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (e) { }
        scheduleMenuPatch();
        bindPlayerEvents();
        tick();
        setInterval(tick, TICK_MS);
    }

    boot();
})();
