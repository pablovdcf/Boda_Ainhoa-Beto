// assets/site.js
let revealObserver = null;

async function loadConfig() {
  try {
    const res = await fetch('assets/config.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('Config no cargada, usando defaults', e);
    return {
      title: document.title || 'Boda',
      couple: { names: 'Ainhoa & Alberto' },
      date: '2026-10-10T10:00:00+02:00',
      date_text: '10 de Octubre 2026',
      theme: 'classic',
      venue: {
        name: 'Pazo Torre de Xunqueiras',
        location_text: 'Galicia',
        map_url: document.getElementById('mapLink')?.href || '#'
      },
      timeline: []
    };
  }
}

function applyTheme(cfg) {
  const link = document.getElementById('themeStylesheet');
  if (!link) return;
  const theme = cfg.theme || 'classic';
  const href = `assets/themes/${theme}.css`;
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }
  try {
    document.body.dataset.theme = theme;
  } catch (e) {
    console.warn('No se pudo aplicar data-theme', e);
  }
}

function applyBasics(cfg) {
  try { if (cfg.title) document.title = cfg.title; } catch {}
  const heroNames = document.getElementById('heroNames');
  if (heroNames && cfg.couple?.names) heroNames.textContent = cfg.couple.names;
  const sub = document.getElementById('heroSub');
  if (sub && cfg.date_text && cfg.venue?.name && cfg.venue?.location_text) {
    sub.textContent = `${cfg.date_text} · ${cfg.venue.name} · ${cfg.venue.location_text}`;
  }
  const map = document.getElementById('mapLink');
  if (map && cfg.venue?.map_url) map.href = cfg.venue.map_url;

  const meta = document.getElementById('countdownMeta');
  if (meta && cfg.date_text && cfg.venue?.name) {
    meta.innerHTML = `${cfg.date_text} — <span class="font-medium">${cfg.venue.name}</span>`;
  }
}

function applyCtas(cfg) {
  const heroCta = document.getElementById('heroCta');
  if (heroCta && cfg.hero_cta) {
    if (cfg.hero_cta.label) heroCta.textContent = cfg.hero_cta.label;
    if (cfg.hero_cta.href) heroCta.href = cfg.hero_cta.href;
  }
  const block = cfg.cta || {};
  const ctaTitle = document.getElementById('finalCtaTitle');
  const ctaText = document.getElementById('finalCtaText');
  const ctaBtn = document.getElementById('finalCtaBtn');
  if (ctaTitle && block.title) ctaTitle.textContent = block.title;
  if (ctaText && block.description) ctaText.textContent = block.description;
  if (ctaBtn && block.button) {
    if (block.button.label) ctaBtn.textContent = block.button.label;
    if (block.button.href) ctaBtn.href = block.button.href;
  }
}

function renderTimeline(cfg) {
  const list = Array.isArray(cfg.timeline) ? cfg.timeline : [];
  const tl = document.getElementById('timeline');
  if (!tl) return;
  tl.innerHTML = list.map(e => `
    <li class="tl-item reveal" data-kind="${e.kind||''}">
      <div class="tl-left">
        <span class="tl-label">${e.label || ''}</span>
        <span class="tl-time">${e.time || ''}</span>
      </div>
      <div class="tl-icon">
        <div class="tl-bullet"><svg><use href="#${e.icon || 'i-welcome'}"/></svg></div>
      </div>
      <div class="tl-right">
        <h4>${e.title || ''}</h4>
        <p>${e.desc || ''}</p>
      </div>
    </li>
  `).join('');
}

