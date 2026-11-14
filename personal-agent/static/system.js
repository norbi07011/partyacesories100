/* Studio Agent – Komputer (zdalne sterowanie), Doradca (wnioski + automatyzacje), Pamięć (wiedza lokalna),
   import z karty, testy jakości, PWA. */

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});

const SEV = {critical:['🔴','krytyczne','warn'], warn:['🟠','uwaga','warn'], opportunity:['💡','okazja','accent'], info:['ℹ️','info','']};
const gauge = (pct, label, sub) => `<div class="stat"><div class="v">${pct==null?'—':Math.round(pct)+'%'}</div><div class="l">${label}${sub?' · '+sub:''}</div><div class="progress-bar"><i style="width:${pct||0}%;background:${pct>85?'var(--warn)':'var(--accent)'}"></i></div></div>`;

/* =====================================================================
   KOMPUTER
   ===================================================================== */
let compTimer = null;
LOADERS.computer = async function(){
  const el = $('#view-computer');
  if (!el.dataset.ready) {
    el.dataset.ready = 1;
    el.innerHTML = `
      <div class="card-h"><h1>Komputer</h1><div class="actions"><button class="btn ghost" id="cmp-shot">📸 Zrzut ekranu</button><button class="btn ghost" id="cmp-refresh">Odśwież</button></div></div>
      <p class="sub">Steruj komputerem z telefonu albo poproś agenta („co mi tak muli?”, „otwórz DaVinci”, „uśpij komputer”). Ryzykowne akcje czekają na Twoją zgodę.</p>
      <div id="cmp-approvals"></div>
      <div class="stats" id="cmp-stats"></div>
      <div class="grid g2">
        <div class="card"><h2>Dyski</h2><div id="cmp-disks"></div></div>
        <div class="card"><div class="card-h"><h2>Szybkie akcje</h2></div>
          <form class="form" id="cmp-open"><input name="target" placeholder="Otwórz: chrome, DaVinci Resolve, ścieżka, https://…" style="flex:1"><button class="btn">Otwórz</button></form>
          <div class="actions">
            <button class="btn ghost" data-power="lock">🔒 Zablokuj</button>
            <button class="btn ghost" data-power="sleep">🌙 Uśpij</button>
            <button class="btn ghost" data-power="restart">🔄 Restart</button>
            <button class="btn ghost" data-power="shutdown">⏻ Wyłącz</button>
            <button class="btn ghost" data-power="cancel">Anuluj wyłączanie</button>
          </div>
          <div id="cmp-shot-view" style="margin-top:14px"></div>
        </div>
      </div>
      <div class="grid g2" style="margin-top:18px">
        <div class="card"><div class="card-h"><h2>Procesy</h2><select id="cmp-sort"><option value="cpu">wg CPU</option><option value="ram">wg RAM</option></select></div><div id="cmp-procs"></div></div>
        <div class="card"><h2>Dziennik akcji</h2><div id="cmp-log"></div></div>
      </div>
      <div class="card" style="margin-top:18px" id="remote-card"></div>`;
    $('#cmp-refresh').onclick = () => LOADERS.computer();
    $('#cmp-sort').onchange = loadProcs;
    $('#cmp-shot').onclick = async () => { toast('Robię zrzut…'); try { await api('/api/computer/screenshot',{method:'POST'});
      $('#cmp-shot-view').innerHTML = `<a href="/api/computer/screenshot/latest?${Date.now()}" target="_blank"><img src="/api/computer/screenshot/latest?${Date.now()}" style="width:100%;border-radius:10px;border:1px solid var(--line)"></a>`; } catch(e){} };
    $('#cmp-open').onsubmit = async e => { e.preventDefault(); const t = e.target.target.value.trim(); if (!t) return; await api('/api/computer/open',{method:'POST',body:{target:t}}); toast('Otwieram: '+t); };
    el.querySelectorAll('[data-power]').forEach(b => b.onclick = async () => {
      const a = b.dataset.power; if (['restart','shutdown'].includes(a) && !confirm('Na pewno? Akcja trafi do zatwierdzenia.')) return;
      const r = await api('/api/computer/action',{method:'POST',body:{tool:'power',args:{action:a}}});
      toast(r.status==='czeka_na_zatwierdzenie' ? 'Czeka na zatwierdzenie (u góry)' : (r.info||'Gotowe')); loadApprovals(); });
  }
  const st = await api('/api/computer/status').catch(()=>({error:'brak danych'}));
  if (st.error) { $('#cmp-stats').innerHTML = `<div class="empty">${esc(st.error)}</div>`; }
  else {
    $('#cmp-stats').innerHTML = gauge(st.cpu_pct,'CPU',st.cpu_cores+' rdzeni') + gauge(st.ram_used_pct,'RAM',st.ram_total_gb+' GB')
      + `<div class="stat"><div class="v">${st.uptime_h} h</div><div class="l">${esc(st.host)} · działa</div></div>`
      + (st.battery?gauge(st.battery.pct,'Bateria',st.battery.plugged?'ładuje':'na baterii'):'')
      + (Object.keys(st.temperatures||{}).length?`<div class="stat"><div class="v">${Math.max(...Object.values(st.temperatures))}°C</div><div class="l">temperatura</div></div>`:'');
    $('#cmp-disks').innerHTML = st.disks.map(d=>`<div class="row"><div class="t"><b>${esc(d.mount)}</b>${d.removable?' <span class="pill accent">wymienny</span>':''}<div class="m">wolne ${d.free_gb} GB z ${d.total_gb} GB · ${esc(d.fs)}</div><div class="progress-bar"><i style="width:${d.used_pct}%;background:${d.used_pct>90?'var(--warn)':'var(--accent)'}"></i></div></div><span class="m">${d.used_pct}%</span></div>`).join('') || '<div class="empty">Brak danych o dyskach.</div>';
  }
  loadProcs(); loadApprovals(); loadCompLog(); loadRemote();
  clearInterval(compTimer); compTimer = setInterval(()=>{ if (current==='computer') { loadApprovals(); } else clearInterval(compTimer); }, 5000);
};
async function loadProcs(){
  const ps = await api('/api/computer/processes?sort='+$('#cmp-sort').value+'&limit=15').catch(()=>[]);
  $('#cmp-procs').innerHTML = ps.length ? `<table class="fin-table"><tbody>${ps.map(p=>`<tr><td>${esc(p.name)}<div class="m">PID ${p.pid}</div></td><td class="num">${p.cpu.toFixed(1)}%</td><td class="num">${p.ram_mb} MB</td><td><button class="icon-btn del" data-kill="${p.pid}" data-name="${esc(p.name)}" title="Zamknij">${ICON.trash}</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Brak danych.</div>';
  $$('[data-kill]').forEach(b=>b.onclick=async()=>{ await api('/api/computer/action',{method:'POST',body:{tool:'kill_process',args:{pid:+b.dataset.kill,name:b.dataset.name}}}); toast('Czeka na zatwierdzenie'); loadApprovals(); });
}
async function loadApprovals(){
  const acts = await api('/api/computer/actions?status=pending').catch(()=>[]);
  const badge = $('#approvals-badge'); badge.hidden = !acts.length; badge.textContent = acts.length;
  const box = $('#cmp-approvals'); if (!box) return;
  box.innerHTML = acts.length ? `<div class="banner" style="display:block"><b>🛡 Do zatwierdzenia (${acts.length})</b>${acts.map(a=>`<div class="row"><div class="t">${esc(a.summary)}<div class="m">${fmtDT(a.created)} · źródło: ${esc(a.source)}</div></div><button class="btn sq" data-ok="${a.id}">Zatwierdź</button><button class="btn ghost sq" data-no="${a.id}">Odrzuć</button></div>`).join('')}</div>` : '';
  box.querySelectorAll('[data-ok],[data-no]').forEach(b=>b.onclick=async()=>{ const ok = !!b.dataset.ok; const r = await api(`/api/computer/actions/${b.dataset.ok||b.dataset.no}/${ok?'approve':'reject'}`,{method:'POST'}); toast(ok?(r.ok?'Wykonano ✓':'⚠️ '+JSON.stringify(r.result||r.error)):'Odrzucono'); loadApprovals(); loadCompLog(); });
}
async function loadCompLog(){
  const l = await api('/api/computer/log').catch(()=>[]);
  $('#cmp-log').innerHTML = l.length ? l.slice(0,20).map(x=>`<div class="row"><div class="t"><b>${esc(x.tool)}</b><div class="m ellipsis">${esc(x.args)} → ${esc(x.result)}</div></div><span class="m">${fmtDT(x.created)}</span></div>`).join('') : '<div class="empty">Jeszcze nic się nie działo.</div>';
}

