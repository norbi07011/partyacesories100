/* Studio Agent – dashboard */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ICON = {
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmtDT = s => s ? s.slice(0,16).replace('T',' ') : '';
const fmtDate = s => s ? new Date(s.slice(0,10)+'T12:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'}) : '';
const fmtSize = b => { b=+b||0; const u=['B','KB','MB','GB','TB']; let i=0; while(b>=1024&&i<4){b/=1024;i++} return b.toFixed(i?1:0)+' '+u[i]; };
const fmtMoney = v => v==null ? '—' : Number(v).toLocaleString('pl-PL',{maximumFractionDigits:0})+' zł';
const nowLocal = () => { const d=new Date(); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const MONTHS = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const store = { get(k,d){ try{ return localStorage.getItem(k) ?? d }catch(e){ return d } }, set(k,v){ try{ localStorage.setItem(k,v) }catch(e){} } };

async function api(path, opts={}) {
  const init = {...opts};
  if (opts.body !== undefined && !(opts.body instanceof Blob) && typeof opts.body !== 'string') {
    init.body = JSON.stringify(opts.body); init.headers = {'Content-Type':'application/json'};
  }
  const r = await fetch(path, init);
  if (!r.ok) {
    let msg = r.statusText;
    try { const j = await r.json(); msg = j.detail || msg; } catch(e) {}
    toast('⚠️ ' + msg); throw new Error(msg);
  }
  return r.json();
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2800); }
const formData = f => Object.fromEntries(new FormData(f).entries());

/* ---------- markdown (najpierw escape = bezpiecznie) ---------- */
function md(src){
  const charts = [];
  src = String(src ?? '').replace(/```chart\s*\n([\s\S]*?)```/g, (m, j) => { charts.push(j); return `\n@@CHART${charts.length-1}@@\n`; });
  const lines = esc(src).split('\n'); let html='', list=null;
  const inline = s => s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g,'$1<i>$2</i>')
    .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g,'$1<i>$2</i>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
  let table = null;
  const flushTable = () => { if (!table) return; const rows = table.filter(r=>!/^\s*\|?\s*:?-{2,}/.test(r));
    html += '<table>' + rows.map((r,i)=>{ const cells = r.trim().replace(/^\||\|$/g,'').split('|'); const tag = i===0?'th':'td';
      return '<tr>' + cells.map(c=>`<${tag}>${inline(c.trim())}</${tag}>`).join('') + '</tr>'; }).join('') + '</table>'; table = null; };
  for (const l of lines){
    if (/^\s*\|.*\|\s*$/.test(l)) { if (list){ html+=`</${list}>`; list=null; } (table ||= []).push(l); continue; }
    flushTable();
    const cm = l.match(/^@@CHART(\d+)@@$/);
    if (cm) { if (list){ html+=`</${list}>`; list=null; } try { html += renderChart(JSON.parse(charts[+cm[1]])); } catch(e) { html += '<div class="m">(nieczytelny wykres)</div>'; } continue; }
    const ul = l.match(/^\s*[-*•]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul||ol){ const tag = ul?'ul':'ol'; if(list!==tag){ if(list) html+=`</${list}>`; html+=`<${tag}>`; list=tag; } html+='<li>'+inline((ul||ol)[1])+'</li>'; continue; }
    if (list){ html+=`</${list}>`; list=null; }
    const h = l.match(/^#{1,6}\s+(.*)/);
    if (h) html+='<h4>'+inline(h[1])+'</h4>';
    else if (l.trim()) html+='<p>'+inline(l)+'</p>';
  }
  flushTable();
  return html + (list?`</${list}>`:'');
}

/* ---------- cache projektów (do selectów) ---------- */
let PROJECTS = [];
async function loadProjectsCache(){
  PROJECTS = await api('/api/projects?status=all');
  $$('.project-select').forEach(sel => {
    const v = sel.value;
    sel.innerHTML = '<option value="">— bez projektu —</option>' + PROJECTS.filter(p=>!['oplacony','anulowany'].includes(p.status)).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    sel.value = v;
  });
}
const projectName = id => (PROJECTS.find(p=>p.id==id)||{}).name || '';

/* ---------- nawigacja ---------- */
const LOADERS = {};
let current = 'home';
function show(view){
  if (!LOADERS[view]) view = 'home';
  current = view;
  $$('.nav').forEach(n=>n.classList.toggle('active', n.dataset.view===view));
  $$('.view').forEach(v=>v.classList.toggle('active', v.id==='view-'+view));
  store.set('view', view);
  if (location.hash !== '#'+view) history.replaceState(null,'','#'+view);
  LOADERS[view]?.();
}
$$('.nav').forEach(n=>n.onclick=()=>show(n.dataset.view));
document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) show(g.dataset.goto); });
function refresh(what){ // po zmianach z czatu
  const map = {tasks:['tasks','home','projects'], events:['calendar','home'], ideas:['ideas','home'], projects:['projects','home'], memory:['settings'], alerts:['crypto'], notifications:['notifications','home'], files:['files'], documents:['documents'], finance:['finance','home'], trading:['trading'], stratfanat:['stratfanat'], websites:['websites'], advisor:['advisor','home'], computer:['computer']};
  const views = new Set((what||[]).flatMap(w=>map[w]||[]));
  if (what?.includes('projects')) loadProjectsCache();
  if (views.has(current) && current!=='chat') LOADERS[current]();
}

/* ---------- motyw ---------- */
(function(){ const t=store.get('theme'); if(t) document.documentElement.dataset.theme=t; })();
$('#theme').onclick=()=>{ const r=document.documentElement; r.dataset.theme = r.dataset.theme==='light'?'dark':'light'; store.set('theme',r.dataset.theme); };

/* ---------- MODAL (edycja) ---------- */
const OPT = {
  priority:[['normal','Normalny'],['high','Pilne'],['low','Niski']],
  taskStatus:[['todo','Do zrobienia'],['doing','W trakcie'],['done','Zrobione']],
  evKind:[['sesja','Sesja'],['teledysk','Teledysk'],['spotkanie','Spotkanie'],['montaz','Montaż'],['inne','Inne']],
  ideaCat:[['sesja','Sesja'],['teledysk','Teledysk'],['ujęcie','Ujęcie'],['biznes','Biznes'],['sprzęt','Sprzęt'],['inne','Inne']],
  ideaStatus:[['nowy','Nowy'],['rozwijany','Rozwijany'],['zrealizowany','Zrealizowany'],['odlozony','Odłożony']],
  projKind:[['sesja','Sesja'],['teledysk','Teledysk'],['reklama','Reklama'],['slub','Ślub'],['event','Event'],['inne','Inne']],
  projStatus:[['zapytanie','Zapytanie'],['potwierdzony','Potwierdzony'],['produkcja','Produkcja'],['postprodukcja','Postprodukcja'],['oddany','Oddany'],['oplacony','Opłacony'],['anulowany','Anulowany']],
};
const projOpts = () => [['','— bez projektu —'], ...PROJECTS.map(p=>[String(p.id), p.name])];
const SCHEMAS = {
  tasks: { title:'Zadanie', fields:[
    {name:'title',label:'Tytuł',full:1,req:1},{name:'project_id',label:'Projekt',type:'select',opts:projOpts},
    {name:'due',label:'Termin',type:'datetime-local'},{name:'priority',label:'Priorytet',type:'select',opts:OPT.priority},
    {name:'status',label:'Status',type:'select',opts:OPT.taskStatus},{name:'notes',label:'Notatki',type:'textarea',full:1}]},
  events: { title:'Wydarzenie', fields:[
    {name:'title',label:'Tytuł',full:1,req:1},{name:'start',label:'Początek',type:'datetime-local',req:1},{name:'end',label:'Koniec',type:'datetime-local'},
    {name:'kind',label:'Rodzaj',type:'select',opts:OPT.evKind},{name:'project_id',label:'Projekt',type:'select',opts:projOpts},
    {name:'location',label:'Miejsce'},{name:'client',label:'Klient'},{name:'notes',label:'Notatki',type:'textarea',full:1}]},
  ideas: { title:'Pomysł', fields:[
    {name:'title',label:'Tytuł',full:1,req:1},{name:'category',label:'Kategoria',type:'select',opts:OPT.ideaCat},
    {name:'status',label:'Status',type:'select',opts:OPT.ideaStatus},{name:'tags',label:'Tagi (po przecinku)',full:1},
    {name:'content',label:'Opis, referencje, klimat, światło…',type:'textarea',full:1,rows:7}]},
  projects: { title:'Projekt', fields:[
    {name:'name',label:'Nazwa projektu',full:1,req:1},{name:'client',label:'Klient'},{name:'contact',label:'Kontakt (tel / e-mail)'},
    {name:'kind',label:'Rodzaj',type:'select',opts:OPT.projKind},{name:'status',label:'Status',type:'select',opts:OPT.projStatus},
    {name:'deadline',label:'Termin oddania',type:'date'},{name:'fee',label:'Stawka (zł)',type:'number'},
    {name:'folder',label:'Folder z materiałami',full:1},{name:'paid',label:'Opłacony',type:'checkbox'},
    {name:'notes',label:'Notatki',type:'textarea',full:1}]},
};
SCHEMAS.documents = { title:'Dokument', fields:[
  {name:'title',label:'Tytuł',full:1,req:1},
  {name:'kind',label:'Rodzaj',type:'select',opts:[['shotlista','Shot-lista'],['wycena','Wycena'],['brief','Brief'],['callsheet','Call sheet'],['scenariusz','Scenariusz'],['umowa','Umowa'],['notatka','Notatka'],['inne','Inne']]},
  {name:'project_id',label:'Projekt',type:'select',opts:projOpts},
  {name:'content',label:'Treść (markdown: **pogrubienie**, - listy, | tabele |)',type:'textarea',full:1,rows:16}]};
SCHEMAS.transactions = { title:'Transakcja', fields:[
  {name:'date',label:'Data',type:'date',req:1},
  {name:'type',label:'Typ',type:'select',opts:[['przychod','Przychód'],['koszt','Koszt'],['strata','Strata'],['inwestycja','Inwestycja']]},
  {name:'amount',label:'Kwota (zł)',type:'number',req:1},
  {name:'area',label:'Obszar',type:'select',opts:()=>FIN_META.areas.map(a=>[a,a])},
  {name:'category',label:'Kategoria'},
  {name:'description',label:'Opis',type:'textarea',full:1}]};
