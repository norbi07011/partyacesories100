/* Studio Agent – moduł TRADING (konto DEMO, wirtualne pieniądze).
   Wykres świecowy na <canvas> (własny kod): wolumen, EMA, Bollinger, S/R, pozycje, crosshair, zoom/przesuwanie,
   panele RSI i MACD. Analiza agentek Luna i Nova, konto demo, dziennik, boty, backtest, wiedza. */
(function(){
const TR = {
  symbol: store.get('tr_sym', 'BTCUSDT'), interval: store.get('tr_iv', '60'),
  meta: null, data: null, analysis: null, account: null, bots: [],
  side: 'long', sizeMode: store.get('tr_size', 'usdt'), built: false, timer: null, tick: 0,
  view: { end: null, count: 120 }, hover: null, show: JSON.parse(store.get('tr_layers', 'null') || 'null') || { ema: true, bb: false, sr: true, vol: true, pos: true },
  posTab: 'open', kbTopic: null,
};
const root = () => document.getElementById('view-trading');
const q = s => root().querySelector(s);
const qa = s => [...root().querySelectorAll(s)];
const nd = p => { const a = Math.abs(+p || 0); return a >= 100 ? 2 : a >= 1 ? 4 : 6; };
const fp = p => p == null || isNaN(p) ? '—' : Number(p).toLocaleString('pl-PL', { minimumFractionDigits: Math.min(2, nd(p)), maximumFractionDigits: nd(p) });
const fu = (v, sign) => v == null || isNaN(v) ? '—' : (sign && v > 0 ? '+' : '') + Number(v).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
const fpct = v => v == null || isNaN(v) ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(2).replace('.', ',') + '%';
const cls = v => v > 0 ? 'tr-up' : v < 0 ? 'tr-down' : '';
const coin = s => String(s || '').replace(/USDT$|USDC$|USD$/, '');
const ivLabel = iv => ({ '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m', '60': '1h', '120': '2h', '240': '4h', 'D': '1D', 'W': '1W' })[iv] || iv;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const dirPill = d => `<span class="pill tr-dir ${d === 'LONG' ? 'long' : d === 'SHORT' ? 'short' : ''}">${d === 'LONG' ? '▲ LONG' : d === 'SHORT' ? '▼ SHORT' : '⏸ CZEKAJ'}</span>`;
const sidePill = s => `<span class="pill tr-dir ${s}">${s === 'long' ? '▲ LONG' : '▼ SHORT'}</span>`;

/* ------------------------------------------------------------------ szkielet widoku */
function build(){
  const r = root();
  r.innerHTML = `
  <div class="card-h tr-head">
    <div><h1>Trading</h1><p class="sub" style="margin:0">Analiza rynku, konto demo, boty i backtesty. Dane: Bybit (publiczne świece).</p></div>
    <div class="actions">
      <span class="tr-demo" title="Wszystkie zlecenia są symulowane – nic nie trafia na prawdziwą giełdę">DEMO — wirtualne pieniądze</span>
      <span class="tr-synth" id="tr-src" hidden title="Bybit niedostępny albo włączony tryb TRADING_DEMO_DATA – ceny nie są prawdziwe">⚠ dane syntetyczne</span>
    </div>
  </div>

  <div class="card tr-bar">
    <div class="tr-syms" id="tr-syms"></div>
    <form id="tr-symform" class="tr-symform"><input name="s" placeholder="inna para, np. ADA" maxlength="16" autocomplete="off"><button class="btn ghost sq">OK</button></form>
    <div class="tr-ivs" id="tr-ivs"></div>
    <div class="tr-price" id="tr-price"></div>
  </div>

  <div class="tr-main">
    <div class="card tr-chartcard">
      <div class="tr-layers" id="tr-layers"></div>
      <div class="tr-chartwrap" id="tr-chartwrap">
        <canvas id="tr-c-main"></canvas>
        <canvas id="tr-c-rsi"></canvas>
        <canvas id="tr-c-macd"></canvas>
        <div class="tr-tip" id="tr-tip" hidden></div>
      </div>
      <div class="m tr-hint">Kółko myszy / szczypanie = zoom · przeciągnij = przesuń · dwuklik = ostatnie świece</div>
    </div>
    <div class="tr-side">
      <div class="card" id="tr-order"></div>
      <div class="card" id="tr-acct"></div>
    </div>
  </div>

  <div class="card tr-analysis">
    <div class="card-h"><h2>Analiza agentek</h2>
      <div class="actions"><button class="btn ghost sq" id="tr-an-refresh">↻ Odśwież</button><button class="btn sq" id="tr-an-ai">✦ Analiza AI</button><button class="btn ghost sq" id="tr-ask">💬 Zapytaj agenta</button></div>
    </div>
    <div id="tr-an"><div class="empty">Ładuję analizę…</div></div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Pozycje i dziennik</h2>
      <div class="filters" id="tr-ptabs">
        <button class="chip" data-t="open">Otwarte</button><button class="chip" data-t="journal">Dziennik</button>
        <button class="chip" data-t="equity">Kapitał</button><button class="chip" data-t="settings">Zasady ryzyka</button>
      </div>
    </div>
    <div id="tr-pos"></div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Boty demo</h2><div class="actions"><button class="btn ghost sq" id="tr-bots-run" title="Przelicz boty teraz (normalnie co minutę)">▶ Sprawdź teraz</button></div></div>
    <p class="m" style="margin-top:-6px">Boty handlują wyłącznie na koncie demo, na zamkniętych świecach. Nigdy nie składają prawdziwych zleceń i nie używają kluczy API.</p>
    <form class="form tr-botform" id="tr-botform"></form>
    <div id="tr-bots"></div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Backtest</h2></div>
    <form class="form tr-btform" id="tr-btform"></form>
    <div id="tr-bt"></div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Wiedza tradingowa</h2>
      <form id="tr-kbq" class="tr-kbq"><input name="q" placeholder="szukaj w temacie, np. RSI"><button class="btn ghost sq">Szukaj</button></form>
    </div>
    <div class="filters" id="tr-kbtopics"></div>
    <div class="tr-kb" id="tr-kb"><div class="empty">Wybierz temat.</div></div>
  </div>`;
  q('#tr-symform').onsubmit = e => { e.preventDefault(); const v = e.target.s.value.trim().toUpperCase(); if (v) { setSymbol(v.endsWith('USDT') ? v : v + 'USDT'); e.target.reset(); } };
  q('#tr-an-refresh').onclick = () => loadAnalysis(false);
  q('#tr-an-ai').onclick = () => loadAnalysis(true);
  q('#tr-ask').onclick = () => { show('chat'); sendChat(`Zrób analizę ${TR.symbol} na interwale ${ivLabel(TR.interval)} (market_analysis) i skomentuj opinie Luny i Novy. Pamiętaj, że to konto demo.`); };
  q('#tr-ptabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { TR.posTab = b.dataset.t; renderPositions(); } };
  q('#tr-bots-run').onclick = async () => { const r = await api('/api/trading/bots/run', { method: 'POST' }); toast(`Boty sprawdzone: ${r.results.length} akcji, ${r.checked.length} zamknięć SL/TP`); refreshAccount(); loadBots(); };
  q('#tr-kbq').onsubmit = e => { e.preventDefault(); if (TR.kbTopic) loadKb(TR.kbTopic, e.target.q.value.trim()); else toast('Najpierw wybierz temat'); };
  renderLayers();
  bindChart();
  TR.view.count = defCount();
  TR.built = true;
}

/* ------------------------------------------------------------------ pasek symboli / interwałów */
function renderBar(){
  const syms = [...new Set([...(TR.meta?.symbols || []), TR.symbol])];
  q('#tr-syms').innerHTML = syms.map(s => `<button class="chip ${s === TR.symbol ? 'active' : ''}" data-s="${esc(s)}">${esc(coin(s))}</button>`).join('');
  q('#tr-ivs').innerHTML = (TR.meta?.intervals || []).map(i => `<button class="chip ${i.id === TR.interval ? 'active' : ''}" data-i="${esc(i.id)}">${esc(i.label)}</button>`).join('');
  q('#tr-syms').onclick = e => { const b = e.target.closest('[data-s]'); if (b) setSymbol(b.dataset.s); };
  q('#tr-ivs').onclick = e => { const b = e.target.closest('[data-i]'); if (b) setInterval_(b.dataset.i); };
}
function setSymbol(s){ TR.symbol = s; store.set('tr_sym', s); TR.view.end = null; renderBar(); reloadMarket(); renderOrder(); }
function setInterval_(i){ TR.interval = i; store.set('tr_iv', i); TR.view.end = null; renderBar(); reloadMarket(); }
async function reloadMarket(){ await loadCandles(); loadAnalysis(false); }

function renderPrice(){
  const d = TR.data; if (!d) return;
  const l = d.last;
  q('#tr-price').innerHTML = `<b>${esc(coin(d.symbol))}/USDT</b> <span class="tr-big">${fp(l.price)}</span> <span class="${cls(l.change_pct)}">${fpct(l.change_pct)}</span><span class="m"> · ${ivLabel(d.interval)}</span>`;
  q('#tr-src').hidden = d.source !== 'synthetic';
}

function renderLayers(){
  const L = [['ema', 'EMA 20/50/200'], ['bb', 'Bollinger'], ['sr', 'Wsparcia/opory'], ['vol', 'Wolumen'], ['pos', 'Moje pozycje']];
  q('#tr-layers').innerHTML = L.map(([k, l]) => `<button class="chip ${TR.show[k] ? 'active' : ''}" data-l="${k}">${l}</button>`).join('')
    + `<span class="tr-legend"><i style="background:var(--series-1)"></i>EMA20 <i style="background:var(--series-3)"></i>EMA50 <i style="background:var(--series-2)"></i>EMA200</span>`;
  q('#tr-layers').onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; TR.show[b.dataset.l] = !TR.show[b.dataset.l]; store.set('tr_layers', JSON.stringify(TR.show)); renderLayers(); draw(); };
}

/* ------------------------------------------------------------------ dane */
async function loadCandles(){
  const sym = TR.symbol, iv = TR.interval;
  try {
    const d = await api(`/api/trading/candles?symbol=${encodeURIComponent(sym)}&interval=${iv}&limit=300`);
    if (sym !== TR.symbol || iv !== TR.interval) return;
    TR.data = d; renderPrice(); draw(); renderOrderHints();
  } catch (e) { q('#tr-price').innerHTML = `<span class="tr-down">Brak danych dla ${esc(sym)}</span>`; }
}

async function loadAnalysis(ai){
  const sym = TR.symbol, iv = TR.interval;
  const box = q('#tr-an');
  if (ai) { q('#tr-an-ai').disabled = true; q('#tr-an-ai').textContent = '✦ Myślę…'; }
  else if (!TR.analysis || TR.analysis.symbol !== sym) box.innerHTML = '<div class="empty">Ładuję analizę…</div>';
  try {
    const a = await api(`/api/trading/analysis?symbol=${encodeURIComponent(sym)}&interval=${iv}&ai=${ai ? 1 : 0}`);
    if (sym === TR.symbol && iv === TR.interval) { TR.analysis = a; renderAnalysis(); }
  } catch (e) { box.innerHTML = `<div class="empty">Nie udało się pobrać analizy.</div>`; }
  finally { const b = q('#tr-an-ai'); if (b) { b.disabled = false; b.textContent = '✦ Analiza AI'; } }
}

async function refreshAccount(){
  try { TR.account = await api('/api/trading/account'); renderAcct(); renderPositions(); draw(); } catch (e) {}
}

/* ------------------------------------------------------------------ analiza: Luna, Nova, konsensus */
function scoreBar(l, s){
  return `<div class="tr-score"><div class="tr-score-bar"><span class="l" style="width:${l}%"></span><span class="s" style="width:${s}%"></span></div>
    <div class="tr-score-lbl"><span class="tr-up">LONG ${l}%</span><span class="tr-down">SHORT ${s}%</span></div></div>`;
}
function planRows(x){
  if (!x.entry) return '<div class="m">Brak planu wejścia – czekamy.</div>';
  return `<div class="tr-plan"><div><span class="m">Wejście</span><b>${fp(x.entry)}</b></div><div><span class="m">SL</span><b class="tr-down">${fp(x.sl)}</b></div>
    <div><span class="m">TP</span><b class="tr-up">${fp(x.tp)}</b></div><div><span class="m">R:R</span><b>1:${x.rr ?? '—'}</b></div></div>`;
}
function renderAnalysis(){
  const a = TR.analysis; if (!a) return;
  const agentCard = g => `<div class="tr-agent ${g.id}">
      <div class="tr-agent-h"><span class="tr-avatar">${g.emoji}</span><div><b>${esc(g.name)}</b><div class="m">${esc(g.style)}</div></div>${dirPill(g.direction)}</div>
      ${scoreBar(g.long_score, g.short_score)}
      <p class="tr-thesis">${esc(g.thesis)}</p>
      <div class="tr-reasons"><div>${g.long_reasons.map(r => `<span class="tr-up">+ ${esc(r)}</span>`).join('') || '<span class="m">brak argumentów za LONG</span>'}</div>
        <div>${g.short_reasons.map(r => `<span class="tr-down">− ${esc(r)}</span>`).join('') || '<span class="m">brak argumentów za SHORT</span>'}</div></div>
      ${planRows(g)}
      ${g.entry ? `<button class="btn ghost sq tr-use" data-agent="${g.id}">Użyj planu ${esc(g.name)}</button>` : ''}
    </div>`;
  const c = a.consensus, ind = a.indicators;
  const lv = (a.levels || []).slice(0, 6).map(l => `<span class="pill ${l.type === 'support' ? 'ok' : 'warn'}">${l.type === 'support' ? 'S' : 'R'} ${fp(l.price)} <span class="m">${l.distance_pct > 0 ? '+' : ''}${l.distance_pct}%${l.htf ? ' · HTF' : ''}</span></span>`).join(' ');
  q('#tr-an').innerHTML = `
    ${a.source === 'synthetic' ? '<div class="tr-warnbox">⚠ Analiza na danych syntetycznych – nie odzwierciedla prawdziwego rynku.</div>' : ''}
    <div class="tr-agents">
      ${a.agents.map(agentCard).join('')}
      <div class="tr-agent cons">
        <div class="tr-agent-h"><span class="tr-avatar">⚖️</span><div><b>Konsensus</b><div class="m">${a.agents.map(g => esc(g.name)).join(' + ')}</div></div>${dirPill(c.direction)}</div>
        ${scoreBar(c.long_score, c.short_score)}
        <p class="tr-thesis">${esc(c.note)}</p>
        ${planRows(c)}
        <div class="tr-facts">
          <div><span class="m">Trend ${ivLabel(a.interval)}</span><b>${esc(a.trend)} · ${esc(a.trend_strength)}</b></div>
          <div><span class="m">Trend HTF ${ivLabel(a.htf_interval)}</span><b>${esc(a.htf_trend)}</b></div>
          <div><span class="m">Struktura</span><b>${esc(a.structure)}</b></div>
          <div><span class="m">RSI · ADX</span><b>${ind.rsi ?? '—'} · ${ind.adx ?? '—'}</b></div>
          <div><span class="m">ATR</span><b>${ind.atr_pct != null ? ind.atr_pct + '%' : '—'}</b></div>
          <div><span class="m">Zasady (UNIFIED)</span><b><span class="tr-up">L ${a.long_score}</span> / <span class="tr-down">S ${a.short_score}</span></b></div>
        </div>
      </div>
    </div>
    ${lv ? `<div class="tr-levels"><span class="m">Poziomy:</span> ${lv}</div>` : ''}
    ${a.ai_comment ? `<div class="tr-ai"><div class="m">✦ Komentarz AI (objaśnia liczby, nie zmienia ich)</div>${md(a.ai_comment)}</div>` : ''}
    <div class="m tr-disc">${esc(a.disclaimer)}</div>`;
  qa('.tr-use').forEach(b => b.onclick = () => {
    const g = a.agents.find(x => x.id === b.dataset.agent); if (!g) return;
    TR.side = g.direction === 'SHORT' ? 'short' : 'long'; renderOrder();
    q('#tr-of [name=sl]').value = g.sl; q('#tr-of [name=tp]').value = g.tp; renderOrderHints();
    q('#tr-order').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast(`Plan ${g.name} w formularzu – sprawdź i zatwierdź`);
  });
}

/* ------------------------------------------------------------------ formularz zlecenia */
function renderOrder(){
  const acc = TR.account, st = acc?.settings || {};
  q('#tr-order').innerHTML = `
    <div class="card-h"><h2>Zlecenie <span class="m">· ${esc(coin(TR.symbol))}</span></h2><span class="pill accent">DEMO</span></div>
    <div class="tr-sides"><button type="button" class="tr-buy ${TR.side === 'long' ? 'on' : ''}" data-side="long">Buy / Long</button><button type="button" class="tr-sell ${TR.side === 'short' ? 'on' : ''}" data-side="short">Sell / Short</button></div>
    <form id="tr-of" class="tr-of">
      <div class="tr-seg"><button type="button" data-m="usdt" class="${TR.sizeMode === 'usdt' ? 'on' : ''}">Kwota USDT</button><button type="button" data-m="risk" class="${TR.sizeMode === 'risk' ? 'on' : ''}">Ryzyko %</button></div>
      ${TR.sizeMode === 'usdt'
        ? `<label>Depozyt (USDT)<input name="usdt_amount" type="number" step="any" min="1" value="100" required></label>`
        : `<label>Ryzyko (% kapitału)<input name="risk_pct" type="number" step="0.1" min="0.1" max="${st.max_risk_pct || 2}" value="${st.risk_pct || 1}" required></label>`}
      <label>Dźwignia <b id="tr-levv">${store.get('tr_lev', '3')}×</b><input name="leverage" type="range" min="1" max="20" step="1" value="${store.get('tr_lev', '3')}"></label>
      <div class="tr-2"><label>Stop loss<input name="sl" type="number" step="any" placeholder="${TR.sizeMode === 'risk' ? 'auto 2×ATR' : 'opcjonalnie'}"></label>
      <label>Take profit<input name="tp" type="number" step="any" placeholder="${TR.sizeMode === 'risk' ? 'auto 2R' : 'opcjonalnie'}"></label></div>
      <div class="tr-hints m" id="tr-hints"></div>
      <button class="btn tr-submit ${TR.side}">${TR.side === 'long' ? '▲ Otwórz LONG' : '▼ Otwórz SHORT'} (demo)</button>
    </form>`;
  q('#tr-order .tr-sides').onclick = e => { const b = e.target.closest('[data-side]'); if (b) { TR.side = b.dataset.side; keepForm(renderOrder); } };
  q('#tr-order .tr-seg').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { TR.sizeMode = b.dataset.m; store.set('tr_size', TR.sizeMode); renderOrder(); } };
  const f = q('#tr-of');
  f.oninput = e => { if (e.target.name === 'leverage') { q('#tr-levv').textContent = e.target.value + '×'; store.set('tr_lev', e.target.value); } renderOrderHints(); };
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formData(f); d.side = TR.side; d.symbol = TR.symbol;
    const btn = f.querySelector('.tr-submit'); btn.disabled = true;
    try {
      const r = await api('/api/trading/order', { method: 'POST', body: d });
      toast(`✓ ${r.position.side.toUpperCase()} ${coin(r.position.symbol)} @ ${fp(r.position.entry)} (demo)` + (r.warning ? ' · bez SL!' : ''));
      f.sl.value = ''; f.tp.value = ''; renderOrderHints(); TR.posTab = 'open'; refreshAccount();
    } catch (err) {} finally { btn.disabled = false; }
  };
  renderOrderHints();
}
function keepForm(fn){ const f = q('#tr-of'); const v = f ? formData(f) : {}; fn(); const g = q('#tr-of'); if (g) for (const [k, x] of Object.entries(v)) if (g[k] && x !== '') g[k].value = x; renderOrderHints(); }
function renderOrderHints(){
  const f = q('#tr-of'), h = q('#tr-hints'); if (!f || !h || !TR.data) return;
  const price = TR.data.last.price, lev = +f.leverage.value || 1, sl = +f.sl.value || 0, tp = +f.tp.value || 0;
  const eq = TR.account?.equity || 0, sgn = TR.side === 'long' ? 1 : -1, out = [];
  let qty = 0;
  if (f.usdt_amount) { const m = +f.usdt_amount.value || 0; qty = m * lev / price; out.push(`Wartość pozycji: <b>${fu(m * lev)}</b>`); }
  else if (sl && f.risk_pct) { const risk = eq * (+f.risk_pct.value || 0) / 100; qty = risk / Math.abs(price - sl); out.push(`Wartość: <b>${fu(qty * price)}</b> · depozyt ${fu(qty * price / lev)}`); }
  else if (f.risk_pct) out.push(`Ryzyko: <b>${fu(eq * (+f.risk_pct.value || 0) / 100)}</b> do SL (SL = 2×ATR 1h)`);
  if (sl && qty) {
    const bad = (sl - price) * sgn >= 0, risk = qty * Math.abs(price - sl);
    out.push(bad ? `<span class="tr-down">SL musi być ${TR.side === 'long' ? 'poniżej' : 'powyżej'} ceny</span>` : `Ryzyko do SL: <b class="tr-down">${fu(risk)}</b>${eq ? ` (${(risk / eq * 100).toFixed(2).replace('.', ',')}%)` : ''}`);
    if (tp && !bad) out.push(`R:R <b>1:${(Math.abs(tp - price) / Math.abs(price - sl)).toFixed(2)}</b>`);
  }
  out.push(`Cena rynkowa ≈ <b>${fp(price)}</b> · opłata 0,06%`);
  h.innerHTML = out.join('<br>');
}