/* ---------- dostęp z telefonu ---------- */
async function loadRemote(){
  const r = await api('/api/remote/info'); const ses = await api('/api/auth/sessions').catch(()=>[]);
  const ts = r.tailscale;
  $('#remote-card').innerHTML = `<div class="card-h"><h2>📱 Dostęp z telefonu (gdy nie ma Cię w domu)</h2></div>
    <div class="grid g2">
      <div>
        <div class="status-line" style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><span class="dot ${r.password_set?'on':'off'}"></span>${r.password_set?'Hasło ustawione':'Najpierw ustaw hasło (wymagane przy dostępie z sieci)'}</div>
        <form class="form" id="pw-form"><input type="password" name="password" placeholder="nowe hasło (min. 8 znaków)" minlength="8" required style="flex:1"><button class="btn">${r.password_set?'Zmień':'Ustaw'} hasło</button></form>
        <div class="status-line" style="display:flex;gap:8px;align-items:center;margin:6px 0 10px"><span class="dot ${r.totp_enabled?'on':''}"></span>2FA (kod z aplikacji): ${r.totp_enabled?'włączone':'wyłączone'}
          <span style="flex:1"></span>${r.totp_enabled?'<button class="btn ghost sq" id="totp-off">Wyłącz</button>':'<button class="btn ghost sq" id="totp-on">Włącz 2FA</button>'}</div>
        <div id="totp-setup"></div>
        <div class="m" style="margin-top:10px">Zalogowane urządzenia: ${ses.length} ${ses.length?'<button class="link" id="ses-clear">wyloguj wszystkie</button>':''}</div>
        ${ses.slice(0,5).map(x=>`<div class="m ellipsis">• ${esc((x.device||'').slice(0,60))} · ${esc(x.ip)} · ${fmtDT(x.last_seen)}</div>`).join('')}
      </div>
      <div class="md">
        <p><b>Polecany sposób: Tailscale</b> (darmowy, prywatny, szyfrowany – komputer nie jest wystawiony do internetu):</p>
        <ol>
          <li>Zainstaluj Tailscale na komputerze i telefonie: <a href="https://tailscale.com/download" target="_blank" rel="noopener">tailscale.com/download</a>, zaloguj się tym samym kontem.</li>
          <li>Na komputerze uruchom raz w terminalu: <code>tailscale serve --bg 8765</code> (daje adres HTTPS – potrzebny do mikrofonu w rozmowie głosowej na telefonie).</li>
          <li>Na telefonie otwórz: <code>${ts.dns?'https://'+esc(ts.dns):'https://&lt;nazwa-komputera&gt;.&lt;twoja-sieć&gt;.ts.net'}</code>, zaloguj się i wybierz „Dodaj do ekranu głównego” – masz aplikację.</li>
        </ol>
        <p class="m">Stan: Tailscale ${ts.installed?(ts.ip?`działa (${esc(ts.ip)})`:'zainstalowany, niepołączony'):'niezainstalowany'} · w sieci domowej: ${r.lan_ips.map(ip=>`<code>http://${esc(ip)}:${r.port}</code>`).join(' ')||'—'} ${r.host==='127.0.0.1'?'(wymaga HOST=0.0.0.0 w Ustawieniach)':''}</p>
        <p class="m">Alternatywa: Cloudflare Tunnel (<code>cloudflared</code>) z własną domeną.</p>
      </div>
    </div>`;
  $('#pw-form').onsubmit = async e => { e.preventDefault(); await api('/api/auth/password',{method:'POST',body:{password:e.target.password.value}}); toast('Hasło zapisane ✓'); loadRemote(); };
  $('#totp-on')?.addEventListener('click', async () => {
    const t = await api('/api/auth/totp/setup',{method:'POST'});
    $('#totp-setup').innerHTML = `<div class="banner" style="display:block"><b>Zeskanuj kod w aplikacji</b> (Google Authenticator, Aegis, 1Password):<div style="background:#fff;padding:8px;border-radius:8px;width:max-content;margin:10px 0">${t.qr_svg||''}</div><div class="m">albo wpisz klucz: <code>${esc(t.secret)}</code></div><form class="form" id="totp-confirm" style="margin-top:10px"><input name="code" inputmode="numeric" maxlength="6" placeholder="6-cyfrowy kod" required><button class="btn">Potwierdź</button></form></div>`;
    $('#totp-confirm').onsubmit = async e => { e.preventDefault(); await api('/api/auth/totp/enable',{method:'POST',body:{code:e.target.code.value}}); toast('2FA włączone ✓'); loadRemote(); };
  });
  $('#totp-off')?.addEventListener('click', async () => { if (!confirm('Wyłączyć 2FA?')) return; await api('/api/auth/totp/disable',{method:'POST'}); loadRemote(); });
  $('#ses-clear')?.addEventListener('click', async () => { await api('/api/auth/sessions',{method:'DELETE'}); toast('Wylogowano wszystkie urządzenia'); loadRemote(); });
}

/* =====================================================================
   DORADCA
   ===================================================================== */
function insightRow(i, compact){
  const [icon, lbl, cls] = SEV[i.severity] || SEV.info;
  return `<div class="insight sev-${esc(i.severity)}"><div class="t"><b>${icon} ${esc(i.title)}</b> <span class="pill ${cls}">${lbl}</span>${i.area?` <span class="pill">${esc(i.area)}</span>`:''}
    ${!compact && i.body?`<div class="m" style="white-space:pre-wrap;margin-top:4px">${esc(i.body)}</div>`:''}
    ${i.suggestion?`<div class="m" style="margin-top:4px">💡 ${esc(i.suggestion)}</div>`:''}</div>
    <div class="actions"><button class="btn sq" data-ins-ask="${i.id}">Zrób to z agentem</button><button class="btn ghost sq" data-ins-done="${i.id}">Załatwione</button><button class="icon-btn" title="Odrzuć" data-ins-dismiss="${i.id}">✕</button></div></div>`;
}
function bindInsights(root, list, reload){
  root.querySelectorAll('[data-ins-ask]').forEach(b=>b.onclick=()=>{ const i = list.find(x=>x.id==b.dataset.insAsk); show('chat');
    sendChat(`Doradca zgłasza: „${i.title}”. ${i.body||''}\nSugestia: ${i.suggestion||''}\nPomóż mi to załatwić krok po kroku (i oznacz wniosek #${i.id} jako załatwiony, gdy skończymy).`); });
  root.querySelectorAll('[data-ins-done],[data-ins-dismiss]').forEach(b=>b.onclick=async()=>{ await api('/api/advisor/insights/'+(b.dataset.insDone||b.dataset.insDismiss),{method:'POST',body:{status:b.dataset.insDone?'done':'dismissed'}}); reload(); });
}
async function renderHomeAdvisor(){
  const list = await api('/api/advisor/insights').catch(()=>[]);
  const el = $('#home-advisor'); el.hidden = !list.length;
  const b = $('#advisor-badge'); const urgent = list.filter(i=>['critical','warn'].includes(i.severity)).length; b.hidden = !urgent; b.textContent = urgent;
  if (!list.length) return;
  el.innerHTML = `<div class="card-h"><h2>🧭 Doradca – co wymaga uwagi</h2><button class="link" data-goto="advisor">Wszystko →</button></div>${list.slice(0,4).map(i=>insightRow(i,true)).join('')}`;
  bindInsights(el, list, renderHomeAdvisor);
}
const _homeLoader = LOADERS.home;
LOADERS.home = async function(){ await _homeLoader(); renderHomeAdvisor(); };

const RULE_TRIG = {daily:'Codziennie o (HH:MM)', hourly:'Co godzinę', weekly:'Co tydzień (np. „pon 09:00”)', insight:'Gdy doradca zgłosi (warn/critical/obszar)', transaction:'Gdy transakcja (np. „koszt 1000”)'};
const RULE_ACT = {notify:'Powiadom (treść)', task:'Utwórz zadanie (tytuł)', agent:'Zapytaj agenta (polecenie)'};
LOADERS.advisor = async function(){
  const el = $('#view-advisor');
  if (!el.dataset.ready) {
    el.dataset.ready = 1;
    el.innerHTML = `<div class="card-h"><h1>Doradca</h1><div class="actions"><button class="btn ghost" id="adv-run">Sprawdź teraz</button><button class="btn" id="adv-ask">🧭 Pełny przegląd firmy</button></div></div>
      <p class="sub">Agent sam pilnuje terminów, płatności, kosztów, magazynu, stron klientów i dysków. Co godzinę szuka problemów i okazji, a w poniedziałek robi przegląd tygodnia.</p>
      <div id="adv-list"></div>
      <div class="card" style="margin-top:18px"><h2>Automatyzacje „jeśli… to…”</h2>
        <form class="form" id="rule-form">
          <input name="name" placeholder="Nazwa, np. Codzienny plan" required style="flex:1 1 180px">
          <select name="trigger">${Object.entries(RULE_TRIG).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
          <input name="trigger_value" placeholder="np. 07:30 / koszt 1000 / critical" style="flex:1 1 150px">
          <select name="action">${Object.entries(RULE_ACT).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
          <input name="action_value" placeholder="np. Przygotuj plan dnia i wyślij na Telegram" style="flex:2 1 240px">
          <button class="btn">Dodaj</button>
        </form>
        <div class="m" style="margin-bottom:10px">Przykłady: „Codziennie 21:00 → zapytaj agenta: podsumuj mój dzień i zaplanuj jutro” · „Transakcja: koszt 1000 → powiadom” · „Doradca: critical → zapytaj agenta: co z tym zrobić?”. Możesz też po prostu poprosić agenta o automatyzację.</div>
        <div id="rules"></div>
      </div>
      <div class="card" style="margin-top:18px"><h2>Historia wniosków</h2><div id="adv-history"></div></div>`;
    $('#adv-run').onclick = async () => { const r = await api('/api/advisor/run',{method:'POST'}); toast(`Nowych wniosków: ${r.new}`); LOADERS.advisor(); };
    $('#adv-ask').onclick = () => { show('chat'); sendChat('Zrób pełny przegląd mojej firmy (umiejętność Doradca biznesowy): wszystkie obszary, liczby, ryzyka i 5 konkretnych rekomendacji.'); };
    $('#rule-form').onsubmit = async e => { e.preventDefault(); await api('/api/rules',{method:'POST',body:formData(e.target)}); e.target.reset(); toast('Automatyzacja dodana ✓'); loadRules(); };
  }
  const list = await api('/api/advisor/insights');
  $('#adv-list').innerHTML = list.length ? `<div class="card">${list.map(i=>insightRow(i)).join('')}</div>` : '<div class="card"><div class="empty">✅ Nic pilnego. Doradca sprawdza firmę co godzinę.</div></div>';
  bindInsights($('#adv-list'), list, LOADERS.advisor);
  loadRules();
  const hist = (await api('/api/advisor/insights?status=all')).filter(i=>['done','dismissed'].includes(i.status));
  $('#adv-history').innerHTML = hist.length ? hist.slice(0,15).map(i=>`<div class="row"><div class="t">${esc(i.title)}<div class="m">${fmtDT(i.updated||i.created)}</div></div><span class="pill ${i.status==='done'?'ok':''}">${i.status==='done'?'załatwione':'odrzucone'}</span></div>`).join('') : '<div class="empty">Brak.</div>';
  renderHomeAdvisor();
};
async function loadRules(){
  const rules = await api('/api/rules');
  $('#rules').innerHTML = rules.length ? rules.map(r=>`<div class="row"><button class="switch ${r.enabled?'on':''}" data-rule-toggle="${r.id}" data-on="${r.enabled}"></button><div class="t"><b>${esc(r.name)}</b><div class="m">${esc(RULE_TRIG[r.trigger]||r.trigger)} ${esc(r.trigger_value||'')} → ${esc(RULE_ACT[r.action]||r.action)}: ${esc(r.action_value||'')}</div><div class="m">uruchomień: ${r.runs||0}${r.last_run?' · ostatnio '+fmtDT(r.last_run):''}</div></div><button class="btn ghost sq" data-rule-run="${r.id}">Uruchom</button><button class="icon-btn del" data-rule-del="${r.id}">${ICON.trash}</button></div>`).join('') : '<div class="empty">Brak automatyzacji.</div>';
  $$('[data-rule-toggle]').forEach(b=>b.onclick=async()=>{ await api('/api/rules/'+b.dataset.ruleToggle,{method:'PATCH',body:{enabled:b.dataset.on==='1'?0:1}}); loadRules(); });
  $$('[data-rule-run]').forEach(b=>b.onclick=async()=>{ await api(`/api/rules/${b.dataset.ruleRun}/run`,{method:'POST'}); toast('Uruchomiono'); });
  $$('[data-rule-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Usunąć automatyzację?')) return; await api('/api/rules/'+b.dataset.ruleDel,{method:'DELETE'}); loadRules(); });
}