SCHEMAS.holdings = { title:'Pozycja w portfelu', fields:[
  {name:'name',label:'Nazwa (np. Bitcoin, aparat Sony)',full:1,req:1},
  {name:'kind',label:'Rodzaj',type:'select',opts:[['krypto','Krypto'],['akcje/ETF','Akcje / ETF'],['sprzęt','Sprzęt'],['inne','Inne']]},
  {name:'coin_id',label:'ID z CoinGecko (dla krypto, np. bitcoin)'},
  {name:'quantity',label:'Ilość',type:'number'},
  {name:'cost',label:'Ile zapłaciłeś łącznie (zł)',type:'number'},
  {name:'current_value',label:'Bieżąca wartość (zł) – gdy nie krypto',type:'number'},
  {name:'notes',label:'Notatki',type:'textarea',full:1}]};
let FIN_META = {areas:['Stratfanat','Strony WWW','Teledyski','Fotografia','Krypto','Prywatne','Inne'], categories:{}};
let modalState = null;
function openModal(table, row={}, opts={}){
  const sc = SCHEMAS[table]; modalState = {table, id: row.id, extra: opts.extra};
  $('#modal-title').textContent = (row.id ? 'Edytuj: ' : 'Nowy: ') + sc.title.toLowerCase();
  $('#modal-body').innerHTML = sc.fields.map(f => {
    const v = row[f.name] ?? '';
    let input;
    if (f.type==='select') input = `<select name="${f.name}">${(typeof f.opts==='function'?f.opts():f.opts).map(([k,l])=>`<option value="${esc(k)}" ${String(v)===String(k)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
    else if (f.type==='textarea') input = `<textarea name="${f.name}" rows="${f.rows||3}">${esc(v)}</textarea>`;
    else if (f.type==='checkbox') return `<div class="field inline"><input type="checkbox" name="${f.name}" id="mf-${f.name}" ${v?'checked':''}><label for="mf-${f.name}">${f.label}</label></div>`;
    else input = `<input name="${f.name}" type="${f.type||'text'}" value="${esc(f.type==='datetime-local'?String(v).slice(0,16):v)}" ${f.req?'required':''} ${f.type==='number'?'step="any"':''}>`;
    return `<div class="field ${f.full?'full':''}"><label>${f.label}</label>${input}</div>`;
  }).join('');
  $('#modal-del').hidden = !row.id;
  const ex = $('#modal-extra'); ex.hidden = !opts.extra; if (opts.extra) { ex.textContent = opts.extra.label; ex.onclick = () => { closeModal(); opts.extra.run(); }; }
  modalState.onSaved = opts.onSaved;
  $('#modal').hidden = false;
  setTimeout(()=>$('#modal-body input, #modal-body textarea')?.focus(), 30);
}
function closeModal(){ $('#modal').hidden = true; modalState = null; }
$('#modal-x').onclick = $('#modal-cancel').onclick = closeModal;
$('#modal').addEventListener('mousedown', e => { if (e.target.id==='modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key==='Escape') { closeModal(); $('#lightbox').hidden=true; $('#gsearch-res').hidden=true; } });
$('#modal-form').onsubmit = async e => {
  e.preventDefault();
  const {table, id, onSaved} = modalState;
  const data = formData(e.target);
  SCHEMAS[table].fields.filter(f=>f.type==='checkbox').forEach(f=> data[f.name] = e.target[f.name].checked ? 1 : 0);
  if ('project_id' in data && table==='tasks') data.project = projectName(data.project_id);
  if (id) await api(`/api/crud/${table}/${id}`, {method:'PATCH', body:data});
  else await api(`/api/crud/${table}`, {method:'POST', body:data});
  closeModal(); toast('Zapisano ✓');
  if (table==='projects') await loadProjectsCache();
  onSaved ? onSaved() : LOADERS[current]?.();
};
$('#modal-del').onclick = async () => {
  const {table, id, onSaved} = modalState;
  if (!confirm('Na pewno usunąć?')) return;
  await api(`/api/crud/${table}/${id}`, {method:'DELETE'});
  closeModal(); toast('Usunięto');
  if (table==='projects') await loadProjectsCache();
  onSaved ? onSaved() : LOADERS[current]?.();
};
async function edit(table, id, opts){ openModal(table, await api(`/api/crud/${table}/${id}`), opts); }

/* ---------- PULPIT ---------- */
LOADERS.home = async function(){
  const now=new Date(), h=now.getHours();
  const [st, settings] = await Promise.all([api('/api/status'), api('/api/settings')]);
  $('#greet').textContent = (h<5?'Dobranoc':h<12?'Dzień dobry':h<18?'Cześć':'Dobry wieczór') + (st.user ? ', '+st.user : '');
  $('#today-date').textContent = now.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const steps = [];
  if (st.provider === 'ollama') {
    const llm = await api('/api/llm/status').catch(()=>null);
    if (llm && !llm.ollama.running) steps.push(['Zainstaluj darmowy model AI','Pobierz Ollamę z <a href="https://ollama.com/download" target="_blank" rel="noopener">ollama.com</a> (albo uruchom start.bat) — agent będzie działał lokalnie, bez opłat.']);
    else if (llm && !llm.ollama.model_ready) steps.push(['Pobierz model AI',`W Ustawieniach kliknij „Pobierz model” (${esc(llm.model)}).`]);
  } else if (!st.claude) steps.push(['Podłącz mózg agenta','Wklej klucz API Claude albo wybierz darmowy model lokalny.']);
  if (!st.telegram_token) steps.push(['Połącz Telegram','Wklej token bota od @BotFather — przypomnienia przyjdą na telefon.']);
  else if (!st.telegram_chats) steps.push(['Dokończ Telegram', settings.telegram_pending ? `Bot dostał wiadomość od ${esc(settings.telegram_pending.name||settings.telegram_pending.chat_id)} — kliknij „Dodaj ten czat”.` : 'Napisz /start do swojego bota, a potem dodaj czat w Ustawieniach.']);
  if (!st.watch_folders.length) steps.push(['Wskaż foldery ze zdjęciami','Agent będzie wiedział, gdzie są Twoje sesje i teledyski.']);
  $('#onboarding').innerHTML = steps.length ? `<div class="banner"><div class="t"><b>Konfiguracja: zostało ${steps.length} ${steps.length===1?'krok':'kroki'}</b>${steps.map(s=>`<div class="m">• <b>${s[0]}</b> — ${s[1]}</div>`).join('')}</div><button class="btn" data-goto="settings">Ustawienia</button></div>` : '';
  const tomorrow = new Date(now.getTime()+864e5);
  const [ev, tasks, notes, ideas, projects] = await Promise.all([
    api(`/api/events?start=${ymd(now)}&end=${ymd(tomorrow)}`), api('/api/tasks?status=open'),
    api('/api/notifications?limit=6'), api('/api/ideas'), api('/api/projects')]);
  const overdue = tasks.filter(t=>t.due && t.due < nowLocal()).length;
  const unpaid = projects.filter(p=>p.status==='oddany' && !p.paid).reduce((a,p)=>a+(p.fee||0),0);
  $('#home-stats').innerHTML = [
    [ev.filter(e=>e.start.slice(0,10)===ymd(now)).length,'wydarzeń dziś'], [tasks.length,'otwartych zadań'],
    [overdue,'po terminie', overdue?'down':''], [projects.length,'aktywnych projektów'], [fmtMoney(unpaid),'do zapłaty od klientów'],
  ].map(([v,l,c])=>`<div class="stat"><div class="v ${c||''}">${v}</div><div class="l">${l}</div></div>`).join('');
  $('#home-events').innerHTML = ev.length ? ev.map(e=>`<div class="row click" data-ev="${e.id}"><span class="time">${e.start.slice(11,16)}</span><div class="t"><b>${esc(e.title)}</b><div class="m">${e.start.slice(0,10)===ymd(now)?'dziś':'jutro'}${e.location?' · '+esc(e.location):''}</div></div></div>`).join('') : '<div class="empty">Wolne. Dobry moment na kreatywną pracę.</div>';
  $('#home-tasks').innerHTML = tasks.length ? tasks.slice(0,6).map(t=>`<div class="row click" data-task="${t.id}"><div class="t ellipsis"><b>${esc(t.title)}</b>${t.due?`<div class="m ${t.due<nowLocal()?'down':''}">${fmtDT(t.due)}</div>`:''}</div>${t.priority==='high'?'<span class="pill high">pilne</span>':''}</div>`).join('') : '<div class="empty">Wszystko zrobione 🎉</div>';
  $('#home-projects').innerHTML = projects.length ? projects.slice(0,5).map(p=>`<div class="row click" data-proj="${p.id}"><div class="t ellipsis"><b>${esc(p.name)}</b><div class="m">${esc(p.client||'')}${p.deadline?' · oddanie '+fmtDate(p.deadline):''}</div></div><span class="pill accent">${esc(p.status)}</span></div>`).join('') : '<div class="empty">Brak aktywnych projektów.</div>';
  $('#home-notes').innerHTML = notes.length ? notes.map(n=>`<div class="row"><div class="t"><b>${esc(n.title)}</b><div class="m">${fmtDT(n.created)}</div></div></div>`).join('') : '<div class="empty">Cisza.</div>';
  $('#home-ideas').innerHTML = ideas.length ? ideas.slice(0,4).map(i=>`<div class="row click" data-idea="${i.id}"><div class="t ellipsis"><b>${esc(i.title)}</b><div class="m ellipsis">${esc(i.content)}</div></div>${i.category?`<span class="pill accent">${esc(i.category)}</span>`:''}</div>`).join('') : '<div class="empty">Brak pomysłów — powiedz agentowi, co Ci chodzi po głowie.</div>';
  loadMarkets().then(m => {
    $('#home-crypto').innerHTML = m.error && !m.markets.length ? '<div class="empty">Brak danych rynkowych (sprawdź internet).</div>' :
      m.markets.map(c=>`<div class="row"><div class="t"><b>${esc(c.name)}</b> <span class="m">${esc(c.symbol)}</span></div><span>$${num(c.usd)}</span><span class="${cls(c.change_24h)}" style="min-width:64px;text-align:right">${chg(c.change_24h)}</span></div>`).join('') || '<div class="empty">Brak monet na liście.</div>';
  });
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-ev],[data-task],[data-idea],[data-proj],[data-doc]'); if (!t || e.target.closest('button.check,.icon-btn')) return;
  if (t.dataset.ev) edit('events', t.dataset.ev); else if (t.dataset.task) edit('tasks', t.dataset.task);
  else if (t.dataset.idea) editIdea(t.dataset.idea); else if (t.dataset.proj) edit('projects', t.dataset.proj); else if (t.dataset.doc) openDoc(t.dataset.doc);
});
$('#ask-form').onsubmit = e => { e.preventDefault(); const v=$('#ask-input').value.trim(); if(!v) return; $('#ask-input').value=''; show('chat'); sendChat(v); };

/* ---------- CZAT ---------- */
let chatLoaded=false, busy=false, attachments=[];
function addMsg(role, text, images){
  const d=document.createElement('div'); d.className='msg '+role;
  const imgs = (images||[]).map(im=>`<img class="att" src="data:${im.media_type};base64,${im.data}" alt="">`).join('');
  d.innerHTML = imgs + (role==='assistant' ? `<button class="icon-btn speak" title="Przeczytaj na głos"><svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg></button><div class="body">${md(text)}</div>` : esc(text).replace(/\n/g,'<br>'));
  $('#msgs').appendChild(d); $('#msgs').scrollTop=1e9; return d;
}
LOADERS.chat = async function(){
  if (chatLoaded) return; chatLoaded=true;
  const hist = await api('/api/chat/history?session=web');
  $('#msgs').innerHTML='';
  if (!hist.length) addMsg('assistant','Cześć! Jestem Twoim agentem. Planuję, pamiętam pomysły i projekty, znam Twoje pliki, szukam w sieci, oceniam kadry ze zdjęć i piszę do Ciebie na Telegramie. **W czym mogę pomóc?**');
  hist.forEach(m=>addMsg(m.role,m.content));
  $('#chips').hidden = hist.length>0;
  setTimeout(()=>$('#chat-input').focus(), 50);
};
async function sendChat(text){
  await LOADERS.chat();
  if (busy) return;
  const images = attachments; attachments=[]; renderAttach();
  if (!text && !images.length) return;
  busy=true; $('#chat-send').disabled=true; $('#chips').hidden=true;
  addMsg('user', text, images);
  const box = addMsg('assistant','');
  box.innerHTML='<div class="tools"></div><div class="body"><span class="typing"><span></span><span></span><span></span></span></div>';
  const tools = box.querySelector('.tools'), body = box.querySelector('.body');
  let acc = '', changed = new Set();
  try {
    const r = await fetch('/api/chat/stream', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message:text, session:'web', images})});
    if (!r.ok || !r.body) throw new Error(r.statusText);
    const reader = r.body.getReader(), dec = new TextDecoder(); let buf='';
    for(;;){
      const {value, done} = await reader.read(); if (done) break;
      buf += dec.decode(value, {stream:true});
      let i; while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0,i); buf = buf.slice(i+2);
        const line = chunk.split('\n').find(l=>l.startsWith('data: ')); if (!line) continue;
        const ev = JSON.parse(line.slice(6));
        if (ev.type==='text') { acc += ev.text; body.innerHTML = md(acc); }
        else if (ev.type==='tool') { tools.querySelectorAll('.run').forEach(x=>x.classList.remove('run')); tools.insertAdjacentHTML('beforeend', `<span class="pill accent run">${esc(ev.label)}</span>`); }
        else if (ev.type==='changed') { ev.what.forEach(w=>changed.add(w)); }
        else if (ev.type==='done') { body.innerHTML = md(ev.reply); tools.querySelectorAll('.run').forEach(x=>x.classList.remove('run')); }
        $('#msgs').scrollTop=1e9;
      }
    }
  } catch(e) { body.innerHTML = md('⚠️ Nie udało się połączyć z agentem.'); }
  busy=false; $('#chat-send').disabled=false;
  if (changed.size) { refresh([...changed]); toast('Agent zaktualizował: ' + [...changed].map(w=>({tasks:'zadania',events:'kalendarz',ideas:'pomysły',projects:'projekty',memory:'pamięć',alerts:'alerty',notifications:'powiadomienia',files:'pliki'})[w]||w).join(', ')); }
}
$('#chat-form').onsubmit = e => { e.preventDefault(); const v=$('#chat-input').value.trim(); $('#chat-input').value=''; $('#chat-input').style.height=''; sendChat(v); };
$('#chat-input').addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); $('#chat-form').requestSubmit(); } });
$('#chat-input').addEventListener('input', e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,180)+'px'; });
$$('.chip', '#chips').forEach(c=>{ if (c.closest('#chips')) c.onclick=()=>sendChat(c.textContent); });
$('#chat-clear').onclick = async()=>{ await api('/api/chat/history?session=web',{method:'DELETE'}); chatLoaded=false; LOADERS.chat(); $('#chips').hidden=false; };
// załączniki: zmniejszamy zdjęcie w przeglądarce (max 1568 px) zanim trafi do agenta
function resizeImage(file){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1568/Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
      res({media_type:'image/jpeg', data:c.toDataURL('image/jpeg',0.86).split(',')[1]});
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Nie mogę odczytać obrazu')); };
    img.src = url;
  });
}
async function addFiles(files){
  for (const f of [...files].filter(f=>f.type.startsWith('image/')).slice(0, 4-attachments.length)) {
    try { attachments.push(await resizeImage(f)); } catch(e) { toast('⚠️ '+e.message); }
  }
  renderAttach();
}
function renderAttach(){
  const p = $('#attach-preview'); p.hidden = !attachments.length;
  p.innerHTML = attachments.map((a,i)=>`<div><img src="data:${a.media_type};base64,${a.data}" alt=""><button type="button" data-rm="${i}">×</button></div>`).join('');
  p.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ attachments.splice(+b.dataset.rm,1); renderAttach(); });
}
$('#chat-file').onchange = e => { addFiles(e.target.files); e.target.value=''; };
$('#chat-input').addEventListener('paste', e => { const f=[...e.clipboardData.files]; if (f.length) { e.preventDefault(); addFiles(f); } });
const chatBox = $('#chat-box');
chatBox.addEventListener('dragover', e => { e.preventDefault(); chatBox.classList.add('drag'); });
chatBox.addEventListener('dragleave', () => chatBox.classList.remove('drag'));
chatBox.addEventListener('drop', e => { e.preventDefault(); chatBox.classList.remove('drag'); addFiles(e.dataTransfer.files); });