/* ------------------------------------------------------------------ konto */
function renderAcct(){
  const a = TR.account; if (!a) return;
  q('#tr-acct').innerHTML = `
    <div class="card-h"><h2>Konto demo</h2><span class="m">start ${fu(a.start_balance)}</span></div>
    <div class="tr-kpis">
      <div><span class="m">Equity</span><b>${fu(a.equity)}</b><span class="${cls(a.total_return_pct)}">${fpct(a.total_return_pct)}</span></div>
      <div><span class="m">Wolne saldo</span><b>${fu(a.balance)}</b><span class="m">w pozycjach ${fu(a.locked)}</span></div>
      <div><span class="m">Niezrealizowany PnL</span><b class="${cls(a.upnl)}">${fu(a.upnl, 1)}</b></div>
      <div><span class="m">Dziś</span><b class="${cls(a.today_pnl)}">${fu(a.today_pnl, 1)}</b></div>
      <div><span class="m">Win rate</span><b>${a.stats.win_rate != null ? a.stats.win_rate + '%' : '—'}</b><span class="m">${a.stats.trades} transakcji</span></div>
      <div><span class="m">Profit factor · śr. R</span><b>${a.stats.profit_factor ?? '—'} · ${a.stats.avg_r ?? '—'}</b></div>
    </div>
    ${a.price_error ? `<div class="m tr-down">Ceny niedostępne: ${esc(a.price_error)}</div>` : ''}`;
}

