// =============================================================
// Persistent dashboard top bar + bottom tab bar — SPA edition.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// Injects HTML + CSS, reads water progress from localStorage,
// exposes window.novaTopbar.updatePill() for the SPA router,
// and intercepts bottom-nav clicks to call window.novaRouter.
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config --------
  const TOPBAR_SUPABASE_URL = 'https://gmmmrfldwjwbektgbifq.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbW1yZmxkd2p3YmVrdGdiaWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDA5NTQsImV4cCI6MjA5NjA3Njk1NH0.sTUJrqcAwkl3lzbcGMU_0Gc5S_Vth0WxvfF6YU8rlJc';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: 8px;
  padding-left: max(14px, env(safe-area-inset-left));
  padding-right: max(14px, env(safe-area-inset-right));
  background: #0a0a0b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-water-wrap { display: flex; align-items: stretch; }
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-right: none;
  border-radius: 12px 0 0 12px;
  text-decoration: none; color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7DD3FC; flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-water-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700; color: #FAFAFA;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.topbar-water-add {
  width: 44px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.28), rgba(110, 231, 183, 0.28));
  color: #FFFFFF; font-family: inherit;
  font-size: 20px; font-weight: 700; line-height: 1;
  cursor: pointer; border-radius: 0 12px 12px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.7), rgba(110, 231, 183, 0.7));
}
.topbar-finance-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px; text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.topbar-finance-btn:hover { background: rgba(255, 255, 255, 0.08); }
.topbar-finance-icon {
  font-size: 20px; line-height: 1;
  filter: grayscale(100%) brightness(1.4); opacity: 0.85;
}
.tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; display: flex; justify-content: center;
  padding: 10px max(16px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: linear-gradient(180deg, rgba(5,5,6,0) 0%, rgba(5,5,6,0.78) 38%, rgba(5,5,6,0.94) 100%);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); pointer-events: none; }
.tabbar-inner { pointer-events: auto; display: flex; width: 100%; max-width: 560px;
  gap: 6px; padding: 6px; background: rgba(20,20,22,0.72);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; box-shadow: 0 12px 36px rgba(0,0,0,0.55); }
.tab { flex: 1 1 0; display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; padding: 10px 6px; border-radius: 13px; font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,0.6); text-decoration: none; background: transparent; border: 1px solid transparent;
  transition: color 0.15s, background 0.15s, border-color 0.15s; -webkit-tap-highlight-color: transparent; }
.tab:hover { color: #fff; }
.tab[aria-current="page"] { color: #fff; background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); }
.tab-icon { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; }
.tab-icon svg { width: 100%; height: 100%; display: block; }
body.has-bottombar { padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important; }
@media (max-width: 480px) {
  .topbar { gap: 6px; }
  .topbar-water-pill { padding: 8px 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 40px; font-size: 18px; }
  .topbar-finance-btn { width: 40px; height: 38px; }
  .topbar-finance-icon { font-size: 18px; }
  .tab { padding: 9px 4px; font-size: 10px; }
  .tabbar { padding-left: 12px; padding-right: 12px; }
}
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 560px) {
  .tabbar-inner:has(.tab:nth-child(6)) .tab { flex-direction: column; gap: 2px; padding: 7px 1px; font-size: 9px; }
  .tabbar-inner:has(.tab:nth-child(6)) .tab-icon { width: 14px; height: 14px; }
}
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open { overflow: hidden; touch-action: none; }
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important; overscroll-behavior: contain;
  }
}

/* ── Nova native-feel polish ── */

/* Page transition overlay */
#nova-overlay {
  position: fixed; inset: 0; z-index: 9997;
  background: #050506; opacity: 0;
  pointer-events: none; will-change: opacity;
  transition: opacity 0.22s ease;
}
#nova-overlay.active { opacity: 1; }

/* Sliding tab pill — replaces background on active tab */
.tabbar-inner { position: relative !important; }
.tab-slide-pill {
  position: absolute; top: 6px; bottom: 6px; left: 0;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 13px; pointer-events: none;
  will-change: transform;
}
.tab[aria-current="page"] {
  color: #fff !important;
  background: transparent !important;
  border-color: transparent !important;
}

/* Touch feedback */
.tab { touch-action: manipulation; }
.tab:active { transform: scale(0.93) !important; transition: transform 0.08s ease !important; }
button:active:not(:disabled) { transform: scale(0.97); transition: transform 0.08s ease !important; }

/* Skeleton shimmer */
@keyframes nova-skeleton-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.65; }
}
.nova-skeleton {
  background: rgba(255,255,255,0.07) !important;
  border-radius: 12px;
  animation: nova-skeleton-pulse 1.5s ease-in-out infinite;
}

/* Entrance animation keyframes (applied per-element in JS) */
@keyframes nova-card-enter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick actions">
  <span id="topbarGreeting" style="flex:1;font-size:13px;font-weight:500;color:rgba(250,250,250,0.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></span>
  <div class="topbar-water-wrap">
    <button class="topbar-water-pill" id="topbarWater" aria-label="Water progress" type="button" style="cursor:pointer;border:none;">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
    </button>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
  </div>
  <button class="topbar-finance-btn" id="topbarFinance" aria-label="Finance" type="button" style="cursor:pointer;border:none;">
    <span class="topbar-finance-icon">📊</span>
  </button>
</header>`;

  const bottombarHtml = `
