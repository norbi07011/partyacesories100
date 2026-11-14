/* Studio Agent – lekkie wykresy SVG (bez bibliotek): bar, hbar, line.
   Specyfikacja: {type, title, labels:[...], series:[{name, data:[...]}], unit?}
   Kolory: kategoryczne sloty z CSS (--series-1..3), etykiety tekstem w kolorach tekstu, siatka stonowana. */
const CH_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const fmtNum = (v, unit='zł') => v == null ? '—' : Number(v).toLocaleString('pl-PL', {maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0}) + (unit ? ' ' + unit : '');
const fmtShort = v => { const a = Math.abs(v); return a >= 1e6 ? (v/1e6).toFixed(1).replace('.0','')+' mln' : a >= 1e3 ? (v/1e3).toFixed(a >= 1e4 ? 0 : 1).replace('.0','')+' tys.' : String(Math.round(v)); };
const escC = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function niceScale(min, max, ticks = 4){
  if (min === max) { max = max || 1; min = Math.min(0, min); }
  const span = max - min, step0 = span / ticks, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = []; for (let v = lo; v <= hi + step/2; v += step) out.push(+v.toFixed(10));
  return out;
}

function renderChart(spec){
  try {
    const series = (spec.series || []).slice(0, 3), labels = spec.labels || [], unit = spec.unit ?? 'zł';
    if (!series.length || !labels.length) return '';
    const legend = series.length > 1 ? `<div class="ch-legend">${series.map((s,i)=>`<span><i style="background:${CH_COLORS[i]}"></i>${escC(s.name)}</span>`).join('')}</div>` : '';
    const body = spec.type === 'hbar' ? hbar(series[0], labels, unit) : spec.type === 'line' ? line(series, labels, unit) : bars(series, labels, unit);
    return `<figure class="chart"><figcaption>${escC(spec.title || series[0].name)}</figcaption>${legend}${body}</figure>`;
  } catch (e) { return `<div class="m">Nie udało się narysować wykresu.</div>`; }
}

function bars(series, labels, unit){
  const W = 640, H = 240, L = 54, R = 8, T = 10, B = 26;
  const all = series.flatMap(s => s.data.map(Number));
  const ticks = niceScale(Math.min(0, ...all), Math.max(0, ...all));
  const y0 = ticks[0], y1 = ticks[ticks.length-1], y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  const groupW = (W - L - R) / labels.length, gap = 2, n = series.length;
  const barW = Math.max(3, Math.min(28, (groupW * 0.72 - gap * (n-1)) / n));
  let g = ticks.map(t => `<line class="ch-grid" x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-axis" x="${L-6}" y="${y(t)+4}" text-anchor="end">${fmtShort(t)}</text>`).join('');
  const zero = y(0);
  labels.forEach((lab, i) => {
    const gx = L + groupW * i + (groupW - (barW * n + gap * (n-1))) / 2;
    series.forEach((s, j) => {
      const v = Number(s.data[i] || 0), top = Math.min(y(v), zero), h = Math.max(Math.abs(y(v) - zero), v ? 1.5 : 0);
      const x = gx + j * (barW + gap), r = Math.min(4, barW/2, h);
      // zaokrąglony tylko koniec z danymi, podstawa przy linii zera
      const d = v >= 0
        ? `M${x},${zero} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${zero} Z`
        : `M${x},${zero} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + barW - r} Q${x + barW},${top + h} ${x + barW},${top + h - r} V${zero} Z`;
      g += `<path d="${d}" fill="${CH_COLORS[j]}" data-tip="${escC(lab)} · ${escC(s.name)}: ${fmtNum(v, unit)}"/>`;
    });
    const step = Math.ceil(labels.length / 12);
    if (i % step === 0) g += `<text class="ch-axis" x="${L + groupW * i + groupW/2}" y="${H - 8}" text-anchor="middle">${escC(lab)}</text>`;
    g += `<rect class="ch-hit" x="${L + groupW * i}" y="${T}" width="${groupW}" height="${H - T - B}" data-tip="${escC(lab)} — ${series.map(s => `${escC(s.name)}: ${fmtNum(Number(s.data[i] || 0), unit)}`).join(' · ')}"/>`;
  });
  g += `<line class="ch-base" x1="${L}" x2="${W-R}" y1="${zero}" y2="${zero}"/>`;
  return `<svg class="ch-svg" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
}

function hbar(s, labels, unit){
  const rows = labels.map((l, i) => [l, Number(s.data[i] || 0)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = Math.max(...rows.map(r => r[1]), 1);
  return `<div class="ch-hbars">${rows.map(([l, v]) => `<div class="ch-hrow" data-tip="${escC(l)}: ${fmtNum(v, unit)}"><span class="ch-hl">${escC(l)}</span><span class="ch-htrack"><i style="width:${Math.max(0.5, v / max * 100)}%;background:${CH_COLORS[0]}"></i></span><span class="ch-hv">${fmtNum(v, unit)}</span></div>`).join('')}</div>`;
}

function line(series, labels, unit){
  const W = 640, H = 220, L = 54, R = 10, T = 10, B = 26;
  const all = series.flatMap(s => s.data.map(Number));
  const ticks = niceScale(Math.min(...all), Math.max(...all));
  const y0 = ticks[0], y1 = ticks[ticks.length-1], y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  const x = i => L + (W - L - R) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
  let g = ticks.map(t => `<line class="ch-grid" x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-axis" x="${L-6}" y="${y(t)+4}" text-anchor="end">${fmtShort(t)}</text>`).join('');
  series.forEach((s, j) => {
    g += `<polyline fill="none" stroke="${CH_COLORS[j]}" stroke-width="2" stroke-linejoin="round" points="${s.data.map((v, i) => `${x(i)},${y(Number(v))}`).join(' ')}"/>`;
  });
  const step = Math.ceil(labels.length / 12);
  labels.forEach((lab, i) => {
    if (i % step === 0) g += `<text class="ch-axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${escC(lab)}</text>`;
    g += `<rect class="ch-hit" x="${x(i) - (W - L - R) / labels.length / 2}" y="${T}" width="${(W - L - R) / labels.length}" height="${H - T - B}" data-tip="${escC(lab)} — ${series.map(s => `${escC(s.name)}: ${fmtNum(Number(s.data[i]), unit)}`).join(' · ')}"/>`;
  });
  return `<svg class="ch-svg" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
}

/* dymek po najechaniu */
(function(){
  const tip = document.createElement('div'); tip.className = 'ch-tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !t.closest('.chart')) { tip.hidden = true; return; }
    tip.textContent = t.dataset.tip; tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
})();
