export function renderMayaPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0b0c">
<meta name="description" content="Hired AI with Maya: a conversational career operating system for starting, transitioning, finding work, interviewing, negotiating, and advancing.">
<title>Hired AI — Maya</title>
<style>
:root{color-scheme:dark;--bg:#0b0b0c;--rail:#111113;--surface:#19191c;--surface2:#212126;--hover:#29292f;--line:#303036;--text:#f4f4f5;--muted:#a1a1aa;--soft:#d4d4d8;--accent:#fff;--good:#8bd6a8;--bad:#f5a1a1;--shadow:0 18px 60px rgba(0,0,0,.35)}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}button,input,textarea{font:inherit}.hidden{display:none!important}button{cursor:pointer}.iconBtn,.ghost,.chip,.actionBtn{border:0;color:var(--text);background:transparent}.public{min-height:100vh;display:grid;place-items:center;padding:28px}.publicInner{width:min(900px,100%);text-align:center}.brand{display:inline-flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.02em}.logo{width:34px;height:34px;border-radius:10px;background:#fff;color:#0b0b0c;display:grid;place-items:center;font-weight:950}.public h1{font-size:clamp(44px,7vw,78px);line-height:1.01;letter-spacing:-.055em;margin:42px auto 18px;max-width:850px}.public p{max-width:700px;margin:0 auto;color:var(--muted);font-size:18px;line-height:1.65}.publicComposer{max-width:760px;margin:36px auto 15px;border:1px solid var(--line);background:var(--surface);border-radius:24px;padding:12px;box-shadow:var(--shadow);text-align:left}.publicComposer textarea{width:100%;min-height:72px;border:0;outline:0;resize:none;background:transparent;color:var(--text);padding:8px 10px;font-size:16px}.publicActions{display:flex;align-items:center;justify-content:space-between;gap:10px}.primary{border:0;background:#fff;color:#111;padding:10px 16px;border-radius:12px;font-weight:750}.secondary{border:1px solid var(--line);background:transparent;color:var(--text);padding:10px 16px;border-radius:12px}.promptRow{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px}.prompt{border:1px solid var(--line);background:transparent;color:var(--soft);border-radius:999px;padding:9px 13px;font-size:13px}.prompt:hover{background:var(--surface)}.publicFine{margin-top:24px;color:#71717a;font-size:12px;line-height:1.6}.app{min-height:100vh}.rail{position:fixed;inset:0 auto 0 0;width:260px;background:var(--rail);border-right:1px solid #202024;padding:12px;display:flex;flex-direction:column;z-index:30}.railBrand{display:flex;align-items:center;gap:10px;padding:8px 8px 16px;font-weight:800}.newThread{width:100%;border:0;background:transparent;color:var(--text);padding:11px 12px;border-radius:10px;text-align:left;font-weight:650}.newThread:hover{background:var(--hover)}.railHint{padding:12px;color:#71717a;font-size:11px;line-height:1.55}.railBottom{margin-top:auto}.accountBtn{width:100%;border:0;background:transparent;color:var(--soft);padding:10px;border-radius:10px;text-align:left}.accountBtn:hover{background:var(--hover)}.chat{margin-left:260px;min-height:100vh}.topbar{height:58px;position:sticky;top:0;z-index:20;background:rgba(11,11,12,.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid rgba(48,48,54,.45)}.topTitle{font-weight:700}.status{font-size:11px;color:var(--muted)}.thread{max-width:790px;margin:0 auto;padding:38px 20px 180px}.emptyState{text-align:center;padding:12vh 0 20px}.mayaOrb{width:58px;height:58px;border-radius:18px;background:#fff;color:#111;display:grid;place-items:center;margin:0 auto 18px;font-size:20px;font-weight:950}.emptyState h2{font-size:30px;letter-spacing:-.035em;margin:0 0 10px}.emptyState p{color:var(--muted);line-height:1.65;max-width:620px;margin:0 auto 24px}.suggestions{display:grid;grid-template-columns:1fr 1fr;gap:9px;max-width:720px;margin:0 auto}.suggestion{border:1px solid var(--line);background:transparent;color:var(--soft);padding:13px 14px;border-radius:14px;text-align:left}.suggestion:hover{background:var(--surface)}.message{display:flex;gap:14px;margin:26px 0}.message.user{justify-content:flex-end}.avatar{width:28px;height:28px;border-radius:9px;flex:0 0 auto;background:#fff;color:#111;display:grid;place-items:center;font-weight:900;font-size:12px}.message.user .avatar{display:none}.messageBody{max-width:calc(100% - 42px);line-height:1.66;font-size:15px}.message.user .messageBody{max-width:82%;background:var(--surface2);padding:10px 14px;border-radius:18px;white-space:pre-wrap}.assistantText{white-space:pre-wrap}.inlineInfo{margin:14px 0 0;border-left:2px solid #3f3f46;padding:2px 0 2px 14px;color:var(--soft);font-size:13px;line-height:1.55}.opportunityList{display:grid;gap:8px;margin-top:14px}.opportunity{border:1px solid var(--line);border-radius:14px;padding:13px;background:#131315}.opportunityTop{display:flex;justify-content:space-between;gap:14px}.opportunity strong{font-size:14px}.opportunity span{color:var(--muted);font-size:12px}.score{font-weight:850;color:var(--good)!important}.actionRow{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.actionBtn{border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:var(--soft)}.actionBtn:hover{background:var(--surface)}.details{margin-top:12px}.details summary{color:var(--muted);font-size:12px;cursor:pointer}.details pre{white-space:pre-wrap;overflow:auto;background:#111113;border:1px solid var(--line);border-radius:12px;padding:12px;color:#b9b9c2;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:340px}.composerWrap{position:fixed;left:260px;right:0;bottom:0;padding:34px 18px max(14px,env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--bg) 34%);z-index:25}.composer{max-width:790px;margin:0 auto;border:1px solid #3a3a41;background:#1c1c20;border-radius:24px;padding:9px 10px;box-shadow:0 12px 45px rgba(0,0,0,.25)}.composer textarea{width:100%;min-height:52px;max-height:180px;resize:none;border:0;outline:0;background:transparent;color:var(--text);padding:9px 10px;font-size:15px}.composerTools{display:flex;justify-content:space-between;align-items:center}.leftTools{display:flex;gap:4px}.tool{border:0;background:transparent;color:var(--muted);padding:8px 10px;border-radius:10px}.tool:hover{background:var(--hover);color:var(--text)}.send{border:0;background:#fff;color:#111;width:36px;height:36px;border-radius:50%;font-weight:900}.send:disabled{opacity:.35;cursor:not-allowed}.disclaimer{text-align:center;color:#5f5f67;font-size:10px;margin-top:8px}.modal{position:fixed;inset:0;background:rgba(0,0,0,.68);display:grid;place-items:center;z-index:100;padding:18px}.modalCard{width:min(500px,100%);background:#18181b;border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:var(--shadow)}.modalCard h2{margin:0 0 7px;letter-spacing:-.03em}.modalCard p{color:var(--muted);font-size:13px;line-height:1.55}.field{display:grid;gap:6px;margin:13px 0}.field label{font-size:11px;color:var(--muted)}.field input,.field textarea{width:100%;border:1px solid var(--line);background:#101012;color:var(--text);border-radius:11px;padding:11px;outline:0}.field textarea{min-height:260px;resize:vertical}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.error{color:var(--bad);font-size:12px;min-height:17px;margin-top:8px}.menu{position:fixed;bottom:115px;left:calc(260px + (100vw - 260px - min(790px,calc(100vw - 300px)))/2 + 6px);z-index:50;width:260px;background:#1b1b1f;border:1px solid var(--line);border-radius:14px;padding:6px;box-shadow:var(--shadow)}.menu button{width:100%;border:0;background:transparent;color:var(--soft);text-align:left;padding:10px;border-radius:9px}.menu button:hover{background:var(--hover)}.mobileRail{display:none}@media(max-width:760px){.rail{display:none}.chat{margin-left:0}.composerWrap{left:0}.thread{padding-left:14px;padding-right:14px}.suggestions{grid-template-columns:1fr}.topbar{padding:0 12px}.mobileRail{display:block}.menu{left:14px;bottom:110px}.messageBody{max-width:calc(100% - 38px)}.message.user .messageBody{max-width:90%}}
</style>
</head>
<body>
<section id="publicSite" class="public">
  <div class="publicInner">
    <div class="brand"><span class="logo">H</span> Hired AI</div>
    <h1>Your career, handled as a conversation.</h1>
    <p>Maya helps you start, change direction, find work, prove what you can do, prepare for interviews, negotiate, and advance. She adapts to the profession and uses the evidence that actually matters in that field.</p>
    <div class="publicComposer">
      <textarea id="publicPrompt" aria-label="Tell Maya what you want from your career"></textarea>
      <div class="publicActions"><span style="color:var(--muted);font-size:12px">No dashboard. Just tell Maya the outcome.</span><button class="primary" onclick="beginFromPublic()">Start with Maya</button></div>
    </div>
    <div class="promptRow">
      <button class="prompt" onclick="seedPublic('Help me start my career')">Start my career</button>
      <button class="prompt" onclick="seedPublic('Help me change careers')">Change careers</button>
      <button class="prompt" onclick="seedPublic('Find work I can realistically win')">Find work</button>
      <button class="prompt" onclick="seedPublic('Help me advance and earn more')">Advance</button>
      <button class="prompt" onclick="seedPublic('Audit my resume')">Resume</button>
      <button class="prompt" onclick="seedPublic('Prepare me for an interview')">Interview</button>
    </div>
    <div class="publicFine">Strongest-defensible positioning · Profession-appropriate evidence · Required credentials remain hard gates · Identity-bearing actions require authorization</div>
    <div style="margin-top:22px"><button class="secondary" onclick="openAuth('login')">Sign in</button> <button class="primary" onclick="openAuth('register')">Create account</button></div>
  </div>
</section>

<section id="app" class="app hidden">
  <aside class="rail">
    <div class="railBrand"><span class="logo">H</span> Hired AI</div>
    <button class="newThread" onclick="newConversation()">＋ New conversation</button>
    <div class="railHint">Every career capability lives inside the conversation. Ask Maya what you want to accomplish.</div>
    <div class="railBottom"><button id="accountBtn" class="accountBtn" onclick="openAccount()">Account</button></div>
  </aside>
  <main class="chat">
    <header class="topbar"><div><button class="iconBtn mobileRail" onclick="newConversation()">＋</button><span class="topTitle">Maya</span></div><span id="status" class="status">Career intelligence</span></header>
    <div id="thread" class="thread"></div>
    <div class="composerWrap">
      <div class="composer">
        <textarea id="composer" aria-label="Message Maya"></textarea>
        <div class="composerTools"><div class="leftTools"><button class="tool" onclick="toggleTools()" title="Add career material">＋</button></div><button id="sendBtn" class="send" onclick="sendCurrent()">↑</button></div>
      </div>
      <div class="disclaimer">Maya can make mistakes. Verify consequential employment, legal, licensing, compensation, and employer information.</div>
    </div>
  </main>
</section>

<div id="toolsMenu" class="menu hidden">
  <button onclick="openResume()">Paste a resume for Maya</button>
  <button onclick="sendText('Assess my career health and show my biggest bottleneck')">Assess career health</button>
  <button onclick="sendText('Help me build a career transition plan')">Build transition plan</button>
  <button onclick="sendText('Help me advance, build a promotion case, and improve compensation')">Build advancement plan</button>
  <button onclick="sendText('Find roles I can realistically win')">Find opportunities</button>
</div>

<div id="authModal" class="modal hidden"><div class="modalCard">
  <h2 id="authTitle">Sign in</h2><p id="authCopy">Continue your conversation with Maya.</p>
  <div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email"></div>
  <div class="field"><label>Password</label><input id="authPassword" type="password" autocomplete="current-password"></div>
  <div id="authError" class="error"></div>
  <div class="modalActions"><button class="secondary" onclick="closeModal('authModal')">Cancel</button><button id="authSubmit" class="primary" onclick="submitAuth()">Sign in</button></div>
</div></div>

<div id="resumeModal" class="modal hidden"><div class="modalCard">
  <h2>Give Maya your resume</h2><p>Paste the current text. Maya will compare it with your career evidence, target roles, and profession-specific requirements inside the conversation.</p>
  <div class="field"><label>Resume text</label><textarea id="resumeText"></textarea></div>
  <div class="modalActions"><button class="secondary" onclick="closeModal('resumeModal')">Cancel</button><button class="primary" onclick="submitResume()">Send to Maya</button></div>
</div></div>

<div id="accountModal" class="modal hidden"><div class="modalCard">
  <h2>Account</h2><p id="accountSummary"></p>
  <div class="modalActions"><button class="secondary" onclick="closeModal('accountModal')">Close</button><button class="secondary" onclick="logout()">Sign out</button></div>
</div></div>

<script>
var state={account:null,authMode:'login',pendingPublic:'',sending:false};
function byId(id){return document.getElementById(id)}
async function api(path,options){var r=await fetch(path,Object.assign({headers:{'content-type':'application/json'}},options||{}));var text=await r.text();var data={};try{data=text?JSON.parse(text):{}}catch(e){data={error:text||'request failed'}}if(!r.ok){var err=new Error(data.error||('Request failed: '+r.status));err.status=r.status;err.data=data;throw err}return data}
function openAuth(mode){state.authMode=mode;byId('authTitle').textContent=mode==='register'?'Create your account':'Sign in';byId('authSubmit').textContent=mode==='register'?'Create account':'Sign in';byId('authPassword').autocomplete=mode==='register'?'new-password':'current-password';byId('authError').textContent='';byId('authModal').classList.remove('hidden')}
function closeModal(id){byId(id).classList.add('hidden')}
function seedPublic(text){byId('publicPrompt').value=text}
function beginFromPublic(){state.pendingPublic=byId('publicPrompt').value.trim();openAuth('register')}
async function submitAuth(){var email=byId('authEmail').value.trim(),password=byId('authPassword').value;byId('authError').textContent='';try{var data=await api('/api/auth/'+state.authMode,{method:'POST',body:JSON.stringify({email:email,password:password})});state.account=data.account;closeModal('authModal');await enterApp();if(state.pendingPublic){var p=state.pendingPublic;state.pendingPublic='';await sendText(p)}}catch(e){byId('authError').textContent=e.message}}
async function enterApp(){byId('publicSite').classList.add('hidden');byId('app').classList.remove('hidden');if(!state.account){try{state.account=await api('/api/me')}catch(e){return}}byId('accountBtn').textContent=state.account.email||'Account';await loadHistory()}
function emptyMarkup(){return '<div class="emptyState"><div class="mayaOrb">M</div><h2>What do you want to change about your career?</h2><p>You can start from anywhere. Maya can help you enter the workforce, switch fields, find better work, strengthen proof, improve applications, prepare for interviews, negotiate, or move up.</p><div class="suggestions"><button class="suggestion" onclick="sendText(\'Help me start my career\')">Help me start my career</button><button class="suggestion" onclick="sendText(\'Help me change careers\')">Help me change careers</button><button class="suggestion" onclick="sendText(\'Find roles I can realistically win\')">Find roles I can realistically win</button><button class="suggestion" onclick="sendText(\'Help me advance and earn more\')">Help me advance and earn more</button><button class="suggestion" onclick="sendText(\'Audit my resume\')">Audit my resume</button><button class="suggestion" onclick="sendText(\'Prepare me for my next interview\')">Prepare me for an interview</button></div></div>'}
function clearThread(){byId('thread').innerHTML=emptyMarkup()}
async function newConversation(){try{await api('/api/maya/history',{method:'DELETE'});clearThread()}catch(e){clearThread()}}
async function loadHistory(){try{var data=await api('/api/maya/history?limit=60');var messages=data.messages||[];if(!messages.length){clearThread();return}byId('thread').innerHTML='';messages.forEach(function(m){appendMessage(m.role==='assistant'?'assistant':'user',m.content||m.message||'')});scrollBottom()}catch(e){clearThread()}}
function appendMessage(role,text){var empty=byId('thread').querySelector('.emptyState');if(empty)empty.remove();var wrap=document.createElement('div');wrap.className='message '+role;var avatar=document.createElement('div');avatar.className='avatar';avatar.textContent='M';var body=document.createElement('div');body.className='messageBody';var t=document.createElement('div');t.className=role==='assistant'?'assistantText':'';t.textContent=text;body.appendChild(t);if(role==='assistant')wrap.appendChild(avatar);wrap.appendChild(body);byId('thread').appendChild(wrap);return body}
function safeDetails(data){var copy={};['type','advantage','universal','frontier','readiness','strategy','reliability','unknowns'].forEach(function(k){if(data&&data[k]!==undefined)copy[k]=data[k]});return copy}
function renderAssistant(data){var body=appendMessage('assistant',data.message||'');var opps=data.opportunities;if(Array.isArray(opps)&&opps.length){var list=document.createElement('div');list.className='opportunityList';opps.slice(0,6).forEach(function(item){var o=item.opportunity||{};var job=o.job||{};var title=item.title||job.title||'Opportunity';var company=item.company||job.company||'';var score=item.opportunityScore!==undefined?item.opportunityScore:(o.score&&o.score.total);var row=document.createElement('button');row.className='opportunity actionBtn';row.style.textAlign='left';row.style.width='100%';row.onclick=function(){sendText('Explain why '+title+(company?' at '+company:'')+' is a strong or weak fit for me')};var top=document.createElement('div');top.className='opportunityTop';var left=document.createElement('strong');left.textContent=title+(company?' · '+company:'');var right=document.createElement('span');right.className='score';right.textContent=score!==undefined?String(score):'';top.appendChild(left);top.appendChild(right);row.appendChild(top);list.appendChild(row)});body.appendChild(list)}
var advantage=data.advantage;if(advantage&&advantage.health){var info=document.createElement('div');info.className='inlineInfo';info.textContent='Career health '+advantage.health.total+'/100 · strongest: '+advantage.health.strongestDimension+' · biggest bottleneck: '+advantage.health.weakestDimension;body.appendChild(info)}
if(Array.isArray(data.actions)&&data.actions.length){var actions=document.createElement('div');actions.className='actionRow';data.actions.slice(0,7).forEach(function(label){var b=document.createElement('button');b.className='actionBtn';b.textContent=label;b.onclick=function(){sendText(label)};actions.appendChild(b)});body.appendChild(actions)}
var details=safeDetails(data);if(Object.keys(details).length){var d=document.createElement('details');d.className='details';var s=document.createElement('summary');s.textContent='View reasoning data';var pre=document.createElement('pre');pre.textContent=JSON.stringify(details,null,2);d.appendChild(s);d.appendChild(pre);body.appendChild(d)}scrollBottom()}
async function sendCurrent(){var text=byId('composer').value.trim();if(!text||state.sending)return;byId('composer').value='';await sendText(text)}
async function sendText(text,extra){if(!text||state.sending)return;state.sending=true;byId('sendBtn').disabled=true;appendMessage('user',text);scrollBottom();try{var payload=Object.assign({message:text},extra||{});var data=await api('/api/maya/chat',{method:'POST',body:JSON.stringify(payload)});renderAssistant(data)}catch(e){appendMessage('assistant',e.status===402?'Your current plan does not include Maya chat yet. Open Account to manage access.':('I could not complete that request: '+e.message))}finally{state.sending=false;byId('sendBtn').disabled=false;byId('composer').focus()}}
function toggleTools(){byId('toolsMenu').classList.toggle('hidden')}
function openResume(){byId('toolsMenu').classList.add('hidden');byId('resumeModal').classList.remove('hidden')}
async function submitResume(){var text=byId('resumeText').value.trim();if(!text)return;closeModal('resumeModal');byId('resumeText').value='';await sendText('Review my resume and improve my positioning for the career direction that best fits my goals.',{resumeText:text})}
function openAccount(){var sub=state.account&&state.account.subscription?state.account.subscription:{};byId('accountSummary').textContent=(state.account?state.account.email:'')+' · plan: '+(sub.plan||'none')+' · status: '+(sub.status||'inactive');byId('accountModal').classList.remove('hidden')}
async function logout(){try{await api('/api/auth/logout',{method:'POST'})}catch(e){}location.reload()}
function scrollBottom(){window.requestAnimationFrame(function(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})})}
byId('composer').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendCurrent()}});
byId('publicPrompt').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();beginFromPublic()}});
document.addEventListener('click',function(e){if(!byId('toolsMenu').classList.contains('hidden')&&!e.target.closest('#toolsMenu')&&!e.target.closest('.tool'))byId('toolsMenu').classList.add('hidden')});
(async function boot(){try{state.account=await api('/api/me');await enterApp()}catch(e){}})();
</script>
</body></html>`;
}
