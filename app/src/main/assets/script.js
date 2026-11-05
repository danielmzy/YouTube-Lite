/*****Youtube Lite*******
Author: Matr1x
Version: 4.0.0
URI: https://github.com/prateek-chaubey/YTPRO
Last Updated On: 26 Sep , 2026 , 22:25 IST
*/




if(window.eruda == null && localStorage.getItem("devMode") == "true"){
//ERUDA
var script = document.createElement('script'); script.src="//youtube.com/ytpro_cdn/npm/eruda"; document.body.appendChild(script); script.onload=()=>{eruda.init();}
}
/**/

/*Keep the bottom-bar Shorts tab in sync with the Hide Shorts setting*/
(function(){
  if(window.__ytlShortsTabTimer) return;
  window.__ytlShortsTabTimer=setInterval(function(){
    try{
      var on=localStorage.getItem("shorts")=="true";
      var tabs=document.querySelectorAll("ytm-pivot-bar-renderer .pivot-bar-item-tab.pivot-shorts");
      for(var i=0;i<tabs.length;i++){
        var it=tabs[i].closest("ytm-pivot-bar-item-renderer")||tabs[i];
        var want=on?"none":"";
        if(it.style.display!==want) it.style.display=want;
      }
    }catch(e){}
  },400);
})();
if(!YTProVer){

/*Few Stupid Inits*/
var YTProVer=(function(){try{var v=Android.getInfo();return v||"1.0";}catch(e){return "1.0";}})();
var ytoldV="";
var isF=false;   //what is this for?
var isAp=false; // oh it's for bg play 
const originalPause = HTMLMediaElement.prototype.pause; // well long story short , save the original pause function
window.PIPause = false; // for pausing video when in PIP
window.isPIP=false;
window.pauseAllowed = true; // allow pause by default
var sTime=[];
var webUrls=["m.youtube.com","youtube.com","yout.be","accounts.google.com"];
var GeminiAT="";
var GeminiModels = {
    "3.1 Pro": '[1,null,null,null,"9d8ca3786ebdfbea",null,null,0,[4,5,6,8],null,null,1, null,null,3]',
    "3.6 Flash":               '[1,null,null,null,"fbb127bbb056c959",null,null,0,[4,5,6,8],null,null,1, null,null,1]',
    "3.5 Flash-Lite":          '[1,null,null,null,"cf41b0e0dd7d53e5",null,null,0,[4,5,6,8],null,null,1, null,null,6]',
    "3.1 Pro Plus":            '[1,null,null,null,"e6fa609c3fa255c0",null,null,0,[4,5,6,8],null,null,4, null,null,3]',
    "3.6 Flash Plus":          '[1,null,null,null,"56fdd199312815e2",null,null,0,[4,5,6,8],null,null,4, null,null,1]',
    "3.5 Flash Lite Plus":     '[1,null,null,null,"8c46e95b1a07cecc",null,null,0,[4,5,6,8],null,null,4, null,null,6]',
    "3.1 Pro Advanced":        '[1,null,null,null,"e6fa609c3fa255c0",null,null,0,[4,5,6,8],null,null,2, null,null,3]',
    "3.6 Flash Advanced":      '[1,null,null,null,"56fdd199312815e2",null,null,0,[4,5,6,8],null,null,2, null,null,1]',
    "3.5 Flash Lite Advanced": '[1,null,null,null,"8c46e95b1a07cecc",null,null,0,[4,5,6,8],null,null,2, null,null,6]'
};

var YTPROCodecs={
video:["AV1","VP8","VP9","H264"],
audio:["Opus","Mp4a"]
}

let touchstartY = 0;
let touchendY = 0;
let initialDistance=null;

//swipe controls
var sens=0.005;
var vol=Android.getVolume();
var brt = Android.getBrightness()/100;

if(localStorage.getItem("saveCInfo") == null  || localStorage.getItem("gesC") == null || localStorage.getItem("gesM") == null || localStorage.getItem("bgplay") == null){
localStorage.setItem("autoSpn","true");
localStorage.setItem("bgplay","true");
localStorage.setItem("gesC","true");
localStorage.setItem("gesM","false");
localStorage.setItem("fzoom","false");
localStorage.setItem("saveCInfo","true");
localStorage.setItem("geminiModel","3.5 Flash-Lite");
localStorage.setItem("prompt",`Give me details about this YouTube video Id: {videoId} , titled "{title}" , a detailed summary of timestamps with facts , resources and reviews of the main content`);
localStorage.setItem("devMode","false");

localStorage.setItem("block_60fps","false");

YTPROCodecs.video.forEach((x)=>{
localStorage.setItem(x,"true");
});

YTPROCodecs.audio.forEach((x)=>{
localStorage.setItem(x,"true");
});

}
if(localStorage.getItem("maxQuality") == null){
localStorage.setItem("maxQuality","true");
}
if(localStorage.getItem("fzoom") == "true"){
document.getElementsByName("viewport")[0].setAttribute("content","");
}

if ([
    "3.0 Pro",
    "3.0 Flash",
    "3.0 Flash Thinking",
    "3.0 Pro Plus",
    "3.0 Flash Plus",
    "3.0 Flash Thinking Plus",
    "3.0 Pro Advanced",
    "3.0 Flash Advanced",
    "3.0 Flash Thinking Advanced"
].includes(localStorage.getItem('geminiModel'))) {
localStorage.setItem('geminiModel', "3.5 Flash-Lite");
}


if(window.location.pathname.indexOf("shorts") > -1){
ytoldV=window.location.pathname;
}
else{
ytoldV=(new URLSearchParams(window.location.search)).get('v') ;
}


/*Dark and Light Mode*/
var c="#000";
var d="#f2f2f2";
var dc="#fff";
var isD=false;
var dislikes="...";
var dislikesRaw=0;


if(document.cookie.indexOf("f6=40000") > -1){
dc ="#000";c ="#fff";d="rgba(255,255,255,0.1)";
isD=true;
}else{
dc ="#fff";c="#000";d="rgba(0,0,0,0.05)";
isD=false;
}

var downBtn=`<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="none">
<path
d="M16.59 9H15V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H7.41a1 1 0 0 0-.7 1.7l4.59 4.59a1 1 0 0 0 1.42 0l4.59-4.59a1 1 0 0 0-.72-1.7Z"
stroke="${c}"
stroke-width="1.8"
stroke-linecap="round"
stroke-linejoin="round"
/>
<rect x="5" y="17.2" width="14" height="1.8" rx="0.9" fill="${c}" />
</svg>
`;










function override() {

var videoElem = document.createElement('video');
var origCanPlayType = videoElem.canPlayType.bind(videoElem);
videoElem.__proto__.canPlayType = makeModifiedTypeChecker(origCanPlayType);

var mse = window.MediaSource;

if (mse === undefined) return;
var origIsTypeSupported = mse.isTypeSupported.bind(mse);
mse.isTypeSupported = makeModifiedTypeChecker(origIsTypeSupported);
}


function makeModifiedTypeChecker(origChecker) {


return function (type) {
if (type === undefined) return '';
var disallowed_types = [];
if (localStorage['H264'] === 'false') {
disallowed_types.push('avc');
}
if (localStorage['VP8'] === 'false') {
disallowed_types.push('vp8');
}
if (localStorage['VP9'] === 'false') {
disallowed_types.push('vp9', 'vp09');
}
if (localStorage['AV1'] === 'true') {
disallowed_types.push('av01', 'av99');
}
if (localStorage['Opus'] === 'false') {
disallowed_types.push('opus');
}
if (localStorage['Mp4a'] === 'false') {
disallowed_types.push('mp4a');
}

// If video type is in disallowed_types, say we don't support them
for (var i = 0; i < disallowed_types.length; i++) {
if (type.indexOf(disallowed_types[i]) !== -1) return '';
}

if (localStorage['block_60fps'] === 'true') {
var match = /framerate=(\d+)/.exec(type);
if (match && match[1] > 30) return '';
}

return origChecker(type);
};
}

override();





function insertAfter(referenceNode, newNode) {
try{
referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}catch{}
}


/*wait for the element , using observer*/
async function waitForElement(selector,vid) {
return new Promise((resolve) => {
const element = document.querySelector(selector);
if(element){
if(vid && element.src != "") return resolve(element);
if(!vid) return resolve(element);
}
const observer = new MutationObserver(() => {
const el = document.querySelector(selector);
if (el){

if(vid && el.src) resolve(el),observer.disconnect();;
if(!vid) resolve(el),observer.disconnect();;
}
});
observer.observe(document.body, {
childList: true,
subtree: true
});
});
}


/*Add Settings Tab*/
var addSettingsTab=()=>{
if(document.getElementById("setDiv") == null){
var setDiv=document.createElement("div");
setDiv.setAttribute("style",`
z-index:9999999999;
font-size:22px;
text-align:center;
line-height:35px;
pointer-events:auto;
`);
setDiv.setAttribute("id","setDiv");
var svg=document.createElement("ytm-pivot-bar-item-renderer");
svg.innerHTML=`<svg fill="${ window.location.href.indexOf("watch") < 0 ? c : "#fff" }" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"  id="hSett"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path></svg>
`;
setDiv.appendChild(svg);
insertAfter(document.getElementsByTagName("ytm-home-logo")[0],setDiv)
if(document.getElementById("hSett") != null){
document.getElementById("hSett").addEventListener("click",
function(ev){
window.location.hash="settings";
});
}
}


};




/*Dislikes To Locale, Credits: Return YT Dislikes*/
function getDislikesInLocale(num){
var nn=num;
if (num < 1000){
nn = num;
}
else{
const int = Math.floor(Math.log10(num) - 2);
const decimal = int + (int % 3 ? 1 : 0);
const value = Math.floor(num / 10 ** decimal);
nn= value * 10 ** decimal;
}
let userLocales;
if (document.documentElement.lang) {
userLocales = document.documentElement.lang;
} else if (navigator.language) {
userLocales = navigator.language;
} else {
try {
userLocales = new URL(
Array.from(document.querySelectorAll("head > link[rel='search']"))
?.find((n) => n?.getAttribute("href")?.includes("?locale="))
?.getAttribute("href")
)?.searchParams?.get("locale");
} catch {
userLocales = "en";
}
}
return Intl.NumberFormat(userLocales, {
notation: "compact",
compactDisplay: "short",
}).format(nn);
}



/*Skips the bad part :)*/
async function skipSponsor(){
var sDiv=document.createElement("div");
sDiv.setAttribute("style",`height:3px;pointer-events:none;width:100%;position:absolute;z-index:99;`)
sDiv.setAttribute("id","sDiv");
var player = document.getElementsByClassName("video-stream")[0];
var dur=player.duration;

if(isNaN(dur)) return;

for(var x in sTime){
var s1=document.createElement("div");
var s2=sTime[x];
s1.setAttribute("style",`height:3px;width:${(100/dur) * (s2[1]-s2[0])}%;background:#0f8;position:absolute;z-index:9;left:${(100/dur) * s2[0]}%;`)
sDiv.appendChild(s1);
}




var e=await waitForElement("yt-progress-bar",false);


if(document.getElementById("sDiv") == null){
if(document.getElementsByClassName('ytPlayerProgressBarHost')[0] != null){
document.getElementsByClassName('ytPlayerProgressBarHost')[0].appendChild(sDiv);
}else{
try{document.getElementsByClassName('ytProgressBarLineProgressBarLine')[0].appendChild(sDiv);}catch{}
}
}




}





/*Fetch The Dislikes*/
async function fDislikes(url){ 
var Url=new URL(url);
var vID="";
if(Url.pathname.indexOf("shorts") > -1){
vID=Url.pathname.substr(8,Url.pathname.length);
}
else if(Url.pathname.indexOf("watch") > -1){
vID=Url.searchParams.get("v");
}


dislikes="...";dislikesRaw=0;
fetch("https://returnyoutubedislikeapi.com/votes?videoId="+vID)
.then(response => {
return response.json();
}).then(jsonObject => {
if('dislikes' in jsonObject){
dislikesRaw=parseInt(jsonObject.dislikes)||0;
dislikes=getDislikesInLocale(parseInt(jsonObject.dislikes));
}
}).catch(error => {});

}



/*Check For Sponsorships*/
async function checkSponsors(Url){


if(Url.indexOf("watch") > -1){

sTime=[];

await fetch("https://sponsor.ajay.app/api/skipSegments?videoID="+new URL(Url).searchParams.get("v"))
.then(response => {
return response.json();
}).then(jsonObject => {
for(var x in jsonObject){
var time=jsonObject[x].segment;
sTime.push(time);
}
}).catch(error => {});



/*Skip the Sponsor*/
var player = await waitForElement(".video-stream",true);


player.ontimeupdate=()=>{
skipSponsor();
var cur=player.currentTime;
for(var x in sTime){
var s2=sTime[x];
if(Math.floor(cur) == Math.floor(s2[0])){
if(localStorage.getItem("autoSpn") == "true"){
player.currentTime=s2[1];
addSkipper(s2[0]);
}
}
}
};





}

}


//DEBUG
/*
s1: FoQR9rLpRy8
s2: PN51tJhZscE
*/
/*Add Skip Sponsor Element*/
function addSkipper(sT){
var sSDiv=document.createElement("div");
sSDiv.setAttribute("style",`
height:50px;${(screen.width > screen.height) ? "width:50%;" : "width:80%;"}overflow:auto;background:rgba(130,130,130,.3);
backdrop-filter:blur(6px);
position:absolute;bottom:40px;
line-height:50px;
left:calc(15% / 2 );padding-left:10px;padding-right:10px;
z-index:99999999999999;text-align:center;border-radius:25px;
color:white;text-align:center;
`);
sSDiv.innerHTML=`<span style="height:30px;line-height:30px;margin-top:10px;display:block;font-family:monospace;font-size:16px;float:left;">Skipped Sponsor</span>
<span style="height:30px;line-height:44px;float:right;padding-right:30px;margin-top:10px;display:block;padding-left:30px;border-left:1px solid white;">
<svg data-action="rewind" xmlns="http://www.w3.org/2000/svg" width="23" height="23" style="margin-top:0px;" fill="currentColor" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
<path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
</svg>
<svg data-action="close" xmlns="http://www.w3.org/2000/svg" width="20" height="20" style="margin-left:30px;" fill="#f24" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
</svg>
</span>`;
document.getElementById("player-control-container").appendChild(sSDiv);


sSDiv.addEventListener("click",(e)=>{
  var el=e.target.closest("[data-action]");
  
  if(!el) return;
  var action=el.dataset.action;
  
  if(action == "close"){
el.parentElement.parentElement.remove();
  }else if(action == "rewind"){
  el.parentElement.parentElement.remove();
  document.getElementsByClassName('video-stream')[0].currentTime=sT+1; 
  }
  
});


setTimeout(()=>{sSDiv.remove();},5000);
}


fDislikes(window.location.href);
checkSponsors(window.location.href);


if((window.location.pathname.indexOf("watch") > -1) || (window.location.pathname.indexOf("shorts") > -1)){
var unV=setInterval(() => {


/*Unmute The Video*/ 

document.getElementsByClassName('video-stream')[0].muted=false;

if(!document.getElementsByClassName('video-stream')[0].muted){
clearInterval(unV);

}

}, 5);

}

/*Funtion to set Element Styles*/
function sty(e,v){
Object.assign(e.style,{
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:"550",
height:"65%",
minWidth:"22%",
width:"auto",
borderRadius:"20px",
background:d,
fontSize:"12px",
marginRight:"5px",
textAlign:"center",
})
}


function getGeminiModels(){
var t=`<div style="height:auto;width:calc(100% - 20px);padding:2px 0 10px;display:flex;align-items:center;gap:8px;text-align:left;position:static;margin-top:0;"><button data-action="closePanel" style="width:auto;height:auto;padding:2px 6px 2px 0;background:transparent;border:0;display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="${c}" viewBox="0 0 24 24" style="float:none;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><span style="position:static;right:auto;width:auto;height:auto;border-radius:0;background:transparent;display:inline-block;font-size:1.05rem;font-weight:600;">Select Gemini Model</span></div>`;

for(var x in GeminiModels){


t+=`<br>
<button data-action="saveModel" data-value="${x}" ${(x == localStorage.getItem('geminiModel')) ? `style="background:${c};color:${dc};"` : "" } >${x}
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${c}"  viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>`;
}

return t;

}


/*Get Codecs*/
function getYTPROCodecs(){
var t=`<p style="text-align:center;font-size:14px;">This feature is experimental , this may break Youtube Lite if not configured correctly. By default all the codecs are enabled , tap on the buttons below to switch them.</p><br> <vc  style="font-size:14px;">Video Codecs</vc><br>`;

for(var y in YTPROCodecs.video){

var x=YTPROCodecs.video[y];

t+=`<button data-action="setRemoveCodec" data-value="${x}" ${("true" == localStorage.getItem(x)) ? `style="background:${c};color:${dc};"` : "" } >${x}
<svg  ${("true" != localStorage.getItem(x)) ? `style="display:none"` : "" } xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${dc}"  viewBox="0 0 16 16">
<path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
</svg>
</button>`;
}

t+=`<br><br><vc  style="font-size:14px">Audio Codecs</vc><br>`
for(var y in YTPROCodecs.audio){

var x=YTPROCodecs.audio[y];

t+=`<button data-action="setRemoveCodec" data-value="${x}" ${("true" == localStorage.getItem(x)) ? `style="background:${c};color:${dc};"` : "" } >${x}
<svg ${("true" != localStorage.getItem(x)) ? `style="display:none"` : "" } xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${dc}"  viewBox="0 0 16 16">
<path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
</svg>
</button>`;
}

t+=`<br><br>
<div>Block 60FPS <span data-action="block_60fps" style="${sttCnf(0,0,"block_60fps")}" ><b style="${sttCnf(0,1,"block_60fps")}" ></b></span></div> `;

t+=`<br><br><button data-action="done" style="margin-top:10px;width:25%;float:right;text-align:center;background:${c};color:${dc};" >Done</button>`;


return t;

}


function setRemoveCodec(x,y){


if(localStorage[x] == "true"){
localStorage.setItem(x,"false");
y.style.background=isD ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)";
y.style.color=c;
y.children[0].style.display="none";
}else{
localStorage.setItem(x,"true");
y.style.background=c;
y.style.color=dc;
y.children[0].style.display="block";
}




}


