/* Central constants shared by the injected scripts. */
(function () {
  var Y = window.YTL || (window.YTL = {});
  Y.KEY = {
    defSubs: "defSubs",
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