/* ---------- KALENDARZ ---------- */
let calMonth = new Date(); calMonth.setDate(1);
LOADERS.calendar = async function(){
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  $('#cal-title').textContent = MONTHS[m]+' '+y;
  const offset=(new Date(y,m,1).getDay()+6)%7;
  const start = new Date(y,m,1-offset), end=new Date(y,m,1-offset+41);
  const [events, upcoming, projects] = await Promise.all([api(`/api/events?start=${ymd(start)}&end=${ymd(end)}`), api('/api/events'), api('/api/projects')]);
  const byDay = {}; events.forEach(e=>(byDay[e.start.slice(0,10)] ||= []).push(e));
  const deadlines = {}; projects.filter(p=>p.deadline).forEach(p=>(deadlines[p.deadline] ||= []).push(p));
  const today=ymd(new Date());
  let html = ['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d=>`<div class="dow">${d}</div>`).join('');
  for (let i=0;i<42;i++){
    const d=new Date(y,m,1-offset+i), k=ymd(d);
    html += `<div class="day ${d.getMonth()!==m?'other':''} ${k===today?'today':''}" data-day="${k}"><div class="n">${d.getDate()}</div>`
      + (deadlines[k]||[]).map(p=>`<div class="ev deadline" data-proj="${p.id}" title="Oddanie: ${esc(p.name)}">⚑ ${esc(p.name)}</div>`).join('')
      + (byDay[k]||[]).map(e=>`<div class="ev ${esc(e.kind)}" data-ev="${e.id}" title="${esc(e.title)}">${e.start.slice(11,16)} ${esc(e.title)}</div>`).join('') + `</div>`;
  }
  $('#cal').innerHTML = html;
  $$('.day').forEach(d=>d.onclick=e=>{ if (e.target.closest('.ev')) return; openModal('events', {start:d.dataset.day+'T10:00', kind:'sesja'}); });
  $('#upcoming').innerHTML = upcoming.length ? upcoming.slice(0,14).map(e=>`<div class="row click" data-ev="${e.id}"><div class="t"><b>${esc(e.title)}</b><div class="m">${fmtDT(e.start)}${e.location?' · '+esc(e.location):''}${e.client?' · '+esc(e.client):''}</div></div><span class="pill">${esc(e.kind)}</span></div>`).join('') : '<div class="empty">Brak nadchodzących wydarzeń.</div>';
};
$('#cal-prev').onclick=()=>{calMonth.setMonth(calMonth.getMonth()-1); LOADERS.calendar()};
$('#cal-next').onclick=()=>{calMonth.setMonth(calMonth.getMonth()+1); LOADERS.calendar()};
$('#cal-today').onclick=()=>{calMonth=new Date(); calMonth.setDate(1); LOADERS.calendar()};
$('#ev-new').onclick=()=>openModal('events', {start: ymd(new Date())+'T10:00', kind:'sesja'});
$('#ics-file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  const r = await api('/api/calendar/import', {method:'POST', body: await f.text()});
  toast(`Zaimportowano ${r.added} wydarzeń` + (r.skipped?` (pominięto ${r.skipped} duplikatów)`:'')); e.target.value=''; LOADERS.calendar();
};

/* ---------- ZADANIA ---------- */
const NEXT = {todo:'doing', doing:'done', done:'todo'};
let taskProject = '';
LOADERS.tasks = async function(){
  await loadProjectsCache();
  const tasks = await api('/api/tasks' + (taskProject?`?project_id=${taskProject}`:''));
  const used = PROJECTS.filter(p=>!['oplacony','anulowany'].includes(p.status));
  $('#task-filter').innerHTML = used.length ? `<button class="chip ${!taskProject?'active':''}" data-tp="">Wszystkie</button>` + used.map(p=>`<button class="chip ${taskProject==p.id?'active':''}" data-tp="${p.id}">${esc(p.name)}</button>`).join('') : '';
  $$('[data-tp]').forEach(b=>b.onclick=()=>{ taskProject=b.dataset.tp; LOADERS.tasks(); });
  const now = nowLocal();
  $$('.col').forEach(col=>{
    const list = tasks.filter(t=>t.status===col.dataset.status);
    col.querySelector('.cnt').textContent = list.length ? `· ${list.length}` : '';
    col.querySelector('div').innerHTML = list.length ? list.map(t=>`<div class="task ${t.status!=='done'&&t.due&&t.due<now?'overdue':''}" data-task="${t.id}" draggable="true"><button class="check" data-next="${t.id}" data-s="${t.status}" title="Przesuń dalej"></button><div class="t"><b>${esc(t.title)}</b><div class="m">${[ (t.project_id&&projectName(t.project_id)) || t.project, t.due&&fmtDT(t.due)].filter(Boolean).map(esc).join(' · ')}</div></div>${t.priority==='high'?'<span class="pill high">pilne</span>':''}</div>`).join('') : '<div class="empty">—</div>';
  });
  $$('[data-next]').forEach(b=>b.onclick=async e=>{ e.stopPropagation(); await api('/api/crud/tasks/'+b.dataset.next,{method:'PATCH',body:{status:NEXT[b.dataset.s]}}); LOADERS.tasks(); });
  // przeciąganie między kolumnami
  $$('.task[draggable]').forEach(t=>t.ondragstart=e=>e.dataTransfer.setData('text/plain', t.dataset.task));
  $$('.col').forEach(col=>{
    col.ondragover=e=>{e.preventDefault(); col.classList.add('over')}; col.ondragleave=()=>col.classList.remove('over');
    col.ondrop=async e=>{ e.preventDefault(); col.classList.remove('over'); const id=e.dataTransfer.getData('text/plain'); if(id){ await api('/api/crud/tasks/'+id,{method:'PATCH',body:{status:col.dataset.status}}); LOADERS.tasks(); } };
  });
};
$('#task-form').onsubmit = async e => { e.preventDefault(); const d=formData(e.target); d.project=projectName(d.project_id); await api('/api/crud/tasks',{method:'POST',body:d}); e.target.reset(); LOADERS.tasks(); };

/* ---------- PROJEKTY ---------- */
let projFilter = 'active';
const PIPE = ['zapytanie','potwierdzony','produkcja','postprodukcja','oddany','oplacony'];
LOADERS.projects = async function(){
  const all = await api('/api/projects?status=all'); PROJECTS = all;
  const active = all.filter(p=>!['oplacony','anulowany'].includes(p.status));
  const unpaid = all.filter(p=>['oddany'].includes(p.status) && !p.paid);
  const month = ymd(new Date()).slice(0,7);
  const earned = all.filter(p=>(p.paid||p.status==='oplacony') && (p.created||'').slice(0,7)===month).reduce((a,p)=>a+(p.fee||0),0);
  $('#proj-stats').innerHTML = [[active.length,'aktywnych'],[fmtMoney(active.reduce((a,p)=>a+(p.fee||0),0)),'wartość aktywnych'],[fmtMoney(unpaid.reduce((a,p)=>a+(p.fee||0),0)),'czeka na zapłatę'],[fmtMoney(earned),'opłacone (ten miesiąc)']]
    .map(([v,l])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
  const list = projFilter==='active' ? active : projFilter==='unpaid' ? unpaid : all;
  const today = ymd(new Date());
  $('#projects').innerHTML = list.length ? list.map(p=>{
    const step = PIPE.indexOf(p.status), pct = p.all_tasks ? Math.round(100*(p.all_tasks-p.open_tasks)/p.all_tasks) : 0;
    return `<div class="proj" data-proj="${p.id}"><div class="meta"><span class="pill accent">${esc(p.status)}</span><span class="pill">${esc(p.kind||'')}</span>${p.paid?'<span class="pill ok">opłacony</span>':''}${p.deadline&&p.deadline<today&&!['oddany','oplacony','anulowany'].includes(p.status)?'<span class="pill warn">po terminie</span>':''}</div>
      <h3>${esc(p.name)}</h3><div class="m">${esc(p.client||'—')}${p.contact?' · '+esc(p.contact):''}</div>
      <div class="pipeline">${PIPE.map((s,i)=>`<i class="${i<=step?'on':''}" title="${s}"></i>`).join('')}</div>
      <div class="meta"><span class="m">${p.deadline?'Oddanie: '+fmtDate(p.deadline):'Bez terminu'}</span><span style="flex:1"></span><b>${p.fee?fmtMoney(p.fee):''}</b></div>
      ${p.all_tasks?`<div class="m">Zadania: ${p.all_tasks-p.open_tasks}/${p.all_tasks}</div><div class="progress"><i style="width:${pct}%"></i></div>`:''}</div>`;
  }).join('') : '<div class="empty">Brak projektów. Dodaj pierwszy albo powiedz agentowi: „nowe zlecenie: teledysk dla zespołu X, 5000 zł, oddanie 20 grudnia”.</div>';
  $$('.proj').forEach(c=>c.onclick=e=>{ e.stopPropagation(); edit('projects', c.dataset.proj, {extra:{label:'Pokaż zadania', run:()=>{ taskProject=c.dataset.proj; show('tasks'); }}}); });
};
$$('#proj-filter .chip').forEach(c=>c.onclick=()=>{ projFilter=c.dataset.f; $$('#proj-filter .chip').forEach(x=>x.classList.toggle('active',x===c)); LOADERS.projects(); });
$('#proj-new').onclick=()=>openModal('projects',{status:'zapytanie',kind:'sesja'});

/* ---------- POMYSŁY ---------- */
let ideaCat = '';
LOADERS.ideas = async function(){
  const q = $('#idea-q').value.trim();
  const ideas = await api('/api/ideas?q='+encodeURIComponent(q)+'&category='+encodeURIComponent(ideaCat));
  $('#idea-cats').innerHTML = [['','Wszystkie'],...OPT.ideaCat].map(([k,l])=>`<button class="chip ${ideaCat===k?'active':''}" data-cat="${k}">${l}</button>`).join('');
  $$('[data-cat]').forEach(b=>b.onclick=()=>{ ideaCat=b.dataset.cat; LOADERS.ideas(); });
  $('#ideas').innerHTML = ideas.length ? ideas.map(i=>`<div class="idea" data-idea="${i.id}"><h3>${esc(i.title)}</h3>${i.content?`<p>${esc(i.content)}</p>`:''}<div class="foot">${i.category?`<span class="pill accent">${esc(i.category)}</span>`:''}${(i.tags||'').split(',').filter(x=>x.trim()).map(t=>`<span class="pill">#${esc(t.trim())}</span>`).join('')}<span style="flex:1"></span><span class="pill ${i.status==='zrealizowany'?'ok':''}">${esc(i.status)}</span></div></div>`).join('') : '<div class="empty">Brak pomysłów.</div>';
};
function editIdea(id){
  edit('ideas', id, {extra:{label:'Rozwiń z agentem ✨', run: async () => {
    const i = await api('/api/crud/ideas/'+id);
    show('chat'); sendChat(`Rozwiń mój pomysł #${i.id} „${i.title}”: ${i.content||''}\nZaproponuj koncept, klimat, światło, kadry/shot-listę, sprzęt, lokację i budżet. Na koniec zaktualizuj pomysł (update_idea) o najważniejsze ustalenia.`);
  }}});
}
$('#idea-new').onclick=()=>openModal('ideas',{category:'sesja',status:'nowy'});
let ideaT; $('#idea-q').oninput=()=>{clearTimeout(ideaT); ideaT=setTimeout(LOADERS.ideas,250)};

/* ---------- PLIKI ---------- */
const KIND_LBL = {zdjecie:'Zdjęcia',raw:'RAW',wideo:'Wideo',audio:'Audio',projekt:'Projekty',dokument:'Dokumenty',inne:'Inne'};
const THUMBABLE = new Set(['zdjecie','raw','wideo']);
let scanPoll = null;
LOADERS.files = async function(){
  const s = await api('/api/files/stats');
  $('#files-sub').innerHTML = s.watch_folders.length
    ? `Foldery: ${s.watch_folders.map(f=>`<code>${esc(f)}</code>`).join(' ')} · ostatni skan: ${fmtDT(s.last_index)||'—'}${s.exif?' · EXIF włączony':''}`
    : 'Nie wskazano jeszcze folderów. <a href="#settings" data-goto="settings">Ustaw je w Ustawieniach</a> (np. <code>D:\\Zdjecia;D:\\Teledyski</code>).';
  $('#file-stats').innerHTML = `<div class="stat"><div class="v">${s.total.count.toLocaleString('pl-PL')}</div><div class="l">plików · ${fmtSize(s.total.size)}</div></div>` + s.by_kind.map(k=>`<div class="stat"><div class="v">${k.count.toLocaleString('pl-PL')}</div><div class="l">${KIND_LBL[k.kind]||k.kind} · ${fmtSize(k.size)}</div></div>`).join('');
  const fill = (sel, rows, key, lbl) => { const v=$(sel).value; $(sel).innerHTML = `<option value="">${lbl}</option>` + rows.map(r=>`<option value="${esc(r[key])}">${esc(r[key])} (${r.count})</option>`).join(''); $(sel).value=v; };
  fill('#file-camera', s.cameras, 'camera', 'Każdy aparat'); fill('#file-lens', s.lenses, 'lens', 'Każdy obiektyw');
  scanState(s.status);
  if (!$('#file-results').dataset.loaded) { $('#file-results').dataset.loaded=1; runFileSearch(); }
};
function scanState(st){
  $('#scan-status').textContent = st.running ? `Skanuję… ${st.scanned.toLocaleString('pl-PL')} plików` : '';
  $('#reindex').disabled = st.running;
  clearTimeout(scanPoll);
  if (st.running) scanPoll = setTimeout(async()=>{ const s = await api('/api/files/stats'); scanState(s.status); if (!s.status.running && current==='files') { LOADERS.files(); runFileSearch(); } }, 1500);
}
async function runFileSearch(){
  const mode = $('#file-mode').value;
  const qs = new URLSearchParams({q:$('#file-q').value, kind:$('#file-kind').value, camera:$('#file-camera').value, lens:$('#file-lens').value, after:$('#file-after').value, before:$('#file-before').value, folders: mode==='folders'});
  const rows = await api('/api/files/search?'+qs);
  const out = $('#file-results');
  if (!rows.length) { out.innerHTML = '<div class="card"><div class="empty">Nic nie znaleziono.</div></div>'; return; }
  if (mode==='folders') {
    out.innerHTML = '<div class="card">' + rows.map(r=>`<div class="row"><div class="t"><b class="ellipsis" style="display:block">${esc(r.folder)}</b><div class="m">${r.files} plików · ${fmtSize(r.size)} · ${esc((r.kinds||'').split(',').map(k=>KIND_LBL[k]||k).join(', '))} · zmiana ${fmtDT(r.last_modified)}</div></div><button class="btn ghost" data-open="${esc(r.folder)}">${ICON.folder} Otwórz</button></div>`).join('') + '</div>';
  } else if (mode==='grid') {
    out.innerHTML = '<div class="gallery">' + rows.map(r=>{
      const thumb = THUMBABLE.has(r.kind) ? `style="background-image:url('/api/files/thumb?size=360&path=${encodeURIComponent(r.path)}')"` : '';
      const exif = [r.focal, r.aperture, r.iso?'ISO '+r.iso:''].filter(Boolean).join(' · ');
      return `<div class="ph" data-path="${esc(r.path)}" data-kind="${r.kind}" data-folder="${esc(r.folder)}"><div class="img" ${thumb}>${thumb?'':esc(r.ext)}</div><div class="cap"><b class="ellipsis">${esc(r.name)}</b><span class="m ellipsis" style="display:block">${esc(exif || fmtDT(r.taken||r.mtime))}</span></div></div>`;
    }).join('') + '</div>';
    $$('.ph').forEach(p=>p.onclick=()=>openLightbox(rows.find(r=>r.path===p.dataset.path)));
  } else {
    out.innerHTML = '<div class="card">' + rows.map(r=>`<div class="row"><div class="t"><b class="ellipsis" style="display:block">${esc(r.name)}</b><div class="m ellipsis">${esc(r.folder)} · ${fmtSize(r.size)} · ${fmtDT(r.taken||r.mtime)}${r.camera?' · '+esc(r.camera):''}${r.lens?' · '+esc(r.lens):''}</div></div><span class="pill">${KIND_LBL[r.kind]||r.kind}</span><button class="btn ghost" data-open="${esc(r.folder)}">${ICON.folder}</button></div>`).join('') + '</div>';
  }
}
function openLightbox(r){
  if (!r) return;
  const lb = $('#lightbox'); lb.hidden=false;
  const img = lb.querySelector('img'); img.hidden = !THUMBABLE.has(r.kind);
  img.src = THUMBABLE.has(r.kind) ? '/api/files/thumb?size=1600&path='+encodeURIComponent(r.path) : '';
  lb.querySelector('.lb-info').innerHTML = `<b>${esc(r.name)}</b><br>${[r.camera,r.lens,r.focal,r.aperture,r.shutter&&r.shutter+' s',r.iso&&'ISO '+r.iso].filter(Boolean).map(esc).join(' · ')}<br><span style="opacity:.7">${esc(r.folder)} · ${fmtSize(r.size)} · ${fmtDT(r.taken||r.mtime)}</span><br><button class="btn ghost" style="margin-top:10px" data-open="${esc(r.folder)}">${ICON.folder} Otwórz folder</button>`;
}
$('#lightbox').onclick = e => { if (!e.target.closest('[data-open]')) $('#lightbox').hidden = true; };
document.addEventListener('click', async e => { const b = e.target.closest('[data-open]'); if (!b) return; e.stopPropagation(); const r = await api('/api/files/open',{method:'POST',body:{path:b.dataset.open}}); toast(r.ok?'Otwieram folder na komputerze…':'Nie mogę otworzyć tego folderu'); });
$('#file-form').onsubmit = e => { e.preventDefault(); runFileSearch(); };
$('#file-mode').onchange = runFileSearch;
$('#reindex').onclick = async()=>{ await api('/api/files/reindex',{method:'POST'}); toast('Skanuję foldery…'); scanState({running:true, scanned:0}); };

/* ---------- KRYPTO ---------- */
const num = v => v==null ? '—' : Number(v).toLocaleString('en-US',{maximumFractionDigits: v<1?4:2});
const cls = ch => ch==null?'':(ch>=0?'up':'down');
const chg = ch => ch==null?'—':(ch>=0?'+':'')+ch.toFixed(2)+'%';
let marketsCache = null;
async function loadMarkets(){
  if (marketsCache && Date.now()-marketsCache.t < 60000) return marketsCache.d;
  const d = await api('/api/crypto').catch(()=>({markets:[],watchlist:[],error:'offline'}));
  marketsCache = {t:Date.now(), d}; return d;
}
function spark(values, up){
  if (!values?.length) return '';
  const min=Math.min(...values), max=Math.max(...values), w=240, h=56, r=(max-min)||1;
  const pts = values.map((v,i)=>`${(i/(values.length-1)*w).toFixed(1)},${(h-4-(v-min)/r*(h-8)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" style="stroke:var(${up?'--ok':'--warn'});stroke-width:1.6"/></svg>`;
}
LOADERS.crypto = async function(){
  const d = await loadMarkets();
  $('#coin-list').innerHTML = d.watchlist.map(c=>`<option value="${esc(c)}">`).join('');
  $('#coins').innerHTML = d.markets.length ? d.markets.map(c=>`<div class="coin"><div class="hd">${c.image?`<img src="${esc(c.image)}" alt="">`:''}<b>${esc(c.name)}</b><span class="m">${esc(c.symbol)}</span></div>
    <div class="price">$${num(c.usd)}</div><div class="m">${c.pln?num(c.pln)+' zł · ':''}24h <span class="${cls(c.change_24h)}">${chg(c.change_24h)}</span> · 7d <span class="${cls(c.change_7d)}">${chg(c.change_7d)}</span></div>${spark(c.spark, (c.change_7d||0)>=0)}</div>`).join('')
    : `<div class="card"><div class="empty">Brak danych z CoinGecko${d.error?' ('+esc(d.error)+')':''}. Obserwowane: ${esc(d.watchlist.join(', ')||'—')}</div></div>`;
  const al = await api('/api/alerts');
  $('#alerts').innerHTML = al.length ? al.map(a=>`<div class="row"><div class="t"><b style="text-transform:capitalize">${esc(a.coin)}</b> ${a.direction==='above'?'≥':'≤'} ${num(a.price)} ${esc(a.currency.toUpperCase())}</div><span class="pill ${a.active?'accent':''}">${a.active?'aktywny':'zadziałał'}</span><button class="icon-btn del" data-del-alert="${a.id}">${ICON.trash}</button></div>`).join('') : '<div class="empty">Brak alertów.</div>';
  $$('[data-del-alert]').forEach(b=>b.onclick=async()=>{ await api('/api/crud/alerts/'+b.dataset.delAlert,{method:'DELETE'}); LOADERS.crypto(); });
};
$('#alert-form').onsubmit = async e => { e.preventDefault(); await api('/api/alerts',{method:'POST',body:formData(e.target)}); e.target.reset(); toast('Alert ustawiony'); LOADERS.crypto(); };

/* ---------- POWIADOMIENIA ---------- */
const LVL = {reminder:'przypomnienie', crypto:'krypto', brief:'brief', alert:'alert', info:'info'};
LOADERS.notifications = async function(){
  const n = await api('/api/notifications?limit=100');
  $('#notes').innerHTML = n.length ? n.map(x=>`<div class="row" style="align-items:flex-start"><div class="t"><b>${esc(x.title)}</b>${x.body?`<div class="m" style="white-space:pre-wrap">${x.level==='brief'?md(x.body):esc(x.body)}</div>`:''}<div class="m">${fmtDT(x.created)}</div></div><span class="pill ${x.read?'':'accent'}">${LVL[x.level]||x.level}</span><button class="icon-btn del" data-del-note="${x.id}">${ICON.trash}</button></div>`).join('') : '<div class="empty">Brak powiadomień.</div>';
  $$('[data-del-note]').forEach(b=>b.onclick=async()=>{ await api('/api/crud/notifications/'+b.dataset.delNote,{method:'DELETE'}); LOADERS.notifications(); });
  await api('/api/notifications/read',{method:'POST'}); poll();
};
$('#test-notify').onclick = async()=>{ const r=await api('/api/notifications/test',{method:'POST'}); toast(r.telegram?'Wysłano — sprawdź Telegram':'Wysłano do dashboardu (Telegram nie jest jeszcze połączony)'); LOADERS.notifications(); };
$('#notes-clear').onclick = async()=>{ if(!confirm('Usunąć wszystkie powiadomienia?')) return; await api('/api/notifications',{method:'DELETE'}); LOADERS.notifications(); };

/* ---------- USTAWIENIA ---------- */
const GROUPS = [
  {title:'Mózg agenta — model AI', keys:['LLM_PROVIDER','OLLAMA_MODEL','OLLAMA_VISION_MODEL','OLLAMA_URL','OLLAMA_CTX'], id:'llm'},
  {title:'Claude — opcjonalnie (chmura, płatny)', keys:['ANTHROPIC_API_KEY','AGENT_MODEL','AGENT_EFFORT','AGENT_FALLBACKS'], id:'claude'},
  {title:'Telegram', keys:['TELEGRAM_BOT_TOKEN','TELEGRAM_ALLOWED_CHAT_IDS'], id:'telegram'},
  {title:'Ty', keys:['USER_NAME','USER_PROFILE','LOCATION','TIMEZONE']},
  {title:'Głos i rozmowa', keys:['VOICE_MODE','VOICE_TTS','VOICE_NAME','PIPER_VOICE','VOICE_STT','WHISPER_MODEL','TELEGRAM_VOICE_REPLY'], id:'voice'},
  {title:'Wyszukiwanie i komputer', keys:['SEARXNG_URL','COMPUTER_SHELL']},
  {title:'Pliki na dysku', keys:['WATCH_FOLDERS','INDEX_EXIF']},
  {title:'Harmonogram i przypomnienia', keys:['MORNING_BRIEF_ENABLED','MORNING_BRIEF_HOUR','MORNING_BRIEF_MINUTE','REMINDER_MINUTES']},
  {title:'Krypto', keys:['CRYPTO_WATCHLIST','CRYPTO_CHECK_MINUTES']},
  {title:'Serwer', keys:['HOST','PORT']},
];
const BOOL = new Set(['AGENT_FALLBACKS','INDEX_EXIF','MORNING_BRIEF_ENABLED','TELEGRAM_VOICE_REPLY','COMPUTER_SHELL']);
const SELECTS = {
  LLM_PROVIDER:[['ollama','Lokalny model (Ollama) — darmowy, prywatny'],['claude','Claude (chmura) — najmądrzejszy, płatny']],
  VOICE_NAME:[['pl-PL-ZofiaNeural','Zofia — kobiecy'],['pl-PL-MarekNeural','Marek — męski']],
  VOICE_TTS:[['edge','Naturalny głos (edge-tts, internet)'],['piper','Głos offline (Piper, lokalnie)'],['browser','Głos systemu (przeglądarka)']],
  PIPER_VOICE:[['pl_PL-gosia-medium','Gosia — kobiecy'],['pl_PL-darkman-medium','Darkman — męski'],['pl_PL-mc_speech-medium','MC Speech — męski']],
  VOICE_MODE:[['ptt','Dyktafon — mikrofon tylko po naciśnięciu'],['auto','Ciągłe słuchanie (jak telefon)']],
  VOICE_STT:[['browser','Przeglądarka (Chrome/Edge) — zalecane'],['whisper','Whisper — lokalnie, działa offline i w Firefoksie']],
  WHISPER_MODEL:[['tiny','tiny — najszybszy'],['base','base'],['small','small — zalecany'],['medium','medium — najdokładniejszy, wolny']],
  AGENT_EFFORT:[['low','low — szybko i tanio'],['medium','medium — zalecane'],['high','high — dokładniej'],['xhigh','xhigh'],['max','max — najdokładniej, najdrożej']] };
const DATALIST = { OLLAMA_MODEL:['qwen3:8b','qwen3:4b','qwen3:14b','llama3.1:8b'], OLLAMA_VISION_MODEL:['qwen2.5vl:7b','qwen2.5vl:3b','gemma3:12b'], AGENT_MODEL:['claude-opus-5-5','claude-sonnet-5-5','claude-haiku-5-5','claude-fable-5-2'] };
let settingsOrig = {};
LOADERS.settings = async function(){
  const [s, st] = await Promise.all([api('/api/settings'), api('/api/status')]);
  const byKey = Object.fromEntries(s.settings.map(x=>[x.key,x])); settingsOrig = {};
  const field = k => {
    const x = byKey[k]; settingsOrig[k] = x.value;
    if (BOOL.has(k)) return `<div class="field inline"><input type="checkbox" name="${k}" id="s-${k}" ${x.value!=='0'?'checked':''}><label for="s-${k}">${esc(x.label.replace(/\s*\(1\/0\)/,''))}</label></div>`;
    let input;
    if (SELECTS[k]) input = `<select name="${k}">${SELECTS[k].map(([v,l])=>`<option value="${v}" ${x.value===v?'selected':''}>${l}</option>`).join('')}</select>`;
    else if (k==='USER_PROFILE') input = `<textarea name="${k}" rows="3">${esc(x.value)}</textarea>`;
    else if (k==='WATCH_FOLDERS') input = `<textarea name="${k}" rows="3" placeholder="D:\\Zdjecia;D:\\Teledyski">${esc(x.value.split(';').join(';\n'))}</textarea><span class="hint">Każdy folder w nowej linii lub po średniku.</span>`;
    else if (x.secret) input = `<input name="${k}" type="password" autocomplete="off" placeholder="${x.set?esc(x.value)+' (zapisany — wpisz nowy, aby zmienić)':'wklej tutaj'}">`;
    else input = `<input name="${k}" value="${esc(x.value)}" ${DATALIST[k]?`list="dl-${k}"`:''}>${DATALIST[k]?`<datalist id="dl-${k}">${DATALIST[k].map(m=>`<option value="${m}">`).join('')}</datalist>`:''}`;
    return `<div class="field"><label>${esc(x.label)}</label>${input}</div>`;
  };
  const tgLine = st.telegram ? `<span class="dot on"></span>Połączony jako <b>@${esc(st.telegram_bot)}</b> · odbiorcy: ${st.telegram_chats}`
    : st.telegram_error ? `<span class="dot off"></span>Błąd: ${esc(st.telegram_error)}` : st.telegram_token ? '<span class="dot off"></span>Token zapisany, bot nie działa' : '<span class="dot off"></span>Niepołączony';
  const pending = s.telegram_pending ? `<div class="banner"><div class="t">Bot dostał <b>/start</b> od <b>${esc(s.telegram_pending.name||'')}</b> (chat_id ${esc(s.telegram_pending.chat_id)}).</div><button type="button" class="btn" id="tg-pair">Dodaj ten czat</button></div>` : '';
  $('#settings-groups').innerHTML = GROUPS.map(g=>`<div class="card set-group"><h2>${g.title}</h2>
    ${g.id==='llm'?`<div id="llm-status" class="status-line"><span class="m">Sprawdzam Ollamę…</span></div><div id="llm-pull"></div>`:''}
    ${g.id==='claude'?`<div class="status-line"><span class="dot ${st.anthropic_key?'on':'off'}"></span>${st.anthropic_key?'Klucz zapisany':'Brak klucza — <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">pobierz klucz</a>'}<span style="flex:1"></span></div>`:''}
    ${g.id==='voice'?`<div class="status-line"><span class="dot ${st.voice.tts_engine==='edge'?'on':''}"></span>Synteza: ${st.voice.tts_engine==='edge'?'naturalny głos':'głos przeglądarki'} · Whisper: ${st.voice.whisper_installed?(st.voice.whisper_loaded?'załadowany':'zainstalowany'):'niezainstalowany'}<span style="flex:1"></span><button type="button" class="btn ghost sq" id="voice-test">Posłuchaj</button></div>`:''}
    ${g.id==='telegram'?`<div class="status-line">${tgLine}</div>${pending}<p class="hint" style="margin:0 0 12px">1) W Telegramie: @BotFather → /newbot → skopiuj token. 2) Zapisz token tutaj. 3) Napisz do bota /start i kliknij „Dodaj ten czat”.</p>`:''}
    ${g.keys.map(field).join('')}</div>`).join('');
  $('#voice-test')?.addEventListener('click', async ()=>{ VOICE_STATUS=null; await speakText(`Cześć${st.user?', '+st.user:''}! Tak brzmi mój głos. W czym mogę pomóc?`); });
  $('#tg-pair')?.addEventListener('click', async()=>{ await api('/api/settings/telegram/pair',{method:'POST'}); toast('Telegram połączony ✓ — sprawdź telefon'); LOADERS.settings(); poll(); });
  $('#test-claude')?.addEventListener('click', async e=>{ e.target.disabled=true; const r = await api('/api/settings/test-claude',{method:'POST'}); e.target.disabled=false; toast(r.ok?'✓ Połączenie z Claude działa':'⚠️ '+r.error); });
  loadLlmStatus();
  api('/api/profile').then(p => { $('#profile-text').value = p.text; });
  $('#jobs').innerHTML = st.jobs.map(j=>`<div class="row"><span class="dot ${j.enabled?'on':''}"></span><div class="t"><b>${esc(j.label)}</b><div class="m">${j.enabled?'następnie: '+esc(j.next_run||'—'):'wyłączone'}</div></div><button class="btn ghost sq" data-run="${j.id}">Uruchom teraz</button></div>`).join('');
  $$('[data-run]').forEach(b=>b.onclick=async()=>{ await api(`/api/jobs/${b.dataset.run}/run`,{method:'POST'}); toast('Uruchomiono: '+b.closest('.row').querySelector('b').textContent); setTimeout(poll, 4000); });
  $('#disk').textContent = st.disk ? `Wolne miejsce na dysku z danymi: ${fmtSize(st.disk.free)} z ${fmtSize(st.disk.total)}` : '';
  const mem = await api('/api/memory');
  const ms = await api('/api/memory/summary');
  $('#mem-summary').innerHTML = `<div class="banner" style="display:block"><b>Notatnik rozmów</b> <span class="m">· ${ms.messages} zapisanych wiadomości (czat, Telegram, rozmowy głosowe)${ms.summary?' · aktualizacja '+fmtDT(ms.summary.created):''}</span>${ms.summary?`<div class="md" style="margin-top:8px">${md(ms.summary.text)}</div>`:'<div class="m">Agent zacznie streszczać starsze rozmowy, gdy uzbiera się ich więcej. Wszystko, co powiesz, zostaje w historii i agent może do tego wrócić.</div>'}</div>`;
  $('#memory').innerHTML = mem.length ? mem.map(m=>`<div class="row"><div class="t">${esc(m.fact)}</div><span class="m">${fmtDate(m.created)}</span><button class="icon-btn del" data-del-mem="${m.id}">${ICON.trash}</button></div>`).join('') : '<div class="empty">Agent jeszcze nic o Tobie nie wie. Opowiedz mu o sobie w czacie.</div>';
  $$('[data-del-mem]').forEach(b=>b.onclick=async()=>{ await api('/api/crud/memory/'+b.dataset.delMem,{method:'DELETE'}); LOADERS.settings(); });
};
$('#settings-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, changes = {};
  for (const k of Object.keys(settingsOrig)) {
    const el = f.elements[k]; if (!el) continue;
    let v = BOOL.has(k) ? (el.checked?'1':'0') : el.value.trim();
    if (k==='WATCH_FOLDERS') v = v.split(/[;\n]+/).map(s=>s.trim()).filter(Boolean).join(';');
    if (el.type==='password') { if (v) changes[k]=v; continue; }
    if (v !== settingsOrig[k]) changes[k] = v;
  }
  if (!Object.keys(changes).length) { toast('Brak zmian'); return; }
  const r = await api('/api/settings',{method:'POST',body:changes});
  $('#settings-msg').textContent = `Zapisano: ${r.changed.length} ${r.changed.length===1?'zmiana':'zmiany'}.` + (r.restart_needed?' Zmiana adresu/portu zadziała po ponownym uruchomieniu.':'');
  toast('Ustawienia zapisane ✓'); marketsCache=null;
  setTimeout(()=>{ LOADERS.settings(); poll(); }, 900);
};
$('#mem-form').onsubmit = async e => { e.preventDefault(); await api('/api/crud/memory',{method:'POST',body:formData(e.target)}); e.target.reset(); LOADERS.settings(); };

/* ---------- WYSZUKIWANIE GLOBALNE ---------- */
let gT;
$('#gsearch').oninput = () => { clearTimeout(gT); gT = setTimeout(globalSearch, 220); };
$('#gsearch').onfocus = () => { if ($('#gsearch').value.trim()) globalSearch(); };
document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); $('#gsearch').focus(); } });
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) $('#gsearch-res').hidden = true; });
async function globalSearch(){
  const q = $('#gsearch').value.trim(), box = $('#gsearch-res');
  if (q.length < 2) { box.hidden = true; return; }
  const r = await api('/api/search?q='+encodeURIComponent(q));
  const grp = (title, items, render) => items.length ? `<div class="grp">${title}</div>` + items.map(render).join('') : '';
  const html = grp('Kalendarz', r.events, e=>`<button data-ev="${e.id}">${esc(e.title)} <span class="m">${fmtDT(e.start)}</span></button>`)
    + grp('Zadania', r.tasks, t=>`<button data-task="${t.id}">${esc(t.title)} <span class="m">${esc(t.status)}</span></button>`)
    + grp('Projekty', r.projects, p=>`<button data-proj="${p.id}">${esc(p.name)} <span class="m">${esc(p.client||'')}</span></button>`)
    + grp('Pomysły', r.ideas, i=>`<button data-idea="${i.id}">${esc(i.title)}</button>`)
    + grp('Dokumenty', r.documents||[], d=>`<button data-doc="${d.id}">${esc(d.title)} <span class="m">${esc(d.kind)}</span></button>`)
    + grp('Z rozmów', r.conversations||[], c=>`<button data-ask="${esc(q)}"><span class="m">${fmtDT(c.created)} · ${c.role==='user'?'Ty':'Agent'}:</span> ${esc(c.fragment)}</button>`)
    + grp('Foldery', r.folders, f=>`<button data-open="${esc(f.folder)}">${esc(f.folder.split(/[\\/]/).slice(-2).join('/'))} <span class="m">${f.files} plików</span></button>`);
  box.innerHTML = html || `<div class="grp">Brak wyników</div><button data-ask="${esc(q)}">Zapytaj agenta: „${esc(q)}”</button>`;
  box.hidden = false;
  box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ box.hidden=true; if (b.dataset.ask) { show('chat'); sendChat('Przypomnij mi, co ustaliliśmy w sprawie: '+b.dataset.ask); } }));
}