function startCountdown(cfg) {
  const targetMs = new Date(cfg.date || '2026-10-10T10:00:00+02:00').getTime();
  const el = {
    d: document.getElementById('d'),
    h: document.getElementById('h'),
    m: document.getElementById('m'),
    s: document.getElementById('s')
  };
  if (!el.d || !el.h || !el.m || !el.s) return;
  const prev = { d: null, h: null, m: null, s: null };

  function setNum(id, val) {
    const n = String(val).padStart(id === 'd' ? 1 : 2, '0');
    if (el[id].textContent === n) return;
    el[id].classList.add('fade');
    setTimeout(() => { el[id].textContent = n; }, 140);
    setTimeout(() => { el[id].classList.remove('fade'); }, 320);
  }
  function tick() {
    const diff = Math.max(0, targetMs - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (prev.d !== d) { setNum('d', d); prev.d = d; }
    if (prev.h !== h) { setNum('h', h); prev.h = h; }
    if (prev.m !== m) { setNum('m', m); prev.m = m; }
    if (prev.s !== s) { setNum('s', s); prev.s = s; }
  }
  tick();
  setInterval(tick, 1000);
}

function renderInfo(cfg) {
  const grid = document.getElementById('infoGrid');
  const items = Array.isArray(cfg.info) ? cfg.info : [];
  if (!grid || items.length === 0) return;
  grid.innerHTML = items.map(it => `
    <div class="card p-6 reveal">
      <h3 class="font-serif text-xl mb-2">${it.title || ''}</h3>
      <p class="text-slate-700">${it.text || ''}</p>
    </div>
  `).join('');
}

function renderGallery(cfg) {
  const host = document.getElementById('galleryGrid') || document.querySelector('.masonry');
  const items = Array.isArray(cfg.gallery) ? cfg.gallery : [];
  if (!host || items.length === 0) return;
  host.innerHTML = items.map(g => `
    <a class="reveal" href="${g.src}"><img src="${g.src}" loading="lazy" alt="${(g.alt||'').replace(/"/g,'&quot;')}"/></a>
  `).join('');
  if (typeof window.setupLightbox === 'function') {
    window.setupLightbox();
  }
}

function renderFaqs(cfg) {
  const host = document.getElementById('faqList');
  const items = Array.isArray(cfg.faqs) ? cfg.faqs : [];
  if (!host || items.length === 0) return;
  host.innerHTML = items.map(f => `
    <details class="card p-4 mb-3 reveal">
      <summary class="cursor-pointer font-medium">${f.q || ''}</summary>
      <div class="mt-2 text-slate-700">${f.a || ''}</div>
    </details>
  `).join('');
}

function initReveals() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
  }
  els.forEach(el => {
    if (el.classList.contains('visible')) return;
    revealObserver.observe(el);
  });
}

function renderLocation(cfg) {
  const block = cfg.location || {};
  const section = document.getElementById('locationSection');
  if (!section) return;
  const titleEl = document.getElementById('locationTitle');
  const subtitleEl = document.getElementById('locationSubtitle');
  const descEl = document.getElementById('locationDesc');
  if (titleEl && block.title) titleEl.textContent = block.title;
  if (subtitleEl && block.subtitle) subtitleEl.textContent = block.subtitle;
  if (descEl && block.description) descEl.textContent = block.description;
  const photosEl = document.getElementById('locationPhotos');
  const photos = Array.isArray(block.photos) ? block.photos : [];
  if (photosEl && photos.length) {
    photosEl.innerHTML = photos.map((p, idx) => `
      <div class="photo ${idx === 0 ? 'main' : 'secondary'}">
        <img src="${p.src}" alt="${(p.alt || '').replace(/"/g, '&quot;')}" loading="lazy" />
      </div>
    `).join('');
  }
}

function showNoticeFromQuery() {
  const banner = document.getElementById('noticeBanner');
  if (!banner) return;
  const params = new URLSearchParams(location.search);
  const text = params.get('notice');
  if (!text) return;
  const kind = params.get('noticeKind') || 'info';
  banner.textContent = text;
  banner.classList.remove('show', 'success', 'info', 'warn');
  banner.classList.add(kind === 'success' ? 'success' : kind === 'warn' ? 'warn' : 'info');
  requestAnimationFrame(() => banner.classList.add('show'));
  setTimeout(() => banner.classList.remove('show'), 6000);
  params.delete('notice');
  params.delete('noticeKind');
  const newQuery = params.toString();
  const newUrl = location.pathname + (newQuery ? `?${newQuery}` : '') + location.hash;
  try {
    history.replaceState({}, '', newUrl);
  } catch (e) {
    console.warn('No se pudo limpiar la URL', e);
  }
}

(async function main(){
  const cfg = await loadConfig();
  applyTheme(cfg);
  applyBasics(cfg);
  applyCtas(cfg);
  renderTimeline(cfg);
  renderInfo(cfg);
  renderGallery(cfg);
  renderFaqs(cfg);
  renderLocation(cfg);
  initReveals();
  showNoticeFromQuery();
  startCountdown(cfg);
})();