/*The settings tab*/
async function ytproSettings(){
var ytpSet=document.createElement("div");
var ytpSetI=document.createElement("div");
ytpSet.setAttribute("id","settingsprodiv");
ytpSetI.setAttribute("id","ssprodivI");
ytpSet.setAttribute("style",`
height:100%;width:100%;position:fixed;top:0;left:0;
display:flex;justify-content:center;
background:rgba(0,0,0,0.7);
z-index:9999;
`);
ytpSet.addEventListener("click",
function(ev){

if(!(ev.target == ytpSetI  || ytpSetI.contains(ev.target) || (aboutPage && aboutPage.contains(ev.target)))){

history.back();
}
});

ytpSetI.setAttribute("style",`
height:65%;width:calc(95% - 20px);overflow:auto;
background:${isD ? "#212121" : "#f1f1f1"};
position:fixed;
bottom:20px;
z-index:99999999999999;padding:10px;text-align:center;border-radius:25px;color:${c};text-align:center;
color:${isD ? "#ccc" : "#444"};padding-bottom:64px;`);

ytpSetI.innerHTML=`<style>
@import url('https://fonts.googleapis.com/css2?family=Delius&display=swap');
#settingsprodiv a{text-decoration:underline;} #settingsprodiv li{list-style:none; display:flex;align-items:center;justify-content:center;color:#fff;border-radius:25px;padding:10px;background:#000;margin:5px;}
#ssprodivI div{
height:10px;
width:calc(100% - 20px);
padding:10px;
font-size:1.45rem;
text-align:left;
display:flex;
align-items:center;
position:relative;
margin-top:3px;
}
#ssprodivI div span{
display:block;
height:23px;
width:40px;
border-radius:40px;
right:10px;
position:absolute;
background:#151515;
}
#ssprodivI div span b{
display:block;
height:19px;
width:19px;
position:absolute;
right:2px;
top:2px;
border-radius:50px;
background:#fff;
}
#ssprodivI div input::placeholder{color:${ isD ? "white" : "#000"};}
#ssprodivI div input,#ssprodivI div button{
height:35px;
background:${isD ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)"};
width:100%;
border:0;
border-radius:20px;
padding:10px;
font-size:1.25rem;
}
#ssprodivI button{
background:transparent;
font-size:1.45rem;
width:calc(100% - 20px);
height:40px;
color:${isD ? "#ccc" : "#444"};
margin-top:3px;
text-align:left;
}
#ssprodivI button svg{
float:right;
}
#ssprodivI .credit{
font-family: "Delius", cursive;
font-style: normal;
display:flex;
justify-content:center;
align-items:center;
text-align:center;
font-size:1.55rem;
font-weight:bolder;
color:${isD ? "#fff" : "#000"};
position:fixed;
bottom:20px;
width:calc(95% - 20px);
left:calc(2.5% + 0px);
background:${d};
border-radius:0 0 25px 25px;
backdrop-filter:blur(10px);
height:15px;
}
#ssprodivI .geminiModels,#ssprodivI .disableCodecs,#ssprodivI .geminiPrompt{
height:auto;
min-height:100px;
padding-bottom:12px;
background:${isD ? "#212121" : "#f1f1f1"};
position:fixed;
display:block;
width:calc(95% - 20px);
left:calc(2.5% + 0px);
bottom:20px;
z-index:999999;
box-shadow:0px 0px 5px black;
border-radius:25px;
display:none;
}
#ssprodivI .geminiModels:before,#ssprodivI .disableCodecs:before,#ssprodivI .geminiPrompt:before{
height:100%;
width:100%;
background:rgba(0,0,0,.6);
position:fixed;
top:0;
left:0;
z-index:-999;
}
#ssprodivI .geminiPrompt textarea{
height:300px;
width:95%;
border-radius:20px;
padding:15px;
background:${d};
}
#ssprodivI .disableCodecs{
column:50%;
}
#ssprodivI .disableCodecs button{
width:48%;
column:50%;
margin-right:2%;
color:${c};
}
</style>`;
ytpSetI.innerHTML+=`<br><b style='font-size:18px' >YouTube Lite Settings</b>
<span style="font-size:10px">v${YTProVer}</span>
<br><br>
<div><input type="url" placeholder="Enter YouTube URL" id="ytproUrlInput" ></div>
<br>
</button>
<br>
<button data-action="downloads"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" style="float:none;vertical-align:middle;margin-right:8px;margin-top:-2px;display:inline-block;"><path d="M16.59 9H15V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H7.41a1 1 0 0 0-.7 1.7l4.59 4.59a1 1 0 0 0 1.42 0l4.59-4.59a1 1 0 0 0-.72-1.7Z" stroke="${isD ? "#ddd" : "#333"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="5" y="17.2" width="14" height="1.8" rx="0.9" fill="${isD ? "#ddd" : "#333"}"/></svg>Downloads
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isD ? "#ccc" : "#444"}" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>
<br>
<div>Autoskip Sponsors <span data-action="sttCnf" data-value="autoSpn" style="${sttCnf(0,0,"autoSpn")}" ><b style="${sttCnf(0,1,"autoSpn")}"></b></span></div>
<br>
<div>Default Max Quality <span data-action="sttCnf" data-value="maxQuality" style="${sttCnf(0,0,"maxQuality")}" ><b style="${sttCnf(0,1,"maxQuality")}"></b></span></div>
<div>Default Subtitles <span data-action="sttCnf" data-value="defSubs" style="${sttCnf(0,0,"defSubs")}" ><b style="${sttCnf(0,1,"defSubs")}"></b></span></div>
<br>
<div>Gesture Controls <span data-action="sttCnf" data-value="gesC" style="${sttCnf(0,0,"gesC")}" ><b style="${sttCnf(0,1,"gesC")}"></b></span></div>
<br>
<div>Miniplayer Gesture <span data-action="sttCnf" data-value="gesM" style="${sttCnf(0,0,"gesM")}" ><b style="${sttCnf(0,1,"gesM")}"></b></span></div>
<br>
<div>Force Zoom <span data-action="sttCnf" data-value="fzoom"  style="${sttCnf(0,0,"fzoom")}" ><b style="${sttCnf(0,1,"fzoom")}" ></b></span></div> 
<br>
<div>Background Play <span data-action="sttCnf" data-value="bgplay" style="${sttCnf(0,0,"bgplay")}" ><b style="${sttCnf(0,1,"bgplay")}" ></b></span></div> 
<br>
<div>Hide Shorts <span data-action="sttCnf" data-value="shorts" style="${sttCnf(0,0,"shorts")}" ><b style="${sttCnf(0,1,"shorts")}" ></b></span></div> 
<br>
<div>Hide Community Posts <span data-action="sttCnf" data-value="communityPosts" style="${sttCnf(0,0,"communityPosts")}" ><b style="${sttCnf(0,1,"communityPosts")}" ></b></span></div> 
<br>
<div>Use single Gemini chat <span data-action="sttCnf" data-value="saveCInfo" style="${sttCnf(0,0,"saveCInfo")}" ><b style="${sttCnf(0,1,"saveCInfo")}"></b></span></div>
<br>
<button data-action="geminiModels">Select Gemini Model
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isD ? "#ccc" : "#444"}" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>
<br>
<button data-action="geminiPrompt">Edit Gemini Prompt
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isD ? "#ccc" : "#444"}" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>
<br>
<button data-action="disableCodecs">Disable Codecs
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isD ? "#ccc" : "#444"}" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>
<br>
<button data-action="issues">Report Bugs
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isD ? "#ccc" : "#444"}" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>
<br>
<div>Developer Mode <span data-action="sttCnf" data-value="devMode" style="${sttCnf(0,0,"devMode")}" ><b style="${sttCnf(0,1,"devMode")}"></b></span></div>
<br>
<button data-action="checkUpdate">Check for Updates
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isD ? "#ccc" : "#444"}"  viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg>
</button>
<br><br>
<button style="font-weight:bolder;" data-action="about">About
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="${isD ? "#ccc" : "#444"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M5 2l6 6-6 6"/>
</svg>
</button>
<br>


<div class="geminiModels">

</div>


<div class="geminiPrompt" style="text-align:center;">
<div style="height:auto;width:calc(100% - 20px);padding:2px 0 10px;display:flex;align-items:center;gap:8px;text-align:left;position:static;margin-top:0;"><button data-action="closePanel" style="width:auto;height:auto;padding:2px 6px 2px 0;background:transparent;border:0;display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="${c}" viewBox="0 0 24 24" style="float:none;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><span style="position:static;right:auto;width:auto;height:auto;border-radius:0;background:transparent;display:inline-block;font-size:1.05rem;font-weight:600;">Edit Gemini Prompt</span></div>
<textarea>
${localStorage.getItem("prompt")}
</textarea>

<button data-action="savePrompt" style="margin-top:10px;width:25%;float:right;text-align:center;background:${c};color:${dc};" >Save</button>
<br><br>
</div>


<div class="disableCodecs">

</div>


<div class="credit" >
<z style="margin-right:6px">Improved with </z>

<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="-1 -1 18 18">
<path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314" 
stroke="black" ${ !isD ? "stroke-width='1'" : "" } stroke-linejoin="round" stroke-linecap="round"/>
</svg>



<z style="margin-left:6px">by Matr1x</z>
</div>
`;


document.body.appendChild(ytpSet);
ytpSet.appendChild(ytpSetI);
var aboutPage=document.createElement("div");
aboutPage.setAttribute("id","aboutPageDiv");
aboutPage.setAttribute("style",`display:none;height:65%;width:calc(95% - 20px);overflow:auto;position:fixed;bottom:20px;z-index:99999999999999;padding:10px;border-radius:25px;text-align:center;background:${isD ? "#212121" : "#f1f1f1"};color:${isD ? "#ccc" : "#444"};`);
aboutPage.innerHTML=`<style>#aboutPageDiv a{text-decoration:underline;}</style>
<div style="display:flex;align-items:center;width:calc(100% - 20px);margin:0 auto;font-size:1.5rem;color:${c};">
<button data-action="backAbout" style="background:transparent;border:0;color:inherit;padding:2px 6px 2px 0;display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
<span>About</span>
</div>
<br><br>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1440" style="width:84px;height:84px;border-radius:20px;display:block;margin:0 auto;" shape-rendering="geometricPrecision"><rect width="1440" height="1440" rx="322" fill="#FFFFFF"/><g transform="translate(721,720.5) scale(1.5) translate(-721,-720.5)"><path fill="#FF0030" d="M488,488 H954 A105,105 0 0 1 1059,593 V848 A105,105 0 0 1 954,953 H488 A105,105 0 0 1 383,848 V593 A105,105 0 0 1 488,488 Z"/><path fill="#FFFFFF" d="M652,623 L825,721 L652,819 Z"/><path fill="#FFFFFF" d="M565,848 h18 v80 h-18 z M565,910 h84 v18 h-84 z M667,848 h18 v80 h-18 z M703,848 h86 v18 h-86 z M737,866 h18 v62 h-18 z M807,848 h18 v80 h-18 z M825,848 h52 v18 h-52 z M825,879 h34 v18 h-34 z M825,910 h52 v18 h-52 z"/></g></svg>
<br><br>
<b style="font-size:1.5rem;color:${c};">YouTube Lite</b>
<br><br>
<span style="font-size:1.1rem;">V1.0</span>
<br><br>
<p style="font-size:1.2rem;width:calc(100% - 20px);margin:auto;text-align:left;"><b style="font-weight:bold">Disclaimer</b>: This is an educational project aimed at showcasing javascript injection into a webview to enhance productivity.<br>
You can find the source code at <a href="https://github.com/danielmzy/YouTube-Lite/" style="font-family:monospace;" > https://github.com/danielmzy/YouTube-Lite/</a>
<br><br><span style="font-family:'Dancing Script','cursive';font-weight:bold;font-style:normal;-webkit-text-stroke:0.55px #ffffff">In Memorise of Ma Xuesen</span><br><br><b>Special Thanks to:</b><br>prateek-chaubey, YTPro(https://github.com/prateek-chaubey/YTPRO).<br>Anarios, return-youtube-dislike(https://github.com/Anarios/return-youtube-dislike)<br>OpenAI, Codex</p>
<br><br><br>`;
ytpSet.appendChild(aboutPage);


document.getElementById("ytproUrlInput").addEventListener("keyup",searchUrl);




var actionsList={
  about:()=>{
    var ap=document.getElementById("aboutPageDiv");
    var st=document.getElementById("ssprodivI");
    if(!ap){ return; }
    if(st){ st.style.display="none"; }
    ap.style.display="block";
    ap.scrollTop=0;
    try{ history.pushState({ytlAbout:1},"","#settings"); }catch(e){}
  },
  backAbout:()=>{
    try{ history.back(); }catch(e){}
  },
  downloads:()=>{
   try{ if(window.ytdlShowPanel) window.ytdlShowPanel(); }catch(e){}
   },
checkUpdate:()=>{
    checkUpdates();
  },
  sttCnf:(button,action)=>{
    sttCnf(button,action);
    if(action == "maxQuality" && window.YTPRO_QUALITY && window.YTPRO_QUALITY.refresh){
      try{window.YTPRO_QUALITY.refresh();}catch(e){}
    }
  },
  geminiModels:()=>{
    document.getElementsByClassName('geminiModels')[0].style.display='block';document.getElementsByClassName('geminiModels')[0].innerHTML=getGeminiModels();
  },
  geminiPrompt:()=>{
    document.getElementsByClassName('geminiPrompt')[0].style.display='block';
  },
  issues:()=>{
    Android.oplink('https://github.com/prateek-chaubey/YTPRO/issues');
  },
  disableCodecs:()=>{
    document.getElementsByClassName('disableCodecs')[0].style.display='block';document.getElementsByClassName('disableCodecs')[0].innerHTML=getYTPROCodecs();
  },
  savePrompt:(el)=>{
    localStorage.setItem('prompt',el.previousElementSibling.value);el.parentElement.style.display='none';
  },
  done:(el)=>{
    el.parentElement.style.display='none';
  },
  closePanel:(el)=>{
    var p=el.closest('.geminiModels,.geminiPrompt');
    if(p){ p.style.display='none'; }
  },
  setRemoveCodec:(el,value)=>{
    setRemoveCodec(value,el)
  },
  block_60fps:(el)=>{
    sttCnf(el,"block_60fps");
  },
  saveModel:(el,value)=>{
    localStorage.removeItem('geminiChatInfo');
    localStorage.setItem('geminiModel',value);
    el.parentElement.style.display='none';
  }
}

//buttons and switches
ytpSetI.querySelectorAll("[data-action]").forEach(button =>{
  button.addEventListener("click",()=>{
    
    if(button.dataset.action== "sttCnf"){
    actionsList[button.dataset.action](button,button.dataset.value);
    }else{
    actionsList[button.dataset.action](button);
    }
  })
});


//About page buttons
aboutPage.querySelectorAll("[data-action]").forEach(button =>{
  button.addEventListener("click",()=>{
    actionsList[button.dataset.action](button);
  })
});


//disable Codecs
ytpSetI.querySelector(".disableCodecs").addEventListener("click",(e)=>{
  var el = e.target.closest("[data-action]");
  if(!el) return;
  
  actionsList[el.dataset.action](el,el.dataset.value);

})


//gemini model selector
ytpSetI.querySelector(".geminiModels").addEventListener("click",(e)=>{
  var el = e.target.closest("[data-action]");
  if(!el) return;
  
  actionsList[el.dataset.action](el,el.dataset.value);

})



}



