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
     2. Authentication -> Users -> Add user -> Create new user (Auto Confirm) for Jack, Suz and Mera (b155: not Invite — that email lands on the project's main URL).
   Until then the app behaves exactly as it does today: pick a name and carry on.
   ============================================================================ */
const AUTH_KEY='bdl-sourcing-session';
/* who an address belongs to. An address not listed reads its name from the part before the @. */
const AUTH_NAMES={'jackbithellamazon@gmail.com':'Jack'};
/* ============================================================================
   b153 — THE LOCK (Jack, 25 Sep: "build it then please" — "I want to put a lock in so everyone has to log in, and a magic link
   to send my VAs instead of them logging in"; "ideally I log in with just my login, then a magic link so it's all good on their
   side and saves logging in and out").

   · TEAM   Jack types each person's email once, in Settings. The name on every verdict comes from that list — never from a
            dropdown — so nobody can pick someone else's name any more. Shared, so every browser knows who is who.
   · SIGNED IN   each browser writes one line when its person signs in, so Jack can see who is in before he locks the door.
   · THE LOCK   a switch in Settings, Jack's only, and it will not turn on unless Jack is signed in on that browser himself —
            so he can never lock himself out. When it is on, a browser with nobody signed in sees the sign-in screen and
            nothing else. Anyone already signed in keeps working even if Supabase is down: the session lives in their browser.

   It is a FRONT DOOR, not a vault: the database key is in the page source like every app on this Supabase project, so it stops
   the wrong name, a VA seeing the other's work, and a stranger with the link — not somebody technical with dev tools. Locking
   the tables themselves is a separate step. On localhost (the test sandbox) the lock is always off.
   ============================================================================ */
const TEAM_KEY='bdl-sourcing-team',LOCK_KEY='bdl-sourcing-lock',SIGNIN_KEY='bdl-sourcing-signins';
function teamAll(){const t=lsGet(TEAM_KEY,null);
  const base=[{name:'Jack',email:'jackbithellamazon@gmail.com'},{name:'Suz',email:''},{name:'Mera',email:''}];
  if(!Array.isArray(t))return base;
  return base.map(b=>Object.assign({},b,t.find(x=>x&&x.name===b.name)||{}));}
function teamSave(list){if(guestOn()){toast('Guest mode — the Team list is not changed from here. Leave guest mode first.',true);return;}lsSet(TEAM_KEY,list);if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('team',list)]);}
function teamNameFor(email){const e=String(email||'').trim().toLowerCase();if(!e)return'';const t=teamAll().find(x=>(x.email||'').trim().toLowerCase()===e);return t?t.name:'';}
function signinsAll(){return lsGet(SIGNIN_KEY,{})||{};}
function signinRecord(name,email){if(!name)return;const all=signinsAll();all[name]={at:new Date().toISOString(),email:email||''};lsSet(SIGNIN_KEY,all);
  /* one row per person, so two people signing in at once can never overwrite each other */
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('signin:'+name,all[name])]);}
function lockSandbox(){return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&!lsGet('bdl-sourcing-lock-test',false);}
function lockState(){return lsGet(LOCK_KEY,{on:false})||{on:false};}
function lockOn(){return !!lockState().on&&!lockSandbox();}
function lockSet(on){const n=authedName();
  if(guestOn()){toast('Guest mode — the lock is not changed from here. Leave guest mode first.',true);return false;}
  if(on&&n!=='Jack'){toast('Sign in as Jack on this browser first — otherwise the lock could shut you out',true);return false;}
  const v={on:!!on,by:n||me()||'',at:new Date().toISOString()};lsSet(LOCK_KEY,v);
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('lock',v)]);
  lockCheck();return true;}
