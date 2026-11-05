/*****Youtube Lite*******
Author: Matr1x
Version: 4.0.0
URI: https://github.com/prateek-chaubey/YTPRO
Last Updated On: 19 Sep , 2026 , 07:11 IST
*/



window.ytproSabrDownload= async function() {


var ytproDownDiv=getDownloadElement();

ytproDownDiv.querySelector("#videoViewDiv").innerHTML="Loading...";


//Get Video ID
var videoId ="";

if(window.location.pathname.indexOf("shorts") > -1){
videoId=window.location.pathname.substr(8,window.location.pathname.length);
}
else{
videoId=new URLSearchParams(window.location.search).get("v");
}


//videoId="vY31qIX7LzQ";


if (!videoId) { window.Android?.showToast?.('No video ID found in URL.'); return; }

// Imports
const { Innertube, Platform, Constants,IRawResponse } = await import(
'https://cdn.jsdelivr.net/npm/youtubei.js@18.0.0/bundle/browser.min.js'
);
const { SabrStream } = await import('https://esm.sh/googlevideo@4.1.1/sabr-stream');
const { buildSabrFormat , EnabledTrackTypes } = await import('https://esm.sh/googlevideo@4.1.1/utils');

const { BotGuardClient, getChallenge } = await import('https://esm.sh/bgutils-js@4.0.3/botguard');
const { WebPoSignalOutput } = await import('https://esm.sh/bgutils-js@4.0.3/shared-types');
const { buildURL, getHeaders, USER_AGENT, parseLooseJSON } = await import('https://esm.sh/bgutils-js@4.0.3/utils');
const { WebPoMinter } = await import('https://esm.sh/bgutils-js@4.0.3/webpo');




async function fetchFunction(input, init = {}) {


const reqUrl = input instanceof Request ? input.url : input.toString();
const url    = new URL(reqUrl);
const method = init.method ?? (input instanceof Request ? input.method : 'GET');
const headers = new Headers();

if (input instanceof Request) input.headers.forEach((v, k) => headers.set(k, v));
if (init.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));

headers.set('User-Agent', "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
headers.set('Sec-Ch-Ua', '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"');
headers.set('Sec-Ch-Ua-Mobile', '?0');
headers.set('Sec-Ch-Ua-Platform', '"Windows"');

const playerId = Array.from(document.scripts)
.map(s => s.src.match(/player\/(.*?)\/player/))
.find(m => m)?.[1] || '4b0d80ee';

if (url.pathname === '/iframe_api') {
const mockedApiCode = `var scriptUrl = 'https:\\/\\/www.youtube.com\\/s\\/player\\/${playerId}\\/www-widgetapi.vflset\\/www-widgetapi.js';try{var ttPolicy=window.trustedTypes.createPolicy("youtube-widget-api",{createScriptURL:function(x){return x}});scriptUrl=ttPolicy.createScriptURL(scriptUrl)}catch(e){}var YT;if(!window["YT"])YT={loading:0,loaded:0};var YTConfig;if(!window["YTConfig"])YTConfig={"host":"https://www.youtube.com"};\nif(!YT.loading){YT.loading=1;(function(){var l=[];YT.ready=function(f){if(YT.loaded)f();else l.push(f)};window.onYTReady=function(){YT.loaded=1;var i=0;for(;i<l.length;i++)try{l[i]()}catch(e){}};YT.setConfig=function(c){var k;for(k in c)if(c.hasOwnProperty(k))YTConfig[k]=c[k]};var a=document.createElement("script");a.type="text/javascript";a.id="www-widgetapi-script";a.src=scriptUrl;a.async=true;var c=document.currentScript;if(c){var n=c.nonce||c.getAttribute("nonce");if(n)a.setAttribute("nonce",\nn)}var b=document.getElementsByTagName("script")[0];b.parentNode.insertBefore(a,b)})()};`;
return new Response(mockedApiCode, { status: 200, headers: { 'Content-Type': 'text/javascript' } });
}

if (url.pathname.startsWith('/s/player/')) {
url.hostname = 'www.youtube.com';
headers.delete('Cookie');
headers.set('Origin',  'https://www.youtube.com');
headers.set('Referer', 'https://www.youtube.com/');
} else {
if (url.hostname.includes('youtube.com')) url.hostname = 'm.youtube.com';
headers.set('Origin',  'https://m.youtube.com');
headers.set('Referer', 'https://m.youtube.com/');
if (cookies) headers.set('Cookie', cookies);
}

let body = init.body ?? null;
if (!body && input instanceof Request && method !== 'GET' && method !== 'HEAD') {
body = await input.arrayBuffer();
}
return fetch(url.toString(), { method, headers, body, credentials: 'omit' });
}



  

Platform.shim.eval = async (data, env) => {
const props = [];
if (env.n)   props.push(`n: exportedVars.nFunction("${env.n}")`);
if (env.sig) props.push(`sig: exportedVars.sigFunction("${env.sig}")`);
return new Function(`${data.output}\nreturn { ${props.join(', ')} }`)();
};

// Create Innertube (WEB Client Setup & Proxy)
const cookies = window.Android?.getAllCookies?.('https://www.youtube.com') ?? '';

const yt = await Innertube.create({
cookie: cookies,
retrieve_player: true,
generate_session_locally: true,
fetch: fetchFunction});




  

// PoToken Generator 
let placeholderPoToken = null;

  
async function generateFullPoToken() {
try {

const initialAttestationData = document.body.innerHTML.match(/window\.ytAtN\(\s*({[\s\S]*?})\s*\)/);
const initialAttestationDataJson = parseLooseJSON(initialAttestationData[1]);


const payload = {
  engagementType: 'ENGAGEMENT_TYPE_UNBOUND',
  eacrToken: initialAttestationDataJson.T
};


const challengeResponse =  await yt.actions.execute('/att/get', { parse: true, ...payload });


const bg = challengeResponse.bg_challenge;

const challenge = {
interpreterUrl: {
privateDoNotAccessOrElseTrustedResourceUrlWrappedValue:
bg.interpreter_url.private_do_not_access_or_else_trusted_resource_url_wrapped_value,
},
interpreterHash:            bg.interpreter_hash,
program:                    bg.program,
globalName:                 bg.global_name,
clientExperimentsStateBlob: bg.client_experiments_state_blob,
};

const interpreterJsRes = await fetch(
`https:${challenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue}`
);
const interpreterJS = await interpreterJsRes.text();

new Function(interpreterJS)();
const bgClient = await BotGuardClient.create({
program:    challenge.program,
globalName: challenge.globalName,
globalObject:  window,
});

const webPoSignalOutput = [];
const botguardResponse  = await bgClient.snapshot({ webPoSignalOutput });

const REQUEST_KEY       = 'O43z0dpjhgX20SCx4KAo';
const integrityTokenRes = await fetch(buildURL('GenerateIT'), {
method:  'POST',
headers: getHeaders(),
body:    JSON.stringify([REQUEST_KEY, botguardResponse]),
});
const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] =
await integrityTokenRes.json();

if (!integrityToken) throw new Error('Empty integrity token');

const minter  = await WebPoMinter.create(
{ integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken },
webPoSignalOutput
);

return await minter.mintAsWebsafeString(videoId);
} catch (e) {
console.error('[YTPRO] PoToken generation failed:', e);
return null;
}
}

const fullTokenPromise =await generateFullPoToken();

const info = await yt.getBasicInfo(videoId, { client: 'WEB' });

 
const player = yt.session.player;
const streamingData = info.streaming_data;
  

if (!streamingData || !player) { 
window.Android?.showToast?.('No streaming data or player found.'); 
return; 
}