/* ---------- status + powiadomienia przeglądarki ---------- */
let lastNoteId = null;
async function poll(){
  try{
    const s = await api('/api/status');
    $('#dot-claude').className='dot '+(s.claude?'on':'off');
    $('#brain-label').textContent = s.provider==='ollama' ? 'Model lokalny' : 'Claude';
    $('#dot-tg').className='dot '+(s.telegram&&s.telegram_chats?'on':'off');
    const u=$('#unread'); u.hidden=!s.unread; u.textContent=s.unread;
    if (lastNoteId!==null && s.last_notification > lastNoteId) {
      const [n] = await api('/api/notifications?limit=1');
      toast('🔔 ' + n.title);
      if ('Notification' in window && Notification.permission==='granted') new Notification(n.title,{body:n.body});
      if (current==='home') LOADERS.home();
    }
    lastNoteId = s.last_notification || 0;
    window.USER_NAME = s.user;
  }catch(e){}
}
if ('Notification' in window && Notification.permission==='default') document.addEventListener('click',()=>Notification.requestPermission(),{once:true});
setInterval(poll, 20000); poll();

loadProjectsCache().finally(()=> show((location.hash||'').slice(1) || store.get('view','home')));
window.addEventListener('hashchange', ()=>{ const v=location.hash.slice(1); if (v && v!==current) show(v); });


