/**
 * Adapter-authored page scripts for the controlled SAP runtime (SPIKE-001).
 *
 * Every export is a JS *expression* evaluated by the native host inside the SAP
 * webview through the WebView2 execute-script completion channel. Scripts are
 * bundled constants — never built from SAP content, logs or user input beyond
 * JSON-literal parameters. SAP page text is treated strictly as data.
 *
 * Security invariants enforced in the scripts themselves:
 * - password/token field values are never serialized (`__fieldValue` masks them);
 * - cookie *values* are never read — only cookie *accessibility* is probed;
 * - text/field collections are capped so payloads stay bounded.
 */

/**
 * Shared helpers injected into every script. They also walk same-origin
 * frames (`__docs`), which is exactly the evidence SPIKE-001 needs about
 * iframe/frame access restrictions.
 */
const HELPERS = String.raw`
function __docs(){var l=[document];for(var i=0;i<l.length&&i<64;i++){try{var f=l[i].querySelectorAll('iframe,frame');for(var j=0;j<f.length;j++){var d=f[j].contentDocument;if(d&&l.indexOf(d)<0)l.push(d);}}catch(e){}}return l;}
function __frameReport(){var out=[];try{var f=document.querySelectorAll('iframe,frame');for(var j=0;j<f.length;j++){var e=f[j];var accessible=false;try{accessible=!!e.contentDocument&&!!e.contentDocument.location;}catch(x){accessible=false;}out.push({tag:String(e.tagName||'').toLowerCase(),src:String(e.getAttribute('src')||'').slice(0,200),accessible:accessible});}}catch(x){}return out;}
function __focus(d){return d?d.activeElement:null;}
function __vis(e){try{var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}catch(x){return true;}}
function __txt(e){return String((e.textContent||'')+'').replace(/\s+/g,' ').trim().slice(0,200);}
function __isPassword(el){return String(el.type||'').toLowerCase()==='password'||String(el.type||'').toLowerCase()==='hidden';}
function __fieldValue(el){if(__isPassword(el))return '';var v=el.value;if(v==null)v='';return String(v).slice(0,200);}
function __serField(el,fi){var masked=__isPassword(el);var v=__fieldValue(el);return {tagName:String(el.tagName||'').toLowerCase(),inputType:el.type?String(el.type):undefined,id:el.id||undefined,name:el.name?String(el.name):undefined,value:masked?'':v,masked:masked,focused:!!(el.ownerDocument&&el.ownerDocument.activeElement===el),disabled:!!el.disabled,frameIndex:fi};}
function __setNative(el,val){var proto=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;var s=Object.getOwnPropertyDescriptor(proto,'value');if(s&&s.set)s.set.call(el,val);else el.value=val;}
function __isRfuiDoc(d){try{var h=(d.documentElement&&d.documentElement.innerHTML||'').slice(0,80000).toLowerCase();return h.indexOf('sap start')>=0||h.indexOf('rfui')>=0||h.indexOf('/sap/bc/bsp')>=0||h.indexOf('netweaver')>=0;}catch(e){return false;}}
function __hash(s){try{if(window.crypto&&crypto.subtle&&s.length<200000){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return 'sha-'+Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2);}).join('').slice(0,32);});}}catch(e){}var n=5381;for(var i=0;i<s.length;i++){n=((n<<5)+n+s.charCodeAt(i))>>>0;}return Promise.resolve('fnv-'+n.toString(16)+'-'+s.length);}
`;

function script(body: string): string {
  return `(async function(){${HELPERS}\n${body}\n})()`;
}

/**
 * Substitutes every `__ARG__` occurrence with a JSON literal (safe for any string
 * content). `replace()` with a string pattern only rewrites the first occurrence,
 * which measured as `ReferenceError: __ARG__ is not defined` in the page — bodies
 * legitimately reference the argument more than once.
 */
function withArg(body: string, arg: unknown): string {
  return script(body).replaceAll("__ARG__", JSON.stringify(arg ?? null));
}