function searchUrl(e){
  
  
if(e.keyCode === 13 || e === "Enter"){

var url=e.target.value;
const regex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|shorts|live)\/))([a-zA-Z0-9_-]{11})/;
  
const match = url.match(regex);
var id=match ? match[1] : null;
if(id){
  return navigateInternalYtMweb(id);
}


var a=document.createElement("a");
a.href=url;
document.body.appendChild(a);
try{document.getElementById("settingsprodiv").remove();}catch{}
a.click();

}
}


function parseVer(v){ v=String(v||"").trim().replace(/^v/i,""); var m=v.match(/\d+(?:\.\d+)*/); if(!m) return [0]; return m[0].split(".").map(function(x){return parseInt(x,10)||0;}); }
function verGt(a,b){ var A=parseVer(a),B=parseVer(b); for(var i=0;i<Math.max(A.length,B.length);i++){ var x=A[i]||0,y=B[i]||0; if(x!==y) return x>y; } return false; }
function fetchLatestRelease(ok,err){ fetch("https://api.github.com/repos/danielmzy/YouTube-Lite/releases/latest",{headers:{"Accept":"application/vnd.github+json"},cache:"no-store"}).then(function(r){ if(r.status===404){ ok(null); return null; } if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }).then(function(j){ if(j) ok(j); }).catch(function(e){ if(err) err(e && e.message ? e.message : String(e)); }); }
function checkUpdates(){
 Android.showToast("Checking for updates…");
 fetchLatestRelease(function(rel){
   if(!rel){ Android.showToast("No releases published yet"); return; }
   var latest=(rel.tag_name||rel.name||"").trim();
   if(latest && verGt(latest,Android.getInfo())){ showUpdateDialog(rel); }
   else { Android.showToast("Your app is up to date (v"+Android.getInfo()+")"); }
 }, function(msg){ Android.showToast("Update check failed: "+msg); });
 fetch("https://youtube.com/ytpro_cdn/npm/ytpro",{cache:"reload"});
 fetch("https://youtube.com/ytpro_cdn/npm/ytpro/bgplay.js",{cache:"reload"});
 fetch("https://youtube.com/ytpro_cdn/npm/ytpro/innertube.js",{cache:"reload"});
}
function showUpdateDialog(rel){
 var tag=(rel.tag_name||rel.name||"new build").trim();
 var date=rel.published_at?new Date(rel.published_at):null;
 var notes=(rel.body||"").trim()||"No changelog provided.";
 var apk=null;
 try{ (rel.assets||[]).forEach(function(a){ if(!apk && /\.apk$/i.test(a.name||"")) apk=a; }); }catch(e){}
 var x=document.createElement("div");
 x.setAttribute("style","height:100%;width:100%;position:fixed;display:grid;align-items:center;top:0;left:0;background:rgba(0,0,0,.6);z-index:99999;");
 x.innerHTML='<div style="margin:auto;width:78%;max-height:70%;padding:18px;background:#212121;border:1px solid #888;border-radius:14px;color:#fff;display:flex;flex-direction:column;">'
  +'<h2 style="margin:0 0 6px 0;">Update Available</h2>'
  +'<div id="ytlUpdSub" style="font-size:12px;color:#aaa;margin-bottom:10px;"></div>'
  +'<div id="ytlUpdNotes" style="white-space:pre-wrap;font-size:13px;line-height:1.45;overflow:auto;max-height:38vh;padding-right:4px;"></div>'
  +'<div style="display:flex;gap:10px;margin-top:14px;">'
  +'<button data-action="cancel" style="flex:1;border:0;border-radius:10px;height:34px;background:#3a3a3a;color:#fff;">Later</button>'
  +'<button data-action="url" style="flex:1;border:0;border-radius:10px;height:34px;background:#3a3a3a;color:#fff;">Release page</button>'
  +'<button data-action="download" style="flex:1.2;border:0;border-radius:10px;height:34px;background:rgba(255,66,66,.85);color:#fff;">Download APK</button>'
  +'</div></div>';
 var sub=x.querySelector("#ytlUpdSub"), n=x.querySelector("#ytlUpdNotes");
 sub.textContent="v"+Android.getInfo()+" → "+tag+(date?" · "+date.toISOString().slice(0,10):"");
 n.textContent=notes;
 x.addEventListener("click",function(e){
   var el=e.target.closest("[data-action]");
   if(!el) return;
   var action=el.dataset.action;
   if(action==="cancel"){ x.remove(); }
   else if(action==="download"){
     if(apk && apk.browser_download_url){ Android.downvid(apk.name||("YouTubeLite-"+tag+".apk"),apk.browser_download_url,"application/vnd.android.package-archive"); }
     else { Android.oplink(rel.html_url); }
   } else if(action==="url"){ Android.oplink(rel.html_url); }
 });
 document.body.appendChild(x);
}


