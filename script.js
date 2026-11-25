/* Yuna Celestia 2nd Anniversary — mobile menu only.
   Without JavaScript the navigation simply stays visible. */
document.documentElement.classList.add('has-js');

const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('main-nav');

function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('is-open', open);
}

toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
});
window.matchMedia('(min-width: 641px)').addEventListener('change', () => setMenu(false));

/* =========================================================
   輕量互動（20261122）：Hero 布幕、星塵、逐一進場、卡片 3D 傾斜
   沒有 JS、或系統開了「減少動態效果」時，什麼都不隱藏也不動
   ========================================================= */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');

  /* Hero 黏住的位置：一般在導覽列正下方；Hero 比螢幕高時，等 Hero 底部到螢幕底才黏住，內容不會還沒看到就被蓋掉 */
  function setHeroTop() {
    if (!hero || !header) return;
    const top = Math.min(header.offsetHeight, window.innerHeight - hero.offsetHeight);
    root.style.setProperty('--hero-top', Math.round(top) + 'px');
  }

  /* Message 段落依原本的 <br> 拆成逐行淡入（只包 span，版面不變） */
  const msgP = document.querySelector('.message-copy p');
  if (msgP) {
    const nodes = [...msgP.childNodes];
    msgP.textContent = '';
    let span = null;
    nodes.forEach((n) => {
      if (n.nodeName === 'BR') { msgP.appendChild(n); span = null; return; }
      if (!span) { span = document.createElement('span'); span.className = 'reveal-line'; msgP.appendChild(span); }
      span.appendChild(n);
    });
  }

  /* 逐一進場的元素：同一群組依序延遲 */
  const groups = [
    ['.message-copy h2', '.message-copy .reveal-line', '.message-art'],
    ['.schedule .section-title', '.schedule-list > li'],
    ['.goods .section-title', '.goods-grid > .product'],
    ['.gallery .section-title', '.gallery-frame'],
    ['.cta h2', '.cta-text', '.btn-youtube', '.socials > li', '.site-footer']
  ];
  const targets = [];
  groups.forEach((sels) => {
    let i = 0;
    sels.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
      if (!el.classList.contains('reveal-line')) el.classList.add('reveal');
      el.style.setProperty('--d', (i++ * 0.12).toFixed(2) + 's');
      targets.push(el);
    }));
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    targets.forEach((el) => io.observe(el));
    /* 捲到最底時，剩下還沒進場的（例如頁尾）一起顯示 */
    const atBottom = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        targets.forEach((el) => { if (!el.classList.contains('is-in')) { el.classList.add('is-in'); io.unobserve(el); } });
      }
    };
    window.addEventListener('scroll', atBottom, { passive: true });
    /* 卡片在 3D 傾斜時，進場延遲不再影響轉回去的速度 */
    targets.forEach((el) => el.addEventListener('transitionend', () => el.style.removeProperty('--d'), { once: true }));
  } else {
    targets.forEach((el) => el.classList.add('is-in'));
  }

  /* 菱格紋固定：記下每個深藍區塊的位置，捲動時把花紋往反方向推 */
  const darks = [...document.querySelectorAll('.dark')];
  const setDarkTops = () => darks.forEach((el) => el.style.setProperty('--st', Math.round(el.getBoundingClientRect().top + window.scrollY) + 'px'));
  let syRaf = 0;
  const setScroll = () => { syRaf = 0; root.style.setProperty('--sy', Math.round(window.scrollY) + 'px'); };
  window.addEventListener('scroll', () => { if (!syRaf) syRaf = requestAnimationFrame(setScroll); }, { passive: true });
  window.addEventListener('resize', setDarkTops);
  window.addEventListener('load', setDarkTops);
  if ('ResizeObserver' in window) new ResizeObserver(setDarkTops).observe(document.body);

  /* 到這裡才加 .fx：CSS 的「先隱藏再進場」和 Hero 布幕都靠它，JS 中途出錯時內容照常顯示 */
  root.classList.add('fx');
  setHeroTop();
  setDarkTops();
  setScroll();
  window.addEventListener('resize', setHeroTop);
  if ('ResizeObserver' in window && hero) new ResizeObserver(setHeroTop).observe(hero);

  /* 金色星塵：Hero 背景上的小畫布，粒子慢慢往上飄、隨機閃爍；Hero 被蓋住或分頁在背景時暫停 */
  const bg = document.querySelector('.hero-bg');
  if (bg && hero) {
    const cv = document.createElement('canvas');
    cv.className = 'hero-dust';
    cv.setAttribute('aria-hidden', 'true');
    bg.insertBefore(cv, bg.querySelector('.hero-star'));
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], raf = 0, last = 0;
    const rand = (a, b) => a + Math.random() * (b - a);
    function make(initial) {
      return { x: rand(0, w), y: initial ? rand(0, h) : h + 4, r: rand(0.5, 1.7), vy: rand(4, 13), vx: rand(-3, 3),
               ph: rand(0, Math.PI * 2), sp: rand(0.8, 2.6), hue: rand(38, 50) };
    }
    function size() {
      const r = bg.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const n = Math.round(Math.min(46, Math.max(18, w * h / 9000)));
      parts = Array.from({ length: n }, () => make(true));
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy * dt; p.x += p.vx * dt; p.ph += p.sp * dt;
        if (p.y < -4 || p.x < -4 || p.x > w + 4) Object.assign(p, make(false));
        const a = 0.25 + 0.75 * Math.pow((Math.sin(p.ph) + 1) / 2, 3);
        ctx.globalAlpha = a;
        ctx.fillStyle = `hsl(${p.hue} 75% 72%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.r > 1.35 && a > 0.85) { ctx.globalAlpha = a * 0.5; ctx.fillRect(p.x - p.r * 3, p.y - 0.3, p.r * 6, 0.6); ctx.fillRect(p.x - 0.3, p.y - p.r * 3, 0.6, p.r * 6); }
      }
    }
    const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const heroVisible = () => window.scrollY < hero.offsetHeight + window.innerHeight * 0.5 && !document.hidden;
    const sync = () => (heroVisible() ? start() : stop());
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(bg);
    window.addEventListener('scroll', sync, { passive: true });
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* 紀念卡片 3D 傾斜：只給滑鼠等精準指標，觸控不傾斜 */
  const card = document.querySelector('.message-art');
  if (card && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const glare = document.createElement('span');
    glare.className = 'card-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);
    const MAX = 11;
    let pending = null;
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      pending = e;
      if (card._raf) return;
      card._raf = requestAnimationFrame(() => {
        card._raf = 0;
        const r = card.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, ((pending.clientX - r.left) / r.width) * 2 - 1));
        const ny = Math.max(-1, Math.min(1, ((pending.clientY - r.top) / r.height) * 2 - 1));
        const mag = Math.min(1, Math.hypot(nx, ny));
        /* 朝游標方向傾斜：繞著與游標方向垂直的軸轉 */
        card.classList.add('is-tilting');
        if (mag > 0.001) card.style.rotate = `${(-ny).toFixed(3)} ${nx.toFixed(3)} 0 ${(MAX * mag).toFixed(2)}deg`;
        card.style.setProperty('--gx', ((nx + 1) * 50).toFixed(1) + '%');
        card.style.setProperty('--gy', ((ny + 1) * 50).toFixed(1) + '%');
        card.style.setProperty('--ga', (90 + nx * 40).toFixed(0) + 'deg');
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(card._raf); card._raf = 0;
      card.classList.remove('is-tilting');
      card.style.rotate = '';
    });
  }
})();