/** EXP-002/EXP-003 evidence: session/auth observation. Cookie values are never read. */
export const sessionStateScript = script(String.raw`
var docs=__docs();var hasPwd=false;var rfui=false;
for(var i=0;i<docs.length;i++){try{if(docs[i].querySelector('input[type=password]'))hasPwd=true;if(__isRfuiDoc(docs[i]))rfui=true;}catch(e){}}
var cookiesAccessible=false;try{document.cookie='__spike_probe=1;path=/';cookiesAccessible=document.cookie.indexOf('__spike_probe')>=0;document.cookie='__spike_probe=;path=/;max-age=0';}catch(e){cookiesAccessible=false;}
var path=String(location.pathname||'').toLowerCase();
var logonMarker=path.indexOf('logon')>=0||path.indexOf('/sap/public/info')>=0||path.indexOf('sso2')>=0;
var authState='unknown';
if(rfui&&!hasPwd)authState='authenticated';
else if(hasPwd||logonMarker)authState='login-form';
else if(path!=='')authState='unauthenticated';
return {url:String(location.href||''),origin:String(location.origin||''),title:String(document.title||''),readyState:document.readyState,authState:authState,cookiesAccessible:cookiesAccessible,frameCount:docs.length,frames:__frameReport(),rfui:rfui,hasPasswordField:hasPwd,pageType:rfui?'rfui':((hasPwd||logonMarker)?'logon':'other')};
`);

/** EXP-004: focused input metadata across same-origin frames. */
export const activeFieldScript = script(String.raw`
var docs=__docs();
for(var i=0;i<docs.length;i++){var el=__focus(docs[i]);
  if(el&&/^(input|textarea)$/i.test(String(el.tagName||''))){
    var f=__serField(el,i);
    return {present:true,tagName:f.tagName,id:f.id,name:f.name,inputType:f.inputType,frameIndex:i,valuePresent:String(f.value).length>0,valueLength:String(f.value).length,masked:f.masked};
  }
  if(el&&el.isContentEditable){return {present:true,tagName:String(el.tagName||'').toLowerCase(),frameIndex:i,valuePresent:false,valueLength:0,masked:false};}}
return {present:false,frameIndex:-1,valuePresent:false,valueLength:0,masked:false};
`);

/** EXP-005: scanner-equivalent injection — exactly one input + one change event. */
export function buildInjectScript(value: string): string {
  return withArg(
    String.raw`
var value=(__ARG__&&typeof __ARG__.value==='string')?__ARG__.value:null;
if(value===null)return {applied:false,reason:'no-value',frameIndex:-1,inputEvents:0,changeEvents:0,valueLengthAfter:0};
var docs=__docs();var el=null;var fi=-1;
for(var i=0;i<docs.length;i++){var a=__focus(docs[i]);if(a&&/^(input|textarea)$/i.test(String(a.tagName||''))){el=a;fi=i;break;}}
if(!el)return {applied:false,reason:'no-active-field',frameIndex:-1,inputEvents:0,changeEvents:0,valueLengthAfter:0};
var inputEvents=0;var changeEvents=0;
el.addEventListener('spike-count-input',function(){inputEvents++;});
el.addEventListener('spike-count-change',function(){changeEvents++;});
try{el.focus();}catch(e){}
__setNative(el,value);
el.dispatchEvent(new Event('input',{bubbles:true}));
el.dispatchEvent(new Event('spike-count-input',{bubbles:false}));
el.dispatchEvent(new Event('change',{bubbles:true}));
el.dispatchEvent(new Event('spike-count-change',{bubbles:false}));
return {applied:true,inputEvents:inputEvents,changeEvents:changeEvents,valueLengthAfter:String(el.value==null?'':el.value).length,frameIndex:fi,elementId:el.id||undefined};
`,
    { value },
  );
}

const KEY_DEFINITIONS: Record<string, { code: string; keyCode: number }> = {
  Enter: { code: "NumpadEnter", keyCode: 13 },
  Escape: { code: "Escape", keyCode: 27 },
  F1: { code: "F1", keyCode: 112 },
  F2: { code: "F2", keyCode: 113 },
  F3: { code: "F3", keyCode: 114 },
  F4: { code: "F4", keyCode: 115 },
  F5: { code: "F5", keyCode: 116 },
  F6: { code: "F6", keyCode: 117 },
  F7: { code: "F7", keyCode: 118 },
  F8: { code: "F8", keyCode: 119 },
  F9: { code: "F9", keyCode: 120 },
  F10: { code: "F10", keyCode: 121 },
  F11: { code: "F11", keyCode: 122 },
  F12: { code: "F12", keyCode: 123 },
};

