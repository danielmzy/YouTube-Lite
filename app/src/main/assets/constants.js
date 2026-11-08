/*
 * Shared constants for the injected scripts.
 *
 * Injected before script.js / innertube.js so YTL.KEY, YTL.URL and
 * YTL.MS are available to every later script and line up with the
 * storage keys used by the Android side.
  *
 * See ENGINEERING.md section 4.1 for the full flow.
 */
(function () {
  var Y = window.YTL || (window.YTL = {});
  Y.KEY = {
    defSubs: "defSubs",
    subsSys: "subsSys",
    shorts: "shorts",
    prompt: "prompt",
    upd: "ytlUpdChecked",
    hist: "ytdlHist",
    bgplay: "bgplay",
    removeCodec: "removeCodec"
  };
  Y.URL = {
    repo: "https://github.com/danielmzy/YouTube-Lite",
    releasesApi: "https://api.github.com/repos/danielmzy/YouTube-Lite/releases/latest",
    ryd: "https://returnyoutubedislikeapi.com"
  };
  Y.MS = {
    pkc: 300,
    shorts: 400,
    ga: 1000,
    longPress: 550,
    unmute: 250,
    streamIdle: 90000
  };
})();
