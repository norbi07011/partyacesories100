/* Studio Agent – rozmowa głosowa (styl FaceTime), dyktowanie i czytanie odpowiedzi na głos.
   Rozpoznawanie mowy: Web Speech API (Chrome/Edge) albo nagrywanie + Whisper na serwerze.
   Synteza mowy: edge-tts z serwera (naturalny głos) albo głos systemu w przeglądarce. */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let VOICE_STATUS = null;
async function voiceStatus(){ if (!VOICE_STATUS) VOICE_STATUS = await api('/api/voice/status').catch(()=>({tts_engine:'browser', stt_engine:'browser'})); return VOICE_STATUS; }

/* ---------- synteza mowy (wspólna) ---------- */
let audioCtx = null, agentAnalyser = null;
function ctx(){ if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); if (audioCtx.state==='suspended') audioCtx.resume(); return audioCtx; }
const audioEl = new Audio(); audioEl.crossOrigin = 'anonymous';
let audioWired = false;
function wireAudio(){
  if (audioWired) return; audioWired = true;
  const c = ctx(); const src = c.createMediaElementSource(audioEl);
  agentAnalyser = c.createAnalyser(); agentAnalyser.fftSize = 512;
  src.connect(agentAnalyser); agentAnalyser.connect(c.destination);
}
function plVoice(){
  const vs = speechSynthesis.getVoices();
  return vs.find(v=>/pl/i.test(v.lang) && /natural|online|zofia|marek|paulina/i.test(v.name)) || vs.find(v=>/^pl/i.test(v.lang));
}
let ttsBroken = false, browserSpeaking = false;
async function speakText(text, {onStart}={}){
  text = text.replace(/[*_`#>|]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').trim();
  if (!text) return;
  const st = await voiceStatus();
  if (st.tts_engine === 'edge' && !ttsBroken) {
    try {
      const r = await fetch('/api/voice/tts', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})});
      if (!r.ok) throw new Error('tts');
      const url = URL.createObjectURL(await r.blob());
      wireAudio(); audioEl.src = url;
      await new Promise((res) => { audioEl.onended = audioEl.onerror = () => { URL.revokeObjectURL(url); res(); }; audioEl.play().then(()=>onStart&&onStart()).catch(res); });
      return;
    } catch(e) { ttsBroken = true; }
  }
  if (!('speechSynthesis' in window)) return;
  await new Promise(res => {
    // zabezpieczenie: niektóre przeglądarki nie zgłaszają końca mowy
    const guard = setTimeout(() => { browserSpeaking = false; res(); }, 4000 + text.length * 90);
    const u = new SpeechSynthesisUtterance(text); u.lang = 'pl-PL'; const v = plVoice(); if (v) u.voice = v; u.rate = 1.03;
    u.onstart = () => { browserSpeaking = true; onStart && onStart(); };
    u.onend = u.onerror = () => { clearTimeout(guard); browserSpeaking = false; res(); };
    speechSynthesis.speak(u);
  });
}
function stopSpeaking(){ try{ audioEl.pause(); audioEl.currentTime = 0; audioEl.onended && audioEl.onended(); }catch(e){} try{ speechSynthesis.cancel(); }catch(e){} browserSpeaking=false; }
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};

/* ---------- czytanie odpowiedzi w czacie ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('.speak'); if (!b) return;
  const msg = b.closest('.msg'); stopSpeaking();
  speakText(msg.querySelector('.body')?.innerText || msg.innerText);
});

/* ---------- nagrywanie dla Whispera (z prostym wykrywaniem ciszy) ---------- */
function makeRecorder(stream, analyser, onAudio, {silenceMs=1100, threshold=0.025}={}){
  const buf = new Float32Array(analyser.fftSize); let rec=null, chunks=[], speaking=false, lastLoud=0, startedLoud=0, stopped=false;
  function level(){ analyser.getFloatTimeDomainData(buf); let s=0; for (const v of buf) s+=v*v; return Math.sqrt(s/buf.length); }
  function tick(){
    if (stopped) return;
    const l = level(), now = performance.now();
    if (l > threshold) { lastLoud = now; if (!speaking) { if (!startedLoud) startedLoud = now; if (now-startedLoud > 140) start(); } }
    else if (!speaking) startedLoud = 0;
    if (speaking && now - lastLoud > silenceMs) stop();
    requestAnimationFrame(tick);
  }
  function start(){
    speaking = true; chunks = [];
    const mime = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(m=>MediaRecorder.isTypeSupported(m)) || '';
    rec = new MediaRecorder(stream, mime?{mimeType:mime}:{});
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const blob = new Blob(chunks, {type: rec.mimeType}); if (blob.size > 3000) onAudio(blob); };
    rec.start();
  }
  function stop(){ speaking=false; startedLoud=0; try{ rec && rec.state!=='inactive' && rec.stop(); }catch(e){} }
  tick();
  return { pause(){ stop(); paused=true; }, get speaking(){ return speaking; }, destroy(){ stopped=true; stop(); } };
}
let paused = false;
async function whisper(blob){
  const r = await fetch('/api/voice/transcribe', {method:'POST', headers:{'Content-Type': blob.type || 'audio/webm'}, body: blob});
  if (!r.ok) { let d=''; try{ d=(await r.json()).detail }catch(e){} throw new Error(d || 'Rozpoznawanie mowy niedostępne'); }
  return (await r.json()).text || '';
}

/* ---------- dyktowanie w czacie ---------- */
let dictRec = null;
$('#dictate').onclick = async () => {
  const btn = $('#dictate'), input = $('#chat-input');
  if (dictRec) { dictRec.stop(); return; }
  const st = await voiceStatus();
  if (SR && st.stt_engine !== 'whisper') {
    const r = new SR(); r.lang='pl-PL'; r.interimResults=true; r.continuous=true; dictRec = r;
    const base = input.value ? input.value.trim()+' ' : '';
    r.onresult = e => { let t=''; for (const res of e.results) t += res[0].transcript; input.value = base + t; input.dispatchEvent(new Event('input')); };
    r.onend = () => { dictRec=null; btn.classList.remove('rec'); input.focus(); };
    r.onerror = e => { if (e.error==='not-allowed') toast('⚠️ Zezwól przeglądarce na mikrofon'); };
    r.start(); btn.classList.add('rec'); toast('Mów… kliknij mikrofon ponownie, aby zakończyć');
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream); const chunks=[];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => { stream.getTracks().forEach(t=>t.stop()); btn.classList.remove('rec'); dictRec=null;
        try { const t = await whisper(new Blob(chunks,{type:mr.mimeType})); input.value = (input.value+' '+t).trim(); input.dispatchEvent(new Event('input')); } catch(e){ toast('⚠️ '+e.message); } };
      mr.start(); dictRec = mr; btn.classList.add('rec'); toast('Nagrywam… kliknij mikrofon, aby zakończyć');
    } catch(e) { toast('⚠️ Brak dostępu do mikrofonu'); }
  }
};

/* =====================================================================
   ROZMOWA GŁOSOWA
   ===================================================================== */
const call = { active:false, state:'idle', muted:false, speaker:true, rec:null, recorder:null, micStream:null, micAnalyser:null,
  camStream:null, pendingFrame:null, t0:0, timer:null, finalText:'', submitT:null, queue:[], playing:false, streamDone:true, raf:null, simLevel:0, ctrl:null };

const STATUS_TXT = { idle:'', listening:'Słucham…', thinking:'Myślę…', speaking:'Mówi…', muted:'Mikrofon wyciszony' };
function setState(s, label){
  call.state = s;
  $('#call-status').textContent = label || (call.muted && s==='listening' ? STATUS_TXT.muted : STATUS_TXT[s]);
  if (s === 'listening') startListening(); else pauseListening();
}

async function openCall(){
  if (call.active) return;
  call.active = true; $('#call').hidden = false; document.body.style.overflow='hidden';
  $('#cap-user').textContent=''; $('#cap-agent').textContent='';
  $('#call-status').textContent = 'Łączenie…';
  ctx();
  try {
    call.micStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}});
    const src = ctx().createMediaStreamSource(call.micStream);
    call.micAnalyser = ctx().createAnalyser(); call.micAnalyser.fftSize = 1024; src.connect(call.micAnalyser);
  } catch(e) {
    $('#call-status').textContent = 'Brak dostępu do mikrofonu — zezwól w przeglądarce (ikona kłódki przy adresie).';
  }
  const st = await voiceStatus();
  call.useWhisper = !SR || st.stt_engine === 'whisper';
  if (call.useWhisper && !st.whisper_installed) {
    $('#cap-agent').textContent = 'Ta przeglądarka nie rozpoznaje mowy, a Whisper nie jest zainstalowany. Użyj Chrome lub Edge albo zainstaluj faster-whisper (requirements-voice.txt).';
  }
  call.t0 = Date.now(); clearInterval(call.timer);
  call.timer = setInterval(()=>{ const s=Math.floor((Date.now()-call.t0)/1000); $('#call-timer').textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }, 500);
  drawOrb();
  const hello = (typeof chatGreetingName === 'function') ? chatGreetingName() : '';
  pushTranscript('agent', 'Cześć' + hello + '! Słucham cię.');
  $('#cap-agent').textContent = 'Cześć' + hello + '! Słucham cię.';
  setState('speaking');
  await speakText('Cześć' + hello + '! Słucham cię.');
  if (call.active) setState('listening');
}

function closeCall(){
  call.active = false; setState('idle');
  try { call.ctrl && call.ctrl.abort(); } catch(e){}
  stopSpeaking(); call.queue = [];
  try { call.rec && call.rec.abort(); } catch(e){} call.rec = null;
  call.recorder && call.recorder.destroy(); call.recorder = null;
  call.micStream && call.micStream.getTracks().forEach(t=>t.stop()); call.micStream = null;
  stopCamera();
  clearInterval(call.timer); cancelAnimationFrame(call.raf);
  $('#call').hidden = true; document.body.style.overflow='';
  chatLoaded = false; if (current==='chat') LOADERS.chat();
}

/* ---------- słuchanie ---------- */
function startListening(){
  if (!call.active || call.muted || !call.micStream) return;
  if (call.useWhisper) {
    if (!VOICE_STATUS?.whisper_installed) return;
    paused = false;
    if (!call.recorder) call.recorder = makeRecorder(call.micStream, call.micAnalyser, async blob => {
      if (call.state !== 'listening') return;
      setState('thinking', 'Rozpoznaję mowę…');
      try { const t = await whisper(blob); if (t.trim()) submit(t.trim()); else setState('listening'); }
      catch(e) { $('#cap-agent').textContent = '⚠️ ' + e.message; setState('listening'); }
    });
    return;
  }
  if (call.rec) return;
  const r = new SR(); r.lang = 'pl-PL'; r.continuous = true; r.interimResults = true; call.rec = r;
  call.finalText = '';
  r.onresult = e => {
    let interim = '', fin = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else interim += t; }
    if (fin) call.finalText += ' ' + fin;
    $('#cap-user').textContent = (call.finalText + ' ' + interim).trim();
    clearTimeout(call.submitT);
    if (call.finalText.trim()) call.submitT = setTimeout(()=>{ const t = call.finalText.trim(); call.finalText=''; submit(t); }, interim ? 1400 : 700);
  };
  r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { $('#call-status').textContent = 'Przeglądarka zablokowała rozpoznawanie mowy.'; } };
  r.onend = () => { call.rec = null; if (call.active && call.state === 'listening' && !call.muted) setTimeout(startListening, 150); };
  try { r.start(); } catch(e) { call.rec = null; }
}
function pauseListening(){
  clearTimeout(call.submitT);
  if (call.rec) { const r = call.rec; call.rec = null; r.onend = null; try { r.abort(); } catch(e){} }
  if (call.recorder) { call.recorder.destroy(); call.recorder = null; }
}

/* ---------- wysyłanie wypowiedzi do agenta ---------- */
let sentenceBuf = '';
async function submit(text){
  if (!call.active || !text) return;
  setState('thinking');
  $('#cap-user').textContent = text; $('#cap-agent').textContent = '';
  pushTranscript('user', text);
  const images = call.pendingFrame ? [call.pendingFrame] : [];
  call.pendingFrame = null; $('#snap-badge').hidden = true;
  call.queue = []; call.streamDone = false; sentenceBuf = ''; let acc = '', changed = new Set();
  call.ctrl = new AbortController();
  try {
    const r = await fetch('/api/chat/stream', {method:'POST', headers:{'Content-Type':'application/json'}, signal: call.ctrl.signal,
      body: JSON.stringify({message: text, session:'web', voice:true, images})});
    const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for(;;){
      const {value, done} = await reader.read(); if (done) break;
      buf += dec.decode(value, {stream:true});
      let i; while ((i = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0,i).split('\n').find(l=>l.startsWith('data: ')); buf = buf.slice(i+2); if (!line) continue;
        const ev = JSON.parse(line.slice(6));
        if (ev.type === 'text') { acc += ev.text; $('#cap-agent').textContent = acc.replace(/[*_#`]/g,''); feedSentences(ev.text); }
        else if (ev.type === 'tool') { if (call.state==='thinking') $('#call-status').textContent = ev.label + '…'; }
        else if (ev.type === 'changed') ev.what.forEach(w=>changed.add(w));
        else if (ev.type === 'done') { if (!acc.trim()) { $('#cap-agent').textContent = ev.reply.replace(/[*_#`]/g,''); call.queue.push(ev.reply); } acc = ev.reply; }
      }
    }
  } catch(e) {
    if (!call.active) return;
    call.queue.push('Przepraszam, nie udało mi się połączyć.');
  }
  if (sentenceBuf.trim()) { call.queue.push(sentenceBuf.trim()); sentenceBuf=''; }
  call.streamDone = true;
  pushTranscript('agent', acc || '…');
  if (changed.size) refresh([...changed]);
  playQueue();
}
function feedSentences(chunk){
  sentenceBuf += chunk;
  const m = sentenceBuf.match(/^([\s\S]*?[.!?…:](?:\s|$))(?=\s*\S)/);
  if (m && m[1].trim().length > 18) { call.queue.push(m[1].trim()); sentenceBuf = sentenceBuf.slice(m[1].length); playQueue(); }
}
async function playQueue(){
  if (call.playing || !call.active) return;
  call.playing = true;
  while (call.active && (call.queue.length || !call.streamDone)) {
    if (!call.queue.length) { await new Promise(r=>setTimeout(r,80)); continue; }
    const s = call.queue.shift();
    if (call.speaker) { setState('speaking'); await speakText(s); }
  }
  call.playing = false;
  if (call.active && call.state !== 'listening') setState('listening');
}

