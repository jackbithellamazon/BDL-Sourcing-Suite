/* ============================================================================
   auth.js — signing in, b126 (Jack, 20 Sep: "you need to do logins ... logins should local browser
   save ... they should be under my login so I can send them links again").

   HOW IT WORKS. Supabase sends a one-click link to the person's email. No passwords exist, so
   nothing to forget, nothing to type, and nobody ever hands a credential to anyone. The accounts
   live in Jack's own Supabase project, so he creates them, re-sends a link, or removes someone,
   from the dashboard he already has.

   The session is kept in this browser (localStorage), so a VA signs in once on her machine and
   stays signed in; the tokens refresh themselves.

   WHAT THIS BUILD DOES AND DOES NOT DO. Signing in decides WHO YOU ARE — it replaces picking a
   name from a list, so a verdict can no longer carry the wrong person. It does NOT yet decide what
   you can read: every data call still uses the shared key exactly as before, so if the sign-in
   ever fails nothing stops working. Locking rows to a person is a second, careful step, done in
   Supabase one table at a time (see the handover file, 20 Sep).

   BEFORE IT CAN WORK, two things in the Supabase dashboard, both Jack's:
     1. Authentication -> URL configuration: add the live app URL to Redirect URLs.
     2. Authentication -> Users -> Invite user: one invite each for Suz and Mera.
   Until then the app behaves exactly as it does today: pick a name and carry on.
   ============================================================================ */
const AUTH_KEY='bdl-sourcing-session';
/* who an address belongs to. An address not listed reads its name from the part before the @. */
const AUTH_NAMES={'jackbithellamazon@gmail.com':'Jack'};
function authBase(){return(typeof CLOUD!=='undefined'&&CLOUD.url?CLOUD.url:'')+'/auth/v1';}
function authKey(){return(typeof CLOUD!=='undefined'&&CLOUD.key)||'';}
function authSession(){const s=lsGet(AUTH_KEY,null);return(s&&s.access_token)?s:null;}
function authClear(){try{localStorage.removeItem(AUTH_KEY);}catch(e){}}
function authNameFor(email,meta){const e=(email||'').toLowerCase();
  if(meta&&meta.name)return meta.name;
  if(AUTH_NAMES[e])return AUTH_NAMES[e];
  const who=(typeof USERS!=='undefined'?USERS:[]).find(u=>e.startsWith(u.toLowerCase()));if(who)return who;
  const part=e.split('@')[0].replace(/[._-]+/g,' ').trim();return part?part[0].toUpperCase()+part.slice(1):'';}
function authUser(){const s=authSession();return s&&s.user?s.user:null;}
function authedName(){const u=authUser();return u?u.name:'';}
/* send the one-click link */
async function authSendLink(email){
  const r=await fetch(authBase()+'/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),
    {method:'POST',headers:{apikey:authKey(),'Content-Type':'application/json'},
     body:JSON.stringify({email:String(email||'').trim().toLowerCase(),create_user:false})});
  if(!r.ok){let msg='';try{const j=await r.json();msg=j.msg||j.error_description||j.message||'';}catch(e){}
    throw new Error(msg||('Supabase said no ('+r.status+')'));}
  return true;}
/* the link comes back as #access_token=…&refresh_token=… — take it, store it, tidy the address bar */
async function authFromHash(){const h=location.hash||'';if(!/access_token=/.test(h))return false;
  const q={};h.replace(/^#/,'').split('&').forEach(p=>{const i=p.indexOf('=');if(i>0)q[decodeURIComponent(p.slice(0,i))]=decodeURIComponent(p.slice(i+1));});
  if(!q.access_token)return false;
  const ok=await authStore({access_token:q.access_token,refresh_token:q.refresh_token,expires_in:+q.expires_in||3600});
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  return ok;}
async function authStore(tok){
  const r=await fetch(authBase()+'/user',{headers:{apikey:authKey(),Authorization:'Bearer '+tok.access_token}});
  if(!r.ok)return false;const u=await r.json();
  lsSet(AUTH_KEY,{access_token:tok.access_token,refresh_token:tok.refresh_token,at:Date.now(),expires_in:tok.expires_in||3600,
    user:{id:u.id,email:u.email,name:authNameFor(u.email,u.user_metadata)}});
  return true;}
/* tokens last an hour; renew quietly when the app opens */
async function authRefresh(){const s=authSession();if(!s||!s.refresh_token)return false;
  if(Date.now()-s.at<(s.expires_in-300)*1000)return true;
  try{const r=await fetch(authBase()+'/token?grant_type=refresh_token',
      {method:'POST',headers:{apikey:authKey(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
    if(!r.ok){authClear();return false;}
    const j=await r.json();return await authStore({access_token:j.access_token,refresh_token:j.refresh_token,expires_in:j.expires_in});}
  catch(e){return true;}}
function authSignOut(){const n=authedName();authClear();if(typeof lsSet==='function')lsSet(ME_KEY,'');
  if(typeof whoPaint==='function')whoPaint();if(typeof paintJackOnly==='function')paintJackOnly();
  if(typeof toast==='function')toast(n?'Signed out of '+n:'Signed out');
  if(typeof whoGate==='function')whoGate(true);}
/* on load: take a link if one just arrived, keep the session fresh, and set the name from it */
async function authBoot(){
  try{await authFromHash();}catch(e){}
  try{await authRefresh();}catch(e){}
  const n=authedName();
  if(n){if(typeof lsSet==='function'&&typeof me==='function'&&me()!==n)lsSet(ME_KEY,n);
    if(typeof whoPaint==='function')whoPaint();if(typeof paintJackOnly==='function')paintJackOnly();
    if(typeof whoGate==='function')whoGate(false);}
  return n;}
