/* ═══════════════════════════════════════════════════════════════
   EL BUEN SAZÓN DEL BUZO · Palapa Familiar — Jonuta, Tabasco
   Motor de experiencia "La Inmersión"
   ───────────────────────────────────────────────────────────────
   Dependencias (CDN, con degradación elegante si no cargan):
   GSAP + ScrollTrigger (escenas con scroll) · Lenis (scroll suave)

   ÍNDICE
   00 Configuración del negocio   10 Escena: mural (La inmersión)
   01 Utilidades y detección      11 Escena: platillos (rail)
   02 WhatsApp                    12 Escena: escotilla (video)
   03 Loader                      13 Menú interactivo
   04 Scroll suave y anclas       14 Experiencia (tilt / spotlight)
   05 Navegación y menú móvil     15 FAQ
   06 Gauge, progreso y fondo     16 Formulario → WhatsApp
   07 Revelados y titulares       17 Cursor y botones magnéticos
   08 Burbujas (canvas)           18 Arranque
   09 Hero (cáusticas WebGL)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ─────────────── 00 · CONFIGURACIÓN DEL NEGOCIO ───────────────
     ÚNICO lugar que hay que editar antes de publicar.            */
  var CONFIG = {
    whatsapp: '52XXXXXXXXXX',   // ← Número con lada de país, solo dígitos. Ej: '5219131234567'
    phoneDisplay: '',           // ← Ej: '+52 913 123 4567' (vacío = no se muestra)
    hours: '',                  // ← Ej: 'Mar a Dom · 11:00 a 19:00' (vacío = "Confírmalo por WhatsApp")
    instagram: '',              // ← URL del perfil (vacío = se oculta el icono)
    facebook: '',               // ← URL de la página (vacío = se oculta el icono)
    mapsQuery: 'El Buen Sazón del Buzo Jonuta Tabasco',
    maxDepth: 40                // metros que marca el medidor al llegar al final
  };

  /* ─────────────── 01 · UTILIDADES Y DETECCIÓN ─────────────── */
  var html = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger) && !reduce;
  var lenis = null;
  var ptr = { x: .5, y: .5, sx: .5, sy: .5, px: 0, py: 0 };   // puntero normalizado + suavizado
  var scrollState = { y: 0, vel: 0, p: 0 };

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    html.classList.add('has-gsap');
  }
  if (reduce) html.classList.add('no-motion');

  /* Bucle central de animación (burbujas, cáusticas, cursor…) */
  var tickers = [];
  var lastT = performance.now();
  function loop(now) {
    var dt = Math.min(48, now - lastT) / 16.667;   // 1 = frame a 60fps
    lastT = now;
    ptr.sx += (ptr.x - ptr.sx) * .06 * dt;
    ptr.sy += (ptr.y - ptr.sy) * .06 * dt;
    for (var i = 0; i < tickers.length; i++) tickers[i](dt, now);
    requestAnimationFrame(loop);
  }

  window.addEventListener('pointermove', function (e) {
    ptr.x = e.clientX / window.innerWidth;
    ptr.y = e.clientY / window.innerHeight;
    ptr.px = e.clientX; ptr.py = e.clientY;
  }, { passive: true });

  /* ─────────────── 02 · WHATSAPP ─────────────── */
  var waReady = /^\d{10,15}$/.test(CONFIG.whatsapp);
  function waURL(msg) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg); }

  var toastEl = $('#toast'), toastTimer;
  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, ms || 3600);
  }

  /* Abre WhatsApp, o muestra una vista previa si el número aún no está configurado */
  function openWhatsApp(msg) {
    if (!waReady) {
      console.warn('[El Buen Sazón del Buzo] Configura CONFIG.whatsapp en script.js para activar la redirección.');
      toast('Modo demo · Aquí se abriría WhatsApp con: «' + msg.split('\n')[0] + '»', 4800);
      return false;
    }
    window.open(waURL(msg), '_blank', 'noopener,noreferrer');
    return true;
  }

  function initWhatsApp() {
    $$('[data-wa-msg]').forEach(function (a) {
      var msg = a.getAttribute('data-wa-msg');
      a.href = waURL(msg);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.addEventListener('click', function (e) {
        if (!waReady) { e.preventDefault(); openWhatsApp(msg); }
      });
    });

    // Datos de contacto opcionales (solo se muestran si están configurados)
    if (CONFIG.phoneDisplay) {
      var row = $('#phoneRow'); if (row) { row.hidden = false; $('#phoneText').textContent = CONFIG.phoneDisplay; }
    }
    if (CONFIG.hours) { var h = $('#hoursText'); if (h) h.textContent = CONFIG.hours; }

    var mapHref = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.mapsQuery);
    var m = $('#mapLink'); if (m) m.href = mapHref;
    $$('[data-map]').forEach(function (a) { a.href = mapHref; a.target = '_blank'; a.rel = 'noopener noreferrer'; });

    var social = { instagram: CONFIG.instagram, facebook: CONFIG.facebook };
    var any = false;
    $$('[data-social]').forEach(function (a) {
      var url = social[a.getAttribute('data-social')];
      if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; any = true; } else { a.hidden = true; }
    });
    var soc = $('.social'); if (soc && !any) soc.hidden = true;

    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    // Globito del botón flotante
    var wa = $('#waFloat');
    if (wa) {
      setTimeout(function () { wa.classList.add('is-tip'); }, 8000);
      setTimeout(function () { wa.classList.remove('is-tip'); }, 14500);
    }
  }

  /* ─────────────── 03 · LOADER · EL DESCENSO ─────────────── */
  var readyFired = false;
  function fireReady() {
    if (readyFired) return;
    readyFired = true;
    html.classList.remove('is-loading');
    html.classList.add('is-ready');
    if (lenis) lenis.start();
    setTimeout(function () { if (hasGSAP) ScrollTrigger.refresh(); }, 400);
  }

  function initLoader() {
    var loader = $('#loader');
    if (!loader) { fireReady(); return; }
    var depthEl = $('#ldDepth'), bar = $('#ldBar');
    var start = performance.now();
    var minTime = reduce ? 500 : 2600;
    var loaded = document.readyState === 'complete';
    var fontsOk = !document.fonts;
    var finished = false, p = 0;

    window.addEventListener('load', function () { loaded = true; }, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fontsOk = true; }, function () { fontsOk = true; });
    }

    function finish() {
      if (finished) return;
      finished = true;
      loader.classList.add('is-done');
      fireReady();
      setTimeout(function () { loader.classList.add('is-gone'); }, reduce ? 50 : 2000);
    }

    (function tick(now) {
      if (finished) return;
      var elapsed = now - start;
      var t = clamp(elapsed / minTime, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var cap = (loaded && fontsOk) ? 1 : .92;
      p += (Math.min(eased, cap) - p) * .18;
      depthEl.textContent = pad(Math.round(p * 30));
      bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      if ((p > .985 && t >= 1 && loaded && fontsOk) || elapsed > 8000) {
        depthEl.textContent = '30'; bar.style.transform = 'scaleX(1)';
        setTimeout(finish, 280);
        return;
      }
      requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ─────────────── 04 · SCROLL SUAVE Y ANCLAS ─────────────── */
  function initScroll() {
    if (window.Lenis && !reduce) {
      lenis = new Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });
      lenis.stop();   // se activa cuando termina el loader
      if (hasGSAP) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      }
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(id === '#inicio' ? 0 : el);
    });
  }

  function scrollToEl(target) {
    var opts = { offset: 0, duration: 1.8, easing: function (t) { return 1 - Math.pow(1 - t, 4); } };
    if (lenis) { lenis.scrollTo(target, opts); return; }
    if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ─────────────── 05 · NAVEGACIÓN Y MENÚ MÓVIL ─────────────── */
  var burger = $('#burger'), overlay = $('#overlay');
  function openMenu() {
    overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Cerrar menú');
    if (lenis) lenis.stop(); else html.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú');
    if (lenis) lenis.start(); else html.style.overflow = '';
  }
  function initNav() {
    $$('.overlay li').forEach(function (li, i) { li.style.setProperty('--i', i); });
    burger.addEventListener('click', function () { overlay.classList.contains('is-open') ? closeMenu() : openMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ─────────────── 06 · GAUGE, PROGRESO Y FONDO ─────────────── */
  function initDepth() {
    var nav = $('#nav'), progress = $('.progress'), ocean = $('.ocean'), gauge = $('.gauge');
    var depthEl = $('#gaugeDepth'), zoneEl = $('#gaugeZone');
    var zones = $$('[data-zone]');
    var navLinks = $$('.nav__links a');
    var lastDepth = -1, lastZone = '', lastY = window.scrollY, hidden = false, ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = clamp(y / max, 0, 1);
      scrollState.p = p;

      progress.style.setProperty('--p', p.toFixed(4));
      ocean.style.setProperty('--p', p.toFixed(4));
      gauge.style.setProperty('--p', p.toFixed(4));

      var d = Math.round(p * CONFIG.maxDepth);
      if (d !== lastDepth) { depthEl.textContent = pad(d); lastDepth = d; }

      // Zona actual (la sección que cruza el centro de la pantalla)
      var mid = window.innerHeight * .5, zone = zones[0] ? zones[0].getAttribute('data-zone') : '', current = null;
      for (var i = 0; i < zones.length; i++) {
        var r = zones[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { current = zones[i]; break; }
      }
      if (current) zone = current.getAttribute('data-zone');
      if (zone !== lastZone) {
        zoneEl.textContent = zone; lastZone = zone;
        gauge.classList.toggle('is-light', zone === 'Arena');
      }
      var curId = current && current.id;
      navLinks.forEach(function (a) { a.classList.toggle('is-active', !!curId && a.getAttribute('href') === '#' + curId); });

      // Navbar: sombra al hacer scroll + se oculta al bajar, reaparece al subir
      nav.classList.toggle('is-stuck', y > 40);
      var delta = y - lastY;
      if (Math.abs(delta) > 6) {
        var shouldHide = delta > 0 && y > 500 && !overlay.classList.contains('is-open');
        if (shouldHide !== hidden) { hidden = shouldHide; nav.classList.toggle('is-hidden', hidden); }
        lastY = y;
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    // Velocidad de scroll (para marquesinas y burbujas)
    tickers.push(function () {
      var y = window.scrollY;
      scrollState.vel += ((y - scrollState.y) - scrollState.vel) * .12;
      scrollState.y = y;
    });
  }

  /* ─────────────── 07 · REVELADOS Y TITULARES ─────────────── */
  function initReveals() {
    // Titulares divididos por palabras (respeta <em> internos)
    $$('[data-split]').forEach(function (el) {
      var i = 0;
      el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
          if (ch.nodeType === 3) {
            var frag = document.createDocumentFragment();
            ch.textContent.split(/(\s+)/).forEach(function (w) {
              if (!w) return;
              if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
              var o = document.createElement('span'); o.className = 'w'; o.setAttribute('aria-hidden', 'true');
              var n = document.createElement('span'); n.className = 'wi'; n.style.setProperty('--i', i++); n.textContent = w;
              o.appendChild(n); frag.appendChild(o);
            });
            node.replaceChild(frag, ch);
          } else if (ch.nodeType === 1) { walk(ch); }
        });
      })(el);
    });

    // Retardo escalonado entre hermanos
    var groups = new Map();
    $$('[data-reveal]').forEach(function (el) {
      var k = el.parentElement; var n = groups.get(k) || 0; groups.set(k, n + 1);
      if (n) el.style.setProperty('--d', Math.min(n * .09, .45) + 's');
    });

    var targets = $$('[data-reveal], [data-split]');
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* Manifiesto: las palabras se encienden con el scroll */
  function initScrubText() {
    var el = $('[data-scrub]'); if (!el) return;
    var text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map(function (w) { return '<span class="sw" aria-hidden="true">' + w + '</span>'; }).join(' ');
    var words = $$('.sw', el);
    if (hasGSAP) {
      words.forEach(function (w) { w.style.transition = 'none'; });
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: .12,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: .5 }
      });
    } else { words.forEach(function (w) { w.style.opacity = 1; }); }
  }

  /* Marquesina: movimiento propio (sin saltos) que reacciona a la velocidad del scroll */
  function initMarquee() {
    var rows = $$('.marquee__row').map(function (row) {
      var track = $('.marquee__track', row);
      var inner = document.createElement('div'); inner.className = 'marquee__inner';
      row.insertBefore(inner, track); inner.appendChild(track);
      var clone = track.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); inner.appendChild(clone);
      return { row: row, inner: inner, track: track, dir: parseFloat(row.getAttribute('data-dir')) || -1, x: 0 };
    });
    if (reduce) return;
    var skew = 0;
    tickers.push(function (dt) {
      var vel = scrollState.vel, boost = 1 + Math.min(Math.abs(vel) * .09, 7);
      skew += (clamp(vel * -.18, -7, 7) - skew) * .1;
      rows.forEach(function (r) {
        var w = r.track.offsetWidth; if (!w) return;
        r.x += r.dir * 1.05 * boost * dt;
        if (r.x <= -w) r.x += w;
        if (r.x > 0) r.x -= w;
        r.inner.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0)';
        r.row.style.transform = 'skewX(' + skew.toFixed(2) + 'deg)';
      });
    });
  }

  /* ─────────────── 08 · BURBUJAS (canvas global) ─────────────── */
  function initBubbles() {
    var c = $('#bubbles'); if (!c || reduce) return;
    var ctx = c.getContext('2d'); if (!ctx) return;
    var W = 0, H = 0, dpr = 1, bubbles = [], motes = [];

    function Bubble(init) { this.reset(init); }
    Bubble.prototype.reset = function (init) {
      var big = Math.random() < .12;
      this.r = rand(1.6, 7) * (big ? 1.9 : 1);
      this.x = rand(0, W); this.y = init ? rand(0, H) : H + this.r * 3;
      this.vy = rand(.25, .8) * (1 + this.r / 10);
      this.wob = rand(0, 6.28); this.ws = rand(.01, .03);
      this.a = rand(.2, .55);
    };
    function Mote() {
      this.x = rand(0, W); this.y = rand(0, H); this.r = rand(.5, 1.5);
      this.vx = rand(-.12, .12); this.vy = rand(-.08, .08); this.a = rand(.12, .38);
    }
    function seed() {
      var nb = Math.round(clamp(W * H / 24000, 16, 64));
      var nm = Math.round(clamp(W * H / 22000, 20, 70));
      bubbles = []; motes = [];
      for (var i = 0; i < nb; i++) bubbles.push(new Bubble(true));
      for (var j = 0; j < nm; j++) motes.push(new Mote());
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    resize();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });

    tickers.push(function (dt) {
      ctx.clearRect(0, 0, W, H);
      var boost = 1 + Math.min(Math.abs(scrollState.vel) * .05, 4);
      var mx = ptr.px, my = ptr.py;

      for (var j = 0; j < motes.length; j++) {
        var m = motes[j];
        m.x += m.vx * dt - scrollState.vel * .02; m.y += m.vy * dt - scrollState.vel * .05;
        if (m.x < -5) m.x = W + 5; if (m.x > W + 5) m.x = -5;
        if (m.y < -5) m.y = H + 5; if (m.y > H + 5) m.y = -5;
        ctx.fillStyle = 'rgba(190,235,255,' + m.a + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
      }

      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        b.y -= b.vy * dt * boost;
        b.wob += b.ws * dt;
        b.x += Math.sin(b.wob) * .35 * dt;
        if (finePointer) {   // las burbujas se apartan del cursor
          var dx = b.x - mx, dy = b.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 9000) { var f = (1 - d2 / 9000) * 1.6; b.x += (dx / (Math.sqrt(d2) + .01)) * f; }
        }
        if (b.y < -b.r * 3) b.reset(false);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(200,240,255,' + (b.a * .1) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(212,243,255,' + b.a + ')'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x - b.r * .32, b.y - b.r * .32, b.r * .28, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,' + (b.a * .9) + ')'; ctx.fill();
      }
    });
  }

  /* ─────────────── 09 · HERO (cáusticas WebGL + parallax) ─────────────── */
  function initCaustics() {
    var c = $('#caustics'); if (!c) return;
    if (reduce) { c.remove(); return; }
    var gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) { c.remove(); return; }

    var vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var fs = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
      'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;',
      '#define TAU 6.28318530718',
      'float caustic(vec2 uv, float time){',
      '  vec2 p = mod(uv * TAU, TAU) - 250.0;',
      '  vec2 i = p; float c = 1.0; float inten = .005;',
      '  for (int n = 0; n < 4; n++){',
      '    float t = time * (1.0 - (3.5 / float(n + 1)));',
      '    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));',
      '    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));',
      '  }',
      '  c /= 4.0; c = 1.17 - pow(c, 1.4);',
      '  return pow(abs(c), 8.0);',
      '}',
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / uRes;',
      '  float asp = uRes.x / uRes.y;',
      '  vec2 q = vec2(uv.x * asp, uv.y) * 1.5 + (uMouse - .5) * .07;',
      '  float a1 = caustic(q, uTime * .42);',
      '  float a2 = caustic(q * 1.8 + 3.1, uTime * .31 + 7.0);',
      '  float v = clamp(a1 * .95 + a2 * .6, 0.0, 1.0);',
      '  float fall = pow(smoothstep(0.0, 1.0, uv.y), 1.3) * .95 + .08;',
      '  float md = distance(vec2(uv.x * asp, uv.y), vec2(uMouse.x * asp, uMouse.y));',
      '  float light = smoothstep(.5, .0, md) * .7;',
      '  float a = clamp(v * (fall + light), 0.0, 1.0);',
      '  vec3 col = mix(vec3(.42, .86, 1.0), vec3(.96, 1.0, 1.0), v);',
      '  gl_FragColor = vec4(col * a, a);',
      '}'
    ].join('\n');

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { c.remove(); return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { c.remove(); return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uMouse = gl.getUniformLocation(prog, 'uMouse');

    function resize() {
      var scale = window.innerWidth < 768 ? .38 : .55;
      c.width = Math.max(2, Math.round(c.clientWidth * scale));
      c.height = Math.max(2, Math.round(c.clientHeight * scale));
      gl.viewport(0, 0, c.width, c.height);
    }
    resize();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });

    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe($('#inicio'));
    }
    var t0 = performance.now();
    tickers.push(function (dt, now) {
      if (!visible) return;
      gl.uniform2f(uRes, c.width, c.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uMouse, ptr.sx, 1 - ptr.sy);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
  }

  function initHero() {
    initCaustics();
    var img = $('.hero__media img');
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe($('#inicio'));
    }
    // Parallax de ratón sobre el mural y los rayos de luz
    if (finePointer && !reduce) {
      var rays = $('.hero__rays'), badge = $('.hero__badge');
      tickers.push(function () {
        if (!visible) return;
        var dx = ptr.sx - .5, dy = ptr.sy - .5;
        img.style.translate = (dx * -34).toFixed(1) + 'px ' + (dy * -22).toFixed(1) + 'px';
        rays.style.translate = (dx * 40).toFixed(1) + 'px 0px';
        if (badge) badge.style.translate = (dx * -18).toFixed(1) + 'px ' + (dy * -14).toFixed(1) + 'px';
      });
    }
    if (hasGSAP) {
      gsap.to('.hero__media', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__inner', { yPercent: -10, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: '75% top', scrub: true } });
    }
  }

  /* ─────────────── 10 · ESCENA: LA INMERSIÓN (mural a pantalla completa) ─────────────── */
  function buildDive(wide) {
    var sec = $('#historia'); if (!sec) return;
    var pin = $('.dive__pin', sec), win = $('.dive__window', sec), pan = $('.dive__pan', sec);
    var a = $('.dive__a', sec), b = $('.dive__b', sec), eyebrow = $('.dive__title .eyebrow', sec);
    var chaps = $$('.chap', sec), spots = $$('.spot', sec), dots = $$('.dive__dots i', sec);

    var startClip = wide ? 'inset(22% 33% 18% 33% round 999px 999px 32px 32px)' : 'inset(24% 22% 20% 22% round 999px 999px 28px 28px)';
    var endClip = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)';
    var focal = [{ x: .5, y: .38, s: 1.55 }, { x: .13, y: .79, s: 1.95 }, { x: .2, y: .25, s: 1.85 }, { x: .5, y: .5, s: 1 }];
    var T = [2.6, 5.4, 8.2, 11.0];

    function calc(f) {
      var w = pan.offsetWidth, h = pan.offsetHeight, cw = win.clientWidth, ch = win.clientHeight;
      var mx = Math.max(0, (w * f.s - cw) / 2), my = Math.max(0, (h * f.s - ch) / 2);
      return { x: clamp((.5 - f.x) * w * f.s, -mx, mx), y: clamp((.5 - f.y) * h * f.s, -my, my) };
    }

    gsap.set(win, { clipPath: startClip });
    gsap.set(pan, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1.14 });
    gsap.set(chaps, { autoAlpha: 0, y: 30 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, start: 'top top', end: '+=800%', scrub: .7, pin: pin, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function () { update(tl.time()); }
      }
    });

    tl.fromTo(win, { clipPath: startClip }, { clipPath: endClip, duration: 2.4, ease: 'power2.inOut' }, 0)
      .to(pan, { scale: 1, duration: 2.4, ease: 'power2.inOut' }, 0)
      .to(a, { yPercent: -90, autoAlpha: 0, duration: 1.7, ease: 'power2.in' }, .15)
      .to(b, { yPercent: 90, autoAlpha: 0, duration: 1.7, ease: 'power2.in' }, .15)
      .to(eyebrow, { autoAlpha: 0, duration: 1 }, .1);

    focal.forEach(function (f, i) {
      tl.to(pan, { x: function () { return calc(f).x; }, y: function () { return calc(f).y; }, scale: f.s, duration: 1.9, ease: 'power2.inOut' }, T[i]);
      tl.to(chaps[i], { autoAlpha: 1, y: 0, duration: .8, ease: 'power2.out' }, T[i] + 1.0);
      if (i < 3) tl.to(chaps[i], { autoAlpha: 0, y: -26, duration: .6, ease: 'power2.in' }, T[i] + 2.55);
    });
    tl.to({}, { duration: 1.6 }, T[3] + 1.9);   // pausa final

    function update(t) {
      var s = gsap.getProperty(pan, 'scale') || 1;
      pan.style.setProperty('--inv', (1 / s).toFixed(3));
      for (var i = 0; i < 3; i++) if (spots[i]) spots[i].classList.toggle('is-on', t >= T[i] + .9 && t < T[i] + 2.6);
      var active = t >= T[3] + 1 ? 3 : t >= T[2] + .8 ? 2 : t >= T[1] + .8 ? 1 : t >= T[0] + .8 ? 0 : -1;
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === active); });
    }
  }

  /* ─────────────── 11 · ESCENA: PLATILLOS (rail horizontal) ─────────────── */
  function buildRail() {
    var track = $('#railTrack'), pin = $('.rail__pin'), bar = $('#railBar');
    if (!track || !pin) return;
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: '#platillos', start: 'top top', end: function () { return '+=' + dist(); }, pin: pin, scrub: .8,
        invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
      }
    });
    $$('.dish__img img', track).forEach(function (img) {
      gsap.fromTo(img, { xPercent: -8, scale: 1.2 }, {
        xPercent: 8, scale: 1.2, ease: 'none',
        scrollTrigger: { trigger: img.closest('.dish'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
  }

  /* ─────────────── 12 · ESCENA: ESCOTILLA (video) ─────────────── */
  function initPortholeMedia() {
    var video = $('#palapaVideo'), btn = $('#soundBtn'), sec = $('#palapa');
    if (!video) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !reduce) { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else video.pause();
      }, { threshold: .25 }).observe(sec);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) video.pause(); });
    if (btn) btn.addEventListener('click', function () {
      video.muted = !video.muted;
      btn.setAttribute('aria-pressed', String(!video.muted));
      btn.setAttribute('aria-label', video.muted ? 'Activar sonido del video' : 'Silenciar el video');
    });
  }

  function buildPorthole() {
    var sec = $('#palapa'); if (!sec) return;
    var pin = $('.porthole__pin', sec), glass = $('#portholeGlass'), ring = $('#portholeRing'), copy = $('#portholeCopy'), peek = $('.porthole__peek', sec);
    var st = { t: 0 };
    function dims() {
      var vw = window.innerWidth, vh = window.innerHeight;
      return { r0: Math.min(vw, vh) * (vw < 700 ? .3 : .2), r1: Math.hypot(vw, vh) / 2 + 70 };
    }
    function apply() {
      var d = dims(), e = st.t * st.t * (3 - 2 * st.t);
      var r = lerp(d.r0, d.r1, e);
      glass.style.clipPath = 'circle(' + r.toFixed(1) + 'px at 50% 50%)';
      ring.style.width = ring.style.height = (r * 2 + 28).toFixed(1) + 'px';
      ring.style.setProperty('--ringR', (r + 7).toFixed(1) + 'px');
    }
    apply();
    gsap.set(copy, { autoAlpha: 0, y: 40 });
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, start: 'top top', end: '+=260%', scrub: .6, pin: pin, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { sec.classList.toggle('is-open', self.progress > .8); },
        onRefresh: apply
      }
    });
    tl.to(st, { t: 1, duration: 3, onUpdate: apply }, 0)
      .to(peek, { autoAlpha: 0, duration: .8 }, 0)
      .to(copy, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' }, 2.8)
      .to({}, { duration: 1 }, 3.8);
  }

  /* ─────────────── 13 · MENÚ INTERACTIVO ─────────────── */
  function initMenu() {
    var tabs = $$('.tab'), panels = $$('.panel');
    if (!tabs.length) return;
    var refreshT;
    function refresh() { if (!hasGSAP) return; clearTimeout(refreshT); refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 350); }

    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, k) {
        if (k === i) {
          p.hidden = false; p.classList.remove('is-active'); void p.offsetWidth; p.classList.add('is-active');
          $$('.row', p).forEach(function (r, j) { r.style.setProperty('--i', j); });
        } else { p.hidden = true; p.classList.remove('is-active'); }
      });
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      refresh();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    $$('.panel.is-active .row').forEach(function (r, j) { r.style.setProperty('--i', j); });

    // Vista previa flotante que sigue al cursor (solo escritorio)
    var stage = $('.menu__stage'), preview = $('#preview');
    if (!finePointer || !preview) return;
    var pimg = $('img', preview), cur = '';
    var tx = 0, ty = 0, cx = 0, cy = 0, on = false;
    var mq = window.matchMedia('(min-width: 1024px)');
    $$('.row__thumb').forEach(function () {});
    $$('.row').forEach(function (row) {
      var src = row.getAttribute('data-img');
      if (src) { var pre = new Image(); pre.src = src; }
      row.addEventListener('mouseenter', function () {
        if (!mq.matches) return;
        if (src && src !== cur) { pimg.src = src; cur = src; }
        preview.classList.add('is-on'); on = true;
      });
      row.addEventListener('mouseleave', function () { preview.classList.remove('is-on'); on = false; });
      row.addEventListener('click', function (e) {
        if (!mq.matches || e.target.closest('a')) return;
        var go = $('.row__go', row); if (go) go.click();
      });
    });
    stage.addEventListener('mousemove', function (e) {
      var w = preview.offsetWidth, h = preview.offsetHeight;
      tx = clamp(e.clientX + 36, 10, window.innerWidth - w - 10);
      ty = clamp(e.clientY - h / 2, 80, window.innerHeight - h - 10);
    });
    tickers.push(function () {
      if (!on && !preview.classList.contains('is-on')) return;
      var vx = tx - cx;
      cx += vx * .14; cy += (ty - cy) * .14;
      preview.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) rotate(' + clamp(vx * .05, -8, 8).toFixed(2) + 'deg)';
    });
  }

  /* ─────────────── 14 · EXPERIENCIA (spotlight + tilt) ─────────────── */
  function initTiles() {
    if (!finePointer || reduce) return;
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        el.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    var cta = $('.tile--cta');
    if (cta) cta.addEventListener('pointermove', function (e) {
      var r = cta.getBoundingClientRect();
      cta.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      cta.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  /* ─────────────── 15 · FAQ (acordeón animado) ─────────────── */
  function initFAQ() {
    var refreshT;
    function refresh() { if (!hasGSAP) return; clearTimeout(refreshT); refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 800); }
    $$('.qa').forEach(function (d) {
      var sum = $('summary', d), body = $('.qa__a', d);
      if (d.open) d.classList.add('is-open');
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.classList.contains('is-open')) {
          d.classList.remove('is-open');
          var done = function (ev) {
            if (ev && ev.propertyName !== 'grid-template-rows') return;
            body.removeEventListener('transitionend', done);
            if (!d.classList.contains('is-open')) d.removeAttribute('open');
          };
          body.addEventListener('transitionend', done);
          if (reduce) done();
        } else {
          d.setAttribute('open', '');
          requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('is-open'); }); });
        }
        refresh();
      });
    });
  }

  /* ─────────────── 16 · FORMULARIO → WHATSAPP ─────────────── */
  function initForm() {
    var form = $('#bookForm'); if (!form) return;
    var done = $('#formDone'), doneLink = $('#doneLink'), guestsEl = $('#f-guests');
    var dateEl = $('#f-date'), timeEl = $('#f-time'), nameEl = $('#f-name');
    var guests = 4;

    var now = new Date();
    var iso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    dateEl.min = iso;

    $$('[data-step]', form).forEach(function (b) {
      b.addEventListener('click', function () {
        guests = clamp(guests + parseInt(b.getAttribute('data-step'), 10), 1, 40);
        guestsEl.textContent = guests;
      });
    });

    // CTAs que preseleccionan la ocasión
    $$('[data-occasion]').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = form.querySelector('input[name="ocasion"][value="' + a.getAttribute('data-occasion') + '"]');
        if (r) r.checked = true;
      });
    });

    function setInvalid(input, bad) {
      var f = input.closest('.field'); if (f) f.classList.toggle('is-invalid', bad);
      input.setAttribute('aria-invalid', String(bad));
    }
    [nameEl, dateEl, timeEl].forEach(function (inp) {
      inp.addEventListener('input', function () { setInvalid(inp, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameEl.value.trim();
      var badName = name.length < 2;
      var badDate = !dateEl.value || dateEl.value < iso;
      var badTime = !timeEl.value;
      setInvalid(nameEl, badName); setInvalid(dateEl, badDate); setInvalid(timeEl, badTime);
      if (badName || badDate || badTime) {
        (badName ? nameEl : badDate ? dateEl : timeEl).focus();
        toast('Revisa los campos marcados para apartar tu mesa.');
        return;
      }
      var fecha = new Date(dateEl.value + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      var hp = timeEl.value.split(':'), hd = new Date(2000, 0, 1, +hp[0], +hp[1]);
      var hora = hd.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
      var oc = (form.querySelector('input[name="ocasion"]:checked') || {}).value || 'Comida en familia';
      var note = $('#f-note').value.trim();
      var msg = 'Hola, quiero reservar una mesa en El Buen Sazón del Buzo 🌊\n\n' +
        '• Nombre: ' + name + '\n' +
        '• Personas: ' + guests + '\n' +
        '• Fecha: ' + fecha + '\n' +
        '• Hora aproximada: ' + hora + '\n' +
        '• Ocasión: ' + oc + '\n' +
        (note ? '• Comentarios: ' + note + '\n' : '') +
        '\n¿Me confirman disponibilidad? ¡Gracias!';

      doneLink.href = waURL(msg);
      doneLink.onclick = function (ev) { if (!waReady) { ev.preventDefault(); openWhatsApp(msg); } };
      form.hidden = true; done.hidden = false;
      done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      openWhatsApp(msg);
    });

    var again = $('#again');
    if (again) again.addEventListener('click', function () { done.hidden = true; form.hidden = false; nameEl.focus(); });
  }

  /* ─────────────── 17 · CURSOR Y BOTONES MAGNÉTICOS ─────────────── */
  function initCursor() {
    if (!finePointer || reduce) return;
    html.classList.add('has-cursor');
    var cur = $('#cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('#cursorLabel');
    cur.style.opacity = 0;
    window.addEventListener('pointermove', function () { cur.style.opacity = 1; }, { once: true });
    var rx = window.innerWidth / 2, ry = window.innerHeight / 2;
    tickers.push(function (dt) {
      rx += (ptr.px - rx) * .2 * dt; ry += (ptr.py - ry) * .2 * dt;
      dot.style.transform = 'translate3d(' + ptr.px + 'px,' + ptr.py + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      if (t) { label.textContent = t.getAttribute('data-cursor'); cur.classList.add('is-hover'); }
      else cur.classList.remove('is-hover');
    });
    document.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cur.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { cur.style.opacity = 1; });
  }

  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = (dx * .22).toFixed(1) + 'px ' + (dy * .32).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', function () { el.style.translate = '0px 0px'; });
    });
  }

  /* ─────────────── 18 · ARRANQUE ─────────────── */
  function init() {
    initWhatsApp();
    initScroll();
    initNav();
    initDepth();
    initReveals();
    initScrubText();
    initMarquee();
    initBubbles();
    initHero();
    initMenu();
    initTiles();
    initFAQ();
    initForm();
    initCursor();
    initMagnetic();
    initPortholeMedia();

    if (hasGSAP) {
      var mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', function () { buildDive(true); });
      mm.add('(max-width: 899px)', function () { buildDive(false); });
      mm.add('(min-width: 1024px)', function () { buildRail(); });
      mm.add('(min-width: 0px)', function () { buildPorthole(); });
    }

    window.addEventListener('load', function () { if (hasGSAP) ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready && hasGSAP) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

    requestAnimationFrame(loop);
    initLoader();
  }

  init();

})();
