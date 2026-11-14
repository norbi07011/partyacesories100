/* Studio Agent – widok Stratfanat: sprzedaż, magazyn, dropy, projekty (makiety + AI), trendy, DNA marki.
   Korzysta z globali app.js: api, esc, toast, md, renderChart, fmtMoney, fmtDT, show, sendChat, LOADERS, store. */
(function(){
  const root = () => document.getElementById('view-stratfanat');
  const TABS = [['overview','Przegląd'],['stock','Magazyn'],['drops','Dropy'],['designs','Projekty'],['trends','Trendy'],['brand','DNA marki']];
  const STATUS = ['pomysł','projektowanie','produkcja','premiera','zakończona'];
  const CH_LBL = {sklep:'Sklep', instagram:'Instagram', vinted:'Vinted', event:'Event', inny:'Inny'};
  const TREND_ST = ['nowy','testujemy','wdrożony','odrzucony'];
  let tab = (typeof store !== 'undefined' && store.get('sf-tab','overview')) || 'overview';
  let META = null, PRODUCTS = [], COLLECTIONS = [], prodFilter = 'aktywny', prodQ = '';
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const num = v => v==null||v==='' ? '—' : Number(v).toLocaleString('pl-PL',{maximumFractionDigits:2});
  const delta = v => v==null ? '' : `<span class="bx-delta ${v>=0?'up':'down'}">${v>=0?'▲':'▼'} ${Math.abs(v)}%</span>`;
  const ask = text => { show('chat'); sendChat(text); };
  const sizesOf = p => Object.keys(p.stock||{});

  /* ---------- modal ---------- */
  function modal(title, bodyHtml, {wide=false, submit='Zapisz', onSubmit, del, extra}={}){
    const m = document.createElement('div'); m.className = 'bx-modal';
    m.innerHTML = `<form class="box ${wide?'wide':''}"><h2>${esc(title)}</h2><div class="mb">${bodyHtml}</div>
      <div class="foot">${del?'<button type="button" class="btn danger left" data-x="del">Usuń</button>':''}${extra?`<button type="button" class="btn ghost" data-x="extra">${esc(extra.label)}</button>`:''}
      <button type="button" class="btn ghost" data-x="close">Anuluj</button>${onSubmit?`<button class="btn" type="submit">${esc(submit)}</button>`:''}</div></form>`;
    const close = () => { m.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key==='Escape') close(); };
    document.addEventListener('keydown', esc_);
    m.addEventListener('mousedown', e => { if (e.target===m) close(); });
    m.querySelector('[data-x=close]').onclick = close;
    if (del) m.querySelector('[data-x=del]').onclick = async()=>{ if (await del()) close(); };
    if (extra) m.querySelector('[data-x=extra]').onclick = () => { close(); extra.run(); };
    m.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const btn = m.querySelector('[type=submit]'); if (btn) btn.disabled = true;
      try { const d = Object.fromEntries(new FormData(e.target).entries()); if (await onSubmit(d, m) !== false) close(); }
      catch(err) { /* toast już pokazany przez api() */ }
      finally { if (btn) btn.disabled = false; }
    };
    document.body.appendChild(m);
    const first = m.querySelector('input,select,textarea'); if (first && window.innerWidth > 760) first.focus();
    return m;
  }
  const opt = (list, val) => list.map(o => { const [v,l] = Array.isArray(o)?o:[o,o]; return `<option value="${esc(v)}" ${String(v)===String(val??'')?'selected':''}>${esc(l)}</option>`; }).join('');
  const field = (label, html, full) => `<div class="${full?'full':''}"><label>${esc(label)}</label>${html}</div>`;
  function lightbox(src, caption, links){
    const lb = document.createElement('div'); lb.className = 'bx-lightbox';
    lb.innerHTML = `<img src="${esc(src)}" alt=""><div class="cap">${esc(caption||'')} ${(links||[]).map(l=>`<a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])}</a>`).join(' ')}</div>`;
    lb.onclick = e => { if (e.target.tagName !== 'A') lb.remove(); };
    document.body.appendChild(lb);
  }

  /* ---------- szkielet ---------- */
  async function load(){
    const el = root(); if (!el) return;
    if (!META) META = await api('/api/stratfanat/meta');
    if (!el.dataset.ready){
      el.dataset.ready = 1;
      el.innerHTML = `<div class="bx-head"><div><h1>Stratfanat</h1><p class="sub" style="margin:0">Twoja marka: sprzedaż, magazyn, dropy, projekty i trendy. Sprzedaż i dostawy same trafiają do finansów.</p></div>
        <div class="actions"><button class="btn ghost" data-act="new-product">+ Produkt</button><button class="btn" data-act="sale">+ Sprzedaż</button></div></div>
        <div class="bx-ask" style="margin-top:14px">
          <button class="btn ghost" data-ask="Znajdź aktualne trendy streetwear pasujące do Stratfanat (umiejętność Trendy streetwear). Oceń dopasowanie do DNA marki i zapisz najlepsze na tablicy trendów.">🔎 Znajdź trendy dla Stratfanat</button>
          <button class="btn ghost" data-ask="Zaprojektuj nową bluzę Stratfanat (umiejętność Projektant mody): 2–3 koncepcje, materiał, technika nadruku, colorway, makiety design_mockup, koszt i marża.">✏️ Zaprojektuj nową bluzę</button>
          <button class="btn ghost" data-ask="Pomóż mi zaplanować następny drop Stratfanat (umiejętność Kampania dropu): zaproponuj datę, koncepcję, modele, harmonogram i kampanię. Załóż kolekcję plan_drop.">🗓 Plan dropu</button>
          <button class="btn ghost" data-ask="Sprawdź magazyn Stratfanat (inventory_status) i sprzedaż: co uzupełnić, co nie rotuje, co zrobić w tym tygodniu, żeby sprzedać więcej.">📦 Co z magazynem?</button>
        </div>
        <div class="bx-tabs" id="sf-tabs"></div><div id="sf-body"></div>`;
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
    }
    renderTabs();
    await renderTab();
  }
  function renderTabs(){
    document.getElementById('sf-tabs').innerHTML = TABS.map(([k,l])=>`<button class="chip ${k===tab?'active':''}" data-tab="${k}">${l}</button>`).join('');
  }
  async function renderTab(){
    const b = document.getElementById('sf-body');
    try {
      if (tab==='overview') await renderOverview(b);
      else if (tab==='stock') await renderStock(b);
      else if (tab==='drops') await renderDrops(b);
      else if (tab==='designs') await renderDesigns(b);
      else if (tab==='trends') await renderTrends(b);
      else await renderBrand(b);
    } catch(e) { b.innerHTML = `<div class="card"><div class="bx-empty">Nie udało się wczytać danych (${esc(e.message)}). Czy moduł Stratfanat jest podłączony?</div></div>`; }
  }
  async function loadProducts(status){ PRODUCTS = await api('/api/stratfanat/products?status='+(status||'aktywny')); return PRODUCTS; }
  async function loadCollections(){ COLLECTIONS = await api('/api/stratfanat/collections'); return COLLECTIONS; }

  /* ---------- PRZEGLĄD ---------- */
  async function renderOverview(b){
    const [ov] = await Promise.all([api('/api/stratfanat/overview'), loadProducts('aktywny')]);
    const k = ov.kpi, nd = ov.next_drop;
    const ndDays = nd ? Math.round((new Date(nd.drop_date+'T12:00') - new Date(today()+'T12:00'))/864e5) : null;
    b.innerHTML = `<div class="stats">
        <div class="stat"><div class="v">${fmtMoney(k.sales_month)}${delta(k.sales_delta_pct)}</div><div class="l">sprzedaż w tym mies.</div></div>
        <div class="stat"><div class="v">${num(k.units_month)}${delta(k.units_delta_pct)}</div><div class="l">sprzedane sztuki · ${num(k.orders_month)} zam.</div></div>
        <div class="stat"><div class="v">${fmtMoney(k.gross_margin_month)}</div><div class="l">marża brutto (mies.)</div></div>
        <div class="stat"><div class="v">${fmtMoney(k.stock_value_cost)}</div><div class="l">magazyn po koszcie · ${num(k.stock_units)} szt.</div></div>
        <div class="stat"><div class="v ${k.low_stock_count?'down':''}">${num(k.low_stock_count)}</div><div class="l">niskie stany</div></div>
        <div class="stat"><div class="v">${nd?(ndDays===0?'dziś':ndDays+' dni'):'—'}</div><div class="l">${nd?'do dropu: '+esc(nd.name):'brak zaplanowanego dropu'}</div></div>
      </div>
      ${ov.alerts?.length?`<div class="card" style="margin-bottom:18px"><h2>Na co zwrócić uwagę</h2>${ov.alerts.slice(0,6).map(a=>`<div class="bx-alert ${esc(a.severity)}"><div class="ic">${a.severity==='info'?'💡':'⚠️'}</div><div class="t"><b>${esc(a.title)}</b>${esc(a.body||'')}<div class="sug">${esc(a.suggestion||'')}</div></div></div>`).join('')}</div>`:''}
      <div class="card" style="margin-bottom:18px"><div class="card-h"><h2>Szybka sprzedaż</h2><span class="m">zdejmie ze stanu i doda przychód w Finansach</span></div>${quickSaleForm()}</div>
      <div class="grid g2">${ov.charts.length ? ov.charts.map(c=>`<div class="card">${renderChart(c)}</div>`).join('') : `<div class="card"><div class="bx-empty">Wykresy pojawią się po pierwszej zapisanej sprzedaży.<br>Powiedz agentowi np. „sprzedałem 2 bluzy Ulica M na Instagramie”.</div></div>`}</div>
      <div class="grid g2" style="margin-top:18px">
        <div class="card"><div class="card-h"><h2>Niskie stany</h2><button class="link" data-tab="stock">magazyn →</button></div>
          ${ov.low_stock.length?`<div class="sf-low">${ov.low_stock.slice(0,12).map(l=>`<div class="it"><div class="q">${l.stock}</div><div class="t"><b>${esc(l.name)}</b><div class="m">rozmiar ${esc(l.size)} · ${esc(l.sku||'')}</div></div><button class="btn ghost sq" data-act="restock" data-id="${l.id}" data-size="${esc(l.size)}">+ Dostawa</button></div>`).join('')}</div>`:'<div class="bx-empty">Wszystkie rozmiary powyżej progu ✓</div>'}</div>
        <div class="card"><h2>Ostatnia sprzedaż</h2>${ov.recent_sales.length?`<div class="bx-list">${ov.recent_sales.map(s=>`<div class="row"><div class="t"><b>${esc(s.name)}</b> <span class="pill">${esc(s.size)}</span> ×${s.qty}<div class="m">${esc(s.date)} · ${esc(CH_LBL[s.channel]||s.channel)}</div></div><div class="amount">${fmtMoney(s.total)}</div><button class="icon-btn del" title="Cofnij sprzedaż (przywraca stan i usuwa przychód)" data-act="undo-sale" data-id="${s.id}"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg></button></div>`).join('')}</div>`:'<div class="bx-empty">Brak sprzedaży.</div>'}</div>
      </div>`;
    bindQuickSale(b);
  }
  function quickSaleForm(){
    if (!PRODUCTS.length) return '<div class="bx-empty">Najpierw dodaj produkt (przycisk „+ Produkt”).</div>';
    return `<form class="sf-quick" id="sf-qs">
      <div class="wide"><label>Produkt</label><select name="product">${PRODUCTS.map(p=>`<option value="${p.id}">${esc(p.name)}${p.color?' · '+esc(p.color):''}</option>`).join('')}</select></div>
      <div><label>Rozmiar</label><select name="size"></select></div>
      <div><label>Sztuk</label><input name="qty" type="number" min="1" value="1"></div>
      <div><label>Cena/szt.</label><input name="price" type="number" step="0.01" min="0"></div>
      <div><label>Kanał</label><select name="channel">${opt(META.channels.map(c=>[c,CH_LBL[c]||c]),'instagram')}</select></div>
      <button class="btn">Zapisz sprzedaż</button></form>`;
  }
  function bindQuickSale(b){
    const f = b.querySelector('#sf-qs'); if (!f) return;
    const sync = () => { const p = PRODUCTS.find(x=>x.id==f.product.value); if (!p) return;
      f.size.innerHTML = sizesOf(p).map(s=>`<option value="${esc(s)}">${esc(s)} (${p.stock[s]})</option>`).join(''); f.price.placeholder = p.price; };
    f.product.onchange = sync; sync();
    f.onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f).entries()); if (!d.price) delete d.price;
      const r = await api('/api/stratfanat/sale',{method:'POST',body:d}); toast(`Sprzedano ${r.produkt} ${r.rozmiar} ×${r.ilosc} · ${fmtMoney(r.kwota)} ✓`+(r.uwaga?' · '+r.uwaga:'')); renderTab(); };
  }

  /* ---------- MAGAZYN ---------- */
  async function renderStock(b){
    await Promise.all([loadProducts(prodFilter), loadCollections()]);
    const q = prodQ.toLowerCase();
    const list = PRODUCTS.filter(p => !q || [p.name,p.sku,p.color,p.category].join(' ').toLowerCase().includes(q));
    const units = list.reduce((a,p)=>a+p.units,0), val = list.reduce((a,p)=>a+p.stock_value_cost,0);
    b.innerHTML = `<div class="filters">${[['aktywny','Aktywne'],['archiwum','Archiwum'],['all','Wszystkie']].map(([k,l])=>`<button class="chip ${prodFilter===k?'active':''}" data-pf="${k}">${l}</button>`).join('')}
        <input id="sf-pq" placeholder="Szukaj: nazwa, SKU, kolor…" value="${esc(prodQ)}" style="flex:1 1 200px">
        <span class="m">${list.length} produktów · ${num(units)} szt. · ${fmtMoney(val)} po koszcie</span></div>
      <div class="card"><div class="bx-scroll"><table class="bx-table"><thead><tr><th>Produkt</th><th class="hide-m">Kategoria</th><th class="num">Cena</th><th class="num hide-m">Koszt</th><th>Stan per rozmiar</th><th class="num">Razem</th><th class="num hide-m">30 dni</th><th></th></tr></thead><tbody>
      ${list.length ? list.map(p=>`<tr class="${p.status!=='aktywny'?'dim':''}"><td class="name"><b>${esc(p.name)}</b><div class="m">${esc(p.sku||'')}${p.color?' · '+esc(p.color):''}${p.collection?' · '+esc(p.collection):''}</div></td>
        <td class="hide-m">${esc(p.category)}</td><td class="num">${fmtMoney(p.price)}</td><td class="num hide-m">${fmtMoney(p.unit_cost)}</td>
        <td><div class="sf-stock">${sizesOf(p).map(s=>{ const v=p.stock[s]; const cls = v===0?'zero':(p.low_sizes.includes(s)?'low':''); return `<label class="sf-size ${cls}"><span>${esc(s)}</span><input type="number" min="0" value="${v}" data-stock="${p.id}" data-size="${esc(s)}" title="Zmień stan i wyjdź z pola, aby zapisać"></label>`; }).join('')}</div></td>
        <td class="num"><b>${p.units}</b></td><td class="num hide-m">${p.sold_30d||0}</td>
        <td class="acts"><button class="btn sq" data-act="sale" data-id="${p.id}">Sprzedaż</button> <button class="btn ghost sq" data-act="restock" data-id="${p.id}">Dostawa</button> <button class="btn ghost sq" data-act="edit-product" data-id="${p.id}">Edytuj</button></td></tr>`).join('')
        : `<tr><td colspan="8"><div class="bx-empty">Brak produktów. Dodaj pierwszy przyciskiem „+ Produkt” albo powiedz agentowi: „dodaj bluzę Ulica, czarna, 249 zł, koszt 95, S:5 M:10 L:8”.</div></td></tr>`}
      </tbody></table></div><p class="m" style="margin:10px 0 0">Ręczna zmiana stanu w tabeli nie tworzy wpisu w finansach – do sprzedaży i dostaw używaj przycisków.</p></div>`;
    const qi = b.querySelector('#sf-pq'); let t; qi.oninput = () => { clearTimeout(t); t = setTimeout(()=>{ prodQ = qi.value; renderStock(b).then(()=>{ const n=b.querySelector('#sf-pq'); n.focus(); n.setSelectionRange(n.value.length,n.value.length); }); }, 300); };
  }

  function productModal(p){
    p = p || {category:'koszulka', status:'aktywny', low_stock_threshold:2};
    const stockTxt = p.stock ? Object.entries(p.stock).map(([k,v])=>`${k}:${v}`).join(', ') : (['czapka','akcesoria'].includes(p.category)?'ONE:0':'S:0, M:0, L:0, XL:0');
    modal(p.id ? 'Edytuj produkt' : 'Nowy produkt', `<div class="bx-form">
      ${field('Nazwa', `<input name="name" required value="${esc(p.name||'')}">`, 1)}
      ${field('SKU (puste = automatyczne)', `<input name="${p.id?'new_sku':'sku'}" value="${esc(p.sku||'')}">`)}
      ${field('Kategoria', `<select name="category">${opt(META.categories, p.category)}</select>`)}
      ${field('Kolor', `<input name="color" value="${esc(p.color||'')}">`)}
      ${field('Kolekcja', `<select name="collection"><option value="">— brak —</option>${opt(COLLECTIONS.map(c=>[String(c.id),c.name]), p.collection_id)}</select>`)}
      ${field('Cena sprzedaży (zł)', `<input name="price" type="number" step="0.01" min="0" value="${p.price??''}">`)}
      ${field('Koszt 1 szt. (zł)', `<input name="unit_cost" type="number" step="0.01" min="0" value="${p.unit_cost??''}">`)}
      ${field('Stan per rozmiar (np. S:3, M:5, L:4)', `<input name="stock" value="${esc(stockTxt)}">`, 1)}
      ${field('Próg niskiego stanu', `<input name="low_stock_threshold" type="number" min="0" value="${p.low_stock_threshold??2}">`)}
      ${field('Status', `<select name="status">${opt(['aktywny','archiwum'], p.status)}</select>`)}
      ${field('Notatki', `<textarea name="notes" rows="3">${esc(p.notes||'')}</textarea>`, 1)}</div>`,
      { onSubmit: async d => {
          const stock = {}; String(d.stock||'').split(/[,;]/).forEach(x=>{ const [k,v]=x.split(':'); if (k && k.trim()) stock[k.trim().toUpperCase()] = parseInt(v)||0; });
          const body = {...d, stock};
          if (p.id) await api('/api/stratfanat/products/'+p.id,{method:'PATCH',body});
          else await api('/api/stratfanat/products',{method:'POST',body});
          toast('Zapisano ✓'); renderTab(); },
        del: p.id ? async()=>{ if(!confirm('Usunąć produkt? (z historią sprzedaży trafi do archiwum)')) return false; const r = await api('/api/stratfanat/products/'+p.id,{method:'DELETE'}); toast(r.info||'Usunięto'); renderTab(); return true; } : null });
  }
  function saleModal(p){
    const prods = PRODUCTS.filter(x=>x.status==='aktywny');
    if (!prods.length) return toast('Najpierw dodaj produkt');
    p = p || prods[0];
    const m = modal('Sprzedaż', `<div class="bx-form">
      ${field('Produkt', `<select name="product">${prods.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}${x.color?' · '+esc(x.color):''}</option>`).join('')}</select>`, 1)}
      ${field('Rozmiar', `<select name="size"></select>`)}${field('Sztuk', `<input name="qty" type="number" min="1" value="1" required>`)}
      ${field('Cena za sztukę (zł)', `<input name="price" type="number" step="0.01" min="0">`)}${field('Kanał', `<select name="channel">${opt(META.channels.map(c=>[c,CH_LBL[c]||c]),'instagram')}</select>`)}
      ${field('Data', `<input name="date" type="date" value="${today()}">`)}${field('Notatka', `<input name="notes" placeholder="np. klient, nr zamówienia">`)}
      </div><p class="m">Przychód zostanie zapisany w Finansach (Stratfanat · sprzedaż ubrań).</p>`,
      { submit:'Zapisz sprzedaż', onSubmit: async d => { if (!d.price) delete d.price;
          const r = await api('/api/stratfanat/sale',{method:'POST',body:d}); toast(`Sprzedano ×${r.ilosc} · ${fmtMoney(r.kwota)} ✓`+(r.uwaga?' · '+r.uwaga:'')); renderTab(); } });
    const f = m.querySelector('form');
    const sync = () => { const x = PRODUCTS.find(y=>y.id==f.product.value); f.size.innerHTML = sizesOf(x).map(s=>`<option value="${esc(s)}">${esc(s)} — na stanie ${x.stock[s]}</option>`).join(''); f.price.placeholder = x.price; };
    f.product.onchange = sync; sync();
  }
  function restockModal(p, size){
    const prods = PRODUCTS.length ? PRODUCTS : [];
    if (!p) p = prods[0]; if (!p) return toast('Najpierw dodaj produkt');
    const m = modal('Dostawa / dodruk', `<div class="bx-form">
      ${field('Produkt', `<select name="product">${prods.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`, 1)}
      ${field('Rozmiar (możesz wpisać nowy)', `<input name="size" list="sf-sizes" required value="${esc(size||'')}"><datalist id="sf-sizes"></datalist>`)}
      ${field('Sztuk', `<input name="qty" type="number" min="1" value="10" required>`)}
      ${field('Koszt 1 szt. (zł)', `<input name="unit_cost" type="number" step="0.01" min="0">`)}${field('Data', `<input name="date" type="date" value="${today()}">`)}
      ${field('Notatka', `<input name="notes" placeholder="np. szwalnia, nr faktury">`, 1)}</div>
      <p class="m">Koszt (sztuki × koszt jednostkowy) trafi do Finansów jako „materiały/produkcja”.</p>`,
      { submit:'Przyjmij dostawę', onSubmit: async d => { if (!d.unit_cost) delete d.unit_cost;
          const r = await api('/api/stratfanat/restock',{method:'POST',body:d}); toast(`Dodano ${r.dodano} szt. ${r.rozmiar}`+(r.koszt?` · koszt ${fmtMoney(r.koszt)}`:'')+' ✓'); renderTab(); } });
    const f = m.querySelector('form');
    const sync = () => { const x = PRODUCTS.find(y=>y.id==f.product.value); f.querySelector('#sf-sizes').innerHTML = sizesOf(x).map(s=>`<option value="${esc(s)}">`).join(''); f.unit_cost.placeholder = x.unit_cost||''; if (!size) f.size.value = sizesOf(x)[0]||''; };
    f.product.onchange = () => { size = null; sync(); }; sync();
  }

  /* ---------- DROPY ---------- */
  async function renderDrops(b){
    await loadCollections();
    const now = today();
    b.innerHTML = `<div class="card-h"><h2>Kolekcje i dropy</h2><button class="btn" data-act="new-drop">+ Nowy drop</button></div>
      ${COLLECTIONS.length ? `<div class="sf-timeline">${COLLECTIONS.map(c=>{
        const si = STATUS.indexOf(c.status), done = c.status==='zakończona', soon = c.days_left!=null && c.days_left>=0 && c.days_left<=7 && si<3;
        const cl = c.checklist||[], nDone = cl.filter(x=>x.done).length;
        return `<div class="sf-drop ${done?'done':''} ${soon?'soon':''}"><div class="top"><div><h3>${esc(c.name)}</h3>
          <div class="meta">${c.season?`<span class="pill accent">${esc(c.season)}</span>`:''}<span class="pill">${c.drop_date?esc(c.drop_date)+' · 18:00':'bez daty'}</span>${c.budget?`<span class="pill">budżet ${fmtMoney(c.budget)}</span>`:''}<span class="pill">${c.products} prod. · ${c.designs} proj.</span>${c.units_sold?`<span class="pill ok">${c.units_sold} szt. · ${fmtMoney(c.revenue)}</span>`:''}</div></div>
          <div class="days">${c.days_left==null?'—':c.days_left<0?'po':c.days_left}<small>${c.days_left==null?'':c.days_left<0?'premierze':'dni do dropu'}</small></div></div>
          ${c.concept?`<div class="m" style="white-space:pre-wrap">${esc(c.concept)}</div>`:''}
          <div class="sf-pipe">${STATUS.map((s,i)=>`<i class="${i<=si?'on':''}"></i>`).join('')}</div><div class="sf-pipe-l">${STATUS.map(s=>`<span>${s}</span>`).join('')}</div>
          <div class="actions" style="margin-top:10px"><select data-coll-status="${c.id}">${opt(STATUS,c.status)}</select>
            <button class="btn ghost sq" data-act="edit-drop" data-id="${c.id}">Edytuj</button>
            <button class="btn ghost sq" data-ask="Przygotuj kampanię dropu „${esc(c.name)}” (umiejętność Kampania dropu): teasery, plan treści, sesja lookbook, countdown, dzień premiery i po premierze.">📣 Kampania</button>
            <button class="btn ghost sq" data-ask="Zaprojektuj produkty do kolekcji Stratfanat „${esc(c.name)}”${c.concept?' (koncepcja: '+esc(c.concept)+')':''} – umiejętność Projektant mody, makiety design_mockup z collection=${c.id}.">✏️ Projekty</button></div>
          ${cl.length?`<details class="sf-check" ${si<4&&c.days_left!=null&&c.days_left<=60?'open':''}><summary>Checklista: ${nDone}/${cl.length} ▾</summary><ul>${cl.map((x,i)=>`<li class="${x.done?'ok':''} ${x.date<now?'past':''}" data-step="${i}" data-coll="${c.id}"><input type="checkbox" ${x.done?'checked':''} tabindex="-1"><span class="d">${esc(x.date)} ${esc(x.T)}</span><span>${esc(x.krok)}</span></li>`).join('')}</ul></details>`:''}
        </div>`; }).join('')}</div>`
      : `<div class="card"><div class="bx-empty">Brak kolekcji. Zaplanuj pierwszy drop – dostaniesz checklistę na 8 tygodni i wpis w kalendarzu.</div></div>`}`;
  }
  function dropModal(c){
    const edit = !!c; c = c || {};
    modal(edit ? 'Edytuj kolekcję' : 'Nowy drop', `<div class="bx-form">
      ${field('Nazwa kolekcji / dropu', `<input name="name" required value="${esc(c.name||'')}">`, 1)}
      ${field('Sezon', `<input name="season" placeholder="np. SS27, FW26, capsule" value="${esc(c.season||'')}">`)}
      ${field('Data premiery', `<input name="drop_date" type="date" required value="${esc(c.drop_date||'')}">`)}
      ${field('Budżet (zł)', `<input name="budget" type="number" min="0" step="1" value="${c.budget??''}">`)}
      ${field('Status', `<select name="status">${opt(STATUS, c.status||'pomysł')}</select>`)}
      ${field('Koncepcja', `<textarea name="concept" rows="4" placeholder="motyw, klimat, inspiracje, modele">${esc(c.concept||'')}</textarea>`, 1)}
      ${edit?'':`<div class="full"><label class="check"><input type="checkbox" name="create_tasks" value="1"> Utwórz też zadania z checklisty (z terminami)</label></div>`}</div>`,
      { submit: edit?'Zapisz':'Zaplanuj drop', onSubmit: async d => {
          if (edit) { await api('/api/stratfanat/collections/'+c.id,{method:'PATCH',body:d}); toast('Zapisano ✓'); }
          else { d.create_tasks = !!d.create_tasks; const r = await api('/api/stratfanat/collections',{method:'POST',body:d}); toast(`Drop zaplanowany: ${r.dni_do_dropu} dni, wpis w kalendarzu ✓`+(r.zadania_utworzone?` · ${r.zadania_utworzone} zadań`:'')); if (r.uwaga) setTimeout(()=>toast(r.uwaga), 3000); }
          renderTab(); },
        del: edit ? async()=>{ if(!confirm('Usunąć kolekcję i jej wpis w kalendarzu?')) return false; await api('/api/stratfanat/collections/'+c.id,{method:'DELETE'}); renderTab(); return true; } : null });
  }

  /* ---------- PROJEKTY ---------- */
  async function renderDesigns(b){
    const [designs] = await Promise.all([api('/api/stratfanat/designs'), loadCollections()]);
    b.innerHTML = `<div class="grid g2" style="align-items:start">
      <div class="card"><h2>Nowa makieta</h2><form id="sf-df" class="bx-form">
        ${field('Produkt', `<select name="product_type">${opt(Object.entries(META.product_types),'hoodie')}</select>`)}
        ${field('Styl grafiki', `<select name="graphic_style">${opt(Object.entries(META.styles),'bold')}</select>`)}
        ${field('Kolor bazy', colorInput('base_color','#111111'))}${field('Kolor nadruku', colorInput('print_color','#f4f4f2'))}
        ${field('Napis / hasło (linie oddziel | )', `<input name="print_text" placeholder="np. STRATFANAT | EST. 2024">`, 1)}
        ${field('Umieszczenie', `<select name="placement">${opt(Object.entries(META.placements),'front_center')}</select>`)}
        ${field('Wykończenia (ściągacze)', colorInput('trim_color',''))}
        ${field('Tytuł projektu', `<input name="title" placeholder="np. Hoodie Ulica – czarna">`)}
        ${field('Kolekcja', `<select name="collection"><option value="">— brak —</option>${opt(COLLECTIONS.map(c=>[String(c.id),c.name]))}</select>`)}
        ${field('Notatki / koncepcja', `<input name="notes" placeholder="materiał, technika, inspiracja">`, 1)}
        <div class="full"><label class="check"><input type="checkbox" name="ai" value="1" id="sf-ai-chk"> Wygeneruj też obraz AI (lokalny ComfyUI)</label></div>
        <div class="full" id="sf-ai-box" hidden><label>Prompt AI (po angielsku – zostaw puste, by ułożyć automatycznie)</label><textarea name="prompt" rows="3"></textarea></div>
        <div class="full actions"><button class="btn">Narysuj makietę</button><button type="button" class="btn ghost" data-ask="Zaprojektuj nowy produkt Stratfanat (umiejętność Projektant mody). Zacznij od pytań o typ produktu i klimat.">Zaprojektuj z agentem</button></div>
      </form></div>
      <div class="card"><h2>Podgląd</h2><div class="sf-mockup-preview" id="sf-prev">${designs[0]?.svg_url?`<img src="${designs[0].svg_url}?t=${Date.now()}" alt="" data-zoom="${designs[0].svg_url}" data-cap="${esc(designs[0].title)}">`:'Tu pojawi się makieta (przód + tył, colorway, blok tytułowy).'}</div>
        <p class="m" style="margin:10px 0 0">Makieta to techniczny rysunek (flat sketch) do tech packu i rozmów ze szwalnią/drukarnią. Obrazy AI generuje lokalny ComfyUI (SDXL).</p></div>
    </div>
    <div class="card-h" style="margin-top:22px"><h2>Galeria projektów</h2><span class="m">${designs.length} projektów</span></div>
    ${designs.length?`<div class="sf-gallery">${designs.map(designCard).join('')}</div>`:'<div class="card"><div class="bx-empty">Brak projektów – narysuj pierwszą makietę powyżej.</div></div>'}`;
    const f = b.querySelector('#sf-df');
    f.querySelector('#sf-ai-chk').onchange = e => { b.querySelector('#sf-ai-box').hidden = !e.target.checked; };
    bindColors(f);
    f.onsubmit = async e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f).entries());
      const btn = f.querySelector('.btn'); btn.disabled = true; btn.textContent = 'Rysuję…';
      try {
        const r = await api('/api/stratfanat/designs/mockup',{method:'POST',body:d});
        toast('Makieta gotowa ✓');
        if (d.ai) {
          toast('Generuję obraz w ComfyUI… (to może potrwać 1–2 min)');
          const prompt = d.prompt?.trim() || autoPrompt(d);
          const a = await api('/api/stratfanat/designs/ai',{method:'POST',body:{prompt, design_id:r.design_id, width:1024, height:1024}}).catch(()=>null);
          if (a && !a.ok) aiHelp(a); else if (a) toast('Obraz AI gotowy ✓');
        }
        await renderDesigns(b);
      } finally { btn.disabled = false; btn.textContent = 'Narysuj makietę'; }
    };
  }
  const NAMES_EN = {tshirt:'oversized heavyweight t-shirt', hoodie:'oversized heavyweight hoodie', crewneck:'heavyweight crewneck sweatshirt', cap:'6-panel baseball cap', tote:'canvas tote bag', jacket:'bomber jacket'};
  const PLACE_EN = {front_center:'large print on the front center', chest_left:'small logo on the left chest', back_large:'large back print', sleeve:'print along the sleeve'};
  function autoPrompt(d){
    return `studio product photo of a ${NAMES_EN[d.product_type]||'garment'} in color ${d.base_color}, ${PLACE_EN[d.placement]||''} with text "${(d.print_text||'').replace(/\|/g,' ')}" in ${d.print_color}, ${d.graphic_style} streetwear graphic style, premium cotton texture, soft box lighting, neutral concrete background, high detail, 35mm`;
  }
  function aiHelp(a){
    modal('ComfyUI niedostępny', `<div class="sf-preview">${md(a.instrukcja || a.error || 'Nie udało się wygenerować obrazu.')}</div>${a.szczegoly?`<p class="m">${esc(a.szczegoly)}</p>`:''}`, {});
  }
  function colorInput(name, val){
    return `<div class="bx-color"><input type="color" value="${esc(val||'#888888')}" data-color-for="${name}"><input type="text" name="${name}" value="${esc(val)}" placeholder="${val?'':'auto'}"></div>`;
  }
  function bindColors(f){
    f.querySelectorAll('[data-color-for]').forEach(c => { const t = f.querySelector(`[name=${c.dataset.colorFor}]`);
      c.oninput = () => { t.value = c.value; }; t.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) c.value = t.value; }; });
  }
  function designCard(d){
    const cols = d.colors || {};
    return `<div class="sf-design">${d.svg_url?`<img class="img" loading="lazy" src="${d.svg_url}" alt="" data-zoom="${d.svg_url}" data-cap="${esc(d.title)}">`:(d.ai_images[0]?`<img class="img" loading="lazy" src="${d.ai_images[0]}" style="object-fit:cover" data-zoom="${d.ai_images[0]}" data-cap="${esc(d.title)}">`:'<div class="noimg">brak podglądu</div>')}
      ${d.ai_images.length && d.svg_url?`<div class="ai">${d.ai_images.map(u=>`<img src="${u}" loading="lazy" alt="" data-zoom="${u}" data-cap="${esc(d.title)} · AI">`).join('')}</div>`:''}
      <div class="cap"><b>${esc(d.title)}</b><div class="m">${esc(META.product_types[d.product_type]||d.product_type||'')}${d.placement?' · '+esc(META.placements[d.placement]||d.placement):''}</div>
        <div class="foot"><span class="sw">${['base','print','trim'].filter(k=>cols[k]).map(k=>`<i style="background:${esc(cols[k])}" title="${k}: ${esc(cols[k])}"></i>`).join('')}</span>
        <span class="pill">${esc(d.status||'szkic')}</span><span style="flex:1"></span>
        ${d.svg_url?`<button class="link" data-act="ai-design" data-id="${d.id}" title="Wygeneruj obraz AI do tego projektu">+ AI</button>`:''}
        <a class="link" href="${d.svg_url||d.ai_images[0]||'#'}" download>pobierz</a>
        <button class="icon-btn del" data-act="del-design" data-id="${d.id}" title="Usuń"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg></button></div></div></div>`;
  }

  /* ---------- TRENDY ---------- */
  async function renderTrends(b){
    const trends = await api('/api/stratfanat/trends');
    const col = s => s>=8 ? 'var(--ok)' : s>=5 ? 'var(--accent)' : 'var(--warn)';
    b.innerHTML = `<div class="card-h"><h2>Tablica trendów</h2><div class="actions"><button class="btn ghost" data-act="new-trend">+ Trend</button><button class="btn" data-ask="Znajdź aktualne trendy streetwear pasujące do Stratfanat (umiejętność Trendy streetwear). Oceń dopasowanie do DNA marki i zapisz najlepsze na tablicy trendów.">🔎 Research z agentem</button></div></div>
      <p class="sub">Ocena 1–10 = dopasowanie do DNA marki, popyt w PL, wykonalność i trwałość trendu.</p>
      ${trends.length?`<div class="sf-trends">${trends.map(t=>`<div class="sf-trend"><div class="top"><h3>${esc(t.title)}</h3><div class="sf-score" style="--p:${t.fit_score*10};--c:${col(t.fit_score)}"><span>${t.fit_score}</span></div></div>
        ${t.description?`<p>${esc(t.description)}</p>`:''}
        <div class="foot">${(t.tags||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>
        <div class="foot">${t.source?(/^https?:/.test(t.source)?`<a class="link" href="${esc(t.source)}" target="_blank" rel="noopener">źródło ↗</a>`:`<span class="m">${esc(t.source)}</span>`):''}<span style="flex:1"></span>
          <select data-trend-status="${t.id}">${opt(TREND_ST, t.status)}</select>
          <button class="link" data-ask="Zaprojektuj produkt Stratfanat wykorzystujący trend „${esc(t.title)}” (umiejętność Projektant mody) i narysuj makietę.">projektuj →</button>
          <button class="icon-btn del" data-act="del-trend" data-id="${t.id}" title="Usuń"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg></button></div></div>`).join('')}</div>`
      :'<div class="card"><div class="bx-empty">Brak zapisanych trendów. Kliknij „Research z agentem” – agent przeszuka Hypebeast, Highsnobiety, Pinterest Trends, TikTok, Google Trends, Grailed i Vinted.</div></div>'}`;
  }
  function trendModal(){
    modal('Nowy trend', `<div class="bx-form">${field('Nazwa', '<input name="title" required>', 1)}
      ${field('Opis i pomysł na wdrożenie', '<textarea name="description" rows="4"></textarea>', 1)}
      ${field('Źródło (URL)', '<input name="source">')}${field('Dopasowanie 1–10', '<input name="fit_score" type="number" min="1" max="10" value="7" required>')}
      ${field('Tagi (po przecinku)', '<input name="tags">', 1)}</div>`,
      { onSubmit: async d => { await api('/api/stratfanat/trends',{method:'POST',body:d}); toast('Zapisano ✓'); renderTab(); } });
  }

  /* ---------- DNA MARKI ---------- */
  async function renderBrand(b){
    const r = await api('/api/stratfanat/brand');
    b.innerHTML = `<div class="grid g2 sf-brand" style="align-items:start"><div class="card"><div class="card-h"><h2>DNA marki</h2><div class="actions"><button class="btn ghost sq" id="sf-bprev">Podgląd</button><button class="btn sq" id="sf-bsave">Zapisz</button></div></div>
        <textarea id="sf-btext" spellcheck="true">${esc(r.text||'')}</textarea><p class="m" style="margin:8px 0 0">Plik: ${esc(r.path)} · agent czyta go przed projektowaniem, researchem i pisaniem treści.</p></div>
      <div class="card"><div class="card-h"><h2>Podgląd</h2><button class="btn ghost sq" data-ask="Pomóż mi uzupełnić DNA marki Stratfanat (brand_profile): zadawaj mi po kolei krótkie pytania o każdą pustą sekcję, a na końcu pokaż gotowy tekst do wklejenia.">✨ Uzupełnij z agentem</button></div><div class="sf-preview" id="sf-bview">${md(r.text||'')}</div></div></div>`;
    const ta = b.querySelector('#sf-btext');
    b.querySelector('#sf-bprev').onclick = () => { b.querySelector('#sf-bview').innerHTML = md(ta.value); };
    b.querySelector('#sf-bsave').onclick = async () => { await api('/api/stratfanat/brand',{method:'POST',body:{text:ta.value}}); b.querySelector('#sf-bview').innerHTML = md(ta.value); toast('DNA marki zapisane ✓'); };
  }

  /* ---------- zdarzenia ---------- */
  async function onClick(e){
    const t = e.target;
    const tb = t.closest('[data-tab]'); if (tb){ tab = tb.dataset.tab; try{ store.set('sf-tab',tab); }catch(_){} renderTabs(); return renderTab(); }
    const ak = t.closest('[data-ask]'); if (ak) return ask(ak.dataset.ask);
    const pf = t.closest('[data-pf]'); if (pf){ prodFilter = pf.dataset.pf; return renderTab(); }
    const z = t.closest('[data-zoom]'); if (z) return lightbox(z.dataset.zoom, z.dataset.cap, [['otwórz w nowej karcie', z.dataset.zoom]]);
    const st = t.closest('[data-step]');
    if (st){ e.preventDefault(); await api('/api/stratfanat/collections/'+st.dataset.coll,{method:'PATCH',body:{done_step:+st.dataset.step}});
      st.classList.toggle('ok'); const cb = st.querySelector('input'); cb.checked = st.classList.contains('ok');
      const ul = st.closest('ul'), sm = st.closest('details').querySelector('summary'); sm.textContent = `Checklista: ${ul.querySelectorAll('li.ok').length}/${ul.children.length} ▾`; return; }
    const a = t.closest('[data-act]'); if (!a) return;
    const id = +a.dataset.id;
    switch (a.dataset.act){
      case 'new-product': if (!COLLECTIONS.length) await loadCollections().catch(()=>{}); return productModal(null);
      case 'edit-product': { if (!COLLECTIONS.length) await loadCollections(); return productModal(PRODUCTS.find(p=>p.id===id)); }
      case 'sale': if (!PRODUCTS.length) await loadProducts(); return saleModal(PRODUCTS.find(p=>p.id===id));
      case 'restock': if (!PRODUCTS.find(p=>p.id===id)) await loadProducts('all'); return restockModal(PRODUCTS.find(p=>p.id===id), a.dataset.size);
      case 'undo-sale': if (!confirm('Cofnąć tę sprzedaż? Stan wróci do magazynu, a przychód zniknie z Finansów.')) return; await api('/api/stratfanat/sales/'+id,{method:'DELETE'}); toast('Cofnięto'); return renderTab();
      case 'new-drop': return dropModal(null);
      case 'edit-drop': return dropModal(COLLECTIONS.find(c=>c.id===id));
      case 'new-trend': return trendModal();
      case 'del-trend': if (!confirm('Usunąć trend?')) return; await api('/api/stratfanat/trends/'+id,{method:'DELETE'}); return renderTab();
      case 'del-design': if (!confirm('Usunąć projekt i jego pliki?')) return; await api('/api/stratfanat/designs/'+id,{method:'DELETE'}); return renderTab();
      case 'ai-design': {
        const d = (await api('/api/stratfanat/designs')).find(x=>x.id===id); if (!d) return;
        const c = d.colors||{};
        modal('Obraz AI do projektu', `<div class="bx-form">${field('Prompt (angielski)', `<textarea name="prompt" rows="5">${esc(autoPrompt({product_type:d.product_type, base_color:c.base, print_color:c.print, placement:d.placement, graphic_style:d.graphic_style, print_text:d.print_text}))}</textarea>`, 1)}
          ${field('Szerokość', '<input name="width" type="number" value="1024" step="64">')}${field('Wysokość', '<input name="height" type="number" value="1024" step="64">')}</div>
          <p class="m">Generowanie w lokalnym ComfyUI trwa zwykle 20 s – 2 min.</p>`,
          { submit:'Generuj', onSubmit: async v => { toast('Generuję…'); const r = await api('/api/stratfanat/designs/ai',{method:'POST',body:{...v, design_id:id}}); if (!r.ok) { aiHelp(r); return; } toast('Obraz AI gotowy ✓'); renderTab(); } });
        return;
      }
    }
  }
  async function onChange(e){
    const t = e.target;
    if (t.dataset.stock){
      const p = PRODUCTS.find(x=>x.id==t.dataset.stock); if (!p) return;
      const stock = {...p.stock, [t.dataset.size]: Math.max(0, parseInt(t.value)||0)};
      await api('/api/stratfanat/products/'+p.id,{method:'PATCH',body:{stock}}); p.stock = stock; toast(`Stan ${p.name} ${t.dataset.size}: ${stock[t.dataset.size]} ✓`);
      const lbl = t.closest('.sf-size'); lbl.classList.toggle('zero', stock[t.dataset.size]===0); lbl.classList.toggle('low', stock[t.dataset.size]>0 && stock[t.dataset.size]<=p.low_stock_threshold);
      return;
    }
    if (t.dataset.collStatus){ await api('/api/stratfanat/collections/'+t.dataset.collStatus,{method:'PATCH',body:{status:t.value}}); toast('Status: '+t.value); return renderTab(); }
    if (t.dataset.trendStatus){ await api('/api/stratfanat/trends/'+t.dataset.trendStatus,{method:'PATCH',body:{status:t.value}}); toast('Zapisano'); }
  }

  LOADERS.stratfanat = load;
})();
