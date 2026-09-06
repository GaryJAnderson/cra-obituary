/* ============================================================
   nav.js — sticky-nav behaviour for the section pills.

   1. Adds .is-stuck to .nav once it pins to the top (so it can
      frost over), detected with a 1px sentinel above it.
   2. Scrollspy: adds .is-active to the pill whose section is
      nearest the middle of the viewport.
   Plain script, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var nav = document.querySelector(".nav");
    if (!nav) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    if (!("IntersectionObserver" in window)) return;

    /* --- pinned / frosted state --- */
    var sentinel = document.getElementById("nav-sentinel");
    if (sentinel) {
      new IntersectionObserver(function (entries) {
        nav.classList.toggle("is-stuck", !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(sentinel);
    }

    /* --- scrollspy --- */
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!sections.length) return;

    var ratios = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        ratios[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
      });
      var best = null, bestRatio = 0;
      Object.keys(ratios).forEach(function (id) {
        if (ratios[id] > bestRatio) { bestRatio = ratios[id]; best = id; }
      });
      links.forEach(function (a) {
        a.classList.toggle("is-active", best && a.getAttribute("href") === "#" + best);
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.01, 0.25, 0.5, 1] });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* Portrait fallback. Lives here rather than as an inline onerror=
     attribute so the page can run under a strict Content-Security-Policy
     that forbids inline scripts. */
  function portraitFallback() {
    var portrait = document.querySelector(".hero__portrait");
    if (!portrait) return;
    portrait.addEventListener("error", function () {
      portrait.classList.add("is-missing");
    });
    if (portrait.complete && portrait.naturalWidth === 0) {
      portrait.classList.add("is-missing");
    }
  }

  function start() { init(); portraitFallback(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