/* ---------- DOKUMENTY ---------- */
const DOC_KINDS = [['','Wszystkie'],['shotlista','Shot-listy'],['wycena','Wyceny'],['brief','Briefy'],['callsheet','Call sheety'],['scenariusz','Scenariusze'],['notatka','Notatki']];
let docKind = '';
LOADERS.documents = async function(){
  const q = $('#doc-q').value.trim();
  const docs = await api('/api/documents?q='+encodeURIComponent(q)+'&kind='+docKind);
  $('#doc-kinds').innerHTML = DOC_KINDS.map(([k,l])=>`<button class="chip ${docKind===k?'active':''}" data-dk="${k}">${l}</button>`).join('');
  $$('[data-dk]').forEach(b=>b.onclick=()=>{ docKind=b.dataset.dk; LOADERS.documents(); });
  $('#docs').innerHTML = docs.length ? docs.map(d=>`<div class="doc" data-doc="${d.id}"><div class="meta"><span class="pill accent">${esc(d.kind)}</span>${d.project_id?`<span class="pill">${esc(projectName(d.project_id))}</span>`:''}</div><h3>${esc(d.title)}</h3><div class="pv">${esc((d.preview||'').replace(/[|*#_-]{2,}/g,' '))}</div><div class="m">${fmtDT(d.updated||d.created)}</div></div>`).join('')
    : '<div class="empty">Brak dokumentów. Poproś agenta np. „przygotuj shot-listę do teledysku Nocne Miasto” albo „zrób wycenę sesji ślubnej”.</div>';
};
let docT; $('#doc-q').oninput=()=>{clearTimeout(docT); docT=setTimeout(LOADERS.documents,250)};
$('#doc-new').onclick=()=>openModal('documents',{kind:'notatka'},{onSaved:LOADERS.documents});
let docOpen = null;
async function openDoc(id){
  const d = await api('/api/crud/documents/'+id); docOpen = d;
  $('#dv-title').textContent = d.title;
  $('#dv-meta').textContent = `${d.kind}${d.project_id?' · '+projectName(d.project_id):''} · ${fmtDT(d.updated||d.created)}`;
  $('#dv-body').innerHTML = md(d.content||'');
  $('#dv-dl').href = `/api/documents/${d.id}/download`;
  $('#docview').hidden = false;
}
$('#dv-x').onclick = () => $('#docview').hidden = true;
$('#docview').addEventListener('mousedown', e => { if (e.target.id==='docview') $('#docview').hidden = true; });
$('#dv-print').onclick = () => window.print();
$('#dv-edit').onclick = () => { $('#docview').hidden = true; openModal('documents', docOpen, {onSaved: () => { if (current==='documents') LOADERS.documents(); openDoc(docOpen.id); }}); };