function renderPositions(){
  const a = TR.account, box = q('#tr-pos'); if (!a || !box) return;
  qa('#tr-ptabs .chip').forEach(c => c.classList.toggle('active', c.dataset.t === TR.posTab));
  if (TR.posTab === 'open') {
    box.innerHTML = a.positions.length ? `<div class="tr-table">
      <div class="tr-tr tr-th"><span>Para</span><span>Wielkość</span><span>Wejście / cena</span><span>SL / TP</span><span>PnL</span><span></span></div>
      ${a.positions.map(p => `<div class="tr-tr">
        <span><b>${esc(coin(p.symbol))}</b> ${sidePill(p.side)} <span class="m">${p.leverage}×${p.bot_id ? ' · 🤖 bot #' + p.bot_id : ''}</span></span>
        <span>${fu(p.value)}<span class="m"> depozyt ${fu(p.margin)}</span></span>
        <span>${fp(p.entry)} → <b>${fp(p.price)}</b></span>
        <span><span class="tr-down">${fp(p.sl)}</span> / <span class="tr-up">${fp(p.tp)}</span>${p.liq ? `<span class="m"> likw. ${fp(p.liq)}</span>` : ''}</span>
        <span class="${cls(p.upnl)}"><b>${fu(p.upnl, 1)}</b> <span class="m">${fpct(p.upnl_pct)}${p.r_now != null ? ' · ' + p.r_now + 'R' : ''}</span></span>
        <span class="tr-acts"><button class="btn ghost sq" data-close="${p.id}" data-f="0.5">50%</button><button class="btn danger sq" data-close="${p.id}" data-f="1">Zamknij</button></span>
      </div>`).join('')}</div>` : '<div class="empty">Brak otwartych pozycji. Złóż zlecenie demo albo uruchom bota.</div>';
    box.querySelectorAll('[data-close]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { const r = await api('/api/trading/close/' + b.dataset.close, { method: 'POST', body: { fraction: +b.dataset.f } }); toast(`Zamknięto ${r.fraction < 1 ? Math.round(r.fraction * 100) + '% ' : ''}@ ${fp(r.exit)} · ${fu(r.pnl, 1)}`); refreshAccount(); }
      catch (e) { b.disabled = false; }
    });
  } else if (TR.posTab === 'journal') {
    box.innerHTML = '<div class="empty">Ładuję…</div>';
    api('/api/trading/trades?limit=100').then(r => {
      if (TR.posTab !== 'journal') return;
      const s = r.stats;
      const reason = x => ({ manual: 'ręcznie', sl: 'SL', tp: 'TP', liq: 'likwidacja', bot: 'bot', bot_deleted: 'bot usunięty' })[x] || String(x).replace('partial:', 'częściowo · ');
      box.innerHTML = r.trades.length ? `<div class="tr-mini">${s.trades} transakcji · win rate ${s.win_rate ?? '—'}% · PnL <b class="${cls(s.pnl)}">${fu(s.pnl, 1)}</b> · PF ${s.profit_factor ?? '—'} · śr. R ${s.avg_r ?? '—'}</div>
        <div class="tr-table">
        <div class="tr-tr tr-th"><span>Zamknięta</span><span>Para</span><span>Wejście → wyjście</span><span>Powód</span><span>Wynik</span><span></span></div>
        ${r.trades.map(t => `<div class="tr-tr"><span class="m">${fmtDT(t.closed)}</span><span><b>${esc(coin(t.symbol))}</b> ${sidePill(t.side)}${t.bot_id ? ' <span class="m">🤖</span>' : ''}</span>
          <span>${fp(t.entry)} → ${fp(t.exit)}</span><span class="m">${esc(reason(t.reason))}${t.note ? ' · ' + esc(t.note) : ''}</span>
          <span class="${cls(t.pnl)}"><b>${fu(t.pnl, 1)}</b>${t.r_multiple != null ? ` <span class="m">${t.r_multiple}R</span>` : ''}</span><span></span></div>`).join('')}</div>`
        : '<div class="empty">Dziennik jest pusty.</div>';
    });
  } else if (TR.posTab === 'equity') {
    const h = a.equity_history || [];
    const multiDay = h.length > 1 && h[0].ts.slice(0, 10) !== h[h.length - 1].ts.slice(0, 10), sb = a.start_balance;
    box.innerHTML = h.length > 1 ? renderChart({ type: 'line', title: `Wynik konta demo od startu (${fu(sb)}), 30 dni`, unit: 'USDT',
        labels: h.map(x => multiDay ? x.ts.slice(8, 10) + '.' + x.ts.slice(5, 7) : x.ts.slice(11, 16)),
        series: [{ name: 'Equity − start', data: h.map(x => +(x.equity - sb).toFixed(2)) }, { name: 'Saldo − start', data: h.map(x => +(x.balance - sb).toFixed(2)) }] })
      : '<div class="empty">Historia kapitału zbiera się co 5 minut – wróć za chwilę.</div>';
  } else {
    const st = a.settings;
    box.innerHTML = `<form class="form tr-set" id="tr-set">
      <label>Domyślne ryzyko %<input name="risk_pct" type="number" step="0.1" value="${st.risk_pct}"></label>
      <label>Max ryzyko na transakcję %<input name="max_risk_pct" type="number" step="0.1" value="${st.max_risk_pct}"></label>
      <label>Max otwartych pozycji<input name="max_positions" type="number" step="1" value="${st.max_positions}"></label>
      <label>Dzienny limit straty %<input name="daily_loss_limit_pct" type="number" step="0.5" value="${st.daily_loss_limit_pct}"></label>
      <button class="btn">Zapisz</button></form>
      <p class="m">Zasady z MESSUAI: ryzykuj 1% (max 2%) kapitału na transakcję, SL = 2×ATR, TP = 4×ATR (R:R min. 1:2), nie walcz z trendem. Po dziennym limicie straty – przerwa do jutra.</p>
      <form class="form" id="tr-reset"><label>Nowe saldo startowe<input name="balance" type="number" value="10000" step="100" min="100"></label><button class="btn danger">Resetuj konto demo</button></form>`;
    q('#tr-set').onsubmit = async e => { e.preventDefault(); await api('/api/trading/account/settings', { method: 'PATCH', body: formData(e.target) }); toast('Zapisano zasady ryzyka'); refreshAccount(); };
    q('#tr-reset').onsubmit = async e => { e.preventDefault(); if (!confirm('Wyzerować konto demo? Pozycje i dziennik zostaną usunięte (boty zostają).')) return; await api('/api/trading/reset', { method: 'POST', body: formData(e.target) }); toast('Konto demo zresetowane'); refreshAccount(); renderOrder(); };
  }
}