/*Set Configration*/
function sttCnf(x,z,y){

/*Way too complex to understand*/
if(isD){
var s=["#000","#717171","#fff"];
}else{
var s=["#fff","#909090","#151515"];
}



if(typeof y == "string"){

if(localStorage.getItem(y) != "true"){
if(z == 1){
return `background:${s[0]};left:2px;`;
}else{
return `background:${s[1]};`;
}
}else{
if(z == 1){
return `background:${s[0]};`;
}else{
return `background:${s[2]};`;
}
}
}
if(localStorage.getItem(z) == "true"){
localStorage.setItem(z,"false");
x.style.background=s[1];
x.children[0].style.left="2px";
x.children[0].style.background=s[0];
}
else{
localStorage.setItem(z,"true");
x.style.background=s[2];
x.children[0].style.left="auto";
x.children[0].style.right="2px";
x.children[0].style.background=s[0];
}

if(localStorage.getItem("fzoom") == "false"){
document.getElementsByName("viewport")[0].setAttribute("content","width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no,");
}else{
document.getElementsByName("viewport")[0].setAttribute("content","");
}



if(localStorage.getItem("bgplay") == "true"){
Android.setBgPlay(true);
}else{
Android.setBgPlay(false);
}


if(localStorage.getItem("gesC") != "true"){
try{
document.getElementById("brtS").remove();
document.getElementById("volS").remove();
}catch{}
  
}

if(localStorage.getItem("devMode") == "false"){
try{eruda.destroy();}catch{}
}else if(!window.eruda && localStorage.getItem("devMode") == "true"){
var script = document.createElement('script'); script.src="//youtube.com/ytpro_cdn/npm/eruda"; document.body.appendChild(script); script.onload=()=>{ eruda.init();}
}



}




/*Format File Size*/
function formatFileSize(bytes){
var s=parseInt(bytes);
let ss = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
for (var i=0; s > 1024; i++) s /= 1024;
return `${s.toFixed(1)} ${ss[i]}`;
}

/*Video Downloader*/
async function ytproDownVid(){

window.ytproSabrDownload();

}





function showHideAdaptives(){
var z=document.querySelectorAll(".adpFormats");
z.forEach((x)=>{
if(x.style.display=="none"){
x.style.display="flex";
}else{
x.style.display="none";
}

});

}

/*Add the meme type and extensions lol*/
function downCap(x,t){
Android.downvid(t,x,"plain/text");
}

/*Send to Download Manager*/
function YTDownVid(o,ex){
var mtype="";
if(ex ==".png"){
mtype="image/png";
}else if(ex ==".mp4"){
mtype="video/mp4";
}
else if(ex ==".mp3"){
mtype="audio/mp3";
}

//console.log(o.getAttribute("data-ytprourl"))

Android.downvid((o.getAttribute("data-ytprotit")+ex),o.getAttribute("data-ytprourl"),mtype);
}








var stopProp = false;
var zoomIn=false;
var scale=1;


/*Checks the Direction of the Swipe*/
function checkDirection(e) {
if ((touchendY > touchstartY) && (touchendY - touchstartY > 20)) {
minimize(true);
}else if ((touchendY < touchstartY) && (touchstartY - touchendY > 20)) {
minimize(false);
//console.log((touchstartY - touchendY ))
}
}

/*for zoom in and out*/
function getDistance(touches) {
const [a, b] = touches;
return Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
}



/*touch start*/
document.body.addEventListener('touchstart', e => {
touchstartY = e.changedTouches[0].screenY;
if (e.touches.length === 2) {
initialDistance = getDistance(e.touches);
}
}, { capture: true });




/*touch move*/
document.body.addEventListener('touchmove', (e) => {


if(stopProp){
e.stopPropagation();
}

if (e.touches.length === 2 && initialDistance !== null) {
const currentDistance = getDistance(e.touches);
const z = currentDistance / initialDistance;

stopProp=true;


if((e.target.className.toString().includes("video-stream") || e.target.className.toString().includes("player-controls-background")) && document.fullscreenElement){

if (z > 1.05) {
var Vv=document.getElementsByClassName('video-stream')[0];
zoomIn=true;
scale=Math.max((screen.height / Vv.offsetHeight) , (screen.width / Vv.offsetWidth)); 
addMaxButton();
} else if (z < 0.95) {
zoomIn=false;
scale=1;
addMaxButton();
}
}



}
},{capture:true});






/*touch end*/
document.body.addEventListener('touchend', e => {


touchendY = e.changedTouches[0].screenY;

if((e.target.className.toString().includes("video-stream") || e.target.className.toString().includes("player-controls-background")) && !document.fullscreenElement && localStorage.getItem("gesM") == "true"){
checkDirection();
}

if (e.touches.length < 2) {
initialDistance = null; // reset

setTimeout(()=>{
stopProp=false;
},500)

}

}, { capture: true });





if (typeof navigation !== "undefined") navigation.addEventListener("navigate", e => {
if(e.destination.url.indexOf("watch") > -1 || e.destination.url.indexOf("shorts") > -1){
  dislikes="...";
fDislikes(e.destination.url);
checkSponsors(e.destination.url);
}
});


/*minimize function to mini the video*/
function minimize(yes){


const createIframe=()=>{

var iframe=document.createElement("iframe");
iframe.setAttribute("id",`miniIframe`);
iframe.setAttribute("style",`
height:99.999%;width:100%;
background:${c};
top:0px;
line-height:50px;
position:fixed;
left:0;
z-index:999;
border:0;
`);


iframe.src="https://m.youtube.com/";
document.body.appendChild(iframe);


var iwindow = iframe.contentWindow || iframe.contentDocument.defaultView;
var doc = iwindow.document;

if (doc.readyState  == 'complete' ) {
if (iwindow.trustedTypes && iwindow.trustedTypes.createPolicy && !iwindow.trustedTypes.defaultPolicy) {
iwindow.trustedTypes.createPolicy('default', {createHTML: (string) => string,createScriptURL: string => string, createScript: string => string, });
}
}

iwindow.navigation.addEventListener("navigate", e => {
if(e.destination.url.indexOf("youtube.com") > -1){
if(e.destination.url.indexOf("/watch") > -1 || e.destination.url.indexOf("/shorts") > -1){
window.location.href=e.destination.url;
}
var script = doc.createElement("script");
var scriptSource=`window.addEventListener('DOMContentLoaded', function() {
var script2 = document.createElement('script');
script2.src="//youtube.com/ytpro_cdn/npm/ytpro";
document.body.appendChild(script2);
});
`;
}
else{
window.location.href=e.destination.url;
}


});

var script = doc.createElement("script");
var scriptSource=`window.addEventListener('DOMContentLoaded', function() {
var script2 = document.createElement('script');
script2.src="//youtube.com/ytpro_cdn/npm/ytpro";
document.body.appendChild(script2);
});
`;

/*
var script = document.createElement('script'); 
script.src="//cdn.jsdelivr.net/npm/eruda"; 
document.body.appendChild(script);
script.onload = function () { eruda.init() } ;
*/


  
var source = doc.createTextNode(scriptSource);
script.appendChild(source);
doc.body.appendChild(script);

return iframe;

}



var iframe = document.getElementById("miniIframe") || createIframe();
var player=document.getElementById("player-container-id");




//var ogCss=getComputedStyle(player);

if(yes){

iframe.style.display="block";


player.setAttribute("ogTop",getComputedStyle(player).top)


player.style.transform="scale(0.65)";
player.style.top=(window.screen.height-(player.getBoundingClientRect().height*2.5))+"px";
player.style.zIndex="9999";


}else{

iframe.style.display="none";



player.style.transform="scale(1)";
player.style.top=player.getAttribute("ogTop");
player.style.zIndex="normal";

player.removeAttribute("ogTop");


}
}