/* ---------- transkrypcja ---------- */
function pushTranscript(who, text){
  const el = document.createElement('div'); el.className = 'ct-item';
  el.innerHTML = `<b>${who==='user'?'Ty':'Agent'}</b>${esc(text.replace(/[*_#`]/g,''))}`;
  $('#ct-list').appendChild(el); $('#call-transcript').scrollTop = 1e9;
}

/* ---------- kamera ---------- */
async function startCamera(){
  try {
    call.camStream = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280}, facingMode:'user'}});
    $('#call-self').srcObject = call.camStream; $('#call-self-wrap').hidden = false;
    $('#c-cam').classList.add('active'); $('#c-snap').disabled = false;
  } catch(e) { toast('⚠️ Brak dostępu do kamery'); }
}
function stopCamera(){
  call.camStream && call.camStream.getTracks().forEach(t=>t.stop()); call.camStream = null;
  $('#call-self-wrap').hidden = true; $('#c-cam').classList.remove('active'); $('#c-snap').disabled = true;
}
function snapFrame(){
  const v = $('#call-self'); if (!v.videoWidth) return;
  const s = Math.min(1, 1280/Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement('canvas'); c.width = v.videoWidth*s; c.height = v.videoHeight*s;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  call.pendingFrame = {media_type:'image/jpeg', data: c.toDataURL('image/jpeg', .85).split(',')[1]};
  const w = $('#call-self-wrap'); w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash');
  $('#snap-badge').hidden = false;
  if (call.state === 'listening' && !$('#cap-user').textContent.trim()) setTimeout(()=>{ if (call.pendingFrame) submit('Co widzisz na tym kadrze? Oceń go krótko.'); }, 2500);
}

/* ---------- animacja: „żywa kula” reagująca na głos ---------- */
const PALETTE = {
  idle:      [[217,165,91],[160,110,210]],
  listening: [[217,165,91],[235,120,90]],
  thinking:  [[120,110,235],[70,170,220]],
  speaking:  [[245,190,110],[200,120,230]],
};
let orbLevel = 0, orbPhase = 0, orbColors = PALETTE.idle.map(c=>c.slice());
function analyserLevel(an){ if (!an) return 0; const b = new Uint8Array(an.fftSize); an.getByteTimeDomainData(b); let s=0; for (const v of b){ const x=(v-128)/128; s+=x*x; } return Math.min(1, Math.sqrt(s/b.length)*4); }
function drawOrb(){
  const cv = $('#call-orb'), g = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio||1), W = cv.clientWidth*dpr, H = cv.clientHeight*dpr;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  let target = 0;
  if (call.state === 'listening' && !call.muted) target = analyserLevel(call.micAnalyser);
  else if (call.state === 'speaking') target = agentAnalyser && !audioEl.paused ? analyserLevel(agentAnalyser) : (browserSpeaking ? 0.35 + 0.25*Math.sin(performance.now()/120) : 0.15);
  else if (call.state === 'thinking') target = 0.18 + 0.08*Math.sin(performance.now()/300);
  orbLevel += (target - orbLevel) * 0.18;
  orbPhase += call.state === 'thinking' ? 0.035 : 0.012 + orbLevel*0.04;
  const want = PALETTE[call.state] || PALETTE.idle;
  orbColors = orbColors.map((c,i)=>c.map((v,j)=>v + (want[i][j]-v)*0.05));
  g.clearRect(0,0,W,H);
  const cx = W/2, cy = H/2, R = Math.min(W,H)*0.27*(1+orbLevel*0.22);
  // poświata
  const glow = g.createRadialGradient(cx,cy,R*0.4,cx,cy,R*2.1);
  glow.addColorStop(0, `rgba(${orbColors[0].map(Math.round)},${0.32+orbLevel*0.3})`); glow.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0,0,W,H);
  // warstwy „blobów”
  for (let layer = 0; layer < 4; layer++) {
    const col = layer % 2 ? orbColors[1] : orbColors[0];
    const rr = R * (1 - layer*0.13);
    g.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const a = i/N*Math.PI*2;
      const wob = Math.sin(a*3 + orbPhase*(1.3+layer*0.4) + layer) * (0.05 + orbLevel*0.16)
                + Math.sin(a*5 - orbPhase*(0.9+layer*0.3)) * (0.03 + orbLevel*0.09)
                + Math.sin(a*2 + orbPhase*0.7 + layer*2) * 0.03;
      const r = rr * (1 + wob);
      const x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
      i ? g.lineTo(x,y) : g.moveTo(x,y);
    }
    const grd = g.createRadialGradient(cx - rr*0.35, cy - rr*0.4, rr*0.05, cx, cy, rr*1.1);
    grd.addColorStop(0, `rgba(255,248,235,${0.55 - layer*0.1})`);
    grd.addColorStop(0.45, `rgba(${col.map(Math.round)},${0.75 - layer*0.12})`);
    grd.addColorStop(1, `rgba(${col.map(v=>Math.round(v*0.35))},${0.25})`);
    g.fillStyle = grd; g.globalCompositeOperation = layer ? 'screen' : 'source-over'; g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  if (call.active) call.raf = requestAnimationFrame(drawOrb);
}

/* ---------- przyciski ---------- */
$('#call-open-side').onclick = openCall;
$('#call-open-chat').onclick = openCall;
$('#c-end').onclick = closeCall;
$('#c-mute').onclick = () => { call.muted = !call.muted; $('#c-mute').classList.toggle('off', call.muted);
  call.micStream && call.micStream.getAudioTracks().forEach(t=>t.enabled = !call.muted);
  if (call.muted) pauseListening(); if (call.state==='listening') setState('listening'); };
$('#c-cam').onclick = () => call.camStream ? stopCamera() : startCamera();
$('#c-snap').onclick = snapFrame;
$('#c-captions').onclick = () => { const t = $('#call-transcript'); t.hidden = !t.hidden; $('#c-captions').classList.toggle('active', !t.hidden); $('#call').classList.toggle('with-transcript', !t.hidden); };
$('#c-speaker').onclick = () => { call.speaker = !call.speaker; $('#c-speaker').classList.toggle('off', !call.speaker); if (!call.speaker) stopSpeaking(); };
$('#call-stage').onclick = () => { if (call.state === 'speaking') { call.queue = []; stopSpeaking(); } }; // przerwij agentowi
document.addEventListener('keydown', e => { if (call.active && e.key === 'Escape') closeCall(); });
window.addEventListener('beforeunload', () => { if (call.active) closeCall(); });