/* ---------- UMIEJĘTNOŚCI ---------- */
LOADERS.skills = async function(){
  const d = await api('/api/skills');
  $('#skills').innerHTML = d.skills.map(s=>`<div class="skill ${s.enabled?'':'off'}"><div class="hd"><h3>${esc(s.name)}</h3><button class="switch ${s.enabled?'on':''}" data-sk-toggle="${esc(s.id)}" title="${s.enabled?'Wyłącz':'Włącz'}"></button></div>
    <div class="m">${esc(s.description)}</div><div class="meta"><span class="pill ${s.builtin?'':'accent'}">${s.builtin?'wbudowana':'własna'}</span><span style="flex:1"></span>
    <button class="btn ghost sq" data-sk-try="${esc(s.name)}">Użyj</button><button class="btn ghost sq" data-sk-edit="${esc(s.id)}">Edytuj</button></div></div>`).join('') || '<div class="empty">Brak umiejętności.</div>';
  $$('[data-sk-toggle]').forEach(b=>b.onclick=async()=>{ await api('/api/skills/'+b.dataset.skToggle,{method:'PATCH',body:{enabled:!b.classList.contains('on')}}); LOADERS.skills(); });
  $$('[data-sk-edit]').forEach(b=>b.onclick=()=>skillModal(d.skills.find(s=>s.id===b.dataset.skEdit)));
  $$('[data-sk-try]').forEach(b=>b.onclick=()=>{ show('chat'); $('#chat-input').value = `Użyj umiejętności „${b.dataset.skTry}”: `; $('#chat-input').focus(); });
  $('#tools-count').textContent = `${d.tools.length} wbudowanych + ${d.mcp.reduce((a,m)=>a+m.tools.length,0)} z MCP`;
  $('#tools-grid').innerHTML = d.tools.map(t=>`<div class="tool-item"><b>${esc(t.label)}</b><span class="m">${esc(t.description.split('.')[0])}</span></div>`).join('');
  $('#mcp-status').innerHTML = !d.mcp_available ? '<div class="m">Biblioteka mcp nie jest zainstalowana (pip install mcp).</div>' : d.mcp.length ? d.mcp.map(m=>`<div class="mcp-row"><span class="dot ${m.status==='działa'?'on':m.status==='wyłączony'?'':'off'}"></span><div class="t"><b>${esc(m.name)}</b> <span class="m">${esc(m.status)}${m.tools.length?' · '+m.tools.length+' narzędzi: '+m.tools.slice(0,6).map(t=>esc(t.name)).join(', ')+(m.tools.length>6?'…':''):''}</span>${m.error?`<div class="m down">${esc(m.error)}</div>`:''}</div></div>`).join('') : '<div class="m">Brak podłączonych serwerów MCP.</div>';
  const cfg = await api('/api/mcp/config'); $('#mcp-config').value = cfg.text; $('#mcp-config').dataset.example = cfg.example;
};
function skillModal(s){
  const sk = s || {name:'', description:'', body:'1. \n2. \n3. '};
  modalState = {table:'_skill', id:sk.id};
  $('#modal-title').textContent = s ? 'Edytuj umiejętność' : 'Nowa umiejętność';
  $('#modal-body').innerHTML = `<div class="field full"><label>Nazwa</label><input name="name" required value="${esc(sk.name)}"></div>
    <div class="field full"><label>Kiedy jej użyć (jedno zdanie – agent czyta to, żeby zdecydować)</label><input name="description" value="${esc(sk.description)}"></div>
    <div class="field full"><label>Instrukcje krok po kroku dla agenta</label><textarea name="body" rows="14">${esc(sk.body)}</textarea></div>`;
  $('#modal-del').hidden = !s; $('#modal-extra').hidden = true;
  $('#modal').hidden = false;
}
$('#skill-new').onclick = () => skillModal(null);
// zapis/usuwanie umiejętności przez wspólne okno
const _origSubmit = $('#modal-form').onsubmit, _origDel = $('#modal-del').onclick;
$('#modal-form').onsubmit = async e => {
  if (modalState?.table !== '_skill') return _origSubmit(e);
  e.preventDefault(); const d = formData(e.target);
  await api('/api/skills',{method:'POST',body:{...d, id: modalState.id}}); closeModal(); toast('Umiejętność zapisana ✓'); LOADERS.skills();
};
$('#modal-del').onclick = async () => {
  if (modalState?.table !== '_skill') return _origDel();
  if (!confirm('Usunąć tę umiejętność?')) return;
  await api('/api/skills/'+modalState.id,{method:'DELETE'}); closeModal(); LOADERS.skills();
};
$('#mcp-save').onclick = async () => { const r = await api('/api/mcp/config',{method:'POST',body:{text:$('#mcp-config').value}}); toast('Zapisano — połączono serwery: '+r.servers.filter(s=>s.status==='działa').length); LOADERS.skills(); };
$('#mcp-reload').onclick = async () => { await api('/api/mcp/reload',{method:'POST'}); LOADERS.skills(); };
$('#mcp-example').onclick = () => { const ex = $('#mcp-config').dataset.example; if (ex) { $('#mcp-config').value = ex; toast('Wstawiono przykłady (wyłączone). Włącz wybrane: "enabled": true'); } };
function chatGreetingName(){ return window.USER_NAME ? ', ' + window.USER_NAME : ''; }