const safeTitle = info.basic_info.title.replace(/[\/\\?%*:|"<>]/g, '-');
try{ Android.setDownloadFolder(safeTitle); }catch(e){}

// Fallback size formatter just in case window.formatFileSize isn't ready
const formatBytes = (bytes) => {
if (window.formatFileSize) return window.formatFileSize(bytes);
if (bytes === 0 || isNaN(bytes)) return "Unknown Size";
const k = 1024;
const sizes = ['Bytes', 'KB', 'MB', 'GB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Short codec label for the download list, e.g. avc1 / av01 / vp9 / mp4a
const shortCodec = (f) => {
const m = (f && (f.codec || f.mimeType || f.mime_type)) || "";
const c = (f && f.codec) ? f.codec : (m.match(/codecs="(.*?)"/)?.[1] || "");
return c.split(",")[0].trim().split(".")[0].toUpperCase();
};

// Helper to standardize format objects
const cleanFormat = (f) => {
const durationSec = (f.approxDurationMs || f.approx_duration_ms || info.basic_info.duration * 1000 || 0) / 1000;
const bytes = f.contentLength ? parseInt(f.contentLength) : (f.bitrate ? Math.floor((f.bitrate * durationSec) / 8) : 0);
const mime = f.mimeType || f.mime_type || "";
const isWebm = mime.includes('webm');
const isMp4 = mime.includes('mp4');
const codec = mime.match(/codecs="(.*?)"/)?.[1] || "";

return {
itag: f.itag,
mimeType: mime,
container: isWebm ? 'webm' : (isMp4 ? 'mp4' : 'other'),
codec: codec,
qualityLabel: f.qualityLabel || f.quality_label || null,
bitrate: f.bitrate,
width: f.width,
hasVideo: !!f.width,
hasAudio: !!f.audioSampleRate || !!f.audio_sample_rate || mime.startsWith('audio/'),
languageId: f.language || f.audioTrack?.id || f.audio_track?.id || 'default',
languageName: f.audioTrack?.displayName || f.audio_track?.display_name || 'Default',
isDefaultAudio: f.audioTrack?.audioIsDefault || f.audio_track?.audio_is_default || (!f.audioTrack && !f.audio_track),
sizeBytes: bytes,
audioQuality:f.audio_quality || null,
audioTrackId:f.audio_track?.id,
sizeFormatted: formatBytes(bytes)
};
};

// Extract raw lists
const rawFormats = streamingData.formats || [];
const rawAdaptive = streamingData.adaptive_formats || [];

const preMuxed = rawFormats.map(cleanFormat);
const adaptive = rawAdaptive.map(cleanFormat);

// Filter adaptive for matching
const videoOnly = adaptive.filter(f => f.hasVideo && !f.hasAudio);
const audioOnly = adaptive.filter(f => f.hasAudio && !f.hasVideo);

// ── BUILD CATEGORY 2: MUXABLE COMBINATIONS ──
const muxableOptions = [];

// Get all unique video qualities (e.g., "1080p60", "1080p", "720p")
const uniqueQualities = [...new Set(videoOnly.map(v => v.qualityLabel).filter(Boolean))]
.sort((a, b) => parseInt(b) - parseInt(a)); // Sort High to Low

// Get all unique audio languages
const uniqueLanguages = [];
const langMap = new Map();
audioOnly.forEach(a => {
if (!langMap.has(a.languageId)) {
langMap.set(a.languageId, { id: a.languageId, name: a.languageName, isDefault: a.isDefaultAudio });
uniqueLanguages.push(langMap.get(a.languageId));
}
});

// Create explicit safe pairs
uniqueQualities.forEach(quality => {
// Ban AV1 to protect Android MediaMuxer
const vForQuality = videoOnly.filter(v => v.qualityLabel === quality && !v.codec.includes('av01'));

// Sort to get highest bitrate video for the container
const mp4Video = vForQuality.filter(v => v.container === 'mp4').sort((a,b) => b.bitrate - a.bitrate)[0];
const webmVideo = vForQuality.filter(v => v.container === 'webm').sort((a,b) => b.bitrate - a.bitrate)[0];

uniqueLanguages.forEach(lang => {
const aForLang = audioOnly.filter(a => a.languageId === lang.id);

// Sort to get highest bitrate audio for the container
const mp4Audio = aForLang.filter(a => a.container === 'mp4').sort((a,b) => b.bitrate - a.bitrate)[0];
const webmAudio = aForLang.filter(a => a.container === 'webm').sort((a,b) => b.bitrate - a.bitrate)[0];

// Add matching MP4 pair
if (mp4Video && mp4Audio) {
muxableOptions.push({
type: 'muxable',
qualityLabel: quality,
language: lang.name,
languageId: lang.id,
isDefaultLanguage: lang.isDefault,
container: 'mp4',
totalBytes: mp4Video.sizeBytes + mp4Audio.sizeBytes,
totalSizeFormatted: formatBytes(mp4Video.sizeBytes + mp4Audio.sizeBytes),
videoItag: mp4Video.itag,
audioItag: mp4Audio.itag,
videoDetails: mp4Video,
audioDetails: mp4Audio
});
}

// Add matching WebM pair
if (webmVideo && webmAudio) {
muxableOptions.push({
type: 'muxable',
qualityLabel: quality,
language: lang.name,
languageId: lang.id,
isDefaultLanguage: lang.isDefault,
container: 'webm',
totalBytes: webmVideo.sizeBytes + webmAudio.sizeBytes,
totalSizeFormatted: formatBytes(webmVideo.sizeBytes + webmAudio.sizeBytes),
videoItag: webmVideo.itag,
audioItag: webmAudio.itag,
videoDetails: webmVideo,
audioDetails: webmAudio
});
}
});
});

// Final Master Object
const ytproMediaData = {
title: info.basic_info.title,
videoId: videoId,
durationSec: info.basic_info.duration || 0,
categories: {
"muxable": muxableOptions,
"audioOnly": audioOnly,
"videoOnly": videoOnly
}
};



ytproDownDiv.insertAdjacentHTML('beforeend',`<style>#downytprodiv a{text-decoration:none;} #downytprodiv li{list-style:none; display:flex;align-items:center;justify-content:center;border-radius:25px;padding:8px;background:${d};margin:5px;margin-top:8px}
#downytprodiv select {
min-height: 20px;
width: auto;
border-radius: 25px;
border: 0;
padding:5px;
color:${c};
font-size:12px;
background:${d};
}

</style>`);




ytproDownDiv.querySelector("#videoViewDiv").innerHTML=`<label for="selectLang" style="margin-right:5px;">Language:</label>`;


var langList=document.createElement("select");
langList.setAttribute("id","selectLang")

uniqueLanguages.forEach(l=>{
var sl=document.createElement("option");
sl.textContent=l.name;
sl.value=l.id;
if (l.isDefault === true) {
sl.selected = true;
}
langList.appendChild(sl);
});



ytproDownDiv.querySelector("#videoViewDiv").appendChild(langList);


langList.addEventListener("change",(e)=>{
updateMuxFormats(e.target.value);
updateAudioOnlyFormats(e.target.value);
})









//var defaultLangId=uniqueLanguages.filter( arr => { return arr.isDefault;})[0].id;

var createAndAppend=()=>{
var div=document.createElement("div");
ytproDownDiv.querySelector("#videoViewDiv").appendChild(div);
return div;
}


var muxedDiv=createAndAppend();
var audioOnlyDiv=createAndAppend();
var videoOnlyDiv=createAndAppend();




function updateMuxFormats(langId=uniqueLanguages.filter( arr => { return arr.isDefault;})[0].id){

muxedDiv.innerHTML="";

muxableOptions.forEach(mux =>{
if(mux.languageId != langId) return;
if(mux.container !== "mp4") return;

var formatLi=document.createElement("li");
/*formatLi.dataset.audioItag=mux.audioItag;
formatLi.dataset.videoItag=mux.videoItag;
formatLi.dataset.langId=mux.languageId;
formatLi.dataset.isWebm=mux.container == "webm";
*/


Object.assign(formatLi.dataset,{
langId:mux.audioDetails.audioTrackId,
isWebm:mux.container == "webm",
audioItag:mux.audioItag,
videoItag:mux.videoItag
});


formatLi.innerHTML=`${downBtn}<span style="margin-left:10px;" >${mux.qualityLabel} | ${mux.container.toUpperCase()} | ${mux.totalSizeFormatted} (${shortCodec(mux.videoDetails)})</span>`;
muxedDiv.appendChild(formatLi);
});




}



function updateAudioOnlyFormats(langId=uniqueLanguages.filter( arr => { return arr.isDefault;})[0].id){

audioOnlyDiv.innerHTML="";

var formatDivider=document.createElement("li");

formatDivider.innerHTML=`
<span>Audio Only (${uniqueLanguages.filter( arr => { return arr.id==langId;})[0].name})</span> 
<span style="margin-left:10px;transform:rotate(180deg);"  >
<svg style="margin-top:5px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${c}"  viewBox="0 0 18 18">
<path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
</svg>
</span>
`;
Object.assign(formatDivider.style,{
minHeight:"20px",
borderRadius:"5px",
background:"#0000"
})

audioOnlyDiv.appendChild(formatDivider);

formatDivider.addEventListener("click",()=>{
Array.from(formatDivider.parentElement.children).forEach((c,i)=>{
if(i == 0) {
c.children[1].style.transform = c.children[1].style.transform === "rotate(180deg)" ? "rotate(0deg)" : "rotate(180deg)";
return;
}
c.style.display = c.style.display === "none" ? "flex" : "none";
})
});


audioOnly.forEach(aud =>{
if(aud.languageId != langId) return;

var formatLi=document.createElement("li");
/*formatLi.dataset.audioItag=aud.itag;
formatLi.dataset.isWebm=aud.container == "webm";
formatLi.dataset.langId=mux.languageId;*/

Object.assign(formatLi.dataset,{
langId:aud.audioTrackId,
isWebm:aud.container == "webm",
audioItag:aud.itag
});

formatLi.innerHTML=`${downBtn}<span style="margin-left:10px;">${aud.audioQuality.replaceAll("AUDIO_QUALITY_"," ")} | ${aud.container.toUpperCase()} | ${aud.sizeFormatted} (${shortCodec(aud)})`;
audioOnlyDiv.appendChild(formatLi);
});




}



function updateVideoOnlyFormats(){

videoOnlyDiv.innerHTML="";

var formatDivider=document.createElement("li");

formatDivider.innerHTML=`
<span>Video Only</span> 
<span style="margin-left:10px;transform:rotate(180deg);"  >
<svg style="margin-top:5px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${c}"  viewBox="0 0 18 18">
<path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
</svg>
</span>
`;
Object.assign(formatDivider.style,{
minHeight:"20px",
borderRadius:"5px",
background:"#0000"
})

videoOnlyDiv.appendChild(formatDivider);

formatDivider.addEventListener("click",()=>{
Array.from(formatDivider.parentElement.children).forEach((c,i)=>{
if(i == 0) {
c.children[1].style.transform = c.children[1].style.transform === "rotate(180deg)" ? "rotate(0deg)" : "rotate(180deg)";
return;
}
c.style.display = c.style.display === "none" ? "flex" : "none";
})
});


videoOnly.forEach(vid =>{
if(vid.container !== "mp4") return;

var formatLi=document.createElement("li");
formatLi.dataset.videoItag=vid.itag;
formatLi.dataset.isWebm=vid.container == "webm";
formatLi.innerHTML=`${downBtn}<span style="margin-left:10px;" >${vid.qualityLabel} | ${vid.container.toUpperCase()} | ${vid.sizeFormatted} (${shortCodec(vid)})</span>`;
videoOnlyDiv.appendChild(formatLi);
});




}





function updateThumbnails(){
var div=ytproDownDiv.querySelector("#thumbViewDiv");
div.innerHTML="<style>.thu{height:80px;border-radius:5px;}.thu img{max-height:97%;max-width:70%;border-radius:10px;border:1px solid silver;}</style>";

var thumbs=info.basic_info.thumbnail;

thumbs.forEach(thumb=>{
div.innerHTML+=`<li class="thu" data-url="${thumb.url}" data-title="Thumbnail ${thumb.height} &#x2715; ${thumb.width} ${safeTitle} Youtube Lite.jpg" >
<img src="${thumb.url}"><br>
<span style="margin-left:30px;display:flex;align-items:center;justify-content:center;"  >${downBtn}<span style="margin-left:10px;"  >${thumb.height} &#x2715; ${thumb.width}
</span></span></li>`
})


div.addEventListener("click",(e)=>{
var el=e.target.closest("[data-url]");
if(!el) return;

try{ window.__ytdlCtx = { v: ytdlCurVid(), t: ytdlPageTitle() }; }catch(e){}
try{ Android.setDownloadFolder(ytdlPageTitle()); }catch(e){}
Android.downvid(el.dataset.title,el.dataset.url,"image/jpg");

});
}


function updateCaptions(){
var div=ytproDownDiv.querySelector("#captionsViewDiv");
div.innerHTML=`<style>cp{width:100%;height:auto;padding-bottom:8px;}c{height:45px;width:50px;padding-top:5px;background:${d};border-radius:10px;margin:0 6px;display:block}</style>`;

var captions=info?.captions?.caption_tracks;

if(!captions) return div.innerHTML=`No Captions Found`;

var t=`Captions ${safeTitle} Youtube Lite`;

captions.forEach(cap=>{

cap.baseUrl = cap.base_url.replace("&fmt=srv3","");

div.innerHTML+=`
<span style="display:block;text-align:center">${cap?.name?.text}</span>
<br>
<div style="position:static;display:flex;justify-content:center">
<c data-url="${cap.baseUrl}&fmt=sbv" data-title="${t}" data-ext=".txt" >${downBtn} <br>.txt</c>
<c  data-url="${cap.baseUrl}&fmt=srt" data-title="${t}" data-ext=".srt" >${downBtn} <br>.srt</c>
</div>
<br><br>`;
});



div.addEventListener("click",(e)=>{
var el=e.target.closest("[data-url]");
if(!el) return;

try{ window.__ytdlCtx = { v: ytdlCurVid(), t: ytdlPageTitle() }; }catch(e){}
try{ Android.setDownloadFolder(ytdlPageTitle()); }catch(e){}
Android.downvid(el.dataset.title+el.dataset.ext,el.dataset.url,"plain/text");

});


}



/*EVENT LISTENERS**/
muxedDiv.addEventListener("click",(e)=>{
var el=e.target.closest("[data-audio-itag]");
if(!el) return;
downloadSABRStream(el.dataset.videoItag,el.dataset.audioItag,el.dataset.isWebm,el.dataset.langId,EnabledTrackTypes.VIDEO_AND_AUDIO);


});



audioOnlyDiv.addEventListener("click",(e)=>{
var el=e.target.closest("[data-audio-itag]");
if(!el) return;
downloadSABRStream(null,el.dataset.audioItag,el.dataset.isWebm,el.dataset.langId,EnabledTrackTypes.AUDIO_ONLY);
});



videoOnlyDiv.addEventListener("click",(e)=>{
var el=e.target.closest("[data-video-itag]");
if(!el) return;
downloadSABRStream(el.dataset.videoItag,null,el.dataset.isWebm,null,EnabledTrackTypes.VIDEO_ONLY);
});






if(info?.basic_info?.is_live || info?.basic_info?.is_live_content){

ytproDownDiv.querySelector("#videoViewDiv").innerHTML="Downloading live streams <br>aren't supported at the moment";
}else{
updateMuxFormats();
updateAudioOnlyFormats();
updateVideoOnlyFormats(); 
}
updateThumbnails();
updateCaptions();




// ── 7. Extract SABR URL & Config ──────────────────────────────────────────
async function extractSabrConfig(playerInfo) {
const url = await player.decipher(playerInfo.streaming_data?.server_abr_streaming_url);
const cfg = playerInfo.player_config
?.media_common_config
?.media_ustreamer_request_config
?.video_playback_ustreamer_config;
return { url, cfg };
}

const { url: serverAbrUrl, cfg: ustreamerConfig } = await extractSabrConfig(info);
if (!serverAbrUrl || !ustreamerConfig) {
window.Android?.showToast?.('Missing SABR config.');
return;
}

const rawUstreamerConfig = typeof ustreamerConfig === 'string' ? ustreamerConfig : JSON.stringify(ustreamerConfig);
const adaptiveFormats = streamingData.adaptive_formats ?? [];
const sabrFormats = adaptiveFormats.map(f => buildSabrFormat(f));






async function downloadSABRStream(videoItag,audioItag,isWebm,langId,enabledTrack){
  
  
if(!Android.isWebViewSupported()){
  Android.showToast("Please Update your WebView.");
  return;
}
if(!Android.hasStoragePermission()){
  return;
}

Android.showToast("Download Started");


const containerExt = isWebm == "true" ? 'webm' : 'mp4';

// ── Grab the absolute lowest qualities to feed to the Black Hole 

const lowestAudio = audioOnly.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))[0].itag;

const lowestVideo = adaptiveFormats
.filter(f => f.width)
.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))[0].itag;

const trashSabrAudio = sabrFormats.filter(s=> s.itag==lowestAudio)[0];
const trashSabrVideo =sabrFormats.filter(s=> s.itag==lowestVideo)[0];


const targetSabrVideo=sabrFormats.filter(s=> s.itag==videoItag)[0] || trashSabrVideo;

var targetSabrAudio;

if(langId != "undefined"){
targetSabrAudio = sabrFormats.filter(s=> s.itag==audioItag && s.audioTrackId == langId)[0] || trashSabrAudio;
}else{
targetSabrAudio = sabrFormats.filter(s=> s.itag==audioItag)[0] || trashSabrAudio;
}


const sabrStream = new SabrStream({
videoId: videoId,
cpn: info.cpn, 
serverAbrStreamingUrl: serverAbrUrl,
videoPlaybackUstreamerConfig: rawUstreamerConfig,
formats: sabrFormats,
poToken: placeholderPoToken ?? undefined, 
clientInfo: {
clientName: 1, // WEB
clientVersion: yt.session.context.client.clientVersion,
osName: 'Windows',
osVersion: '10.0',
},
durationMs: (info.basic_info.duration ?? 0) * 1000,
fetch: async (input, init = {}) => {
const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
return fetch(url, { ...init, mode: 'cors', credentials: 'include' });
},
});

sabrStream.on('reloadPlayerResponse', async () => {
try {
const freshInfo = await yt.getBasicInfo(videoId, { client: 'WEB' });
const { url: newUrl, cfg: newCfg } = await extractSabrConfig(freshInfo);
if (newUrl) sabrStream.setStreamingURL(newUrl);
if (newCfg) sabrStream.setUstreamerConfig(typeof newCfg === 'string' ? newCfg : JSON.stringify(newCfg));
} catch (e) {}
});

let isTokenApplied = false;
sabrStream.on('streamProtectionStatusUpdate', async (data) => {
if ((data.status === 2 || data.status === 3) && !isTokenApplied) {
isTokenApplied = true;
try {
const fullToken = await fullTokenPromise; 
if (fullToken) sabrStream.poToken = fullToken;
} catch (err) {}
}
});


const { videoStream ,audioStream} = await sabrStream.start({
preferMp4: !isWebm,  
preferH264: !isWebm, 
videoFormat: () => targetSabrVideo, 
audioFormat: () => targetSabrAudio,
enabledTrackTypes:enabledTrack,
});

const durationSec = info.basic_info.duration || 0;


createDownloaderStatus();
window.__ytdlNeedNewCard = true;
try{ if(location.hash === "#download"){ history.back(); } else { var _dlSheet = document.getElementById("outerdownytprodiv"); if(_dlSheet) _dlSheet.remove(); } }catch(e){}

var downloaderDiv=document.querySelector("#ytProDownloaderDiv");



/* ---------- download manager cards ---------- */
var pendingMuxCards = {};

function ytdlThumbSrc(){
try{ return "https://i.ytimg.com/vi/"+videoId+"/mqdefault.jpg"; }catch(e){ return ""; }
}


var ytdlDetailCard = null;

function ytdlEnsureDetail(){
var d = document.getElementById("ytdlDetail");
if(d) return d;
d = document.createElement("div");
d.id = "ytdlDetail";
d.style.cssText = "position:fixed;left:2.5%;bottom:20px;width:95%;height:70%;z-index:99999999999999;background:" + (isD ? "#212121" : "#f1f1f1") + ";color:" + c + ";border-radius:12px;display:none;padding:14px;box-sizing:border-box;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)";
d.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">'
+ '<div id="ytdlDetailBack" style="width:30px;height:30px;border-radius:50%;background:' + (isD ? "#3a3a3a" : "#ffffff") + ';display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;">'
+ '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="' + c + '" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></div>'
+ '<div style="font-weight:600;font-size:15px;">Downloads</div></div>'
+ '<div style="display:flex;gap:10px;margin-top:16px;align-items:center;">'
+ '<img id="ytdlDetailThumb" style="width:96px;height:54px;border-radius:8px;object-fit:cover;background:#000;">'
+ '<div id="ytdlDetailTitle" style="font-size:14px;font-weight:600;line-height:1.35;"></div></div>'
+ '<div id="ytdlDetailRows" style="margin-top:12px;"></div>'
+ '<div id="ytdlDetailOpen" style="display:none;margin-top:14px;padding:12px;border-radius:8px;background:' + (isD ? "#3a3a3a" : "#ffffff") + ';font-size:13px;word-break:break-all;cursor:pointer;"></div>';
document.body.appendChild(d);
d.querySelector("#ytdlDetailBack").addEventListener("click", function(e){ e.stopPropagation(); ytdlCloseDetail(); });
d.querySelector("#ytdlDetailOpen").addEventListener("click", function(){
if(!ytdlDetailCard) return;
var name = ytdlDetailCard.dataset.file || "";
var ok = false;
try{ ok = window.Android && Android.openDownloadedFile ? Android.openDownloadedFile(name) : false; }catch(e){}
if(!ok){ try{ Android.showToast("File not found yet: " + name); }catch(e){} }
});
return d;
}

function ytdlOpenDetail(card){
var d = ytdlEnsureDetail();
try{
  var prevRows = d.querySelector("#ytdlDetailRows");
  if(prevRows){
    var olds = [].slice.call(prevRows.children);
    for(var oi = 0; oi < olds.length; oi++){
      var ch = olds[oi];
      if(ch && ch.__card){
        try{ ch.__card.appendChild(ch); ch.style.display = "none"; }catch(eBack){}
      }
    }
  }
}catch(ePrev){}
ytdlDetailCard = card;
d.querySelector("#ytdlDetailTitle").textContent = card.querySelector(".ytdlTitle").textContent;
d.querySelector("#ytdlDetailThumb").src = card.querySelector(".ytdlThumb").src;
var rows = d.querySelector("#ytdlDetailRows");
var body = card.querySelector(".ytdlBody");
if(!body){ try{ Android.showToast("Open detail failed: no content"); }catch(eToast){} return; }
body.__card = card;
rows.appendChild(body);
body.style.display = "block";
var openBox = d.querySelector("#ytdlDetailOpen");
if(openBox) openBox.style.display = "none";
d.style.display = "block";
}
window.__ytdlOpenDetail = ytdlOpenDetail;

function ytdlCloseDetail(){
var d = document.getElementById("ytdlDetail");
if(!d) return;
var bodies = [].slice.call(d.querySelectorAll("#ytdlDetailRows .ytdlBody"));
for(var bi = 0; bi < bodies.length; bi++){
var bb = bodies[bi];
var owner = bb.__card || ytdlDetailCard;
if(owner){
try{ owner.appendChild(bb); bb.style.display = "none"; }catch(eMove){}
try{ if(ytdlRefreshSub) ytdlRefreshSub(owner); }catch(eSub){}
}
}
d.style.display = "none";
ytdlDetailCard = null;
}


function ytdlNewCard(){
var list = document.getElementById("ytdlList");
if(!list) return null;
var vid = ytdlCurVid();
var cards = list.querySelectorAll(".ytdlCard");
for(var i = 0; i < cards.length; i++){
if(vid && cards[i].dataset.v === vid){
var p0 = document.getElementById("ytProDownloaderDiv");
if(p0) p0.style.display = "block";
return cards[i];
}
}
var card = document.createElement("div");
card.className = "ytdlCard";
card.dataset.v = vid || "";
card.innerHTML = '<div class="ytdlHead">'
+ '<img class="ytdlThumb" src="' + (vid ? ("https://i.ytimg.com/vi/" + vid + "/mqdefault.jpg") : ytdlThumbSrc()) + '">'
+ '<div class="ytdlMeta"><div class="ytdlTitle"></div><div class="ytdlSub">Downloading...</div></div>'
+ '<div class="ytdlChev"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="' + c + '" d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.42l4.59-4.59a1 1 0 0 0 0-1.42L10.7 6.71a1 1 0 0 0-1.41 0z"/></svg></div>'
+ '</div><div class="ytdlBody" style="display:none"></div>';
card.querySelector(".ytdlTitle").textContent = safeTitle;
card.querySelector(".ytdlHead").addEventListener("click", function(){ ytdlOpenDetail(card); });
var emp = list.querySelector(".ytdlEmpty");
if(emp) emp.remove();
list.appendChild(card);
try{
var _body = card.querySelector(".ytdlBody");
var _hist = ytdlHist();
var _seen = {};
for(var j = _hist.length - 1; j >= 0; j--){
var _it = _hist[j];
if(!_it || (_it.v || "") !== (vid || "")) continue;
if(!_it.n || _seen[_it.n]) continue;
_seen[_it.n] = 1;
_body.appendChild(ytdlFileRow(_it.n));
}
ytdlRefreshSub(card);
}catch(e){}
var panel = document.getElementById("ytProDownloaderDiv");
if(panel) panel.style.display = "block";
return card;
}

function markCardDone(name, err){
var card = window.__ytdlLastCard;
if(!card) return;
var sub = card.querySelector(".ytdlSub");
if(err){
if(sub){ sub.textContent = "Failed: " + err; sub.style.color = "#ff7a7a"; }
return;
}
card.dataset.done = "1";
card.dataset.file = name || "";
var body = card.querySelector(".ytdlBody");
if(!body){ var det = document.getElementById("ytdlDetailRows"); if(det) body = det.querySelector(".ytdlBody"); }
if(!body) return;
var rows = body.querySelectorAll(".ytdlRow");
for(var i = 0; i < rows.length; i++) rows[i].remove();
if(name) body.appendChild(ytdlFileRow(name));
var tt = card.querySelector(".ytdlTitle"), th = card.querySelector(".ytdlThumb");
if(name){
var h = ytdlHist().filter(function(x){ return !(x && x.n === name); });
h.push({ n: name, t: tt ? tt.textContent : (safeTitle || ""), th: th ? th.src : "", v: card.dataset.v || "" });
ytdlSaveHist(h);
}
ytdlRefreshSub(card);
var _det = document.getElementById("ytdlDetailRows");
if(!_det || !_det.contains(body)) body.style.display = "none";
var chev = card.querySelector(".ytdlChev");
if(chev) chev.style.transform = "";
}

window.ytdlOnMuxDone = function(name, err){
try{
var card = pendingMuxCards[name];
if(card){ delete pendingMuxCards[name]; window.__ytdlLastCard = card; }
markCardDone(name, err);
}catch(e){}
};

function createProgreses(streamName){
if(!window.__ytdlLastCard || window.__ytdlNeedNewCard){
window.__ytdlLastCard = ytdlNewCard();
window.__ytdlNeedNewCard = false;
}
var card = window.__ytdlLastCard;
if(!card){
var fallbackDetails = document.createElement("span");
return { elDetails: fallbackDetails, elProgress: document.createElement("div") };
}
var row = document.createElement("div");
row.className = "ytdlRow";
var elDetails = document.createElement("span");
var elProgress = document.createElement("div");
var elProgressBar = document.createElement("div");
elDetails.className = "ytproDetails";
elProgressBar.className = "ytproProgressBar";
elProgress.className = "ytproProgress";
elDetails.innerHTML = `${streamName}: <span></span>`;
elProgressBar.appendChild(elProgress);
row.appendChild(elDetails);
row.appendChild(elProgressBar);
card.querySelector(".ytdlBody").appendChild(row);
try{ ytdlRefreshSub(card); }catch(e){}
return { elDetails, elProgress };
}



//video only
if(enabledTrack==EnabledTrackTypes.VIDEO_ONLY){

const estVideoBytes = targetSabrVideo.contentLength || (targetSabrVideo.bitrate ? Math.floor((targetSabrVideo.bitrate * durationSec) / 8) : 0);


var fileName=`${safeTitle}_${new Date().getTime()}_VIDEO.${containerExt}`;

var {elDetails,elProgress} = createProgreses("Video Stream");

await pipeToDisk(videoStream,fileName, estVideoBytes,elDetails,elProgress);
markCardDone(fileName);



}else if(enabledTrack==EnabledTrackTypes.AUDIO_ONLY){
//audio only 


const estAudioBytes = targetSabrAudio.contentLength || 
(targetSabrAudio.bitrate ? Math.floor((targetSabrAudio.bitrate * durationSec) / 8) : 0);

var {elDetails,elProgress} = createProgreses("Audio Stream");

var fileName=`${safeTitle}_${new Date().getTime()}_AUDIO.${containerExt}`;

await pipeToDisk(audioStream,fileName, estAudioBytes,elDetails,elProgress);
markCardDone(fileName);



}else if(enabledTrack==EnabledTrackTypes.VIDEO_AND_AUDIO){
//both 



const estVideoBytes = targetSabrVideo.contentLength || (targetSabrVideo.bitrate ? Math.floor((targetSabrVideo.bitrate * durationSec) / 8) : 0);


const estAudioBytes = targetSabrAudio.contentLength || 
(targetSabrAudio.bitrate ? Math.floor((targetSabrAudio.bitrate * durationSec) / 8) : 0);


var videoEl= createProgreses("Video Stream");
var audioEl= createProgreses("Audio Stream");


var videoFileName=`${safeTitle}_${new Date().getTime()}_VIDEO.${containerExt}`;

var audioFileName=`${safeTitle}_${new Date().getTime()}_AUDIO.${containerExt}`;


const downloadTasks = [];

if (videoStream) {
downloadTasks.push(pipeToDisk(videoStream, videoFileName, estVideoBytes,videoEl.elDetails,videoEl.elProgress));
}

if (audioStream) {
downloadTasks.push(pipeToDisk(audioStream, audioFileName, estAudioBytes,audioEl.elDetails,audioEl.elProgress));
}

await Promise.all(downloadTasks);


window.Android.showToast('Muxing formats...');

const muxOutName = `${safeTitle}_${new Date().getTime()}_FULL.${containerExt}`;
pendingMuxCards[muxOutName] = window.__ytdlLastCard;
window.Android?.muxVideoAudio?.(videoFileName,audioFileName,muxOutName);

}









}


}