/** EXP-006/EXP-007: keyboard event delivery to the focused field (synthetic). */
export function keyScript(key: string): string {
  const definition = KEY_DEFINITIONS[key] ?? { code: key, keyCode: 0 };
  return withArg(
    String.raw`
var k=__ARG__;
var docs=__docs();var el=null;var fi=-1;
for(var i=0;i<docs.length;i++){var a=__focus(docs[i]);if(a&&a!==docs[i].body&&a!==docs[i].documentElement){el=a;fi=i;break;}}
function mk(type,doc,target){var ev=new doc.KeyboardEvent(type,{key:k.key,code:k.code,charCode:0,keyCode:k.keyCode,which:k.keyCode,cancelable:type!=='keyup',bubbles:true});try{Object.defineProperty(ev,'keyCode',{get:function(){return k.keyCode;}});Object.defineProperty(ev,'which',{get:function(){return k.keyCode;}});}catch(x){}return ev;}
var targets=[];
if(el&&el.ownerDocument)targets.push([el,el.ownerDocument]);
for(var d=0;d<docs.length;d++){var root=docs[d].body||docs[d].documentElement;if(root)targets.push([root,docs[d]]);}
var types=['keydown','keypress','keyup'];var dispatched=0;var lastPrevented=null;
for(var t=0;t<targets.length;t++){for(var y=0;y<types.length;y++){try{var r=targets[t][0].dispatchEvent(mk(types[y],targets[t][1],targets[t][0]));dispatched++;if(t===0)lastPrevented=(r===false);}catch(x){}}}
return {delivered:dispatched>0,target:el?String(el.tagName||'').toLowerCase():'document',synthetic:true,frameIndex:fi,key:k.key,dispatchedEvents:dispatched,defaultPreventedOnTarget:lastPrevented===true};
`,
    { key, code: definition.code, keyCode: definition.keyCode },
  );
}

/**
 * EXP-006/EXP-007 instrumentation: install a capturing keydown/keyup counter in
 * every reachable document. `isTrusted` is what separates the synthetic DOM path
 * from a real OS-level keystroke, so the spike can state which channel SAP acted
 * on. Idempotent: an already-watched document keeps its counters.
 */
export const keyWatchScript = script(String.raw`
var docs=__docs();var installed=0;
function attach(d,ix){d.__spikeKeys={self:ix,down:0,up:0,trusted:0,prevented:0,lastCode:'',lastTarget:'',lastTrusted:false};
d.addEventListener('keydown',function(e){var k=d.__spikeKeys;if(!k)return;k.down++;k.lastCode=String(e.code||e.key||'');k.lastTarget=String((e.target&&e.target.tagName)||'');if(e.isTrusted){k.trusted++;k.lastTrusted=true;}},true);
d.addEventListener('keydown',function(e){var k=d.__spikeKeys;if(k&&e.defaultPrevented)k.prevented++;},false);
d.addEventListener('keyup',function(e){var k=d.__spikeKeys;if(k)k.up++;},true);installed++;}
for(var i=0;i<docs.length;i++){try{if(!docs[i].__spikeKeys)attach(docs[i],i);}catch(e){}}
return {installed:installed,frames:docs.length};
`);

/** EXP-006/EXP-007 evidence: read back the trusted-key counters. */
export const keyCountersScript = script(String.raw`
var docs=__docs();var out={watched:0,down:0,up:0,trusted:0,prevented:0,lastCode:'',lastTarget:'',lastTrusted:false,lastFrame:-1};
for(var i=0;i<docs.length;i++){var k=docs[i].__spikeKeys;if(!k)continue;
out.watched++;out.down+=Number(k.down)||0;out.up+=Number(k.up)||0;out.trusted+=Number(k.trusted)||0;out.prevented+=Number(k.prevented)||0;
if(k.lastCode){out.lastCode=String(k.lastCode);out.lastTarget=String(k.lastTarget||'');}
if(k.lastTrusted){out.lastTrusted=true;out.lastFrame=Number(k.self)||0;}}
return out;
`);

