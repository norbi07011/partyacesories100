// @ts-nocheck
/* Real-time 3D cutaways (Three.js) that show how each kind of insulation is built up:
 * boards flying onto a brick wall and brick slips laid row by row, beads filling a cavity,
 * batts rising between floor joists, boards sliding between rafters. Physically based
 * materials, soft shadows, a slow camera sway and drag-to-rotate. One renderer per tile,
 * drawn only while the tile is on screen. */
import * as THREE from 'three';

export type StudioKind = 'vloer' | 'dak' | 'spouw' | 'gevel';

export function createWallStudio(host: HTMLElement, kind: StudioKind, opts: { reduce?: boolean } = {}) {
  const T = THREE;
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const cv = renderer.domElement;
  cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab';
  host.appendChild(cv);

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(30, 1, 0.05, 60);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const rand = (a, b) => a + Math.random() * (b - a);
  const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* environment for reflections: warm horizon, dark zenith, a few soft light panels */
  {
    const pm = new T.PMREMGenerator(renderer), es = new T.Scene();
    const sg = new T.SphereGeometry(20, 48, 24), pa = sg.attributes.position, cols = [];
    const zen = new T.Color(0x2b2824), hor = new T.Color(0xd9cbb2), gnd = new T.Color(0x1a1714);
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i) / 20, c = y >= 0 ? hor.clone().lerp(zen, Math.pow(y, 0.55)) : hor.clone().lerp(gnd, Math.min(1, -y * 4)); cols.push(c.r, c.g, c.b); }
    sg.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    es.add(new T.Mesh(sg, new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true })));
    const panel = (w, h, x, y, z, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k * 0.97, k * 0.9), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    panel(9, 3.5, -5, 7, 9, 5); panel(3, 7, 9, 2, 5, 2.5); panel(6, 1, 0, -2, 10, 1.6); panel(6, 4, 0, 4, -9, 2.2);
    scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
  }
  scene.add(new T.HemisphereLight(0xfff1dc, 0x15120f, 0.5));
  const key = new T.DirectionalLight(0xffe6c2, 1.25); key.position.set(3.2, 4.6, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 16 }); scene.add(key);
  const rim = new T.DirectionalLight(0x9db8ff, 0.4); rim.position.set(-4, 2.5, -3); scene.add(rim);

  /* procedural textures */
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const speck = (g, S, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.3})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); } };
  const brickC = (() => {
    const S = 1024, cols = 8, rows = 16, bw = S / cols, bh = S / rows, m = 7, c = canvas(S, S), g = c.getContext('2d'), b = canvas(S, S), gb = b.getContext('2d');
    g.fillStyle = '#5d564e'; g.fillRect(0, 0, S, S); gb.fillStyle = '#2a2a2a'; gb.fillRect(0, 0, S, S); speck(g, S, 12000, 0.07);
    for (let r = 0; r < rows; r++) { const off = r % 2 ? bw / 2 : 0;
      for (let k = -1; k <= cols; k++) {
        const x = k * bw + off + m / 2, y = r * bh + m / 2, w = bw - m, h = bh - m, hue = rand(10, 24), sat = rand(34, 52), li = rand(24, 38);
        g.fillStyle = `hsl(${hue},${sat}%,${li}%)`; g.fillRect(x, y, w, h);
        for (let s = 0; s < 90; s++) { g.fillStyle = `hsla(${hue + rand(-5, 5)},${sat}%,${li + rand(-12, 10)}%,.5)`; g.fillRect(x + Math.random() * w, y + Math.random() * h, rand(1, 5), rand(1, 2.5)); }
        const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,240,220,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
        const gv = Math.round(rand(190, 225)); gb.fillStyle = `rgb(${gv},${gv},${gv})`; gb.fillRect(x, y, w, h);
      } }
    return { c, b };
  })();
  const plain = (base, n, a) => { const c = canvas(256, 256), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256); speck(g, 256, n, a); return c; };
  const ksC = plain('#d4d0c7', 3000, 0.1), epsC = plain('#3f4144', 5000, 0.16), soilC = plain('#2b2622', 4000, 0.12), pirC = plain('#e3cf8a', 2500, 0.08);
  const woolC = (() => { const c = canvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#d8b24a'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,236,170' : '150,110,30'},${rand(0.15, 0.4)})`; g.lineWidth = rand(0.5, 1.5); const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-14, 14), y + rand(-3, 3)); g.stroke(); } return c; })();
  const woodC = (() => { const c = canvas(512, 128), g = c.getContext('2d'); g.fillStyle = '#b48a58'; g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${Math.random() > 0.5 ? '90,60,30' : '230,190,140'},${rand(0.08, 0.3)})`; g.lineWidth = rand(0.5, 2); const y = Math.random() * 128; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + rand(-6, 6), 340, y + rand(-6, 6), 512, y + rand(-4, 4)); g.stroke(); } return c; })();
  const tileC = (() => { const c = canvas(512, 512), g = c.getContext('2d'); g.fillStyle = '#26282b'; g.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { const gr = g.createLinearGradient(0, r * 64, 0, r * 64 + 64); gr.addColorStop(0, '#3c4045'); gr.addColorStop(0.85, '#22252a'); gr.addColorStop(1, '#0c0d0f'); g.fillStyle = gr; g.fillRect(k * 64 + 1, r * 64, 62, 64); } speck(g, 512, 5000, 0.05); return c; })();
  const tex = (c, rx, ry, srgb = true) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = aniso; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  const M = {
    brick: (w, h) => new T.MeshStandardMaterial({ map: tex(brickC.c, w / 1.7, h / 1.0), bumpMap: tex(brickC.b, w / 1.7, h / 1.0, false), bumpScale: 0.008, roughness: 0.92, envMapIntensity: 0.5 }),
    ks: (w, h) => new T.MeshStandardMaterial({ map: tex(ksC, w / 0.5, h / 0.5), roughness: 0.9, envMapIntensity: 0.5 }),
    eps: (w, h) => new T.MeshStandardMaterial({ map: tex(epsC, w / 0.3, h / 0.3), roughness: 0.95, envMapIntensity: 0.35 }),
    pir: (w, h) => new T.MeshStandardMaterial({ map: tex(pirC, w / 0.4, h / 0.4), roughness: 0.85, envMapIntensity: 0.4 }),
    wool: (w, h) => new T.MeshStandardMaterial({ map: tex(woolC, w / 0.5, h / 0.5), roughness: 1, envMapIntensity: 0.4 }),
    wood: (w, h) => new T.MeshStandardMaterial({ map: tex(woodC, Math.max(1, w / 1.2), Math.max(1, h / 0.3)), roughness: 0.7, envMapIntensity: 0.6 }),
    soil: (w, h) => new T.MeshStandardMaterial({ map: tex(soilC, w / 0.4, h / 0.4), roughness: 1, envMapIntensity: 0.2 }),
    tile: (w, h) => new T.MeshStandardMaterial({ map: tex(tileC, w / 1.6, h / 1.6), roughness: 0.55, metalness: 0.15, envMapIntensity: 0.9 }),
    foil: () => new T.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.95, roughness: 0.28, envMapIntensity: 1.3 }),
    board: () => new T.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.8, envMapIntensity: 0.5 }),
  };

  const root = new T.Group(); scene.add(root);
  const anim = [];
  /** progress of a step that starts at a and ends at b on the loop; everything retreats together at the end */
  const P = (t, a, b) => eo(cl((t - a) / (b - a))) * (1 - eio(cl((t - 0.92) / 0.08)));
  const box = (w, h, d, mat, x, y, z, parent = root) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const fly = (m, dx, dy, dz, a, b) => { const hx = m.position.x, hy = m.position.y, hz = m.position.z;
    anim.push((t) => { const k = P(t, a, b); m.visible = k > 0.002; m.position.set(hx + dx * (1 - k), hy + dy * (1 - k), hz + dz * (1 - k)); }); };
  const grow = (m, axis, from, a, b) => { const size = new T.Box3().setFromObject(m).getSize(new T.Vector3())[axis], h = m.position[axis];
    anim.push((t) => { const k = P(t, a, b); m.visible = k > 0.002; m.scale[axis] = Math.max(k, 0.0001); m.position[axis] = h + from * (size / 2) * (1 - k); }); };

  let YB = -0.9, look = new T.Vector3(0, 0, 0), yaw0 = -0.55, pitch0 = 0.2, dist = 5.6;
  const W = 2.2, H = 1.7;

  if (kind === 'gevel') {
    box(W, H, 0.1, M.ks(W, H), 0, 0, -0.19);
    box(W, H, 0.1, M.brick(W, H), 0, 0, -0.05);
    const WI = W * 0.82, bw = WI / 3, bh = H / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const m = box(bw - 0.006, bh - 0.006, 0.12, M.eps(bw, bh), -W / 2 + bw * (c + 0.5), -H / 2 + bh * (r + 0.5), 0.06);
      fly(m, 0, 0, 1.3 + c * 0.15, 0.04 + (r * 3 + c) * 0.035, 0.2 + (r * 3 + c) * 0.035);
    }
    const WS = W * 0.62, bed = box(WS, H, 0.004, new T.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 1, envMapIntensity: 0.2 }), -W / 2 + WS / 2, 0, 0.122);
    grow(bed, 'y', -1, 0.44, 0.52);
    const sw = 0.21, sh = 0.05, j = 0.012, rows = Math.floor(H / (sh + j)), cols = Math.ceil(WS / (sw + j)) + 1, slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let x0 = -W / 2 + c * (sw + j) - (r % 2 ? (sw + j) / 2 : 0), x1 = x0 + sw; x0 = Math.max(x0, -W / 2); x1 = Math.min(x1, -W / 2 + WS + (r % 2 ? 0.1 : 0));
      if (x1 - x0 > 0.03) slots.push({ x: (x0 + x1) / 2, w: (x1 - x0) / sw, y: -H / 2 + j / 2 + r * (sh + j) + sh / 2, a: 0.5 + (r / rows) * 0.3 + c * 0.004 });
    }
    const slips = new T.InstancedMesh(new T.BoxGeometry(sw, sh, 0.016), new T.MeshStandardMaterial({ roughness: 0.82, envMapIntensity: 0.55 }), slots.length);
    slips.castShadow = slips.receiveShadow = true; root.add(slips);
    const col = new T.Color(), d = new T.Object3D();
    slots.forEach((s, i) => { col.setHSL(rand(0.02, 0.055), rand(0.45, 0.65), rand(0.16, 0.34)).convertSRGBToLinear(); slips.setColorAt(i, col); });
    anim.push((t) => { slots.forEach((s, i) => { const k = P(t, s.a, s.a + 0.07); d.position.set(s.x, s.y, 0.132 + (1 - k) * 0.3); d.scale.set(s.w * Math.max(k, 0.0001), Math.max(k, 0.0001), 1); d.updateMatrix(); slips.setMatrixAt(i, d.matrix); }); slips.instanceMatrix.needsUpdate = true; });
    YB = -H / 2; yaw0 = -0.62; pitch0 = 0.16; dist = 4.5;
  }

  if (kind === 'spouw') {
    const cav = 0.09;
    box(W, H, 0.1, M.ks(W, H), 0, 0, -0.05 - cav - 0.05);
    const ow = W * 0.5; box(ow, H, 0.1, M.brick(ow, H), -W / 2 + ow / 2, 0, 0);
    const lip = box(W - ow, H * 0.3, 0.1, M.brick(W - ow, H * 0.3), W / 2 - (W - ow) / 2, -H / 2 + H * 0.15, 0); lip.material.envMapIntensity = 0.5;
    const r = 0.021, sp = 0.043, nx = Math.floor(W / sp), ny = Math.floor(H / (sp * 0.86)), nz = 2, beads = [];
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) beads.push({ x: -W / 2 + sp * (x + 0.5 + (y % 2 ? 0.5 : 0)) + rand(-0.006, 0.006), y: -H / 2 + r + y * sp * 0.86, z: -0.05 - cav + r + 0.004 + z * (cav - 2 * r - 0.008) + rand(-0.004, 0.004), a: 0.06 + (y / ny) * 0.56 + rand(0, 0.03) });
    const im = new T.InstancedMesh(new T.SphereGeometry(r, 10, 8), new T.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.6, envMapIntensity: 0.7 }), beads.length);
    im.castShadow = true; im.receiveShadow = true; root.add(im);
    const d = new T.Object3D(); let settled = -1;
    anim.push((t) => { const state = t > 0.74 && t < 0.92 ? 1 : 0; if (state && settled === 1) return; settled = state;
      beads.forEach((b, i) => { const k = P(t, b.a, b.a + 0.09); d.position.set(b.x, b.y + (1 - k) * (1 - k) * (H / 2 + 0.35 - b.y), b.z); d.scale.setScalar(k > 0.002 ? 1 : 0.0001); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; });
    YB = -H / 2; yaw0 = 0.7; pitch0 = 0.22; dist = 4.7; look.set(0, 0, -0.07);
  }

  if (kind === 'vloer') {
    const L = 1.7, top = 0.3;
    for (let i = 0; i < 5; i++) box(0.07, 0.2, L, M.wood(L, 0.2), -0.9 + i * 0.45, top - 0.1, 0).rotation.y = 0;
    for (let i = 0; i < 7; i++) box(2.0, 0.022, 0.138, M.wood(2.0, 0.14), 0, top + 0.012, -L / 2 + 0.07 + i * 0.145);
    box(0.1, 1.0, L + 0.1, M.brick(L, 1.0), -1.1, top - 0.5, 0); box(0.1, 1.0, L + 0.1, M.brick(L, 1.0), 1.1, top - 0.5, 0);
    box(2.3, 0.04, L + 0.1, M.soil(2.3, L), 0, top - 1.0, 0);
    const foil = box(2.1, 0.005, L, M.foil(), 0, top - 0.976, 0); grow(foil, 'x', -1, 0.05, 0.3);
    for (let i = 0; i < 4; i++) { const m = box(0.375, 0.15, L - 0.02, M.wool(0.4, L), -0.675 + i * 0.45, top - 0.105, 0); fly(m, 0, -0.75, 0, 0.3 + i * 0.07, 0.5 + i * 0.07); }
    YB = top - 1.0; look.set(0, -0.2, 0); yaw0 = -0.6; pitch0 = 0.1; dist = 5.0;
  }

  if (kind === 'dak') {
    const g = new T.Group(); g.rotation.x = -0.72; g.position.set(0, -0.05, 0); root.add(g);
    const LN = 2.0;
    box(2.3, LN + 0.1, 0.035, M.tile(2.3, LN), 0, 0, -0.1, g);
    for (let i = 0; i < 5; i++) box(0.06, LN, 0.16, M.wood(LN, 0.16), -0.9 + i * 0.45, 0, 0, g);
    for (let i = 0; i < 4; i++) { const m = box(0.385, LN - 0.02, 0.12, M.pir(0.4, LN), -0.675 + i * 0.45, 0, -0.015, g); fly(m, 0, 0, 1.2, 0.05 + i * 0.08, 0.26 + i * 0.08); }
    const foil = box(2.2, LN * 0.72, 0.004, M.foil(), 0, LN * 0.14, 0.084, g); grow(foil, 'y', 1, 0.52, 0.66);
    const pb = box(2.2, LN * 0.42, 0.0125, M.board(), 0, LN * 0.29, 0.096, g); fly(pb, 0, 0, 0.9, 0.68, 0.8);
    YB = -1.0; yaw0 = 0.55; pitch0 = 0.02; dist = 5.0; look.set(0, 0.05, 0);
  }

  const ground = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: 0.4 })); ground.rotation.x = -Math.PI / 2; ground.position.y = YB - 0.001; ground.receiveShadow = true; scene.add(ground);

  /* drag to rotate; vertical swipes still scroll the page */
  let uy = 0, up = 0, drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, uy, up }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; uy = Math.max(-1.1, Math.min(1.1, drag.uy - (e.clientX - drag.x) * 0.006)); up = Math.max(-0.25, Math.min(0.5, drag.up + (e.clientY - drag.y) * 0.004)); });
  const end = () => { drag = null; cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  const fit = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1 ? 38 : 30; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(fit); ro.observe(host); fit();

  const LOOP = 11; let raf = 0, t0 = performance.now(), running = false;
  const frame = (now) => {
    const sec = (now - t0) / 1000, t = opts.reduce ? 0.85 : (sec % LOOP) / LOOP;
    anim.forEach((f) => f(t));
    const yaw = yaw0 + uy + (opts.reduce ? 0 : Math.sin(sec * 0.28) * 0.16), pitch = pitch0 + up;
    cam.position.set(look.x + Math.sin(yaw) * Math.cos(pitch) * dist, look.y + Math.sin(pitch) * dist, look.z + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(look);
    renderer.render(scene, cam);
    if (running && !opts.reduce) raf = requestAnimationFrame(frame);
  };
  return {
    start() { if (running) return; running = true; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    /** jump to a moment on the loop (0..1) and draw once; used for stills */
    still(t) { t0 = performance.now() - t * LOOP * 1000; frame(performance.now()); },
    destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => { if (m.map) m.map.dispose(); if (m.bumpMap) m.bumpMap.dispose(); m.dispose(); }); }); renderer.dispose(); renderer.forceContextLoss?.(); cv.remove(); },
  };
}