/*JAVA Callback for AccessToken*/
function callbackSNlM0e(){
return new Promise(resolve => {
callbackSNlM0e.resolve = resolve; 
});
}

/*JAVA Callback for Gemini Response*/
function callbackGeminiClient(){
return new Promise(resolve => {
callbackGeminiClient.resolve = resolve; 
});
}






/*Handles the reponse*/
function handleGeminiResponse(res){


/*Extract the body from the response*/
const getBody=(lines)=>{
  
let linesJSON=JSON.parse(lines[2]).findLast(arr =>{
try{
  let js=JSON.parse(arr[2]);
  if(js?.[4]?.[0]?.[0]?.indexOf("rc_") > -1) return js;  
}catch(e){
  console.log("err",e)
}           
});


return JSON.parse(linesJSON?.[2] || "[]");
  
};


/*Modifies the timestamps , to handle them inside the video element*/
const modifyTimestamps=(x)=>{
var html=x;
var hrefs=html.match(/href="([^"]*)"/g) || [];
var urls= [...hrefs].map(url => url.replace(/href="|"/g, ""));
hrefs.forEach((x,i)=>{
var time=new URL(urls[i]).searchParams.get("t");
if(time != null){
html=html.replace(x,`href="javascript:void(0);" onclick="document.getElementsByClassName('video-stream')[0].currentTime='${time}'"`)
}else if(urls[i].indexOf("youtube.com") < 0 && urls[i].indexOf("youtu.be") < 0){
html=html.replace(x,`href="javascript:void(0);" onclick="try{document.getElementsByClassName('video-stream')[0].pause();}catch{}Android.oplink('${urls[i]}')"`)
}
})
return html;
}





/*checks if the object is empty*/
var response=res.stream;

if (response == undefined) return document.getElementById("GeminiResponse").innerHTML=`<center style="margin-top:15px" > An error Occurred while connecting to Gemini`;



var lines=response.split("\n");
var body=getBody(lines);


if(body.length === 0) return document.getElementById("GeminiResponse").innerHTML=`<center style="margin-top:15px" > An error Occurred while connecting to Gemini`;


var chat=[];

chat.push(body?.[1]?.[0]);
chat.push(body?.[1]?.[1]);
chat.push(body?.[4]?.[0]?.[0]);

/*Stores the recent chat info*/
localStorage.setItem("geminiChatInfo",chat.toString());


body=body?.[4]?.[0];

var text=body?.[1]?.[0] || "";
text=text.replace(/http:\/\/googleusercontent\.com\/\S+/g,'');
var thoughts = body?.[37]?.[0]?.[0] || null;
var images=[];

for(var i in body?.[12]?.[1]){
var img=body?.[12]?.[1]?.[i]
images.push({
url:img[0][0][0],
alt:img[0][4],
title:img[7][0]
});

text+=`<center><img alt="${img[0][4]}" src="${img[0][0][0]}"></center>`;
}

//console.log(text,"\n\n\n-------- \n\n",thoughts)






let converter = new showdown.Converter();
converter.setFlavor('github');
let html = modifyTimestamps(converter.makeHtml(text));


let thoughtsHtml=(thoughts != null) ? `<button onclick="(this.nextElementSibling.style.height=='auto') ? (this.children[0].style.transform='rotate(-90deg)',this.nextElementSibling.style.height='0') : (this.children[0].style.transform='rotate(90deg)',this.nextElementSibling.style.height='auto');" class="think" >Show Thinking 
<svg xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-90deg);margin-left:10px" width="16" height="16" fill="${isD ? "#ccc" : "#444"}" viewBox="0 0 16 16">
<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
</svg></button>
<div class="geminiThoughts">
<br>
${converter.makeHtml(thoughts)}


</div><br>` : "";

document.getElementById("GeminiResponse").innerHTML=`<div style="position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;padding:2px 0 4px;">
<button id="ytlGemCopy" style="border:none;border-radius:14px;padding:5px 12px;font-size:13px;font-weight:600;background:${isD?'#3a3a3a':'#e8e8e8'};color:${isD?'#fff':'#111'};-webkit-tap-highlight-color:transparent;user-select:none;outline:none;">Copy</button></div>

${thoughtsHtml}



<div class="geminiAnswer">
${html}
</div>
`;

var _ytlCopyBtn=document.getElementById('ytlGemCopy');
if(_ytlCopyBtn){
  _ytlCopyBtn.onclick=function(){
    var ans=document.querySelector('#GeminiResponse .geminiAnswer');
    var txt=ans?((ans.innerText||ans.textContent||'').trim()):'';
    if(!txt) return;
    var self=this;
    var done=function(){ self.textContent='Copied'; setTimeout(function(){ self.textContent='Copy'; },1400); };
    var fallback=function(){
      try{
        var ta=document.createElement('textarea');
        ta.value=txt;
        ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0;';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      }catch(e){}
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(done).catch(fallback);
    } else { fallback(); }
  };
}


}





/*Main Gemini Function*/
function ytlVideoTitle(){
  try{
    var el=document.querySelector('.slim-video-information-title');
    if(el && (el.textContent||'').trim()) return el.textContent.trim();
    var m=document.querySelector('ytm-slim-video-metadata-section-renderer span.ytAttributedStringWhiteSpaceNoWrap');
    if(m && (m.textContent||'').trim()) return m.textContent.trim();
    var h=document.querySelector('ytm-slim-video-metadata-section-renderer');
    if(h && (h.textContent||'').trim()) return (h.textContent||'').trim().split('\n')[0].trim();
  }catch(e){}
  return (document.title||'').replace(/\s*-\s*YouTube\s*$/,'').trim();
}

function ytlGeminiPrompt(){
  var p=null;
  try{ p=localStorage.getItem('prompt'); }catch(e){}
  if(!p){
    p='Give me details about this YouTube video Id: {videoId} , titled \"{title}\" , a detailed summary of timestamps with facts , resources and reviews of the main content';
    try{ localStorage.setItem('prompt',p); }catch(e){}
  }
  var vid='';
  try{ vid=new URL(location.href).searchParams.get('v')||''; }catch(e){}
  try{ return p.replaceAll('{url}',location.href).replaceAll('{videoId}',vid).replaceAll('{title}',ytlVideoTitle()); }
  catch(e){ return p; }
}

async function geminiInfo(){
if(document.getElementById("GeminiResponse") == null){
var GeminiRes=document.createElement("div");
GeminiRes.setAttribute("style",`min-height:60px;max-height:200px;display:block;height:auto;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;font-weight:400;width:calc(92% - 20px);font-size:14px;padding:10px;position:relative;margin:auto;background:${d};border-radius:15px;margin-bottom:8px;`);
GeminiRes.setAttribute("id","GeminiResponse");


insertAfter(document.getElementById('ytproMainDivE'),GeminiRes);
}

var GeminiRes=document.getElementById("GeminiResponse");

/*Independent scrolling: swipes inside the summary move only the summary*/
if(!GeminiRes.__ytlScrollBound){
  GeminiRes.__ytlScrollBound = true;
  var _gLastY = 0;
  GeminiRes.addEventListener('touchstart',function(e){
    if(e.touches && e.touches.length === 1) _gLastY = e.touches[0].clientY;
    try{ e.stopPropagation(); }catch(err){}
  },{passive:true});
  GeminiRes.addEventListener('touchmove',function(e){
    if(e.touches && e.touches.length === 1){
      var y = e.touches[0].clientY;
      var dy = _gLastY - y;
      _gLastY = y;
      GeminiRes.scrollTop = GeminiRes.scrollTop + dy;
    }
    try{ e.preventDefault(); }catch(err){}
    try{ e.stopPropagation(); }catch(err){}
  },{passive:false});
  GeminiRes.addEventListener('touchend',function(e){ try{ e.stopPropagation(); }catch(err){} },{passive:true});
  GeminiRes.addEventListener('wheel',function(e){ e.stopPropagation(); },{passive:true});
}


document.getElementById("GeminiResponse").innerHTML=`
<div class="geminiLoader"></div>`;

var cookies=Android.getAllCookies(window.location.href);

if(cookies.indexOf("__Secure-1PSID=") < 0){
GeminiRes.innerHTML=`
<center style="margin-top:15px">
<span >Sign in to use Gemini<span>
<br><br>
<a href="https://accounts.google.com/ServiceLogin?service=youtube" >
<button style="background:${c};color:${isD ? "#000" : "#fff"};font-weight:500;height:35px;width:90px;border-radius:25px;text-align:center;line-height:35px;">Sign In</button>
</a>
<br><br>

</center>`;

return;

}


/*checks if the user is logged in*/
cookies=cookies.split(";");

var secured="";

cookies.forEach((x)=>{
if(x.indexOf("__Secure-1PSID=") > -1 || x.indexOf("__Secure-1PSIDTS=") > -1)
secured+=x+";";
})



var endpoint="https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate";
var headers=JSON.stringify({
"accept": "*/*",
"accept-language": "en",
"content-type":"application/x-www-form-urlencoded;charset=UTF-8",
"x-goog-ext-525001261-jspb": GeminiModels[localStorage.getItem('geminiModel')],
"x-same-domain": "1",
"cookie": secured,
"Referer": "https://gemini.google.com/",
"Referrer-Policy": "origin"
});


if(GeminiAT == ""){
Android.getSNlM0e(secured);
GeminiAT=await callbackSNlM0e();
if(!GeminiAT || GeminiAT == "error"){
await new Promise(r=>setTimeout(r,1200));
Android.getSNlM0e(secured);
GeminiAT=await callbackSNlM0e();
}

var sd = document.createElement('script');
sd.src="//youtube.com/ytpro_cdn/npm/showdown/dist/showdown.min.js";
document.body.appendChild(sd);

}




var prompt=ytlGeminiPrompt();
//`send me details with timestamps and images related to this youtube com video ${}`;
// , including all the aspects and scopes with timestamp , add facts in the analysis as well ,Here's the youtube 



var chat = null;

if(localStorage.getItem("saveCInfo") == "true" && localStorage.getItem("geminiChatInfo") != null){
chat = localStorage.getItem("geminiChatInfo").split(",");
}

  
  
const formData = new URLSearchParams();
formData.append("f.req", JSON.stringify([null,JSON.stringify([[prompt],null,chat])]));

  
formData.append("at", GeminiAT);



Android.GeminiClient(endpoint,headers,formData.toString());
var response=await callbackGeminiClient();

/*If the saved chat session is stale or Gemini rejected the request, retry once without chat history*/
if(!response || !response.stream || String(response.stream).length < 40){
try{ localStorage.removeItem("geminiChatInfo"); }catch(e){}
var fdRetry=new URLSearchParams();
fdRetry.append("f.req", JSON.stringify([null,JSON.stringify([[prompt],null,null])]));
fdRetry.append("at", GeminiAT);
Android.GeminiClient(endpoint,headers,fdRetry.toString());
response=await callbackGeminiClient();
}

handleGeminiResponse(response);

}


