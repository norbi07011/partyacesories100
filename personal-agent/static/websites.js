/* Studio Agent – widok Strony WWW: monitoring stron klientów (status, czas odpowiedzi, uptime, SSL, domena, hosting),
   audyt SEO/wydajności, historia. Globale z app.js: api, esc, toast, md, renderChart, fmtMoney, fmtDT, show, sendChat, LOADERS. */
(function(){
  const root = () => document.getElementById('view-websites');
  let SITES = [], lastAudit = null;
  const pct = v => v==null ? '—' : (v>=99.995 ? '100' : v.toFixed(v>=99.9?2:1)) + '%';
  const ask = text => { show('chat'); sendChat(text); };
  const dayPill = (d, warn, lbl) => {
    if (d==null) return '<span class="m">—</span>';
    const cls = d < 0 ? 'warn' : d < warn ? 'warn' : d < warn*2 ? 'accent' : 'ok';
    return `<span class="pill ${cls} web-days" title="${esc(lbl||'')}">${d<0?'po terminie':d===0?'dziś':d+' dni'}</span>`;
  };
  const host = u => { try { return new URL(u).host; } catch(e) { return u; } };

  function modal(title, bodyHtml, {wide=false, submit='Zapisz', onSubmit, del}={}){
    const m = document.createElement('div'); m.className = 'bx-modal';
    m.innerHTML = `<form class="box ${wide?'wide':''}"><h2>${esc(title)}</h2><div>${bodyHtml}</div><div class="foot">${del?'<button type="button" class="btn danger left" data-x="del">Usuń</button>':''}<button type="button" class="btn ghost" data-x="close">${onSubmit?'Anuluj':'Zamknij'}</button>${onSubmit?`<button class="btn" type="submit">${esc(submit)}</button>`:''}</div></form>`;
    const close = () => { m.remove(); document.removeEventListener('keydown', k); };
    const k = e => { if (e.key==='Escape') close(); };
    document.addEventListener('keydown', k);
    m.addEventListener('mousedown', e => { if (e.target===m) close(); });
    m.querySelector('[data-x=close]').onclick = close;
    if (del) m.querySelector('[data-x=del]').onclick = async()=>{ if (await del()) close(); };
    m.querySelector('form').onsubmit = async e => { e.preventDefault(); if (!onSubmit) return close();
      const b = m.querySelector('[type=submit]'); b.disabled = true;
      try { if (await onSubmit(Object.fromEntries(new FormData(e.target).entries())) !== false) close(); } catch(_) {} finally { b.disabled = false; } };
    document.body.appendChild(m);
    return m;
  }
  const field = (label, html, full) => `<div class="${full?'full':''}"><label>${esc(label)}</label>${html}</div>`;

  async function load(){
    const el = root(); if (!el) return;
    if (!el.dataset.ready){
      el.dataset.ready = 1;
      el.innerHTML = `<div class="bx-head"><div><h1>Strony WWW</h1><p class="sub" style="margin:0">Strony klientów pod opieką: dostępność co 10 minut, certyfikaty SSL, domeny, odnowienia hostingu i audyt SEO.</p></div>
        <div class="actions"><button class="btn ghost" data-act="check-all">↻ Sprawdź teraz</button><button class="btn" data-act="add">+ Dodaj stronę</button></div></div>
        <div class="stats" id="web-kpi" style="margin-top:18px"></div>
        <div id="web-alerts"></div>
        <div class="card"><div class="card-h"><h2>Monitorowane strony</h2><span class="m" id="web-last"></span></div><div id="web-table"></div></div>
        <div class="card" style="margin-top:18px"><div class="card-h"><h2>Audyt SEO i wydajności</h2>
          <button class="btn ghost sq" data-ask="Zrób pełny audyt strony (umiejętność Audyt strony WWW) – zapytaj mnie o adres, jeśli go nie podałem.">Audyt z agentem</button></div>
          <form class="web-auditbar" id="web-af"><input name="url" placeholder="adres strony, np. sklep-klienta.pl" required><button class="btn">Audytuj</button></form>
          <div id="web-audit" style="margin-top:16px"><div class="m">Sprawdza: HTTPS i przekierowania, czas odpowiedzi, rozmiar i kompresję HTML, title, meta description, H1, alt obrazków, viewport, canonical, Open Graph, robots.txt, sitemap.xml i mieszaną treść.</div></div></div>
        <div id="web-history"></div>`;
      el.addEventListener('click', onClick);
      el.querySelector('#web-af').onsubmit = e => { e.preventDefault(); runAudit(e.target.url.value); };
    }
    await refresh();
  }

  async function refresh(){
    let d;
    try { d = await api('/api/websites'); }
    catch(e) { root().querySelector('#web-table').innerHTML = `<div class="bx-empty">Nie udało się wczytać (${esc(e.message)}). Czy moduł Strony WWW jest podłączony?</div>`; return; }
    SITES = d.sites; const k = d.kpi;
    root().querySelector('#web-kpi').innerHTML = `
      <div class="stat"><div class="v">${k.count}</div><div class="l">monitorowane strony</div></div>
      <div class="stat"><div class="v ${k.down?'down':'up'}">${k.down?k.down+' ✕':k.up+' ✓'}</div><div class="l">${k.down?'nie działa':'działa'}</div></div>
      <div class="stat"><div class="v">${pct(k.avg_uptime_30d)}</div><div class="l">średni uptime 30 dni</div></div>
      <div class="stat"><div class="v">${fmtMoney(k.monthly_fees)}</div><div class="l">abonamenty / mies. · ${fmtMoney(k.yearly_fees)} rocznie</div></div>
      <div class="stat"><div class="v ${k.expiring?'down':''}">${k.expiring}</div><div class="l">SSL / domena / hosting wkrótce</div></div>`;
    root().querySelector('#web-alerts').innerHTML = d.alerts.length ? `<div class="card" style="margin-bottom:18px"><h2>Wymaga uwagi</h2>${d.alerts.map(a=>`<div class="bx-alert ${esc(a.severity)}"><div class="ic">${a.severity==='critical'?'🔴':a.severity==='warn'?'⚠️':'💡'}</div><div class="t"><b>${esc(a.title)}</b>${esc(a.body||'')}<div class="sug">${esc(a.suggestion||'')}</div></div></div>`).join('')}</div>` : '';
    const last = SITES.map(s=>s.last_check).filter(Boolean).sort().pop();
    root().querySelector('#web-last').textContent = last ? 'ostatnie sprawdzenie: '+fmtDT(last) : '';
    root().querySelector('#web-table').innerHTML = SITES.length ? `<div class="bx-scroll"><table class="bx-table web-table"><thead><tr><th>Strona</th><th class="num">Status</th><th class="num">Odpowiedź</th><th class="num">Uptime 7 d</th><th class="num">30 d</th><th>SSL</th><th>Domena</th><th>Hosting</th><th class="num">Abonament</th><th class="num">SEO</th><th></th></tr></thead><tbody>
      ${SITES.map(s=>{ const dot = s.up==null ? '' : s.up ? 'up' : 'down';
        return `<tr class="web-site ${s.active?'':'dim'}"><td class="name-cell"><div class="name"><span class="bx-dot ${dot}" title="${s.up==null?'jeszcze nie sprawdzono':s.up?'działa':'nie działa'}"></span><div style="min-width:0"><b>${esc(s.name||host(s.url))}</b><div class="url"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(host(s.url))}</a>${s.client?' · '+esc(s.client):''}${s.project?' · '+esc(s.project):''}</div>${s.last_error && !s.up?`<div class="m down">${esc(s.last_error)}</div>`:''}</div></div></td>
          <td class="num" data-l="Status">${s.last_status?`<span class="${s.up?'':'down'}">${s.last_status}</span>`:(s.last_check?'<span class="down">błąd</span>':'—')}</td>
          <td class="num" data-l="Odpowiedź">${s.last_ms!=null?s.last_ms+' ms':'—'}${s.avg_ms_7d?`<div class="m">śr. ${s.avg_ms_7d} ms</div>`:''}</td>
          <td class="num" data-l="Uptime 7 dni">${pct(s.uptime_7d)}</td><td class="num" data-l="Uptime 30 dni">${pct(s.uptime_30d)}</td>
          <td data-l="SSL">${s.ssl_error?'<span class="pill warn" title="'+esc(s.ssl_error)+'">błąd</span>':dayPill(s.ssl_days,14,s.ssl_expiry)}</td>
          <td data-l="Domena">${dayPill(s.domain_days,30,s.domain_expiry)}</td>
          <td data-l="Hosting">${dayPill(s.hosting_days,14,s.hosting_renewal)}</td>
          <td class="num" data-l="Abonament">${s.monthly_fee?fmtMoney(s.monthly_fee):'—'}</td>
          <td class="num" data-l="SEO">${s.last_audit_score!=null?`<span class="pill ${s.last_audit_score>=75?'ok':s.last_audit_score>=50?'accent':'warn'}">${s.last_audit_score}</span>`:'—'}</td>
          <td class="acts"><button class="btn ghost sq" data-act="check" data-id="${s.id}">Sprawdź</button> <button class="btn ghost sq" data-act="audit" data-id="${s.id}">Audyt</button> <button class="btn ghost sq" data-act="history" data-id="${s.id}">Historia</button> <button class="btn ghost sq" data-act="edit" data-id="${s.id}">Edytuj</button></td></tr>`; }).join('')}
      </tbody></table></div>` : `<div class="bx-empty">Brak stron. Dodaj pierwszą stronę klienta – agent będzie sprawdzał ją co 10 minut i przypomni o SSL, domenie i hostingu.<br>Możesz też powiedzieć agentowi: „dodaj do monitoringu stronę kowalski-foto.pl, klient Kowalski, abonament 150 zł”.</div>`;
  }

  function siteModal(s){
    const edit = !!s; s = s || {active:1};
    modal(edit ? 'Edytuj stronę' : 'Nowa strona', `<div class="bx-form">
      ${field('Adres strony', `<input name="url" required placeholder="https://…" value="${esc(s.url||'')}">`, 1)}
      ${field('Nazwa', `<input name="name" value="${esc(s.name||'')}">`)}${field('Klient', `<input name="client" value="${esc(s.client||'')}">`)}
      ${field('Abonament / utrzymanie (zł/mies.)', `<input name="monthly_fee" type="number" min="0" step="1" value="${s.monthly_fee??''}">`)}
      ${field('Projekt', `<select name="project_id"><option value="">— brak —</option>${(typeof PROJECTS!=='undefined'?PROJECTS:[]).map(p=>`<option value="${p.id}" ${p.id==s.project_id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`)}
      ${field('Odnowienie hostingu', `<input name="hosting_renewal" type="date" value="${esc(s.hosting_renewal||'')}">`)}
      ${field('Wygaśnięcie domeny (auto z RDAP, gdy dostępne)', `<input name="domain_expiry" type="date" value="${esc(s.domain_expiry||'')}">`)}
      ${field('Notatki (hosting, panel, dostępy – bez haseł)', `<textarea name="notes" rows="3">${esc(s.notes||'')}</textarea>`, 1)}
      <div class="full"><label class="check"><input type="checkbox" name="active" value="1" ${s.active?'checked':''}> Monitoruj (sprawdzanie co 10 min)</label></div></div>`,
      { onSubmit: async d => { d.active = !!d.active;
          if (edit) await api('/api/websites/'+s.id,{method:'PATCH',body:d});
          else { toast('Dodaję i sprawdzam…'); await api('/api/websites',{method:'POST',body:d}); }
          toast('Zapisano ✓'); refresh(); },
        del: edit ? async()=>{ if (!confirm('Usunąć stronę z monitoringu (z historią)?')) return false; await api('/api/websites/'+s.id,{method:'DELETE'}); refresh(); return true; } : null });
  }

  async function runAudit(url){
    const box = root().querySelector('#web-audit');
    root().querySelector('#web-af').url.value = url;
    box.innerHTML = '<div class="typing"><span></span><span></span><span></span></div><div class="m">Audytuję '+esc(url)+'…</div>';
    let r; try { r = await api('/api/websites/audit',{method:'POST',body:{url}}); } catch(e) { box.innerHTML = ''; return; }
    lastAudit = r;
    if (!r.ok) { box.innerHTML = `<div class="bx-alert critical"><div class="ic">🔴</div><div class="t"><b>Audyt nieudany</b>${esc(r.error||'')}</div></div>`; return; }
    const c = r.score>=90?'var(--ok)':r.score>=75?'var(--ok)':r.score>=50?'var(--accent)':'var(--warn)', d = r.dane;
    const yes = v => v ? '<span class="up">✓</span>' : '<span class="down">✕</span>';
    box.innerHTML = `<div class="web-audit"><div><div class="web-ring" style="--p:${r.score};--c:${c}"><div><b>${r.score}</b><span>${esc(r.ocena)}</span></div></div>
        <p class="m" style="text-align:center;margin:10px 0 0">${esc(fmtDT(r.sprawdzono))}</p></div>
      <div><div class="web-facts">
        <div><small>Status</small>HTTP ${d.status}${d.redirects?` · ${d.redirects} przekier.`:''}</div>
        <div><small>Czas odpowiedzi</small>${d.ttfb_ms} ms (całość ${d.load_ms} ms)</div>
        <div><small>HTML</small>${d.html_kb} KB ${d.compression?'· '+esc(d.compression):'· bez kompresji'}</div>
        <div><small>HTTPS</small>${yes(d.https)} ${d.http_to_https===false?'· brak przekier. z http':d.http_to_https?'· przekier. z http ✓':''}</div>
        <div><small>Title (${d.title_len})</small>${esc(d.title||'—')}</div>
        <div><small>Description (${d.description_len})</small>${esc((d.meta_description||'—').slice(0,90))}</div>
        <div><small>H1</small>${d.h1_count}× ${esc((d.h1||[])[0]||'')}</div>
        <div><small>Obrazki bez alt</small>${d.images_without_alt} / ${d.images}</div>
        <div><small>Viewport / lang</small>${yes(d.viewport)} ${esc(d.lang||'brak lang')}</div>
        <div><small>Canonical / OG</small>${yes(d.canonical)} · OG: ${d.og_tags.length}</div>
        <div><small>robots.txt / sitemap</small>${yes(d.robots_txt)} ${yes(d.sitemap_xml)}</div>
        <div><small>Skrypty blokujące</small>${d.render_blocking_scripts} z ${d.scripts}</div></div>
        ${r.problemy.length ? r.problemy.map(i=>`<div class="web-issue"><span class="pill ${i.waga==='krytyczne'||i.waga==='ważne'?'warn':i.waga==='średnie'?'accent':''}">${esc(i.waga)}</span><div class="t"><b>${esc(i.problem)}</b><div>${esc(i.jak_naprawic)}</div></div><span class="pts">${i.punkty}</span></div>`).join('') : '<div class="bx-empty">Brak problemów – świetna robota ✓</div>'}
        <div class="actions" style="margin-top:14px"><button class="btn ghost sq" data-act="audit-report">📄 Raport dla klienta (agent)</button><span class="m">${esc(r.uwaga||'')}</span></div></div></div>`;
    refresh();
  }

  async function history(id){
    const s = SITES.find(x=>x.id===id); if (!s) return;
    const h = await api(`/api/websites/history/${id}?days=30`);
    const box = root().querySelector('#web-history');
    const bars = h.daily.map(d=>`<i class="${d.uptime<95?'bad':d.uptime<99.9?'mid':''}" style="height:${Math.max(12, d.uptime||0)}%" title="${esc(d.day)}: ${pct(d.uptime)} · śr. ${d.ms??'—'} ms"></i>`).join('');
    box.innerHTML = `<div class="card" style="margin-top:18px"><div class="card-h"><h2>Historia: ${esc(s.name||host(s.url))}</h2><button class="link" data-act="close-history">zamknij ✕</button></div>
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><div class="stat"><div class="v">${pct(h.uptime_7d)}</div><div class="l">uptime 7 dni</div></div><div class="stat"><div class="v">${pct(h.uptime_30d)}</div><div class="l">uptime 30 dni</div></div><div class="stat"><div class="v">${h.incidents.length}</div><div class="l">nieudane sprawdzenia</div></div></div>
      ${h.daily.length?`<div class="m">Dostępność dzień po dniu (30 dni)</div><div class="web-uptime">${bars}</div>`:''}
      ${h.chart?renderChart(h.chart):'<div class="bx-empty">Brak danych – pierwsze wyniki pojawią się po kolejnych sprawdzeniach.</div>'}
      ${h.incidents.length?`<h2 style="margin-top:16px">Ostatnie błędy</h2>${h.incidents.slice(-10).reverse().map(c=>`<div class="row"><span class="bx-dot down"></span><div class="t">${esc(fmtDT(c.ts))}<div class="m">${esc(c.error||('HTTP '+c.status))}</div></div><span class="m">${c.ms??''} ms</span></div>`).join('')}`:''}</div>`;
    box.scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function onClick(e){
    const ak = e.target.closest('[data-ask]'); if (ak) return ask(ak.dataset.ask);
    const a = e.target.closest('[data-act]'); if (!a) return;
    const id = +a.dataset.id, s = SITES.find(x=>x.id===id);
    switch (a.dataset.act){
      case 'add': return siteModal(null);
      case 'edit': return siteModal(s);
      case 'check-all': { a.disabled = true; a.textContent = 'Sprawdzam…'; try { const r = await api('/api/websites/check',{method:'POST'}); const bad = r.results.filter(x=>!x.ok).length; toast(`Sprawdzono ${r.checked} stron`+(bad?` · ${bad} nie działa`:' · wszystkie działają ✓')); await refresh(); } finally { a.disabled = false; a.textContent = '↻ Sprawdź teraz'; } return; }
      case 'check': { a.disabled = true; try { const r = await api(`/api/websites/${id}/check`,{method:'POST'}); toast(r.ok?`${r.name}: HTTP ${r.status} · ${r.ms} ms ✓`:`${r.name}: ${r.error||'nie działa'}`); await refresh(); } finally { a.disabled = false; } return; }
      case 'audit': return runAudit(s.url).then(()=>root().querySelector('#web-audit').scrollIntoView({behavior:'smooth', block:'start'}));
      case 'history': return history(id);
      case 'close-history': root().querySelector('#web-history').innerHTML = ''; return;
      case 'audit-report': if (lastAudit) ask(`Przygotuj raport z audytu strony ${lastAudit.url} dla klienta (umiejętność Audyt strony WWW). Wynik automatycznego audytu: ${lastAudit.score}/100. Problemy: ${lastAudit.problemy.map(p=>p.problem).join('; ')}.`); return;
    }
  }

  LOADERS.websites = load;
})();