/* ---------- MODEL AI (Ollama) ---------- */
let pullPoll = null;
async function loadLlmStatus(){
  const box = $('#llm-status'); if (!box) return;
  const d = await api('/api/llm/status').catch(()=>null); if (!d) return;
  const o = d.ollama;
  if (d.provider !== 'ollama') { box.innerHTML = '<span class="dot"></span>Używasz Claude (chmura). Wybierz „Lokalny model”, żeby działać za darmo.'; return; }
  if (!o.running) { box.innerHTML = `<span class="dot off"></span>Ollama nie działa — <a href="https://ollama.com/download" target="_blank" rel="noopener">pobierz i zainstaluj</a> (Windows/Mac/Linux), potem odśwież.`; return; }
  box.innerHTML = `<span class="dot ${o.model_ready?'on':'off'}"></span>Ollama ${esc(o.version||'')} · ${o.model_ready?'model gotowy: <b>'+esc(d.model)+'</b>':'brak modelu '+esc(d.model)}
    <span style="flex:1"></span>${o.model_ready?'<button type="button" class="btn ghost sq" id="test-claude">Sprawdź</button>':`<button type="button" class="btn sq" id="llm-pull-btn">Pobierz model</button>`}`;
  const installed = o.models.map(m=>`<span class="pill">${esc(m.name)} · ${fmtSize(m.size)}</span>`).join(' ');
  $('#llm-pull').innerHTML = (installed?`<div class="m" style="margin-bottom:10px">Zainstalowane: ${installed}</div>`:'') + (o.pull.running||o.pull.error ? pullHtml(o.pull) : '') +
    (!o.vision_ready ? `<div class="m" style="margin-bottom:12px">Do oceniania zdjęć pobierz też model wizyjny: <button type="button" class="link" id="llm-pull-vision">pobierz ${esc(o.recommended.find(r=>r.name.includes('vl'))?.name||'qwen2.5vl:7b')}</button></div>` : '');
  $('#llm-pull-btn')?.addEventListener('click', ()=>startPull());
  $('#llm-pull-vision')?.addEventListener('click', ()=>startPull($('[name=OLLAMA_VISION_MODEL]').value));
  $('#test-claude')?.addEventListener('click', testBrain);
  if (o.pull.running) { clearTimeout(pullPoll); pullPoll = setTimeout(loadLlmStatus, 1500); }
}
function pullHtml(p){
  const pct = p.total ? Math.round(p.completed/p.total*100) : 0;
  return `<div class="m">Pobieranie ${esc(p.model||'')}: ${esc(p.status||'')} ${p.total?`${pct}% (${fmtSize(p.completed)} / ${fmtSize(p.total)})`:''}${p.error?' · <span class="down">błąd: '+esc(p.error)+'</span>':''}</div><div class="progress-bar"><i style="width:${pct}%"></i></div><div style="height:12px"></div>`;
}
async function startPull(model){ await api('/api/llm/pull',{method:'POST',body:{model}}); toast('Pobieram model — to może potrwać kilka minut'); setTimeout(loadLlmStatus, 800); }
async function testBrain(e){ e.target.disabled=true; const r = await api('/api/settings/test-claude',{method:'POST'}); e.target.disabled=false; toast(r.ok?'✓ Model działa'+(r.reply?': „'+r.reply+'”':''):'⚠️ '+r.error); }
document.addEventListener('click', e => { if (e.target.id==='test-claude' && !e.target.dataset.bound) { e.target.dataset.bound=1; } });
$('#profile-save').onclick = async () => { await api('/api/profile',{method:'POST',body:{text:$('#profile-text').value}}); toast('Profil zapisany — agent wie już o tym ✓'); };