/* =====================================================================
   PAMIĘĆ (lokalna wiedza)
   ===================================================================== */
const ENT_TYPES = ['osoba','firma','marka','projekt','miejsce','inne'];
LOADERS.memory = async function(){
  const el = $('#view-memory');
  if (!el.dataset.ready) {
    el.dataset.ready = 1;
    el.innerHTML = `<div class="card-h"><h1>Pamięć</h1><button class="btn ghost" id="kb-reindex">Zaktualizuj wiedzę</button></div>
      <p class="sub">Wszystko zostaje na Twoim komputerze. Agent szuka po znaczeniu w dokumentach, pomysłach, projektach, rozmowach i plikach z Twoich folderów, pamięta osoby i firmy oraz Twoje decyzje.</p>
      <div class="card"><form class="form" id="kb-form" style="margin:0"><input name="q" placeholder="Zapytaj pamięć, np. „co ustaliłem z drukarnią?”, „pomysły na kolekcję zimową”" style="flex:1" required><button class="btn">Szukaj</button></form><div class="m" id="kb-status" style="margin-top:8px"></div><div id="kb-results"></div></div>
      <div class="grid g2" style="margin-top:18px">
        <div class="card"><h2>Osoby i firmy</h2>
          <form class="form" id="ent-form"><input name="name" placeholder="Nazwa / imię i nazwisko" required style="flex:1 1 160px"><select name="type">${ENT_TYPES.map(t=>`<option>${t}</option>`).join('')}</select><input name="contact" placeholder="kontakt" style="flex:1 1 120px"><input name="notes" placeholder="notatka" style="flex:2 1 160px"><button class="btn">Dodaj</button></form>
          <form class="form" id="rel-form"><input name="a" placeholder="kto/co" required style="flex:1"><input name="rel" placeholder="relacja, np. pracuje w" required style="flex:1"><input name="b" placeholder="z kim/czym" required style="flex:1"><button class="btn ghost">Połącz</button></form>
          <div id="ent-list"></div></div>
        <div class="card"><h2>Dziennik decyzji</h2>
          <form class="form" id="dec-form"><input name="topic" placeholder="temat" required style="flex:1 1 140px"><input name="decision" placeholder="decyzja" required style="flex:2 1 200px"><input name="reason" placeholder="dlaczego" style="flex:2 1 200px"><input name="people" placeholder="z kim" style="flex:1 1 120px"><button class="btn">Zapisz</button></form>
          <div id="dec-list"></div></div>
      </div>`;
    $('#kb-reindex').onclick = async () => { await api('/api/kb/reindex',{method:'POST'}); toast('Indeksuję wiedzę lokalnie…'); setTimeout(kbStatus, 3000); };
    $('#kb-form').onsubmit = async e => { e.preventDefault(); const r = await api('/api/kb/search?q='+encodeURIComponent(e.target.q.value));
      $('#kb-results').innerHTML = `<div class="m" style="margin:10px 0">Tryb: ${esc(r.tryb)}${r.uwaga?' · '+esc(r.uwaga):''}</div>` + (r.wyniki.length ? r.wyniki.map(w=>`<div class="row" style="align-items:flex-start"><div class="t"><b>${esc(w.tytul||w.zrodlo)}</b> <span class="pill">${esc(w.zrodlo.split(':')[0])}</span>${w.score?` <span class="m">trafność ${Math.round(w.score*100)}%</span>`:''}<div class="m" style="white-space:pre-wrap">${esc(w.fragment)}</div></div></div>`).join('') : '<div class="empty">Nic nie znalazłem.</div>'); };
    $('#ent-form').onsubmit = async e => { e.preventDefault(); await api('/api/kb/entities',{method:'POST',body:formData(e.target)}); e.target.reset(); loadEntities(); };
    $('#rel-form').onsubmit = async e => { e.preventDefault(); await api('/api/kb/relations',{method:'POST',body:formData(e.target)}); e.target.reset(); loadEntities(); };
    $('#dec-form').onsubmit = async e => { e.preventDefault(); await api('/api/kb/decisions',{method:'POST',body:formData(e.target)}); e.target.reset(); loadDecisions(); };
  }
  kbStatus(); loadEntities(); loadDecisions();
};
async function kbStatus(){
  const s = await api('/api/kb/status');
  $('#kb-status').textContent = `Fragmentów wiedzy: ${s.chunks} · z wektorami (wyszukiwanie po znaczeniu): ${s.embedded}${s.last?' · ostatnio '+fmtDT(s.last):''}${s.running?' · indeksuję…':''}${s.error?' · '+s.error:''}`;
  if (s.running) setTimeout(kbStatus, 2500);
}
async function loadEntities(){
  const g = await api('/api/kb/graph');
  const byId = Object.fromEntries(g.nodes.map(n=>[n.id,n]));
  $('#ent-list').innerHTML = g.nodes.length ? g.nodes.map(n=>{ const rels = g.edges.filter(e=>e.a===n.id).map(e=>`${esc(e.rel)} → ${esc(byId[e.b]?.name||'?')}`);
    return `<div class="row click" data-ent="${esc(n.name)}"><div class="t"><b>${esc(n.name)}</b> <span class="pill">${esc(n.type)}</span>${rels.length?`<div class="m">${rels.join(' · ')}</div>`:''}</div><button class="icon-btn del" data-ent-del="${n.id}">${ICON.trash}</button></div>`; }).join('') : '<div class="empty">Agent będzie tu zapisywał klientów, modelki, dostawców, drukarnie…</div>';
  $$('[data-ent]').forEach(r=>r.onclick=async e=>{ if (e.target.closest('[data-ent-del]')) return; show('chat'); sendChat(`Co wiesz o: ${r.dataset.ent}? (entity_info)`); });
  $$('[data-ent-del]').forEach(b=>b.onclick=async e=>{ e.stopPropagation(); if(!confirm('Usunąć z pamięci?')) return; await api('/api/kb/entities/'+b.dataset.entDel,{method:'DELETE'}); loadEntities(); });
}
async function loadDecisions(){
  const d = await api('/api/kb/decisions');
  $('#dec-list').innerHTML = d.length ? d.map(x=>`<div class="row" style="align-items:flex-start"><div class="t"><b>${esc(x.topic)}</b>: ${esc(x.decision)}${x.reason?`<div class="m">Dlaczego: ${esc(x.reason)}</div>`:''}<div class="m">${esc(x.date)}${x.people?' · '+esc(x.people):''}</div></div><button class="icon-btn del" data-dec-del="${x.id}">${ICON.trash}</button></div>`).join('') : '<div class="empty">Brak decyzji. Agent zapisze je sam, gdy coś ustalisz.</div>';
  $$('[data-dec-del]').forEach(b=>b.onclick=async()=>{ await api('/api/kb/decisions/'+b.dataset.decDel,{method:'DELETE'}); loadDecisions(); });
}