/* ------------------------------------------------------------------ boty */
function paramFields(strategy, values){
  const p = { ...(TR.meta?.strategies?.[strategy]?.params || {}), ...(values || {}) };
  const L = { fast: 'EMA szybka', slow: 'EMA wolna', trend_filter: 'Filtr EMA200 (1/0)', sl_atr: 'SL × ATR', tp_atr: 'TP × ATR', period: 'Okres RSI', low: 'RSI wyprzedanie', high: 'RSI wykupienie', exit: 'RSI wyjście', start_hour: 'Zakres od (godz.)', end_hour: 'Zakres do (godz.)', close_hour: 'Zamknięcie (godz.)', sl_factor: 'SL × zakres', tp_factor: 'TP × zakres', skip_weekends: 'Pomiń weekendy (1/0)', min_score: 'Próg wejścia', exit_score: 'Próg wyjścia' };
  return Object.entries(p).map(([k, v]) => `<label class="tr-pf">${L[k] || k}<input name="p_${k}" type="number" step="any" value="${v}"></label>`).join('');
}
function stratOptions(sel){ return Object.entries(TR.meta?.strategies || {}).map(([k, s]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(s.label)}</option>`).join(''); }
function symOptions(sel){ return [...new Set([...(TR.meta?.symbols || []), TR.symbol])].map(s => `<option ${s === sel ? 'selected' : ''}>${esc(s)}</option>`).join(''); }
function ivOptions(sel){ return (TR.meta?.intervals || []).map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${i.label}</option>`).join(''); }
function collectParams(f){ const p = {}; for (const [k, v] of Object.entries(formData(f))) if (k.startsWith('p_') && v !== '') p[k.slice(2)] = +v; return p; }