<nav class="tabbar" id="bottombar" role="navigation" aria-label="Main tabs">
  <div class="tabbar-inner">
    <a href="index.html" class="tab" data-page="main"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>Main</a>
    <a href="health.html" class="tab" data-page="health"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>Health</a>
    <a href="po-coach.html" class="tab" data-page="fitness"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="10" width="4" height="4" rx="1"/><rect x="19" y="10" width="4" height="4" rx="1"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>Fitness</a>
    <a href="finance.html" class="tab" data-page="finance"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>Finance</a>
    <a href="/focus" class="tab" data-page="focus"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>Focus</a>
    <a href="library.html" class="tab" data-page="library"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>Library</a>
  </div>
</nav>`;

  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function currentPageKey() {
    return document.documentElement.dataset.activeTab || 'main';
  }
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function injectStyleAndHTML() {
    if (!document.getElementById('topbar-style')) {
      const style = document.createElement('style');
      style.id = 'topbar-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
    if (!document.getElementById('bottombar') && !isEmbedded()) {
      const bottomWrap = document.createElement('div');
      bottomWrap.innerHTML = bottombarHtml.trim();
      document.body.appendChild(bottomWrap.firstChild);
      const active = currentPageKey();
      document.querySelectorAll('.tab[data-page]').forEach((t) => {
        if (t.getAttribute('data-page') === active) t.setAttribute('aria-current', 'page');
      });
      document.body.classList.add('has-bottombar');
    }
    if (!document.getElementById('topbar') && !isEmbedded()) {
      const topWrap = document.createElement('div');
      topWrap.innerHTML = topbarHtml.trim();
      document.body.insertBefore(topWrap.firstChild, document.body.firstChild);
      const greetEl = document.getElementById('topbarGreeting');
      if (greetEl) greetEl.textContent = getGreeting();
    }
  }

  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }
  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }
  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return;
    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }
  async function pushWaterMergedToSupabase(localWater) {
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;
    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
  }
  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
    pushWaterMergedToSupabase(state);
  }

  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
  function startModalLock() {
    const MODAL_SELECTORS = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam', '.wc-modal-bg'];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    function sync() { document.body.classList.toggle('topbar-modal-open', anyOpen()); }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    sync();
  }

  // ── Native-feel: page transition overlay ──────────────────────
  function createNavOverlay() {
    const d = document.createElement('div');
    d.id = 'nova-overlay';
    document.body.appendChild(d);
    return d;
  }

  // ── Native-feel: sliding tab pill ─────────────────────────────
  function setupTabPill() {
    const inner = document.querySelector('.tabbar-inner');
    if (!inner) return null;
    const pill = document.createElement('div');
    pill.className = 'tab-slide-pill';
    inner.insertBefore(pill, inner.firstChild);

    function moveTo(tab, instant) {
      const ir = inner.getBoundingClientRect();
      const tr = tab.getBoundingClientRect();
      if (instant) pill.style.transition = 'none';
      pill.style.width = tr.width + 'px';
      pill.style.transform = 'translateX(' + (tr.left - ir.left) + 'px)';
      if (instant) requestAnimationFrame(() => {
        pill.style.transition = 'transform 0.3s cubic-bezier(0.22,1,0.36,1), width 0.3s cubic-bezier(0.22,1,0.36,1)';
      });
    }

    const active = inner.querySelector('.tab[aria-current="page"]');
    if (active) requestAnimationFrame(() => moveTo(active, true));

    return { pill, moveTo };
  }

  // ── SPA-aware nav clicks ───────────────────────────────────────
  function setupNavTransitions(overlay, pillObj) {
    document.querySelectorAll('.tab[data-page]').forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const tabId = tab.dataset.page;
        if (tab.getAttribute('aria-current') === 'page') return;
        if (window.novaRouter && window.novaRouter.showTab) {
          window.novaRouter.showTab(tabId);
        }
      });
    });
    // Water pill navigates to health tab
    const waterBtn = document.getElementById('topbarWater');
    if (waterBtn) waterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.novaRouter) window.novaRouter.showTab('health');
    });
    // Finance btn navigates to finance tab
    const finBtn = document.getElementById('topbarFinance');
    if (finBtn) finBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.novaRouter) window.novaRouter.showTab('finance');
    });
  }

  // ── Native-feel: stagger-fade entrance animation ───────────────
  function animatePageEntrance() {
    const container = document.querySelector('main') || document.querySelector('.page-container');
    if (!container) return;
    const children = Array.from(container.children).slice(0, 8);
    children.forEach((child, i) => {
      child.style.animation = 'nova-card-enter 0.38s ' + (i * 55) + 'ms cubic-bezier(0.22,1,0.36,1) both';
      const cleanup = () => { child.style.animation = ''; };
      child.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, i * 55 + 420);
    });
  }

  function boot() {
    injectStyleAndHTML();

    const overlay = createNavOverlay();
    const pillObj = setupTabPill();
    setupNavTransitions(overlay, pillObj);

    // Expose pill updater so the SPA router can move the pill on tab switches
    window.novaTopbar = {
      updatePill: function(tabId) {
        if (!pillObj) return;
        const target = document.querySelector('.tab[data-page="' + tabId + '"]');
        if (target) {
          pillObj.moveTo(target, false);
          document.querySelectorAll('.tab[data-page]').forEach(t => {
            t.setAttribute('aria-current', t.dataset.page === tabId ? 'page' : 'false');
          });
        }
      }
    };

    animatePageEntrance();

    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    render();
    lockGestures();
    startModalLock();
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    setInterval(render, 30 * 1000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
