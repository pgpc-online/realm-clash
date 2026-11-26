/* Realm Clash v6.8 – Splash screen
   Logo (3.5s, fade-in + zoom) -> Hero scene (5s, thin loading bar + text + %) -> onComplete (lobby)
   Usage:  RealmSplash.start({ onComplete: () => showLobby() });
*/
(function () {
  const CFG = {
    logo: 'splash/splash_logo.webp',   // adjust path to your project layout
    hero: 'splash/splash_hero.webp',
    logoMs: 3500,
    heroMs: 5000,
    onComplete: function () {}
  };

  const css = `
  #rc-splash{position:fixed;inset:0;z-index:99999;background:#000;overflow:hidden;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;touch-action:none;user-select:none}
  #rc-splash .rc-layer{position:absolute;inset:0;opacity:0}
  #rc-splash .rc-img{width:100%;height:100%;display:block}
  #rc-splash .rc-logo .rc-img{object-fit:contain;transform:scale(.82);will-change:transform,opacity}
  #rc-splash .rc-hero .rc-img{object-fit:cover;transform:scale(1.0);will-change:transform}
  #rc-splash .rc-hero::after{content:"";position:absolute;inset:auto 0 0 0;height:22%;
    background:linear-gradient(to top,rgba(0,0,0,.75),transparent);pointer-events:none}
  #rc-splash .rc-load{position:absolute;left:4%;right:4%;bottom:max(14px,env(safe-area-inset-bottom));z-index:2}
  #rc-splash .rc-row{display:flex;justify-content:space-between;color:#e8f5e0;font-size:12px;
    letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;text-shadow:0 1px 3px #000}
  #rc-splash .rc-track{height:3px;background:rgba(255,255,255,.18);border-radius:2px;overflow:hidden}
  #rc-splash .rc-fill{height:100%;width:0;background:linear-gradient(90deg,#4fd36a,#b8ff8a);
    box-shadow:0 0 8px #6cff8a}
  @keyframes rcLogo{
    0%{opacity:0;transform:scale(.82)}
    35%{opacity:1}
    85%{opacity:1}
    100%{opacity:0;transform:scale(1.08)}
  }`;

  function loadImg(src) {
    return new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(i); i.src = src; });
  }

  function start(opts) {
    Object.assign(CFG, opts || {});
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    const root = document.createElement('div'); root.id = 'rc-splash';
    root.innerHTML =
      '<div class="rc-layer rc-hero"><img class="rc-img" alt=""></div>' +
      '<div class="rc-layer rc-logo"><img class="rc-img" alt=""></div>' +
      '<div class="rc-load" style="opacity:0"><div class="rc-row"><span>Loading</span><span class="rc-pct">0%</span></div>' +
      '<div class="rc-track"><div class="rc-fill"></div></div></div>';
    document.body.appendChild(root);

    const heroL = root.querySelector('.rc-hero'), logoL = root.querySelector('.rc-logo');
    const heroI = heroL.querySelector('img'), logoI = logoL.querySelector('img');
    const load = root.querySelector('.rc-load'), fill = root.querySelector('.rc-fill'),
          pct = root.querySelector('.rc-pct');

    Promise.all([loadImg(CFG.logo), loadImg(CFG.hero)]).then(([lg, hr]) => {
      logoI.src = lg.src; heroI.src = hr.src;

      // Phase 1: logo, 3.5s
      logoL.style.opacity = 1;
      logoI.style.animation = 'rcLogo ' + CFG.logoMs + 'ms ease-in-out forwards';

      setTimeout(() => {
        // Phase 2: hero scene, 5s
        logoL.style.display = 'none';
        heroL.style.transition = 'opacity .5s ease';
        heroL.style.opacity = 1;
        load.style.transition = 'opacity .5s ease'; load.style.opacity = 1;
        const t0 = performance.now();
        (function tick(now) {
          const t = Math.min((now - t0) / CFG.heroMs, 1);
          heroI.style.transform = 'scale(' + (1 + 0.06 * t) + ')';   // slow push-in
          const p = Math.round(100 * t);
          fill.style.width = p + '%'; pct.textContent = p + '%';
          if (t < 1) requestAnimationFrame(tick); else finish();
        })(t0);
      }, CFG.logoMs);
    });

    function finish() {
      root.style.transition = 'opacity .4s ease'; root.style.opacity = 0;
      setTimeout(() => { root.remove(); st.remove(); CFG.onComplete(); }, 400);
    }
  }

  window.RealmSplash = { start };
})();