var volSvg=`<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16" focusable="false" aria-hidden="true" style="pointer-events: none;filter:drop-shadow(0px 0px 1px black);position:absolute;top:10%"><path fill="#fff" d="M11.485 2.143 3.913 6.687A6 6 0 001 11.832v.338a6 6 0 002.913 5.144l7.572 4.543A1 1 0 0013 21V3a1.001 1.001 0 00-1.515-.857Zm6.88 2.079a1 1 0 00-.001 1.414 9 9 0 010 12.728 1 1 0 001.414 1.414 11 11 0 000-15.556 1 1 0 00-1.413 0Zm-2.83 2.828a1 1 0 000 1.415 5 5 0 010 7.07 1 1 0 001.415 1.415 6.999 6.999 0 000-9.9 1 1 0 00-1.415 0Z"></path></svg>`;
var brtSvg=`<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="16" viewBox="0 0 24 24" width="16" style="filter:drop-shadow(0px 0px 1px black);position:absolute;top:10%;"><rect fill="none" height="24" width="24"/><path fill="#fff" d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0 c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2 c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1 C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06 c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41 l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41 c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36 c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"/></svg>`;


/*Return YouTube Dislike: like/dislike pill*/
var rydStyleDone=false;
function rydEnsureStyle(){
  if(rydStyleDone || document.getElementById("ytlRydStyle")){ return; }
  var st=document.createElement("style");
  st.id="ytlRydStyle";
  st.textContent=""
    +"#ytlRyd{margin:8px 0 2px;display:block;text-align:center;}"
    +"#ytlRyd .ytl-row{display:inline-flex;align-items:center;gap:14px;padding:7px 16px;border-radius:999px;background:"+(isD?"#272727":"#f2f2f2")+";color:"+(isD?"#fff":"#0f0f0f")+";font-size:14px;font-weight:600;line-height:1;max-width:100%;box-sizing:border-box;}"
    +"#ytlRyd .ytl-seg{display:inline-flex;align-items:center;gap:8px;border:0;background:none;padding:0;margin:0;color:inherit;font:inherit;cursor:pointer;}"
    +"#ytlRyd .ytl-seg svg{width:20px;height:20px;display:block;fill:currentColor;}"
    +"#ytlRyd .ytl-like span{color:#2ecc71;}"
    +"#ytlRyd .ytl-dislike span{color:#ff4e45;}"
    +"#ytlRyd .ytl-sep{width:1px;height:18px;background:"+(isD?"#555":"#c9c9c9")+";display:block;}"
    +"#ytlRyd .ytl-bar{display:flex;height:4px;border-radius:3px;overflow:hidden;background:"+(isD?"#3a3a3a":"#d9d9d9")+";margin:6px auto 0;max-width:260px;}"
    +"#ytlRyd .ytl-bar i{display:block;height:100%;}"
    +"#ytlRyd .ytl-bar .ytl-bar-l{background:#2ecc71;}"
    +"#ytlRyd .ytl-bar .ytl-bar-d{background:#ff4e45;}";
  document.head.appendChild(st);
  rydStyleDone=true;
}
function rydCompactToNum(t){
  if(!t){ return 0; }
  var m=(t+"").replace(/,/g,"").trim().match(/^([\d.]+)\s*([万亿KMB]?)/i);
  if(!m){ return 0; }
  var n=parseFloat(m[1])||0;
  var u=(m[2]||"").toUpperCase();
  if(u==="万"){ n*=1e4; }
  else if(u==="亿"){ n*=1e8; }
  else if(u==="K"){ n*=1e3; }
  else if(u==="M"){ n*=1e6; }
  else if(u==="B"){ n*=1e9; }
  return Math.round(n);
}
function renderRydPill(){
  var actions=document.querySelector("div.slim-video-action-bar-actions");
  var oldDiskl=document.getElementById("diskl");
  if(oldDiskl){ oldDiskl.remove(); }
  if(!actions){ return; }
  rydEnsureStyle();
  var likeHost=document.querySelector("like-button-view-model");
  var disHost=document.querySelector("dislike-button-view-model");
  if(likeHost){ likeHost.style.display="none"; }
  if(disHost){ disHost.style.display="none"; }
  var pill=document.getElementById("ytlRyd");
  if(!pill || !pill.isConnected){
    pill=document.createElement("div");
    pill.id="ytlRyd";
    pill.innerHTML="<div class='ytl-row'>"
      +"<button class='ytl-seg ytl-like' aria-label='Like'><svg viewBox='0 0 24 24'><path d='M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'></path></svg><span class='ytl-like-count'>—</span></button>"
      +"<i class='ytl-sep'></i>"
      +"<button class='ytl-seg ytl-dislike' aria-label='Dislike'><svg viewBox='0 0 24 24'><path d='M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z'></path></svg><span class='ytl-dislike-count'>—</span></button>"
      +"</div><div class='ytl-bar'><i class='ytl-bar-l'></i><i class='ytl-bar-d'></i></div>";
    pill.querySelector(".ytl-like").addEventListener("click",function(){
      var b=document.querySelector("like-button-view-model button");
      if(b){ b.click(); }
    });
    pill.querySelector(".ytl-dislike").addEventListener("click",function(){
      var b=document.querySelector("dislike-button-view-model button");
      if(b){ b.click(); }
    });
    actions.parentNode.insertBefore(pill,actions.nextSibling);
  }
  var likeText="—";
  var subs=document.querySelectorAll(".ytVideoSubtitleViewModelSubstring");
  for(var i=0;i<subs.length;i++){
    if(subs[i].className.indexOf("BoldSubstring")<0){
      var m=(subs[i].textContent||"").match(/^[\d.,]+\s*[万亿KMB]?/i);
      if(m){ likeText=m[0].trim(); subs[i].style.display="none"; break; }
    }
  }
  var likeRaw=0;
  var likeBtn=document.querySelector("like-button-view-model button");
  if(likeBtn){
    var digit=(likeBtn.getAttribute("aria-label")||"").replace(/[^\d]/g,"");
    if(digit){ likeRaw=parseInt(digit,10)||0; }
  }
  if(!likeRaw){ likeRaw=rydCompactToNum(likeText); }
  var disText=(dislikes && dislikes!="...")?dislikes:"—";
  var lc=pill.querySelector(".ytl-like-count");
  var dc=pill.querySelector(".ytl-dislike-count");
  if(lc){ lc.textContent=likeText; }
  if(dc){ dc.textContent=disText; }
  var row=pill.querySelector(".ytl-row");
  var bar=pill.querySelector(".ytl-bar");
  if(row && bar){ bar.style.width=row.offsetWidth+"px"; }
  var bl=pill.querySelector(".ytl-bar-l");
  var bd=pill.querySelector(".ytl-bar-d");
  if(bl && bd){
    var disRaw=dislikesRaw||0;
    var total=likeRaw+disRaw;
    var pct=total>0?(likeRaw/total*100):50;
    bl.style.width=pct.toFixed(1)+"%";
    bd.style.width=(100-pct).toFixed(1)+"%";
  }
}
/* Hide the masthead three-dot (more options) button */
function hideTopbarDots(){
  try{
    var ps=document.querySelectorAll(".mobile-topbar-header-content path");
    for(var i=0;i<ps.length;i++){
      var d=ps[i].getAttribute("d")||"";
      if(d.indexOf("M12 4a2 2 0 100 4")===0 || d.indexOf("M12 8c1.1 0 2-.9")===0){
        var b=ps[i].closest("button");
        if(b && b.style.display!=="none"){ b.style.display="none"; }
      }
    }
  }catch(e){}
}
/*THE 0NE AND 0NLY FUNCTION*/
function applyShortsTab(){
  try{
    var on = localStorage.getItem("shorts") == "true";
    var tabs = document.querySelectorAll("ytm-pivot-bar-renderer .pivot-bar-item-tab.pivot-shorts");
    for(var i=0;i<tabs.length;i++){
      var item = tabs[i].closest("ytm-pivot-bar-item-renderer") || tabs[i];
      var want = on ? "none" : "";
      if(item.style.display !== want){ item.style.display = want; }
    }
  }catch(e){}
}
async function pkc(){
hideTopbarDots();
applyShortsTab();

if(window.location.href.indexOf("youtube.com/watch") < 0){ var _op=document.getElementById("ytlRyd"); if(_op){ _op.remove(); } }
if(window.location.href.indexOf("youtube.com/watch") > -1){


try{

renderRydPill();

}catch(e){}


//Volume and brightness slider 
try{

if(localStorage.getItem("gesC") == "true"){
  

var v= document.getElementById("player-container-id");
var rect=v.getBoundingClientRect();

var elStyle={
height:"70%",
width:rect.width*0.14+"px",
display:"flex",
"flex-direction":"column",
"align-items":"center",
"justify-content":"center",
position:"absolute",
top:"16%", 
right:"0px",
opacity:"0",
//background:"#a57a"
};  
  
  

var el=document.createElement("div");
var elB=document.createElement("div");
elB.setAttribute("id","brtS");
el.setAttribute("id","volS");

Object.assign(el.style,elStyle);
Object.assign(elB.style,elStyle);
elB.style.left="24px";

el.innerHTML=`${volSvg}<div style="position:absolute;bottom:5%;left:calc(50% - 1.5px);background:rgba(255,255,255,0.5); height:70%;width:3px;border-radius:3px;color:red;box-shadow:0px 0px 2px black;pointer-events:none" ><div style="background:white;width:100%;height:${vol * 100}%;border-radius:3px;position:absolute;bottom:0;box-shadow:0px 0px 2px black;" id="volIS"></div></div>`;
elB.innerHTML=`${brtSvg}<div style="position:absolute;bottom:5%;left:calc(50% - 1.5px);background:rgba(255,255,255,0.5); height:70%;width:3px;border-radius:3px;color:red;box-shadow:0px 0px 2px black;pointer-events:none" ><div style="background:white;width:100%;height:${brt * 100}%;border-radius:3px;position:absolute;bottom:0;box-shadow:0px 0px 1px black;" id="brtIS"></div></div>`;


if(!document.getElementById("brtS")){
document.getElementById("player-container-id").appendChild(elB);

elB.addEventListener("touchmove",(e)=>{
e.preventDefault();
elB.style.opacity="1";

var diff= touchstartY - e.touches[0].pageY;

if(diff > 0){
brt +=sens;
}else{
brt -=sens;
}

if(brt > 1) brt=1;
if(brt < 0) brt =0;

touchstartY=e.touches[0].pageY;

Android.setBrightness(brt);
document.getElementById("brtIS").style.height=brt*100+"%";

},{ passive: false })


//hide the element after touch endas
elB.addEventListener("touchend",(e)=>{
elB.style.opacity="0";
},{ passive: false });

}





if(!document.getElementById("volS")){
document.getElementById("player-container-id").appendChild(el);

el.addEventListener("touchmove",(e)=>{
e.preventDefault();
el.style.opacity="1";

var diff= touchstartY - e.touches[0].pageY;

if(diff > 0){
vol +=sens;
}else{
vol -=sens;
}

if(vol > 1) vol=1;
if(vol < 0) vol =0;

touchstartY=e.touches[0].pageY;

Android.setVolume(vol);
document.getElementById("volIS").style.height=vol * 100 +"%";

},{ passive: false })



//hide the element after touch endas , yes endas
el.addEventListener("touchend",(e)=>{
el.style.opacity="0";
},{ passive: false });

}

//Keep the brightness/volume strips clear of the control bar in fullscreen
var _ytlFsFit=function(){
  var fs=!!document.fullscreenElement;
  var ids=["brtS","volS"];
  for(var i=0;i<ids.length;i++){
    var s=document.getElementById(ids[i]);
    if(!s) continue;
    s.style.top=fs?"10%":"16%";
    s.style.height=fs?"55%":"70%";
  }
};
document.addEventListener("fullscreenchange",_ytlFsFit);
_ytlFsFit();

//Strips take touches only in fullscreen (in portrait the right strip would cover the fullscreen button)
(function(){
  function apply(fs){
    var v = document.getElementById("volS");
    var b = document.getElementById("brtS");
    if(v){
      v.style.setProperty("pointer-events", fs ? "auto" : "none", "important");
      v.style.setProperty("z-index", fs ? "2147483000" : "", "important");
      v.style.setProperty("right", fs ? "16px" : "0px", "important");
    }
    if(b){
      b.style.setProperty("pointer-events","auto","important");
      b.style.setProperty("z-index","2147483000","important");
    }
  }
  function sync(){ apply(!!document.fullscreenElement); }
  document.addEventListener("fullscreenchange", sync);
  sync();
  setTimeout(sync, 400);
})();

//Disable the swipe-up "more videos" sheet while in fullscreen
if(!window.__ytlFsRecBlock){
window.__ytlFsRecBlock=true;
var _fsx=0,_fsy=0,_fact=false,_fskip=false;
var _fsActive=function(){
  return !!document.fullscreenElement || !!document.querySelector(".fullscreen-controls");
};
var _fstrip=function(x,y){
  var ids=["brtS","volS"];
  for(var i=0;i<ids.length;i++){
    var s=document.getElementById(ids[i]);
    if(!s) continue;
    var r=s.getBoundingClientRect();
    if(r.width>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom) return true;
  }
  return false;
};
var _fstart=function(e){
  if(!_fsActive()){ _fact=false; return; }
  var t=e.changedTouches?e.changedTouches[0]:e;
  if(!t){ _fact=false; return; }
  _fsx=t.clientX; _fsy=t.clientY; _fact=true;
  _fskip=_fstrip(_fsx,_fsy);
};
var _fmove=function(e){
  if(!_fact||_fskip||!_fsActive()) return;
  var t=e.changedTouches?e.changedTouches[0]:e;
  if(!t) return;
  var dy=t.clientY-_fsy, dx=t.clientX-_fsx;
  if(dy < -8 && Math.abs(dy) > Math.abs(dx)*0.8){
    e.stopPropagation();
    if(e.cancelable) e.preventDefault();
  }
};
var _fend=function(){ _fact=false; };
if(window.PointerEvent){
  window.addEventListener("pointerdown",_fstart,true);
  window.addEventListener("pointermove",_fmove,{capture:true,passive:false});
  window.addEventListener("pointerup",_fend,true);
  window.addEventListener("pointercancel",_fend,true);
}
window.addEventListener("touchstart",_fstart,true);
window.addEventListener("touchmove",_fmove,{capture:true,passive:false});
window.addEventListener("touchend",_fend,true);
window.addEventListener("touchcancel",_fend,true);
}

}


  
}catch(e){
  console.log(e)
}











/*Check If Element Already Exists*/
if(document.getElementById("ytproMainDivE") == null){



var ytproMainDivA=document.createElement("div");
ytproMainDivA.setAttribute("id","ytproMainDivE");
ytproMainDivA.setAttribute("style",`
height:50px;width:100%;display:block;overflow:auto;
`);

insertAfter(document.getElementsByClassName('slim-video-action-bar-actions')[0],ytproMainDivA);

var ytproMainDiv=document.createElement("div");
ytproMainDiv.setAttribute("style",`
height:50px;width:100%;display:flex;overflow:auto;
align-items:center;justify-content:center;
`);
ytproMainDivA.appendChild(ytproMainDiv);

/*Gemini Button*/
var ytproGemini=document.createElement("div");
sty(ytproGemini);
ytproGemini.style.width="30px";
ytproGemini.style.height="calc(65% - 4.5px)";
ytproGemini.style.position="relative";
ytproGemini.style.background=`linear-gradient(${isD ? "#272727,#272727" : "#f2f2f2,#f2f2f2"}) padding-box , linear-gradient(16deg ,#4285f4 ,#9b72cb ,#d96570) border-box`;
ytproGemini.style.border="2px solid transparent";
ytproGemini.innerHTML=`
<svg style="height:20px;width:20px" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" fill="url(#prefix__paint0_radial_980_20147)"/><defs><radialGradient id="prefix__paint0_radial_980_20147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)"><stop offset=".067" stop-color="#9168C0"/><stop offset=".343" stop-color="#5684D1"/><stop offset=".672" stop-color="#1BA1E3"/></radialGradient></defs></svg>
<style type="text/css">
#GeminiResponse img{
max-width:90%;
height:auto;
border-radius:10px;
margin-top:5px;
}
#GeminiResponse::-webkit-scrollbar{width:6px;}
#GeminiResponse::-webkit-scrollbar-thumb{background:rgba(128,128,128,.55);border-radius:3px;}
#GeminiResponse::-webkit-scrollbar-track{background:transparent;}
#GeminiResponse a{
color:rgb(62,166,255);
}
.geminiLoader,.geminiLoader:before,.geminiLoader:after{
content:'';
height:10px;
width:70%;
position:absolute;
top:15px;
border-radius:5px;
left:10px;
background:${d};
animation: geminiLoad 1s linear infinite alternate;
}
.geminiLoader:before{
top:27px;
left:0;
}
.geminiLoader:after{
top:54px;
left:0;
width:90%;
}
@keyframes geminiLoad{
0% {
opacity:1;
}
100% {
opacity:.4;
}
}
.geminiThoughts{
height:0;
width:calc(100% - 30px);
transition:5s;
float:left;
overflow:hidden;
padding-left:5px;
font-style:italic;
border-left:3px solid ${d};
display:block;
float:none;
clear:both;
}
.geminiAnswer{
height:auto;
width:100%;
display:block;
float:none;
clear:both;
}
#GeminiResponse .think{
background:transparent;
font-size:1.45rem;
width:calc(100% - 20px);
height:20px;
color:${isD ? "#ccc" : "#444"};
margin-top:3px;
text-align:left;
display:flex;
padding-left:5px;
border-left:3px solid ${d};
}
</style>
`;






ytproMainDiv.appendChild(ytproGemini);


ytproGemini.addEventListener("click",
async function(){




geminiInfo();


});














/*Download Button*/
var ytproDownVidElem=document.createElement("div");
sty(ytproDownVidElem);
//ytproDownVidElem.style.width="140px";
ytproDownVidElem.innerHTML=`${downBtn.replace('width="18"','width="24"').replace('height="18"','height="24"')}`;
ytproMainDiv.appendChild(ytproDownVidElem);
ytproDownVidElem.addEventListener("click",
function(){
window.location.hash="download";
});

/*PIP Button*/
var ytproPIPVidElem=document.createElement("div");
sty(ytproPIPVidElem);
//ytproPIPVidElem.style.width="140px";
ytproPIPVidElem.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 0 24 24" width="22"><path fill="${c}" d="M18 7h-6c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1zm3-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm-1 16.01H4c-.55 0-1-.45-1-1V5.98c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v12.03c0 .55-.45 1-1 1z"/></svg>`;
ytproMainDiv.appendChild(ytproPIPVidElem);
ytproPIPVidElem.addEventListener("click",
function(){
PIPlayer(true);
});





}





}else if(window.location.href.indexOf("youtube.com/shorts") > -1){


let b = document.getElementById("brtS");
let v = document.getElementById("volS");
if (b) b.remove();
if (v) v.remove();


if(document.getElementById("ytproMainSDivE") == null){
var ys=document.createElement("div");
ys.setAttribute("id","ytproMainSDivE");
ys.setAttribute("style",`width:50px;height:auto;position:relative;display:block;`);


/*Download Button*/
ysDown=document.createElement("div");
ysDown.setAttribute("style",`
height:48px;width:48px;display:flex;align-items:center;justify-content:center;
filter:drop-shadow(0 0 1px #0009);
border-radius:50%;
`);
ysDown.innerHTML=downBtn.replaceAll(`${c}`,`#fff`).replace(`width="24"`,`width="30"`).replace(`height="24"`,`height="30"`);


ysDown.addEventListener("click",
function(){
window.location.hash="download";
});


/*Heart Button*/





try{
  
if(document.getElementsByClassName("ytwReelActionBarViewModelHost")[0].children[0]){
  
document.getElementsByClassName("ytwReelActionBarViewModelHost")[0].insertBefore(ys,document.getElementsByClassName("ytwReelActionBarViewModelHost")[0].children[0]);

ys.appendChild(ysDown);
}
}catch{}

}


if(!document.getElementById("ytShortsDislikes")){
try{document.querySelectorAll('like-button-view-model')[0].children[0].children[0].children[0].insertAdjacentHTML("beforeend",`<span style="height:3px;width:3px;border-radius:50%;box-shadow:0px 0px 3px black;margin:3px;background:white">&nbsp;</span><span id="ytShortsDislikes" style="font-weight:bold;text-shadow:0px 0px 3px black;">${dislikes}</span>`);}catch{}
}else{
document.getElementById("ytShortsDislikes").innerHTML=dislikes;
}




/*Watch The old and New URL*
if(ytoldV != window.location.pathname){
fDislikes();
ytoldV=window.location.pathname;
}*/


}

}