function getDownloadElement() {
const isExisting = (id) => document.getElementById(id);

// Reuse or create outer + inner divs
const ytproDown = isExisting("outerdownytprodiv") || document.createElement("div");
const ytproDownDiv = isExisting("downytprodiv") || document.createElement("div");

ytproDown.id = "outerdownytprodiv";
ytproDownDiv.id = "downytprodiv";

Object.assign(ytproDown.style, {
height: "100%", width: "100%", position: "fixed",
top: "0", left: "0", display: "flex",
justifyContent: "center", background: "rgba(0,0,0,0.4)", zIndex: "9"
});

Object.assign(ytproDownDiv.style, {
height: "65%", width: "85%", overflow: "auto",
background: isD ? "#212121" : "#f1f1f1",
position: "absolute", bottom: "20px", zIndex: "99",
padding: "20px", borderRadius: "25px", textAlign: "center"
});

ytproDown.addEventListener("click", (ev) => {
if (!ytproDownDiv.contains(ev.target)) history.back();
});

// Build tabs declaratively
const TABS = [
{ label: "Formats",    viewId: "videoViewDiv"    },
{ label: "Thumbnails", viewId: "thumbViewDiv"    },
{ label: "Captions",   viewId: "captionsViewDiv" },
];

const tabStyle = {
height: "100%",
width: "calc((100% - 10px) / 3)",
borderRadius: "25px",
lineHeight: "30px"
};

const tabs = document.createElement("div");
Object.assign(tabs.style, {
height: "30px", width: "calc(95% - 44px)", display: "flex",
gap: "5px", position: "absolute", top: "10px", left: "calc(2.5% + 44px)"
});

const views = [];

TABS.forEach(({ label, viewId }) => {
const tab = document.createElement("div");
Object.assign(tab.style, tabStyle);
tab.textContent = label;
tab.dataset.view = `#${viewId}`;
tabs.appendChild(tab);

const view = document.createElement("div");
view.id = viewId;
view.style.paddingTop="40px";
view.style.display = "none";
ytproDownDiv.appendChild(view);
views.push(view);
});

tabs.addEventListener("click", (e) => {
const el = e.target.closest("[data-view]");
if (!el) return;

[...tabs.children].forEach(child => child.style.background = "transparent");
views.forEach(v => v.style.display = "none");

document.querySelector(el.dataset.view).style.display = "block";
el.style.background = d;
});

document.body.appendChild(ytproDown);
ytproDown.appendChild(ytproDownDiv);
ytproDownDiv.prepend(tabs); // tabs sit above views

// Back button: closes the download sheet (same as tapping outside)
const downBack = document.createElement("div");
downBack.id = "ytproDownBack";
Object.assign(downBack.style, {
height: "30px", width: "30px", borderRadius: "15px",
position: "absolute", top: "10px", left: "2.5%",
display: "flex", alignItems: "center", justifyContent: "center",
background: d, cursor: "pointer", zIndex: "3"
});
downBack.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="${c}" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`;
downBack.addEventListener("click", (e) => {
e.stopPropagation();
if (window.location.hash === "#download") history.back();
else {
const outer = document.getElementById("outerdownytprodiv");
if (outer) outer.remove();
}
});
ytproDownDiv.prepend(downBack);

tabs.children[0].style.background=d;
document.querySelector("#videoViewDiv").style.display = "block"

return ytproDownDiv;
}




// 1. Global registry to catch ports when Android sends them back
const pendingStreams = {};

window.addEventListener("message", (event) => {
if (typeof event.data === "string" && event.data.startsWith("PORT_FOR:") && event.ports.length > 0) {
const fileName = event.data.substring(9);
if (pendingStreams[fileName]) {
pendingStreams[fileName](event.ports[0]); // Hand the port back to pipeToDisk
delete pendingStreams[fileName];
}
}
});

// 2. Helper function to request a dedicated pipe
function createDedicatedPipe(fileName) {
return new Promise((resolve) => {
pendingStreams[fileName] = resolve;
window.Android?.requestBinaryPort?.(fileName);
});
}

// 3. pipeToDisk
async function pipeToDisk(stream, fileName, expectedTotalBytesStr, elDetails, elProgress) {
const expectedBytes = parseInt(expectedTotalBytesStr || "0", 10);
const totalMB = expectedBytes > 0 ? (expectedBytes / (1024 * 1024)).toFixed(2) : '?';

const filePort = await createDedicatedPipe(fileName);
if (!filePort) {
console.error(`[YTPRO] Failed to get port for ${fileName}`);
return 0;
}

const reader = stream.getReader();
let total = 0;
let lastLogMB = -1;
const startedAt = Date.now();

try {
const CHUNK_SIZE = 1024 * 512; 

while (true) {
const { done, value } = await reader.read();
if (done) break;

if (value?.length > 0) {
let offset = 0;
while (offset < value.length) {
    const end = Math.min(offset + CHUNK_SIZE, value.length);
    const chunk = value.subarray(offset, end);
    const chunkBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);

    // Send the binary chunk down this file's specific port
    filePort.postMessage(chunkBuffer);

    const bytesWritten = chunkBuffer.byteLength;
    offset = end;
    total += bytesWritten;

    const currentMBFloor = Math.floor(total / (1024 * 1024));
    if (currentMBFloor > lastLogMB) {
        const downloadedMB = (total / (1024 * 1024)).toFixed(2);
        const percent = expectedBytes > 0 ? Math.round((total / expectedBytes) * 100) : -1;
        const elapsed = Math.max(0.5, (Date.now() - startedAt) / 1000);
        const speed = (total / (1024 * 1024) / elapsed).toFixed(2);

        elDetails.children[0].innerHTML = ` ${downloadedMB} MB / ${totalMB} MB · ${speed} MB/s`;
        elProgress.style.width = percent + "%";
        elProgress.innerHTML = percent + "%";

        window.Android?.onDownloadProgress?.(percent, total);
        lastLogMB = currentMBFloor;
    }

    await new Promise(r => setTimeout(r, 5)); 
}
}
}
} finally {
// Tell Android THIS specific port is finished, so Java can close the file and kill the port
filePort.postMessage("END");
}

const finalMB = (total / (1024 * 1024)).toFixed(2);
const avgSpeed = (total / (1024 * 1024) / Math.max(0.5, (Date.now() - startedAt) / 1000)).toFixed(2);
elDetails.children[0].innerHTML = ` ${finalMB} MB / ${totalMB} MB · ${avgSpeed} MB/s`;
elProgress.style.width = "100%";
elProgress.innerHTML = "100%";

return total;
}




function createDownloaderStatus(){

if(document.querySelector("#ytProDownloaderDiv")) return;

var div=document.createElement("div");

div.id="ytProDownloaderDiv";

Object.assign(div.style,{
height:"55%",
overflow:"hidden",
width:"calc(95% - 20px)",
zIndex:999999,
position:"fixed",
padding:"10px",
bottom:"10px",
display:"none",
left:"2.5%",
background:isD ? "#212121" : "#f1f1f1",
borderRadius:"25px",
textAlign:"center"
});

div.innerHTML=`
<style>
.ytdlHeader{display:flex;align-items:center;gap:10px;height:32px;text-align:left}
.ytdlBack{height:30px;width:30px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:${d};cursor:pointer;flex:0 0 auto}
.ytdlHeaderTitle{font-weight:600;color:${c}}
.ytdlList{height:calc(100% - 42px);overflow:auto;padding-top:4px}
.ytdlCard{background:${isD ? "#2c2c2c" : "#ffffff"};border-radius:16px;margin:6px 0;overflow:hidden}
.ytdlHead{display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer}
.ytdlThumb{width:64px;height:36px;border-radius:8px;object-fit:cover;flex:0 0 auto;background:#000}
.ytdlMeta{flex:1;min-width:0;text-align:left}
.ytdlTitle{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${c}}
.ytdlSub{font-size:12px;opacity:.75;margin-top:2px;white-space:normal;line-height:1.3;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;color:${c}}
.ytdlChev{transition:transform .2s;flex:0 0 auto;display:flex}
.ytdlBody{display:none;padding:0 10px 10px}
.ytdlRow{margin-top:8px}
.ytproDetails{display:block;width:95%;margin:auto;margin-top:5px;text-align:left;font-size:13px}
.ytproProgressBar{display:flex;position:relative;width:95%;height:14px;padding:3px;margin:auto;margin-top:4px;background:${d};border-radius:20px;overflow:hidden}
.ytproProgress{display:grid;place-items:center;position:relative;width:0%;height:14px;background:${c};border-radius:20px;text-align:center;color:${dc};line-height:14px;font-size:10px;transition:0.25s}
</style>
<div class="ytdlHeader">
<div class="ytdlBack" id="ytdlBack"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="${c}" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></div>
<div class="ytdlHeaderTitle">Downloads</div>
<div id="ytdlClear" style="margin-left:auto;font-size:12px;opacity:.75;cursor:pointer;padding:6px 8px;">Clear</div>
</div>
<div class="ytdlList" id="ytdlList"></div>
`;

document.body.appendChild(div);

var back = div.querySelector("#ytdlBack");
if(back){
back.addEventListener("click", function(e){ e.stopPropagation(); try{ ytdlCloseDetail(); }catch(e2){} div.style.display = "none"; });
}
var clr = div.querySelector("#ytdlClear");
if(clr){
clr.addEventListener("click", function(e){
e.stopPropagation();
try{ localStorage.removeItem("ytdlHist"); }catch(err){}
try{ var _d0 = document.getElementById("ytdlDetail"); if(_d0) _d0.style.display = "none"; }catch(e0){}
var list = div.querySelector("#ytdlList");
if(list){
var cards = list.querySelectorAll(".ytdlCard");
for(var i = cards.length - 1; i >= 0; i--){
if(!cards[i].querySelector(".ytdlRow")) cards[i].remove();
}
var emps = list.querySelectorAll(".ytdlEmpty");
for(var k = 0; k < emps.length; k++) emps[k].remove();
if(!list.querySelector(".ytdlCard")){
var _e = document.createElement("div");
_e.className = "ytdlEmpty";
_e.style.cssText = "padding:28px 10px;text-align:center;opacity:.55;font-size:13px;";
_e.textContent = "No downloads yet";
list.appendChild(_e);
}
}
try{ Android.showToast("Download records cleared"); }catch(err){}
});
}

}










window.ytdlAddHistory = function(name, title, thumb){
if(!name) return;
var ctx = window.__ytdlCtx || {};
var vid = ctx.v || ytdlCurVid();
var h = ytdlHist().filter(function(x){ return !(x && x.n === name); });
h.push({ n: name, t: title || ctx.t || name, th: thumb || ctx.th || "", v: vid });
ytdlSaveHist(h);
try{
if(vid){
var live = document.querySelector('#ytdlList .ytdlCard[data-v="' + vid + '"]');
if(live){
var body = live.querySelector(".ytdlBody");
if(body){
var rs = body.querySelectorAll(".ytdlFileRow"), dup = false;
for(var i = 0; i < rs.length; i++){ if(rs[i].dataset.file === name) dup = true; }
if(!dup){
body.appendChild(ytdlFileRow(name));
live.dataset.done = "1";
ytdlRefreshSub(live);
}
}
}
}
}catch(e){}
};

function ytdlPageTitle(){
try{
var sels = ["ytm-slim-video-metadata-section-renderer span.ytAttributedStringWhiteSpaceNoWrap","ytm-watch-metadata h1","ytd-watch-metadata h1","#title h1","h1"];
for(var i = 0; i < sels.length; i++){
var h = document.querySelector(sels[i]);
if(h){
var t = (h.textContent || "").trim();
if(t && t.toLowerCase() !== "youtube") return t;
}
}
return (document.title || "").replace(/\s*-\s*YouTube\s*$/, "").trim();
}catch(e){ return ""; }
}
function ytdlCurVid(){
try{
var m = location.href.match(/[?&]v=([A-Za-z0-9_-]{6,})/) || location.href.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
return m ? m[1] : "";
}catch(e){ return ""; }
}
function ytdlHist(){
try{ var h = JSON.parse(localStorage.getItem("ytdlHist") || "[]"); return Array.isArray(h) ? h : []; }catch(e){ return []; }
}
function ytdlSaveHist(h){
try{ localStorage.setItem("ytdlHist", JSON.stringify(h.slice(-300))); }catch(e){}
}
function ytdlOpenFile(name){
var ok = false;
try{ ok = window.Android && Android.openDownloadedFile ? Android.openDownloadedFile(name) : false; }catch(e){}
if(!ok){ try{ Android.showToast("File not found: " + name); }catch(e){} }
}
function ytdlFileRow(name){
var row = document.createElement("div");
row.className = "ytdlFileRow";
row.dataset.file = name;
row.style.cssText = "font-size:12px;line-height:1.4;padding:8px 2px;overflow-wrap:anywhere;cursor:pointer;border-bottom:1px solid rgba(128,128,128,.18);";
row.textContent = "\u2713 " + name;
row.addEventListener("click", function(e){ e.stopPropagation(); ytdlOpenFile(name); });
return row;
}
function ytdlRefreshSub(card){
var sub = card.querySelector(".ytdlSub"); if(!sub) return;
var b = card.querySelector(".ytdlBody");
if(!b){ var d0 = document.getElementById("ytdlDetailRows"); if(d0) b = d0.querySelector(".ytdlBody"); }
var downloading = b && b.querySelector(".ytdlRow");
var n = b ? b.querySelectorAll(".ytdlFileRow").length : 0;
sub.textContent = downloading ? "Downloading..." : (n + (n === 1 ? " file" : " files"));
}
function ytdlEnsureDetailDOM(){
var d = document.getElementById("ytdlDetail");
if(d) return d;
d = document.createElement("div");
d.id = "ytdlDetail";
d.style.cssText = "position:fixed;left:2.5%;width:95%;bottom:20px;height:65%;background:#212121;color:#fff;border-radius:16px;z-index:2147483647;display:none;overflow:auto;";
d.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:14px 18px;">'
+ '<div id="ytdlDetailBack" style="width:34px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);cursor:pointer;font-size:18px;">\u2190</div>'
+ '<div style="font-size:16px;font-weight:600;">Downloads</div></div>'
+ '<div style="padding:0 18px 20px;">'
+ '<img id="ytdlDetailThumb" style="width:100%;max-width:360px;border-radius:10px;display:block;margin:0 auto 12px;">'
+ '<div id="ytdlDetailTitle" style="font-size:15px;font-weight:600;text-align:center;margin-bottom:10px;"></div>'
+ '<div id="ytdlDetailRows"></div></div>';
d.querySelector("#ytdlDetailBack").addEventListener("click", function(){
var r = d.querySelector("#ytdlDetailRows");
var bs = [].slice.call(r.children);
for(var bi = 0; bi < bs.length; bi++){ var bb = bs[bi]; if(bb && bb.__card){ try{ bb.__card.appendChild(bb); bb.style.display = "none"; }catch(eM){} } }
d.style.display = "none";
});
document.body.appendChild(d);
return d;
}
window.__ytdlOpenDetailDOM = function(card){
var d = ytdlEnsureDetailDOM();
try{
var r0 = d.querySelector("#ytdlDetailRows");
var old = [].slice.call(r0.children);
for(var oi = 0; oi < old.length; oi++){
var ch = old[oi];
if(ch && ch.__card){ try{ ch.__card.appendChild(ch); ch.style.display = "none"; }catch(eB){} }
}
}catch(eP){}
d.querySelector("#ytdlDetailTitle").textContent = card.querySelector(".ytdlTitle").textContent;
d.querySelector("#ytdlDetailThumb").src = card.querySelector(".ytdlThumb").src;
var rows = d.querySelector("#ytdlDetailRows");
var body = card.querySelector(".ytdlBody");
if(!body){ try{ Android.showToast("Open detail failed: no content"); }catch(eT){} return; }
body.__card = card;
if(body.parentNode) body.parentNode.removeChild(body);
rows.appendChild(body);
body.style.display = "block";
var ob = d.querySelector("#ytdlDetailOpen");
if(ob) ob.style.display = "none";
d.style.display = "block";
d.scrollTop = 0;
}
function ytdlRenderHistory(){
var list = document.getElementById("ytdlList");
if(!list) return;
var h = ytdlHist();
var have = {};
var cs = list.querySelectorAll(".ytdlCard");
for(var i = 0; i < cs.length; i++){
var key = cs[i].dataset.v || cs[i].dataset.file;
if(key) have[key] = 1;
}
var emp = list.querySelector(".ytdlEmpty");
if(emp) emp.remove();
var order = [], groups = {};
for(var i = h.length - 1; i >= 0; i--){
var it = h[i];
if(!it || !it.n) continue;
var k = it.v || it.t || it.n;
if(!groups[k]){ groups[k] = { t: it.t || it.n, th: it.th || "", v: it.v || "", items: [] }; order.push(k); }
groups[k].items.push(it);
}
for(var j = 0; j < order.length; j++){
var k = order[j], g = groups[k];
if(have[k]) continue;
var card = document.createElement("div");
card.className = "ytdlCard";
card.dataset.v = g.v;
card.dataset.done = "1";
var th = g.th || "";
if(!th && g.v) th = "https://i.ytimg.com/vi/" + g.v + "/mqdefault.jpg";
if(!th){
var ext = ((g.items[0].n || "").split(".").pop() || "").toLowerCase();
var svg;
if(ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp"){
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><rect width="64" height="36" fill="#444"/><rect x="14" y="9" width="36" height="20" fill="none" stroke="#bbb" stroke-width="1.5"/><circle cx="22" cy="15" r="2" fill="#bbb"/><path d="M16 26 l10-8 6 5 5-4 9 7" fill="none" stroke="#bbb" stroke-width="1.5"/></svg>';
}else if(ext === "srt" || ext === "txt" || ext === "vtt" || ext === "xml"){
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><rect width="64" height="36" fill="#444"/><rect x="16" y="8" width="32" height="20" fill="none" stroke="#bbb" stroke-width="1.5"/><path d="M20 14 h24 M20 18 h24 M20 22 h16" stroke="#bbb" stroke-width="1.5"/></svg>';
}else{
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><rect width="64" height="36" fill="#444"/><path d="M26 11 l14 7 -14 7 z" fill="#bbb"/></svg>';
}
th = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
card.innerHTML = '<div class="ytdlHead">'
+ '<img class="ytdlThumb" src="' + th + '">'
+ '<div class="ytdlMeta"><div class="ytdlTitle"></div><div class="ytdlSub"></div></div>'
+ '<div class="ytdlChev"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.42l4.59-4.59a1 1 0 0 0 0-1.42L10.7 6.71a1 1 0 0 0-1.41 0z"/></svg></div>'
+ '</div><div class="ytdlBody" style="display:none"></div>';
card.querySelector(".ytdlTitle").textContent = g.t;
var body = card.querySelector(".ytdlBody");
for(var q = g.items.length - 1; q >= 0; q--){ body.appendChild(ytdlFileRow(g.items[q].n)); }
var n = g.items.length;
card.querySelector(".ytdlSub").textContent = n + (n === 1 ? " file" : " files");
(function(cc){ cc.querySelector(".ytdlHead").addEventListener("click", function(){
var fn = window.__ytdlOpenDetail || window.__ytdlOpenDetailDOM;
try{ fn(cc); }catch(e){ try{ Android.showToast("open detail failed: " + (e && e.message ? e.message : e)); }catch(x){} }
}); })(card);
list.appendChild(card);
}
}

window.ytdlShowPanel = function(){
try{
if(location.hash === "#settings"){ history.back(); }
var _ind0 = document.getElementById("ytproDownloadIndicator");
if(_ind0) _ind0.remove();
var _sh0 = document.getElementById("outerdownytprodiv");
if(_sh0) _sh0.remove();
createDownloaderStatus();
try{ ytdlRenderHistory(); }catch(e0){}
var p = document.getElementById("ytProDownloaderDiv");
if(p){ p.style.display = "block"; p.style.zIndex = "2147483647"; }
try{
var _l = document.getElementById("ytdlList");
if(_l && !_l.querySelector(".ytdlCard") && !_l.querySelector(".ytdlEmpty")){
var _e = document.createElement("div");
_e.className = "ytdlEmpty";
_e.style.cssText = "padding:28px 10px;text-align:center;opacity:.55;font-size:13px;";
_e.textContent = "No downloads yet";
_l.appendChild(_e);
}
}catch(e3){}
}catch(e){}
};

document.addEventListener('click', function(e){
try{
var el=e.target;
while(el && el!==document.body && !(el.classList && el.classList.contains('ytdlCard'))){ el=el.parentElement; }
if(!el || !el.classList || !el.classList.contains('ytdlCard')) return;
if(el.dataset.hist !== '1') return;
var nm=el.dataset.file||'';
var ok=false;
try{ ok = window.Android && Android.openDownloadedFile ? Android.openDownloadedFile(nm) : false; }catch(err){}
if(!ok){ try{ Android.showToast('File not found: '+nm); }catch(err){} }
}catch(err){}
}, true);


(function(){
function ytdlNoSelStyle(){
try{
if(document.getElementById("ytdlNoSel")) return;
var st = document.createElement("style");
st.id = "ytdlNoSel";
st.textContent = "#ytProDownloaderDiv,#ytProDownloaderDiv *,#ytdlDetail,#ytdlDetail *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;}#ytProDownloaderDiv img,#ytdlDetail img{pointer-events:none!important;-webkit-user-drag:none!important;}::selection{background:transparent!important;}";
(document.head || document.documentElement).appendChild(st);
}catch(e){}
}
function ytdlClearSel(){
try{ var s = window.getSelection(); if(s && s.removeAllRanges) s.removeAllRanges(); }catch(e){}
}
ytdlNoSelStyle();
setInterval(ytdlNoSelStyle, 1500);
document.addEventListener("contextmenu", function(e){
try{
var t = e.target;
if(t && t.closest && (t.closest("#ytProDownloaderDiv") || t.closest("#ytdlDetail"))){ e.preventDefault(); }
}catch(x){}
}, true);
document.addEventListener("click", function(e){
try{
var t = e.target;
if(t && t.closest && (t.closest("#ytProDownloaderDiv") || t.closest("#ytdlDetail"))){ ytdlClearSel(); }
}catch(x){}
}, true);
})();
