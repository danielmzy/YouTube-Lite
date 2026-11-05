/*
 * Small UI fixes for the YouTube mobile web player running inside the app.
 */
(function () {
    if (window.__YTPRO_PLAYER_FIXES__) return;
    window.__YTPRO_PLAYER_FIXES__ = true;

    var STYLE_ID = 'ytpro-player-fixes';

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var parent = document.head || document.documentElement;
        if (!parent) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        // YouTube keeps an invisible volume-slider strip (#volS) pinned to the
        // right edge of the player. In the app's fullscreen custom view that
        // strip is painted above the "exit fullscreen" button and silently
        // swallows the tap, so the button looks dead. On mobile the strip is
        // display-only (volume is controlled with the hardware keys), so let
        // touches fall through to the controls underneath.
        style.textContent = '#volS{pointer-events:none!important}';
        parent.appendChild(style);
    }

    ensureStyle();
    document.addEventListener('DOMContentLoaded', ensureStyle);
})();