function renderBotForm(){
  const f = q('#tr-botform'), strat = f.strategy?.value || 'ema_cross';
  f.innerHTML = `<input name="name" placeholder="nazwa (opcjonalnie)" style="flex:1 1 160px">
    <select name="strategy">${stratOptions(strat)}</select><select name="symbol">${symOptions(f.symbol?.value || TR.symbol)}</select>
    <select name="interval">${ivOptions(f.interval?.value || '15')}</select>
    <label class="tr-pf">Ryzyko %<input name="risk_pct" type="number" step="0.1" min="0.1" max="2" value="1"></label>
    <label class="tr-pf">Dźwignia<input name="leverage" type="number" step="1" min="1" max="20" value="3"></label>
    <div class="tr-params">${paramFields(strat)}</div>
    <div class="m tr-sdesc">${esc(TR.meta?.strategies?.[strat]?.desc || '')}</div>
    <button class="btn">🤖 Utwórz i uruchom</button>`;
  f.strategy.onchange = renderBotForm;
  f.onsubmit = async e => {
    e.preventDefault(); const d = formData(f);
    const body = { name: d.name, strategy: d.strategy, symbol: d.symbol, interval: d.interval, risk_pct: +d.risk_pct, leverage: +d.leverage, params: collectParams(f) };
    await api('/api/trading/bots', { method: 'POST', body }); toast('Bot demo uruchomiony – sprawdza świece co minutę'); f.name.value = ''; loadBots();
  };
}
async function loadBots(){
  try { TR.bots = await api('/api/trading/bots'); } catch (e) { return; }
  const box = q('#tr-bots');
  box.innerHTML = TR.bots.length ? `<div class="tr-bots">${TR.bots.map(b => {
    const s = b.stats, p = b.open_position;
    return `<div class="tr-bot ${b.status}">
      <div class="tr-bot-h"><div><b>${esc(b.name)}</b><div class="m">${b.name.includes(b.strategy_label) ? '' : esc(b.strategy_label) + ' · '}${esc(coin(b.symbol))} ${esc(b.interval_label)} · ryzyko ${b.risk_pct}% · dźwignia ${b.leverage}×</div></div>
        <span class="pill ${b.status === 'running' ? 'ok' : ''}">${b.status === 'running' ? '● działa' : '❚❚ pauza'}</span></div>
      <div class="tr-bot-stats"><span>${s.trades} transakcji</span><span>win rate ${s.win_rate ?? '—'}%</span><span class="${cls(s.pnl)}">PnL ${fu(s.pnl, 1)}</span><span>PF ${s.profit_factor ?? '—'}</span></div>
      ${p ? `<div class="tr-bot-pos">${sidePill(p.side)} @ ${fp(p.entry)} · SL ${fp(p.sl)} · TP ${fp(p.tp)} · <b class="${cls(p.upnl)}">${fu(p.upnl, 1)}</b></div>` : '<div class="m">Brak otwartej pozycji – czeka na sygnał.</div>'}
      ${b.log.length ? `<details><summary class="m">Dziennik bota</summary>${b.log.map(l => `<div class="m">${fmtDT(l.ts)} · ${esc(l.msg)}</div>`).join('')}</details>` : ''}
      <div class="actions"><button class="btn ghost sq" data-bt="${b.id}">${b.status === 'running' ? '❚❚ Pauza' : '▶ Start'}</button>
        <button class="btn ghost sq" data-btest="${b.id}">Backtest</button><button class="btn danger sq" data-bdel="${b.id}">Usuń</button></div>
    </div>`; }).join('')}</div>` : '<div class="empty">Nie masz jeszcze botów. Wybierz strategię powyżej – najpierw sprawdź ją w backteście.</div>';
  box.querySelectorAll('[data-bt]').forEach(x => x.onclick = async () => { await api(`/api/trading/bots/${x.dataset.bt}/toggle`, { method: 'POST' }); loadBots(); });
  box.querySelectorAll('[data-bdel]').forEach(x => x.onclick = async () => { if (!confirm('Usunąć bota? Jego otwarta pozycja zostanie zamknięta.')) return; await api('/api/trading/bots/' + x.dataset.bdel, { method: 'DELETE' }); toast('Bot usunięty'); loadBots(); refreshAccount(); });
  box.querySelectorAll('[data-btest]').forEach(x => x.onclick = () => {
    const b = TR.bots.find(y => y.id == x.dataset.btest); if (!b) return;
    renderBtForm({ strategy: b.strategy, symbol: b.symbol, interval: b.interval, risk_pct: b.risk_pct, leverage: b.leverage, params: b.params });
    q('#tr-btform').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ------------------------------------------------------------------ backtest */
function renderBtForm(v){
  const f = q('#tr-btform');
  v = v || { strategy: f.strategy?.value || 'ema_cross', symbol: f.symbol?.value || TR.symbol, interval: f.interval?.value || '60', days: f.days?.value || 30, risk_pct: f.risk_pct?.value || 1, leverage: f.leverage?.value || 3 };
  f.innerHTML = `<select name="strategy">${stratOptions(v.strategy)}</select><select name="symbol">${symOptions(v.symbol)}</select>
    <select name="interval">${ivOptions(v.interval)}</select>
    <label class="tr-pf">Okres (dni)<input name="days" type="number" min="1" max="365" value="${v.days || 30}"></label>
    <label class="tr-pf">Ryzyko %<input name="risk_pct" type="number" step="0.1" value="${v.risk_pct || 1}"></label>
    <label class="tr-pf">Dźwignia<input name="leverage" type="number" step="1" min="1" max="20" value="${v.leverage || 3}"></label>
    <div class="tr-params">${paramFields(v.strategy, v.params)}</div>
    <button class="btn">▶ Uruchom backtest</button>`;
  f.strategy.onchange = () => renderBtForm();
  f.onsubmit = async e => {
    e.preventDefault(); const d = formData(f), btn = f.querySelector('.btn'); btn.disabled = true; btn.textContent = 'Liczę…';
    try {
      const r = await api('/api/trading/backtest', { method: 'POST', body: { strategy: d.strategy, symbol: d.symbol, interval: d.interval, days: +d.days, risk_pct: +d.risk_pct, leverage: +d.leverage, params: collectParams(f) } });
      renderBt(r);
    } catch (err) {} finally { btn.disabled = false; btn.textContent = '▶ Uruchom backtest'; }
  };
}
function renderBt(r){
  const m = r.metrics;
  const tiles = [[fpct(m.return_pct), 'zwrot', cls(m.return_pct)], [fpct(m.buy_hold_pct), 'kup i trzymaj', cls(m.buy_hold_pct)], [m.trades, 'transakcji'],
    [m.win_rate != null ? m.win_rate + '%' : '—', 'win rate'], [m.profit_factor ?? '—', 'profit factor'], ['−' + m.max_drawdown_pct + '%', 'max obsunięcie', 'tr-down'],
    [m.avg_r ?? '—', 'średnie R'], [fu(m.final_balance), 'kapitał końcowy']];
  q('#tr-bt').innerHTML = `
    ${r.source === 'synthetic' ? '<div class="tr-warnbox">⚠ Backtest na danych syntetycznych – wynik nie mówi nic o prawdziwym rynku.</div>' : ''}
    <div class="m">${esc(r.strategy_label)} · ${esc(r.symbol)} ${ivLabel(r.interval)} · ${esc(r.period.from)} → ${esc(r.period.to)} (${r.period.candles} świec) · ryzyko ${r.risk_pct}% · ${r.leverage}×</div>
    <div class="stats tr-btstats">${tiles.map(([v, l, c]) => `<div class="stat"><div class="v ${c || ''}">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    ${renderChart({ type: 'line', title: `Krzywa kapitału – wynik od startu (${fu(m.start_balance)})`, unit: 'USDT', labels: r.equity_curve.labels, series: [{ name: 'Zysk/strata', data: r.equity_curve.values.map(v => +(v - m.start_balance).toFixed(2)) }] })}
    ${r.trades.length ? `<details><summary class="m">Ostatnie transakcje (${r.trades.length})</summary><div class="tr-table">${r.trades.slice(-40).reverse().map(t => `<div class="tr-tr">
      <span class="m">${new Date(t.entry_t).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span><span>${sidePill(t.side)}</span>
      <span>${fp(t.entry)} → ${fp(t.exit)}</span><span class="m">${esc(t.reason)} · ${esc(t.why)}</span><span class="${cls(t.pnl)}"><b>${fu(t.pnl, 1)}</b> <span class="m">${t.r ?? ''}R</span></span><span></span></div>`).join('')}</div></details>` : ''}
    <div class="m tr-disc">${esc(r.note)}</div>`;
}

/* ------------------------------------------------------------------ wiedza */
async function loadKbTopics(){
  const topics = await api('/api/trading/knowledge').catch(() => []);
  q('#tr-kbtopics').innerHTML = topics.map(t => `<button class="chip" data-k="${esc(t.id)}" title="${esc(t.title)}">${esc(t.title.split(' – ')[0])}</button>`).join('') || '<div class="empty">Brak plików wiedzy (knowledge/trading).</div>';
  q('#tr-kbtopics').onclick = e => { const b = e.target.closest('[data-k]'); if (b) loadKb(b.dataset.k); };
}
async function loadKb(topic, qstr){
  TR.kbTopic = topic;
  qa('#tr-kbtopics .chip').forEach(c => c.classList.toggle('active', c.dataset.k === topic));
  const r = await api(`/api/trading/knowledge/${encodeURIComponent(topic)}${qstr ? '?q=' + encodeURIComponent(qstr) : ''}`);
  q('#tr-kb').innerHTML = md(r.text);
}

/* ================================================================== WYKRES (canvas) */
const PAD_R = 66, PAD_B = 20;
const defCount = () => ((q('#tr-chartwrap')?.clientWidth || 800) < 600 ? 60 : 120);
function setupCanvas(cv, h){
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || cv.parentElement.clientWidth;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  cv.style.height = h + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
function range(){
  const n = TR.data?.candles.length || 0;
  const count = Math.max(20, Math.min(TR.view.count, n));
  const end = TR.view.end == null ? n : Math.max(count, Math.min(n, TR.view.end));
  return { s: end - count, e: end, count, n };
}
function chartHeights(){ const w = q('#tr-chartwrap')?.clientWidth || 800; return w < 600 ? [300, 80, 80] : [420, 96, 96]; }
function xOf(i, r, plotW){ const cw = plotW / r.count; return (i - r.s) * cw + cw / 2; }
function timeLabel(t){
  const d = new Date(t), iv = TR.data.interval;
  if (iv === 'D' || iv === 'W') return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  return (d.getHours() === 0 && d.getMinutes() === 0) ? d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }) : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function draw(){
  if (!TR.data || !q('#tr-c-main') || current !== 'trading') return;
  const D = TR.data, C = D.candles, r = range(), [H1, H2, H3] = chartHeights();
  const col = { up: css('--ok'), down: css('--warn'), grid: css('--line'), text: css('--muted'), fg: css('--text'), acc: css('--accent'), s1: css('--series-1'), s2: css('--series-2'), s3: css('--series-3'), bg: css('--panel') };
  const font = '11px Inter, system-ui, sans-serif';

  /* --- panel główny --- */
  const { ctx, w } = setupCanvas(q('#tr-c-main'), H1);
  const plotW = w - PAD_R, plotH = H1 - PAD_B, volH = TR.show.vol ? plotH * 0.18 : 0;
  let lo = Infinity, hi = -Infinity;
  for (let i = r.s; i < r.e; i++) { lo = Math.min(lo, C[i][3]); hi = Math.max(hi, C[i][2]); }
  if (TR.show.bb) for (let i = r.s; i < r.e; i++) { if (D.bb.up[i] != null) { hi = Math.max(hi, D.bb.up[i]); lo = Math.min(lo, D.bb.low[i]); } }
  const padP = (hi - lo) * 0.08 || hi * 0.01; lo -= padP; hi += padP;
  const y = p => 6 + (hi - p) / (hi - lo) * (plotH - volH - 12);
  ctx.font = font; ctx.lineWidth = 1;
  // siatka + oś ceny
  const ticks = niceScale(lo, hi, 6).filter(v => v >= lo && v <= hi);
  ctx.strokeStyle = col.grid; ctx.fillStyle = col.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ticks.forEach(v => { const yy = Math.round(y(v)) + .5; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke(); ctx.fillText(fp(v), plotW + 6, yy); });
  // oś czasu
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const every = Math.max(1, Math.round(r.count / Math.max(2, Math.floor(plotW / 90))));
  for (let i = r.s; i < r.e; i++) if ((i - r.s) % every === 0) { const xx = Math.round(xOf(i, r, plotW)) + .5; if (xx < 24 || xx > plotW - 24) continue; ctx.strokeStyle = col.grid; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, plotH); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(timeLabel(C[i][0]), xx, plotH + 4); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotW, plotH); ctx.clip();
  const cw = plotW / r.count, bw = Math.max(1, Math.min(14, cw * 0.68));
  // wolumen
  if (volH) {
    let vmax = 0; for (let i = r.s; i < r.e; i++) vmax = Math.max(vmax, C[i][5]);
    ctx.globalAlpha = .28;
    for (let i = r.s; i < r.e; i++) { const vh = vmax ? C[i][5] / vmax * volH : 0; ctx.fillStyle = C[i][4] >= C[i][1] ? col.up : col.down; ctx.fillRect(xOf(i, r, plotW) - bw / 2, plotH - vh, bw, vh); }
    ctx.globalAlpha = 1;
  }
  // Bollinger
  const line = (arr, color, width, dash) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.beginPath(); let on = false;
    for (let i = r.s; i < r.e; i++) { const v = arr[i]; if (v == null) { on = false; continue; } const xx = xOf(i, r, plotW), yy = y(v); on ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); on = true; }
    ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; };
  if (TR.show.bb) { ctx.globalAlpha = .6; line(D.bb.up, col.text, 1, [3, 3]); line(D.bb.low, col.text, 1, [3, 3]); line(D.bb.mid, col.text, 1, [1, 3]); ctx.globalAlpha = 1; }
  // S/R
  if (TR.show.sr) D.levels.forEach(l => { const yy = Math.round(y(l.price)) + .5; if (yy < 0 || yy > plotH) return;
    ctx.strokeStyle = l.type === 'support' ? col.up : col.down; ctx.globalAlpha = .25 + l.strength * .1; ctx.setLineDash([6, 4]); ctx.lineWidth = 1 + (l.strength >= 4);
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; ctx.globalAlpha = 1; });
  // świece
  for (let i = r.s; i < r.e; i++) {
    const [, o, h, l, c] = C[i], xx = xOf(i, r, plotW), upC = c >= o;
    ctx.strokeStyle = ctx.fillStyle = upC ? col.up : col.down;
    ctx.beginPath(); ctx.moveTo(Math.round(xx) + .5, y(h)); ctx.lineTo(Math.round(xx) + .5, y(l)); ctx.stroke();
    const yo = y(o), yc = y(c); ctx.fillRect(xx - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
  }
  // EMA
  if (TR.show.ema) { line(D.ema200, col.s2, 1.6); line(D.ema50, col.s3, 1.4); line(D.ema20, col.s1, 1.3); }
  ctx.restore();
  // etykiety S/R na osi
  const tag = (price, color, text) => { const yy = y(price); if (yy < 0 || yy > plotH) return; ctx.fillStyle = color; ctx.fillRect(plotW + 1, yy - 8, PAD_R - 1, 16); ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '600 10.5px Inter, system-ui, sans-serif'; ctx.fillText(text || fp(price), plotW + 4, yy); ctx.font = font; };
  if (TR.show.sr) D.levels.forEach(l => tag(l.price, l.type === 'support' ? col.up : col.down));
  // pozycje użytkownika na tym symbolu
  if (TR.show.pos && TR.account) TR.account.positions.filter(p => p.symbol === D.symbol).forEach(p => {
    const hl = (price, color, label) => { if (price == null) return; const yy = Math.round(y(price)) + .5; if (yy < 0 || yy > plotH) return; ctx.strokeStyle = color; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, 6, yy - 2); };
    hl(p.entry, col.acc, `#${p.id} ${p.side.toUpperCase()} ${fp(p.entry)}`); hl(p.sl, col.down, `SL ${fp(p.sl)}`); hl(p.tp, col.up, `TP ${fp(p.tp)}`);
  });
  // ostatnia cena
  const lastC = C[C.length - 1]; tag(lastC[4], lastC[4] >= lastC[1] ? col.up : col.down);
  if (r.e === r.n) { const yy = Math.round(y(lastC[4])) + .5; ctx.strokeStyle = lastC[4] >= lastC[1] ? col.up : col.down; ctx.globalAlpha = .6; ctx.setLineDash([1, 2]); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  // znak wodny
  ctx.fillStyle = col.text; ctx.globalAlpha = .12; ctx.font = '600 22px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`${coin(D.symbol)}/USDT · ${ivLabel(D.interval)}${D.source === 'synthetic' ? ' · SYNTETYCZNE' : ''}`, 10, 8); ctx.globalAlpha = 1; ctx.font = font;

  /* --- RSI --- */
  const R = setupCanvas(q('#tr-c-rsi'), H2), ry = v => 6 + (100 - v) / 100 * (H2 - 12);
  R.ctx.font = font; R.ctx.strokeStyle = col.grid;
  R.ctx.fillStyle = css('--accent-soft') || 'rgba(128,128,128,.08)'; R.ctx.fillRect(0, ry(70), plotW, ry(30) - ry(70));
  [30, 50, 70].forEach(v => { const yy = Math.round(ry(v)) + .5; R.ctx.setLineDash(v === 50 ? [2, 3] : [4, 3]); R.ctx.beginPath(); R.ctx.moveTo(0, yy); R.ctx.lineTo(plotW, yy); R.ctx.stroke(); R.ctx.setLineDash([]); R.ctx.fillStyle = col.text; R.ctx.textBaseline = 'middle'; R.ctx.fillText(v, plotW + 6, yy); });
  R.ctx.save(); R.ctx.beginPath(); R.ctx.rect(0, 0, plotW, H2); R.ctx.clip();
  R.ctx.strokeStyle = col.s1; R.ctx.lineWidth = 1.4; R.ctx.beginPath(); let on = false;
  for (let i = r.s; i < r.e; i++) { const v = D.rsi[i]; if (v == null) { on = false; continue; } const xx = xOf(i, r, plotW); on ? R.ctx.lineTo(xx, ry(v)) : R.ctx.moveTo(xx, ry(v)); on = true; }
  R.ctx.stroke(); R.ctx.restore();
  const rsiNow = D.rsi[(TR.hover ?? r.e - 1)];
  R.ctx.fillStyle = col.text; R.ctx.textBaseline = 'top'; R.ctx.textAlign = 'left'; R.ctx.fillText(`RSI 14  ${rsiNow != null ? rsiNow.toFixed(1) : '—'}`, 6, 4);

  /* --- MACD --- */
  const M = setupCanvas(q('#tr-c-macd'), H3);
  let mlo = 0, mhi = 0;
  for (let i = r.s; i < r.e; i++) for (const v of [D.macd.macd[i], D.macd.signal[i], D.macd.hist[i]]) if (v != null) { mlo = Math.min(mlo, v); mhi = Math.max(mhi, v); }
  const mr = (mhi - mlo) || 1, my = v => 6 + (mhi - v) / mr * (H3 - 12);
  M.ctx.font = font; M.ctx.strokeStyle = col.grid; const zy = Math.round(my(0)) + .5; M.ctx.beginPath(); M.ctx.moveTo(0, zy); M.ctx.lineTo(plotW, zy); M.ctx.stroke();
  M.ctx.save(); M.ctx.beginPath(); M.ctx.rect(0, 0, plotW, H3); M.ctx.clip();
  for (let i = r.s; i < r.e; i++) { const v = D.macd.hist[i]; if (v == null) continue; M.ctx.fillStyle = v >= 0 ? col.up : col.down; M.ctx.globalAlpha = .55; const y0 = my(0), y1 = my(v); M.ctx.fillRect(xOf(i, r, plotW) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0))); }
  M.ctx.globalAlpha = 1;
  const mline = (arr, color) => { M.ctx.strokeStyle = color; M.ctx.lineWidth = 1.3; M.ctx.beginPath(); let o2 = false; for (let i = r.s; i < r.e; i++) { const v = arr[i]; if (v == null) { o2 = false; continue; } const xx = xOf(i, r, plotW); o2 ? M.ctx.lineTo(xx, my(v)) : M.ctx.moveTo(xx, my(v)); o2 = true; } M.ctx.stroke(); };
  mline(D.macd.macd, col.s1); mline(D.macd.signal, col.s2); M.ctx.restore();
  M.ctx.fillStyle = col.text; M.ctx.textBaseline = 'top'; M.ctx.fillText('MACD 12/26/9', 6, 4);

  /* --- crosshair --- */
  const hv = TR.hover, tip = q('#tr-tip');
  if (hv != null && hv >= r.s && hv < r.e) {
    const xx = Math.round(xOf(hv, r, plotW)) + .5;
    [[ctx, H1 - PAD_B], [R.ctx, H2], [M.ctx, H3]].forEach(([c, h]) => { c.strokeStyle = col.text; c.globalAlpha = .55; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, h); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; });
    if (TR.hoverY != null && TR.hoverY < plotH) { const yy = Math.round(TR.hoverY) + .5, pr = hi - (TR.hoverY - 6) / (plotH - volH - 12) * (hi - lo);
      ctx.strokeStyle = col.text; ctx.globalAlpha = .55; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (TR.hoverY < plotH - volH) tag(pr, col.fg); }
    const k = C[hv], ch = (k[4] / k[1] - 1) * 100;
    tip.hidden = false;
    tip.innerHTML = `<div class="m">${new Date(k[0]).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
      <div>O <b>${fp(k[1])}</b> H <b>${fp(k[2])}</b></div><div>L <b>${fp(k[3])}</b> C <b class="${cls(ch)}">${fp(k[4])}</b></div>
      <div class="m">${fpct(ch)} · wol. ${Number(k[5]).toLocaleString('pl-PL', { maximumFractionDigits: 0 })}</div>
      ${TR.show.ema && D.ema20[hv] != null ? `<div class="m">EMA20 ${fp(D.ema20[hv])}${D.ema50[hv] != null ? ' · 50 ' + fp(D.ema50[hv]) : ''}${D.ema200[hv] != null ? ' · 200 ' + fp(D.ema200[hv]) : ''}</div>` : ''}
      <div class="m">RSI ${D.rsi[hv] != null ? D.rsi[hv].toFixed(1) : '—'}</div>`;
    const left = xx > plotW / 2 ? 8 : plotW - tip.offsetWidth - 8;
    tip.style.left = Math.max(4, left) + 'px'; tip.style.top = '34px';
  } else if (tip) tip.hidden = true;
}