/* ---------- FINANSE ---------- */
const TX_LBL = {przychod:'przychód', koszt:'koszt', strata:'strata', inwestycja:'inwestycja'};
(function initFinance(){
  const now = new Date(); $('#fin-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  $('#fin-year').innerHTML = [0,1,2,3].map(i=>`<option>${now.getFullYear()-i}</option>`).join('');
  $('#tx-form').date.value = ymd(now);
})();
$('#fin-mode').onchange = () => { const y = $('#fin-mode').value==='year'; $('#fin-month').hidden = y; $('#fin-year').hidden = !y; LOADERS.finance(); };
$('#fin-month').onchange = () => LOADERS.finance();
$('#fin-year').onchange = () => LOADERS.finance();
function finPeriod(){ return $('#fin-mode').value==='year' ? {year: $('#fin-year').value} : {month: $('#fin-month').value}; }
LOADERS.finance = async function(){
  FIN_META = await api('/api/finance/meta');
  const area = $('#tx-area'); if (!area.options.length) area.innerHTML = FIN_META.areas.map(a=>`<option>${esc(a)}</option>`).join('');
  $('#tx-cats').innerHTML = [...new Set(Object.values(FIN_META.categories).flat())].map(c=>`<option value="${esc(c)}">`).join('');
  const p = finPeriod();
  const [r, txs] = await Promise.all([api('/api/finance/report?'+new URLSearchParams(p)), api('/api/finance/transactions?month='+(p.month||p.year))]);
  const s = r.podsumowanie, ch = r['zmiana_%'];
  const dl = (v, invert) => v==null ? '' : `<span class="delta ${(v>=0)!==!!invert?'up':'down'}">${v>=0?'▲':'▼'} ${Math.abs(v)}%</span>`;
  $('#fin-kpi').innerHTML = [
    [fmtMoney(s.przychod)+dl(ch.przychod), 'przychody'], [fmtMoney(s.koszt)+dl(ch.koszt, true), 'koszty'], [fmtMoney(s.strata), 'straty'],
    [`<span class="${s.zysk>=0?'':'down'}">${fmtMoney(s.zysk)}</span>`+dl(ch.zysk), 'zysk'], [s['marza_%']==null?'—':s['marza_%']+'%', 'marża'], [fmtMoney(s.inwestycja), 'inwestycje'],
  ].map(([v,l])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l} · ${esc(r.okres)}</div></div>`).join('');
  const charts = r.wykresy;
  ['#fin-c1','#fin-c2','#fin-c3','#fin-c4'].forEach((sel,i)=>{ $(sel).innerHTML = charts[i] ? renderChart(charts[i]) : `<div class="empty">${i===2?'Brak przychodów w tym okresie.':'Brak kosztów w tym okresie.'}</div>`; });
  const areas = Object.entries(r.obszary);
  $('#fin-areas').innerHTML = areas.length ? `<table class="fin-table"><thead><tr><th>Obszar</th><th class="num">Przychody</th><th class="num">Koszty</th><th class="num">Zysk</th></tr></thead><tbody>${areas.sort((a,b)=>b[1].zysk-a[1].zysk).map(([a,v])=>`<tr><td>${esc(a)}</td><td class="num">${fmtMoney(v.przychod)}</td><td class="num">${fmtMoney(v.koszt+v.strata)}</td><td class="num ${v.zysk<0?'down':''}">${fmtMoney(v.zysk)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Brak transakcji w tym okresie.</div>';
  $('#fin-tx').innerHTML = txs.length ? `<table class="fin-table"><tbody>${txs.map(t=>`<tr class="click" data-tx="${t.id}"><td class="m" style="white-space:nowrap">${esc(t.date)}</td><td><span class="tx-type">${TX_LBL[t.type]||esc(t.type)}</span></td><td>${esc(t.description||t.category||'')}<div class="m">${esc(t.area)}${t.category?' · '+esc(t.category):''}</div></td><td class="num amount ${t.type==='przychod'?'plus':'minus'}">${t.type==='przychod'?'+':'−'}${fmtMoney(t.amount)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Brak transakcji. Dodaj powyżej albo powiedz agentowi, np. „sprzedałem 3 bluzy Stratfanat po 180 zł”.</div>';
  $$('[data-tx]').forEach(row=>row.onclick=()=>edit('transactions', row.dataset.tx, {onSaved: LOADERS.finance}));
  const pf = await api('/api/finance/portfolio');
  $('#fin-portfolio').innerHTML = `<div class="stats" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px"><div class="stat"><div class="v">${fmtMoney(pf.zainwestowano)}</div><div class="l">zainwestowano</div></div><div class="stat"><div class="v">${fmtMoney(pf.wartosc)}</div><div class="l">wartość</div></div><div class="stat"><div class="v ${pf.wynik<0?'down':'up'}">${fmtMoney(pf.wynik)}</div><div class="l">wynik${pf['wynik_%']!=null?' · '+pf['wynik_%']+'%':''}</div></div></div>`
    + (pf.pozycje.length ? pf.pozycje.map(h=>`<div class="row click" data-hold="${h.id}"><div class="t"><b>${esc(h.name)}</b><div class="m">${esc(h.kind)}${h.quantity?' · '+h.quantity:''}${h.price_pln?' · kurs '+fmtMoney(h.price_pln):''}</div></div><div style="text-align:right"><div class="amount">${fmtMoney(h.value)}</div><div class="m ${h.pl<0?'down':'up'}">${h.pl==null?'':(h.pl>=0?'+':'')+fmtMoney(h.pl)}</div></div></div>`).join('') : '<div class="empty">Dodaj krypto, sprzęt albo inne inwestycje — krypto wyceni się samo.</div>');
  $$('[data-hold]').forEach(row=>row.onclick=()=>edit('holdings', row.dataset.hold, {onSaved: LOADERS.finance}));
};
$('#tx-form').onsubmit = async e => { e.preventDefault(); const d = formData(e.target); await api('/api/crud/transactions',{method:'POST',body:d}); e.target.amount.value=''; e.target.description.value=''; toast('Zapisano ✓'); LOADERS.finance(); };
$('#hold-new').onclick = () => openModal('holdings', {kind:'krypto'}, {onSaved: LOADERS.finance});
$('#fin-ask').onclick = () => { const p = finPeriod(); show('chat'); sendChat(`Pokaż moje statystyki finansowe za ${p.month||'rok '+p.year}: wykresy, obszary, portfel i wnioski.`); };