/* =====================================================================
   PLIKI: import z karty + archiwum
   ===================================================================== */
let importPoll = null;
async function renderMediaPanels(){
  const [cards, st] = await Promise.all([api('/api/media/cards').catch(()=>[]), api('/api/media/import')]);
  $('#media-import').innerHTML = `<h2>📥 Import z karty pamięci</h2>
    ${cards.length ? cards.map(c=>`<label class="row" style="cursor:pointer"><input type="radio" name="card" value="${esc(c.mount)}" ${cards.length===1?'checked':''}><div class="t"><b>${esc(c.mount)}</b><div class="m">${c.files} plików · ${c.size_gb} GB · ${esc(c.markers.join(', '))}</div></div></label>`).join('') : '<div class="empty">Nie widzę karty z aparatu (folder DCIM). Włóż kartę i kliknij Odśwież.</div>'}
    <form class="form" id="imp-form" style="margin-top:10px">
      <input name="project" placeholder="nazwa projektu, np. Ślub Nowak" required style="flex:1 1 180px">
      <input name="library" placeholder="folder biblioteki" value="${esc(st.library||'')}" style="flex:2 1 220px">
      <input name="backup" placeholder="kopia zapasowa (opcjonalnie), np. E:\\Backup" style="flex:2 1 220px">
      <button class="btn" ${cards.length?'':'disabled'}>Importuj</button><button type="button" class="btn ghost" id="imp-refresh">Odśwież</button>
    </form>
    <div class="m">Pliki trafią do: biblioteka/rok/data_projekt/RAW|JPG|WIDEO. Karta nie jest kasowana.</div>
    <div id="imp-progress"></div>`;
  $('#imp-refresh').onclick = renderMediaPanels;
  $('#imp-form').onsubmit = async e => { e.preventDefault(); const src = document.querySelector('input[name=card]:checked')?.value; if (!src) { toast('Wybierz kartę'); return; }
    await api('/api/media/import',{method:'POST',body:{source:src, ...formData(e.target)}}); toast('Import rozpoczęty'); pollImport(); };
  if (st.running) pollImport(); else if (st.finished) showImport(st);
  const arch = await api('/api/media/archive').catch(()=>[]);
  $('#media-archive').innerHTML = `<h2>🗄 Do archiwizacji</h2><div class="m" style="margin-bottom:8px">Duże foldery nieruszane od 6 miesięcy – warto przenieść na dysk zewnętrzny.</div>` +
    (arch.length ? arch.slice(0,8).map(a=>`<div class="row"><div class="t"><b class="ellipsis" style="display:block">${esc(a.folder)}</b><div class="m">${a.size_gb} GB · ${a.files} plików · zmiana ${fmtDT(a.mtime)}</div></div><button class="btn ghost sq" data-open="${esc(a.folder)}">Otwórz</button></div>`).join('') : '<div class="empty">Nic do archiwizacji.</div>');
}
function showImport(st){
  const pct = st.total ? Math.round(st.copied/st.total*100) : 0;
  $('#imp-progress').innerHTML = `<div class="m" style="margin-top:10px">${st.running?'Kopiuję':'Zakończono'}: ${st.copied}/${st.total} plików · ${(st.bytes/1e9).toFixed(2)} GB${st.errors?.length?` · błędy: ${st.errors.length}`:''}</div><div class="progress-bar"><i style="width:${pct}%"></i></div>${!st.running&&st.dest?`<div class="m">→ ${st.dest.map(esc).join('<br>→ ')}</div>`:''}`;
}
function pollImport(){ clearTimeout(importPoll); importPoll = setTimeout(async()=>{ const st = await api('/api/media/import'); showImport(st); if (st.running && current==='files') pollImport(); }, 1000); }
const _filesLoader = LOADERS.files;
LOADERS.files = async function(){ await _filesLoader(); renderMediaPanels(); };