function bindChart(){
  const wrap = q('#tr-chartwrap');
  let drag = null, pinch = null;
  const idxAt = clientX => { const rect = wrap.getBoundingClientRect(), r = range(), plotW = rect.width - PAD_R; const x = clientX - rect.left; if (x < 0 || x > plotW) return null; return Math.min(r.e - 1, Math.max(r.s, r.s + Math.floor(x / (plotW / r.count)))); };
  const yIn = (clientY) => { const cv = q('#tr-c-main').getBoundingClientRect(); const yy = clientY - cv.top; return yy >= 0 && yy <= cv.height ? yy : null; };
  wrap.addEventListener('mousemove', e => {
    if (drag) { const plotW = wrap.clientWidth - PAD_R, r = range(); const shift = Math.round((e.clientX - drag.x) / (plotW / r.count)); TR.view.end = Math.min(r.n, Math.max(r.count, drag.end - shift)); if (TR.view.end >= r.n) TR.view.end = null; }
    TR.hover = idxAt(e.clientX); TR.hoverY = yIn(e.clientY); requestAnimationFrame(draw);
  });
  wrap.addEventListener('mouseleave', () => { TR.hover = null; TR.hoverY = null; drag = null; draw(); });
  wrap.addEventListener('mousedown', e => { const r = range(); drag = { x: e.clientX, end: r.e }; wrap.classList.add('drag'); });
  window.addEventListener('mouseup', () => { drag = null; wrap?.classList.remove('drag'); });
  wrap.addEventListener('wheel', e => {
    if (!TR.data) return; e.preventDefault();
    const r = range(), f = e.deltaY > 0 ? 1.15 : 1 / 1.15, at = idxAt(e.clientX) ?? r.e - 1;
    const count = Math.round(Math.max(20, Math.min(r.n, r.count * f)));
    const ratio = (at - r.s) / r.count; let end = Math.round(at + (1 - ratio) * count);
    TR.view.count = count; TR.view.end = end >= r.n ? null : Math.max(count, end); draw();
  }, { passive: false });
  wrap.addEventListener('dblclick', () => { TR.view = { end: null, count: defCount() }; draw(); });
  // dotyk: 1 palec = przesuwanie + crosshair, 2 palce = zoom
  wrap.addEventListener('touchstart', e => {
    const r = range();
    if (e.touches.length === 2) pinch = { d: Math.abs(e.touches[0].clientX - e.touches[1].clientX), count: r.count, end: r.e };
    else drag = { x: e.touches[0].clientX, end: r.e };
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (pinch && e.touches.length === 2) { e.preventDefault(); const d = Math.abs(e.touches[0].clientX - e.touches[1].clientX) || 1; const n = TR.data.candles.length;
      TR.view.count = Math.round(Math.max(20, Math.min(n, pinch.count * pinch.d / d))); TR.view.end = pinch.end >= n ? null : pinch.end; draw(); return; }
    if (drag) { e.preventDefault(); const plotW = wrap.clientWidth - PAD_R, r = range(); const shift = Math.round((e.touches[0].clientX - drag.x) / (plotW / r.count));
      TR.view.end = Math.min(r.n, Math.max(r.count, drag.end - shift)); if (TR.view.end >= r.n) TR.view.end = null; TR.hover = idxAt(e.touches[0].clientX); TR.hoverY = null; draw(); }
  }, { passive: false });
  wrap.addEventListener('touchend', () => { drag = null; pinch = null; setTimeout(() => { TR.hover = null; draw(); }, 1500); });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (current === 'trading') draw(); }, 120); });
  new MutationObserver(() => { if (current === 'trading') draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* ------------------------------------------------------------------ cykl życia widoku */
function startTimer(){
  clearInterval(TR.timer);
  TR.timer = setInterval(() => {
    if (current !== 'trading') { clearInterval(TR.timer); TR.timer = null; return; }
    if (document.hidden) return;
    TR.tick++;
    loadCandles(); refreshAccount();
    if (TR.tick % 6 === 0) { loadBots(); if (!TR.analysis?.ai_comment) loadAnalysis(false); }
  }, 10000);
}

LOADERS.trading = async function(){
  if (!root()) return;
  if (!TR.built) build();
  if (!TR.meta) TR.meta = await api('/api/trading/symbols').catch(() => ({ symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT', 'LTCUSDT'], intervals: [], strategies: {} }));
  renderBar();
  await Promise.all([refreshAccount(), loadCandles()]);
  renderOrder();
  if (!q('#tr-botform').children.length) { renderBotForm(); renderBtForm(); loadKbTopics(); }
  loadAnalysis(false); loadBots();
  startTimer();
};
window.TRADING = TR; // do debugowania z konsoli
})();