setInterval(pkc,300);

/*Tell the native splash that the injected UI is ready*/
try{ setTimeout(function(){ try{ Android.splashReady(); }catch(e){} }, 1200); }catch(e){}





function navigateInternalYtMweb(videoId) {
    window.location.hash="";
    const link = document.createElement('a');
    link.href = `/watch?v=${videoId}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
}


///PIP MODE CONFIG
function removePIP(){

isPIP=false;
pauseAllowed = true;
document.exitFullscreen();
 
document.getElementsByClassName('video-stream')[0].pause();
setTimeout(()=>{
document.getElementsByClassName('video-stream')[0].play();
},5);


}




function PIPlayer(pip = false){
  
var v=document.getElementsByClassName('video-stream')[0];

 
if(pip){

if(v.getBoundingClientRect().height > v.getBoundingClientRect().width){
Android.pipvid("portrait");
}
else{
Android.pipvid("landscape");
}

return;
}


v.requestFullscreen();
v.play();
pauseAllowed = false;
isPIP=true;

}



















// well this is for bypassing the pause function of Youtube when video is in
// PIP mode , its a workaround for now , until i find a proper method
// to allow the pip mode for the video element , like chromium browsers

HTMLMediaElement.prototype.pause = function(){
  
if (pauseAllowed || PIPause) {
return originalPause.apply(this, arguments);
}

if (this.paused) {
this.play().catch(() => {});
}
};









const originalExitFullscreen = document.exitFullscreen;
const originalRequestFullscreen = Element.prototype.requestFullscreen;

//exit full screen
document.exitFullscreen = function (...args) {
 if(!isPIP){ return originalExitFullscreen.apply(this, args);}
};


//request full screen
Element.prototype.requestFullscreen = function (...args) {
var video = document.getElementsByClassName('video-stream')[0];

if(video.getBoundingClientRect().height > video.getBoundingClientRect().width){
Android.fullScreen(true);
}
else{
Android.fullScreen(false);
}

return originalRequestFullscreen.apply(this, args);
};






/*Return from About on system back*/
window.addEventListener("popstate",function(){
try{
var ap=document.getElementById("aboutPageDiv");
if(ap && ap.style.display=="block"){
ap.style.display="none";
var st=document.getElementById("ssprodivI");
if(st){ st.style.display="block"; }
}
}catch(e){}
});

/*Check The Hash Change*/
window.onhashchange=()=>{
try{document.getElementById("outerdownytprodiv").remove();}catch{}
try{document.getElementById("settingsprodiv").remove();}catch{}
//try{document.querySelector("#ytproDownloadIndicator").remove();}catch{}
//try{document.querySelector("#ytProDownloaderDiv").remove();}catch{}
if(window.location.hash == "#download"){
ytproDownVid();
}else if(window.location.hash == "#settings"){
ytproSettings();
}


}



// AdBlocker which removes the ad contents from the fetch requests itself !!
(() => {
const _origFetch = window.fetch;
window.fetch = async function(input, init) {
try {
const url = (typeof input === 'string') ? input : input.url;



//block ad urls
if(url.includes("googleads.g.doubleclick.net") || url.includes("youtube.com/youtubei/v1/player/ad_break") || url.includes("youtube.com/pagead/adview") || url.includes("youtube.com/api/stats/ads")){

//console.log("Blocked",url);
return "";
}else if(url.includes("youtube.com/youtubei/")){


const response = await _origFetch.apply(this, arguments);



try {

const clone = response.clone();
let data = await clone.json();


//older version
if(data?.responseContext?.webResponseContextExtensionData?.webResponseContextPreloadData?.preloadMessageNames?.[0] == "adSlotRenderer" || data?.responseContext?.webResponseContextExtensionData?.webResponseContextPreloadData?.preloadMessageNames?.[0] == "shortsAdsRenderer"){
data={};
}


//remove the ad content
delete data?.adSlots;
delete data?.playerAds;
delete data?.adPlacements;
delete data?.adBreakHeartbeatParams;


//newer version update: 09 Feb , 2026 23:27 IST
delete data?.[0]?.playerResponse?.adSlots;
delete data?.[0]?.playerResponse?.playerAds;
delete data?.[0]?.playerResponse?.adPlacements;
delete data?.[0]?.playerResponse?.adBreakHeartbeatParams;


const newBody = JSON.stringify(data);

// Build new headers (update content-length + content-type)
const newHeaders = new Headers(response.headers);
newHeaders.set("content-length", String(newBody.length));
newHeaders.set("content-type", "application/json");

// Return modified Response
return new Response(newBody, {
status: response.status,
statusText: response.statusText,
headers: newHeaders
});
} catch (e) {
// not JSON, return original
return response;
}



}

return _origFetch.apply(this, arguments);

} catch (e) { /* ignore logging errors */ }

return _origFetch.apply(this, arguments);


};


})();



//modified XHR for the same purpose
const XHR = window.XMLHttpRequest;
const origOpen = XHR.prototype.open;
const origSend = XHR.prototype.send;

XHR.prototype.open = function(method, url, ...rest) {
this._interceptedMethod = method;
this._interceptedUrl = url;
return origOpen.apply(this, [method, url, ...rest]);
};

XHR.prototype.send = function(body) {
// Block certain URLs
if (
this._interceptedUrl.includes("googleads.g.doubleclick.net") ||
this._interceptedUrl.includes("youtube.com/youtubei/v1/player/ad_break") ||
this._interceptedUrl.includes("youtube.com/pagead/adview") ||
this._interceptedUrl.includes("youtube.com/api/stats/ads")
) {
//console.warn("Blocked:", this._interceptedUrl);
return;
}

return origSend.apply(this, arguments);
};












/****** I LOVE YOU <3 *****/
/*YT ADS BLOCKER*/
function adsBlock(){


try{
document.getElementsByClassName('video-stream')[0].removeAttribute('disablepictureinpicture');
}catch{}


/*Block Ads*/
var ads=document.getElementsByTagName("ad-slot-renderer");
for(var x in ads){
try{ads[x].remove();}catch{}
}
try{
document.getElementsByClassName("ad-interrupting")[0].getElementsByTagName("video")[0].currentTime=document.getElementsByClassName("ad-interrupting")[0].getElementsByTagName("video")[0].duration;
document.getElementsByClassName("ytp-ad-skip-button-modern")[0].click();

}catch{}




/*Block Ads*/
try{
document.getElementsByTagName("ytm-promoted-sparkles-web-renderer")[0].remove();
}catch{}
try{
document.getElementsByTagName("ytm-companion-ad-renderer")[0].remove();
}catch{}

/*Remove Open App*/
try{
document.querySelectorAll('a').forEach(a => {
if (a.href.indexOf("intent://") > -1) {
a.style.display = 'none';
}
});
}catch{}
/*Remove Promotion Element*/
try{document.getElementsByTagName("ytm-paid-content-overlay-renderer")[0].style.display="none";}catch{}




/*Hide Community Posts*/
if(localStorage.getItem("communityPosts") == "true"){

document.querySelectorAll("ytm-backstage-post-thread-renderer")?.forEach(el => el.remove());
  
}
 

/*Hide Shorts*/
if(localStorage.getItem("shorts") == "true"){


for( x in document.getElementsByClassName("big-shorts-singleton")){
try{document.getElementsByClassName("big-shorts-singleton")[x].remove();
}catch{}
}

for( x in document.getElementsByTagName("ytm-reel-shelf-renderer")){
try{document.getElementsByTagName("ytm-reel-shelf-renderer")[x].remove();
}catch{}

for( x in document.getElementsByTagName("ytm-shorts-lockup-view-model")){
try{document.getElementsByTagName("ytm-shorts-lockup-view-model")[x].remove();
}catch{}

}

}
}




}





//Add Maximize Gesture
function addMaxButton(){


var pElem=document.getElementById('player-container-id');
var Ve=document.getElementById('player');
var Vv=document.getElementsByClassName('video-stream')[0];



if(pElem === document.fullscreenElement){


try{
if(zoomIn){
Ve.style.transform=`scale(${scale})`;
}else{
Ve.style.transform="scale(1)";  
}
}catch{}


}else{
try{
Ve.style.transform="scale(1)";
}catch{}
}


}


async function extraSpeed(){
  var el=document.querySelector(".ytwVariableSpeedControllerViewModelButtonContainer");
 if(!el) return;
 
 
const slider = document.getElementById("slider");

if(slider.max==10) return;

slider.max = 10;
slider.ariaValueMax = "10";

slider.addEventListener("input", () => {
  const video = document.querySelector('.video-stream');
  if (video) video.playbackRate = parseFloat(slider.value);
});

if(el.children.length >= 6) el.children[0].remove();

if(!document.getElementById("10xSpeed")){

var elm=document.createElement("ytw-variable-speed-controller-speed-button-view-model");

elm.id="10xSpeed";
elm.className="ytwVariableSpeedControllerSpeedButtonViewModelHost ytwVariableSpeedControllerViewModelPlaybackSpeedButton";


elm.insertAdjacentHTML("beforeend",`<button-view-model class="ytSpecButtonViewModelHost"><button class="ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeS ytSpecButtonShapeNextEnableBackdropFilterExperiment" title="" aria-disabled="false" style=""><div class="ytSpecButtonShapeNextButtonTextContent ytSpecButtonShapeNextElevatedContent">10x</div><yt-touch-feedback-shape aria-hidden="true" class="ytSpecTouchFeedbackShapeHost ytSpecTouchFeedbackShapeTouchResponse"><div class="ytSpecTouchFeedbackShapeStroke"></div><div class="ytSpecTouchFeedbackShapeFill"></div></yt-touch-feedback-shape><yt-light-shape aria-hidden="true" class="contribYtLightShapeHost contribYtLightShapeStaticRimLight contribYtLightShapeStaticRimLightTonal" style="--yt-light-wash-opacity: 0; --yt-light-wash-x: 0px; --yt-light-wash-y: 0px; --yt-light-wash-size: 0px;"><div class="contribYtLightShapeStaticWashLight contribYtLightShapeStaticWashLightTonal" style=""></div></yt-light-shape></button></button-view-model>`);

elm.addEventListener("click", () => {
   // document.querySelector('.video-stream').playbackRate = 10;
    slider.value=10;
    slider.dispatchEvent(new Event("input", { bubbles: true }));

});

el.appendChild(elm);


}

}


//https://youtube.com/watch?v=SInH_fP0deQ



/*Mutation Observer*/
//as i have been developing Youtube Lite for almost 4 years now
//thus it still contains the code which i used when i was a
//totally noob in copy pasting , that time i wasn't aware of
//plenty of things and by which i used `setInterval` instead
//of mutation observer , i shall be optimizing the code in future
//releases but rn only a few code blocks will be in the observer

const targetNode = document.body;
const config = { childList: true, subtree: true };

const observer = new MutationObserver(() => {


//speed

extraSpeed(); 
  
//ads Block
adsBlock();


//mE button
addMaxButton();

//settingsTab
addSettingsTab();


try{
var video = document.getElementsByClassName('video-stream')[0];
if(video.getBoundingClientRect().height > video.getBoundingClientRect().width){
Android.fullScreen(true);
}
else{
Android.fullScreen(false);
}}
catch{}


});

// Start observing changes in the body
observer.observe(targetNode, config);





/*Update your app bruh*/


 

function runAutoUpdateCheck(){
 try{
  if(location.href!="https://m.youtube.com/" && location.href!="https://m.youtube.com") return;
  var last=parseInt(localStorage.getItem("ytlUpdChecked")||"0",10)||0;
  if(Date.now()-last <= 6*3600*1000) return;
  localStorage.setItem("ytlUpdChecked", String(Date.now()));
  fetchLatestRelease(function(rel){
    if(!rel) return;
    var latest=(rel.tag_name||rel.name||"").trim();
    if(latest && verGt(latest,Android.getInfo())) showUpdateDialog(rel);
  },function(){});
 }catch(e){}
}
if(document.readyState==="complete"){ setTimeout(runAutoUpdateCheck,1500); }
else { window.addEventListener("load",function(){ setTimeout(runAutoUpdateCheck,1500); }); }




document.addEventListener('click',(event) => {

let anchor = event.target.closest('a');
if (anchor){


if(anchor.href.includes("www.youtube.com/redirect")){

try{
document.getElementsByClassName('video-stream')[0].pause();
}catch{}

const url=new URL(anchor.href).searchParams.get("q");

setTimeout(()=>{Android.oplink(url)},50);

event.preventDefault();
event.stopPropagation(); 

}


}
},
true);

function showCurtain(){
  const el=document.createElement("div");
  Object.assign(el.style,{
    position:"fixed",
    zIndex:"9999999",
    width:"100%",
    height:"100%",
    top:0,
    left:0
  })
  el.id="ytProCurtain"
  document.body.appendChild(el)
}

  function hideCurtain(){
    document.getElementById("ytProCurtain")?.remove()
  }

}