/* =====================================================================
   USTAWIENIA: testy jakości + głos offline
   ===================================================================== */
let evalPoll = null;
async function renderEvals(){
  const d = await api('/api/evals');
  const last = d.last || [], run = d.runs[0];
  $('#evals-card').innerHTML = `<div class="card-h"><h2>🧪 Testy jakości modelu</h2><button class="btn ghost sq" id="eval-run" ${d.state.running?'disabled':''}>${d.state.running?`Testuję… ${d.state.progress}/${d.state.total}`:'Uruchom test'}</button></div>
    <p class="m" style="margin-bottom:10px">10 typowych poleceń (finanse, zadania, kalendarz, pamięć, pogoda). Sprawdza, czy model wywołuje właściwe narzędzia z dobrymi danymi. Nie zmienia Twoich danych. Uruchom po każdej zmianie modelu.</p>
    ${d.runs.length?`<div class="stats" style="margin-bottom:10px">${d.runs.slice(0,4).map(r=>`<div class="stat"><div class="v ${r.passed/r.total>=.8?'up':r.passed/r.total<.5?'down':''}">${r.passed}/${r.total}</div><div class="l">${esc(r.model)} · ${fmtDT(r.created)}</div></div>`).join('')}</div>`:''}
    ${last.length?`<table class="fin-table"><tbody>${last.map(r=>`<tr><td>${r.ok?'✅':'❌'}</td><td>${esc(r.prompt)}<div class="m">oczekiwane: ${esc(r.expect)}</div>${!r.ok?`<div class="m">wywołał: ${esc(r.calls.join(', ')||'nic')}</div>`:''}</td><td class="num m">${r.seconds}s</td></tr>`).join('')}</tbody></table>`:''}`;
  $('#eval-run')?.addEventListener('click', async ()=>{ await api('/api/evals/run',{method:'POST'}); toast('Test uruchomiony – potrwa kilka minut'); renderEvals(); });
  clearTimeout(evalPoll); if (d.state.running) evalPoll = setTimeout(()=>{ if (current==='settings') renderEvals(); }, 3000);
}
async function renderPiper(){
  const v = await api('/api/voice/status'); const box = document.querySelector('#settings-groups .set-group:nth-child(4)');
  const host = [...document.querySelectorAll('#settings-groups .set-group')].find(g=>g.querySelector('h2')?.textContent.startsWith('Głos'));
  if (!host || host.querySelector('#piper-box')) return;
  const dl = v.piper_download;
  host.insertAdjacentHTML('beforeend', `<div id="piper-box" class="m" style="margin-top:6px">Głos offline (Piper): ${v.piper_installed?(v.piper_voices.length?'pobrane: '+v.piper_voices.map(esc).join(', '):'brak pobranych głosów'):'biblioteka niezainstalowana'}
    ${v.piper_installed?`<button type="button" class="link" id="piper-dl">${dl.running?'pobieram…':'pobierz wybrany głos (~60 MB)'}</button>`:''}${dl.error?` <span class="down">${esc(dl.error)}</span>`:''}</div>`);
  $('#piper-dl')?.addEventListener('click', async ()=>{ await api('/api/voice/piper/download',{method:'POST',body:{voice:document.querySelector('[name=PIPER_VOICE]').value}}); toast('Pobieram głos offline…'); });
}
const _settingsLoader = LOADERS.settings;
LOADERS.settings = async function(){ await _settingsLoader(); renderEvals(); renderPiper(); };

/* ---------- odznaka zatwierdzeń (co 20 s) ---------- */
setInterval(()=>{ api('/api/computer/actions?status=pending').then(a=>{ const b=$('#approvals-badge'); b.hidden=!a.length; b.textContent=a.length; }).catch(()=>{}); }, 20000);
