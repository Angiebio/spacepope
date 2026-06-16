/* The Galactic Observer — observatory.js · 16JUN2026
 *
 * Two small jobs, both reverent:
 *   1. The skin toggle — turn the atlas page between Void (dark) and Vellum
 *      (cream). The choice persists; a reader who prefers parchment keeps it.
 *   2. The star field — a single fixed, low-opacity layer of gold pinpricks,
 *      parallaxing very slowly on scroll. Never under running text. Silent
 *      under prefers-reduced-motion. The cosmos is decoration, never noise.
 */
(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORE_KEY = "observer-skin";

  /* ---- skin toggle (Void / Vellum) -------------------------------------- */
  // A reader's stored preference overrides the page's default skin — except
  // we let document pages (encyclical/dispatch) keep their vellum default the
  // FIRST time, since that's the intended reading register. Stored choice wins
  // on subsequent visits.
  const stored = localStorage.getItem(STORE_KEY);
  if (stored === "void" || stored === "vellum") {
    root.setAttribute("data-skin", stored);
  }

  const toggle = document.getElementById("skinToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      const next = root.getAttribute("data-skin") === "vellum" ? "void" : "vellum";
      root.setAttribute("data-skin", next);
      localStorage.setItem(STORE_KEY, next);
    });
  }

  /* ---- the star field --------------------------------------------------- */
  const field = document.getElementById("starfield");
  if (field && !reduceMotion) {
    const COUNT = Math.min(140, Math.round(window.innerWidth * window.innerHeight / 12000));
    const stars = [];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const s = document.createElement("span");
      s.className = "star";
      // magnitude-varied: a few bright, many faint — like a real plate
      const mag = Math.pow(Math.random(), 2.2); // skew toward faint
      const size = 0.6 + mag * 2.4;
      const depth = 0.3 + Math.random() * 0.7; // parallax depth
      s.style.width = s.style.height = size.toFixed(2) + "px";
      s.style.left = (Math.random() * 100).toFixed(3) + "%";
      s.style.top = (Math.random() * 100).toFixed(3) + "%";
      s.style.opacity = (0.25 + mag * 0.75).toFixed(2);
      s.dataset.depth = depth.toFixed(3);
      stars.push(s);
      frag.appendChild(s);
    }
    field.appendChild(frag);

    // very slow parallax — the spheres turn, but with the weight of ten
    // thousand years. Rate is tiny; rAF-throttled; off under reduced motion.
    let ticking = false;
    const RATE = 0.08;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        const y = window.scrollY;
        for (let i = 0; i < stars.length; i++) {
          const d = parseFloat(stars[i].dataset.depth);
          stars[i].style.transform = "translateY(" + (y * RATE * d).toFixed(1) + "px)";
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