/** EXP-008: normalized screen snapshot; password values are never serialized. */
export const screenStateScript = script(String.raw`
var docs=__docs();var fields=[];var buttons=[];var texts=[];var seenText={};
function pushText(s){s=String(s||'').trim();if(!s||seenText[s])return;if(Object.keys(seenText).length>=120)return;seenText[s]=1;texts.push(s.slice(0,200));}
for(var i=0;i<docs.length;i++){var d=docs[i];
  try{
    var els=d.querySelectorAll('input:not([type=hidden]),textarea');
    for(var j=0;j<els.length&&fields.length<160;j++){if(__vis(els[j]))fields.push(__serField(els[j],i));}
    var ctl=d.querySelectorAll('button,a[href],input[type=button],input[type=submit],label');
    for(var c=0;c<ctl.length&&buttons.length<160;c++){var e2=ctl[c];var tx=__txt(e2)||(e2.value?String(e2.value):'');if(!tx||!__vis(e2))continue;var tag=e2.tagName.toLowerCase();var kind=tag==='a'?'link':(tag==='label'?'label':'button');buttons.push({kind:kind,text:tx.slice(0,200),id:e2.id||undefined,frameIndex:i});}
    pushText(String(d.title||''));
    var body=d.body;if(!body)continue;
    var walk=body.querySelectorAll('div,span,p,td,th,caption,legend,h1,h2,h3,h4,option');
    var cap=Math.min(walk.length,4000);
    for(var w=0;w<cap&&texts.length<100;w++){var n=walk[w];if(!n.childNodes)continue;var own='';for(var q=0;q<n.childNodes.length;q++){var cn=n.childNodes[q];if(cn.nodeType===3)own+=cn.nodeValue;}pushText(own);}
  }catch(e){}
}
var sigParts=String(location.href||'')+'|';
for(var f=0;f<fields.length;f++){var ff=fields[f];sigParts+=(ff.id||'')+','+(ff.name||'')+','+(ff.inputType||'')+','+(ff.masked?'#'+String(ff.value).length:String(ff.value).slice(0,64))+';';}
sigParts+='|';
for(var b=0;b<buttons.length;b++){sigParts+=String(buttons[b].text).slice(0,64)+';';}
sigParts+='|'+texts.slice(0,40).join('#');
var signature=await __hash(sigParts);
return {url:String(location.href||''),origin:String(location.origin||''),title:String(document.title||''),texts:texts,fields:fields,buttons:buttons,signature:signature,frameCount:docs.length,frames:__frameReport()};
`);

/**
 * EXP-011 + same-origin/CSP investigation: same-origin request from inside the
 * controlled runtime. Reports normalized status and security-relevant response
 * headers; never reads cookie values and never returns response bodies.
 */