/* the front door: nobody signed in + lock on = the sign-in screen and nothing else */
function lockCheck(){const on=lockOn(),n=authedName();
  if(on&&n&&!guestOn()&&typeof me==='function'&&me()!==n&&typeof lsSet==='function')lsSet(ME_KEY,n);   /* signed in = that is who you are (guest mode may view as anyone — nothing saves) */
  const shut=on&&!n;document.documentElement.classList.toggle('locked',shut);
  let el=document.getElementById('lockScreen');
  if(!shut){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement('div');el.id='lockScreen';el.className='lockscreen';document.body.appendChild(el);
    el.addEventListener('click',async e=>{const b=e.target.closest('#lkSend');if(!b)return;
      const i=document.getElementById('lkEmail'),m=document.getElementById('lkMsg'),v=(i.value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){m.textContent='That does not look like an email address.';m.className='lkmsg bad';return;}
      b.disabled=true;b.textContent='Sending…';m.textContent='';
      try{await authSendLink(v);m.innerHTML=`Check <b>${escapeHtml(v)}</b> — open the link on this computer and you're in.`;m.className='lkmsg good';}
      catch(err){m.textContent=/not allowed|not found|signups/i.test(String(err.message||''))?'That address has not been invited yet — ask Jack.':String(err.message||err);m.className='lkmsg bad';}
      b.disabled=false;b.textContent='Send me a link';});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='lkEmail'){e.preventDefault();document.getElementById('lkSend').click();}});}
  el.hidden=false;
  el.innerHTML=`<div class="lkcard"><div class="lklogo"><span class="lkmark"></span><b>BDL</b> <em>Sourcing</em></div>
    <h1>Sign in to carry on</h1><p>Type your work email and we'll send you a one-click link. No password, and it keeps you signed in on this computer.</p>
    <div class="lkrow"><input type="email" id="lkEmail" placeholder="you@…" autocomplete="email" spellcheck="false" autofocus><button type="button" class="btn primary" id="lkSend">Send me a link</button></div>
    <div class="lkmsg" id="lkMsg"></div></div>`;
  setTimeout(()=>{const i=document.getElementById('lkEmail');if(i)i.focus();},60);}
function authBase(){return(typeof CLOUD!=='undefined'&&CLOUD.url?CLOUD.url:'')+'/auth/v1';}
function authKey(){return(typeof CLOUD!=='undefined'&&CLOUD.key)||'';}
function authSession(){const s=lsGet(AUTH_KEY,null);return(s&&s.access_token)?s:null;}
function authClear(){try{localStorage.removeItem(AUTH_KEY);}catch(e){}}
function authNameFor(email,meta){const e=(email||'').toLowerCase();
  const t=teamNameFor(e);if(t)return t;   /* b153: the Team list Jack keeps in Settings is the truth */
  if(meta&&meta.name)return meta.name;
  if(AUTH_NAMES[e])return AUTH_NAMES[e];
  const who=(typeof USERS!=='undefined'?USERS:[]).find(u=>e.startsWith(u.toLowerCase()));if(who)return who;
  const part=e.split('@')[0].replace(/[._-]+/g,' ').trim();return part?part[0].toUpperCase()+part.slice(1):'';}
function authUser(){const s=authSession();return s&&s.user?s.user:null;}
function authedName(){const u=authUser();return u?u.name:'';}
/* send the one-click link */
async function authSendLink(email){
  /* b155: guest mode sends nothing to anyone — a sign-in email is a real email */
  if(guestOn()){const e=new Error('Guest mode — no sign-in links are sent. Leave guest mode first.');throw e;}
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
  const nm=authNameFor(u.email,u.user_metadata);
  const first=!authSession();
  lsSet(AUTH_KEY,{access_token:tok.access_token,refresh_token:tok.refresh_token,at:Date.now(),expires_in:tok.expires_in||3600,
    user:{id:u.id,email:u.email,name:nm}});
  if(first)signinRecord(nm,u.email);   /* b153: Jack's Team list shows who is in */
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
  if(typeof lockCheck==='function')lockCheck();
  if(typeof whoPaint==='function')whoPaint();if(typeof paintJackOnly==='function')paintJackOnly();
  if(typeof toast==='function')toast(n?'Signed out of '+n:'Signed out');
  if(typeof whoGate==='function')whoGate(true);}
/* on load: take a link if one just arrived, keep the session fresh, and set the name from it */
async function authBoot(){
  try{await authFromHash();}catch(e){}
  try{await authRefresh();}catch(e){}
  const n=authedName();
  if(n){if(!guestOn()&&typeof lsSet==='function'&&typeof me==='function'&&me()!==n)lsSet(ME_KEY,n);
    if(typeof whoPaint==='function')whoPaint();if(typeof paintJackOnly==='function')paintJackOnly();
    if(typeof whoGate==='function')whoGate(false);}
  lockCheck();
  return n;}