export function probeScript(url: string): string {
  return withArg(
    String.raw`
var raw=__ARG__===null?null:String(__ARG__.url);
function header(res,name){try{return res.headers.get(name);}catch(e){return null;}}
function securityHeaders(res){var hs={};try{['content-security-policy','content-security-policy-report-only','x-frame-options','server','cache-control'].forEach(function(h){var v=header(res,h);if(v)hs[h]=String(v).slice(0,300);});}catch(e){}return hs;}
function markerList(text){var markers=[];[['sap-start','sap start'],['sap-netweaver','sap netweaver'],['rfui','rfui'],['bsp-path','/sap/bc/bsp'],['logon-form','<form'],['logon-path','logon'],['unavailable','service unavailable'],['internal-error','internal server error'],['session-expired','session']].forEach(function(m){if(text.indexOf(m[1])>=0)markers.push(m[0]);});return markers;}
var out={probeUrl:String(raw||'').slice(0,200),runtimeOrigin:String(location.origin||''),sameOrigin:false,reachable:false,status:0,headers:{},metaHeaders:{},markers:[]};
if(!raw||!/^https?:\/\//i.test(raw))return {__backend:'invalid-url',message:'probe URL must be http(s): '+String(raw).slice(0,120)};
try{out.sameOrigin=(new URL(raw).origin===location.origin);}catch(e){out.sameOrigin=false;}
function metaCsp(){var m={};try{var mds=document.querySelectorAll('meta[http-equiv]');for(var i=0;i<mds.length;i++){var key=String(mds[i].getAttribute('http-equiv')||'').toLowerCase();if(key==='content-security-policy'||key==='x-frame-options')m[key]=String(mds[i].getAttribute('content')||'').slice(0,300);}}catch(e){}return m;}
try{
var controller=new AbortController();var timer=setTimeout(function(){controller.abort();},12000);
var res=await fetch(raw,{credentials:'include',redirect:'follow',signal:controller.signal});
clearTimeout(timer);
var text='';try{text=(await res.text()||'').toLowerCase().slice(0,40000);}catch(e){}
out.reachable=true;out.finalUrl=String(res.url||'');out.status=typeof res.status==='number'?res.status:0;out.responseType=String(res.type||'');
out.headers=securityHeaders(res);out.metaHeaders=metaCsp();out.markers=markerList(text);
if(out.status===401||out.status===403){out.errorCategory='auth-required';out.errorMessage='HTTP '+out.status;}
else if(out.status>=500){out.errorCategory='service-unavailable';out.errorMessage='HTTP '+out.status;}
else if(!res.ok&&res.type!=='opaque'){out.errorCategory='unknown';out.errorMessage='HTTP '+out.status;}
return out;
}catch(err){
var message=String((err&&(err.message||err.name))||err);
if(out.sameOrigin){
  if(/certificate|ssl|tls|err_cert/i.test(message))return {__backend:'certificate-error',message:'TLS certificate failure for '+String(raw).slice(0,160)};
  return {__backend:'sap-unavailable',message:'same-origin request to '+String(raw).slice(0,160)+' failed: '+message.slice(0,160)};
}
out.reachable=false;out.errorCategory='unknown';
out.errorMessage='cross-origin probe blocked or unreachable (same-origin only from runtime): '+message.slice(0,160);
out.metaHeaders=metaCsp();
return out;
}
`,
    { url },
  );
}

/** Runtime identity/CSP observation helper (same-origin investigation). */
export const capabilitiesScript = script(String.raw`
var cspMeta=null;try{var m=document.querySelector('meta[http-equiv="Content-Security-Policy" i]');cspMeta=m?String(m.getAttribute('content')||'').slice(0,300):null;}catch(e){}
var canWriteDom=false;try{var s=document.createElement('div');s.setAttribute('data-spike','1');canWriteDom=true;}catch(e){}
return {url:String(location.href||''),origin:String(location.origin||''),title:String(document.title||''),readyState:document.readyState,frameCount:__docs().length,frames:__frameReport(),userAgent:String(navigator.userAgent||'').slice(0,220),hasRfuiMarkers:__isRfuiDoc(document),cspMeta:cspMeta,domReadable:!!document.documentElement,domWritable:canWriteDom,referrer:String(document.referrer||'').slice(0,200)};
`);

/** EXP-009: DOM-mutation based navigation signal (installed once per page). */
export const installMutationWatchScript = script(String.raw`
if(!window.__spikeWatch){
window.__spikeWatch={mutations:0,lastChangeUrl:'',title:String(document.title||''),target:''};
try{
var target=document.body||document.documentElement;
window.__spikeWatch.target=String((target&&target.tagName)||'');
new MutationObserver(function(list){window.__spikeWatch.mutations+=list.length;window.__spikeWatch.lastChangeUrl=String(location.href||'');window.__spikeWatch.title=String(document.title||'');}).observe(target,{childList:true,subtree:true,attributes:true,characterData:true});
}catch(e){window.__spikeWatch.error=String(e&&e.message||e);}
}
window.__spikeWatch.mutations=0;
return {installed:true,target:window.__spikeWatch.target,frameUrl:String(location.href||'')};
`);

export const readMutationWatchScript = script(String.raw`
var w=window.__spikeWatch||null;
if(!w)return {installed:false,mutations:0,url:String(location.href||''),title:String(document.title||'')};
return {installed:true,mutations:Number(w.mutations||0),url:String(location.href||w.lastChangeUrl||''),title:String(w.title||document.title||''),error:w.error||undefined};
`);
