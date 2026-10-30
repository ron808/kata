"use client";

import { useEffect } from "react";

type Motion = typeof import("@/lib/motion");

/** Layout position (transforms ignored), so measuring mid-scene gives resting places. */
function rest(el: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * The signature scene: Kata marks the page, the marked phrases lift off as stickers and
 * land on the map, every thread gets its status, and Kata asks about the stuck one.
 * Desktop keeps the page beside the map; phones let the page give way to the map.
 */
function mindScene({ gsap, EASE_OUT }: Motion, desktop: boolean) {
  const section = document.querySelector<HTMLElement>('[data-scene="mind"]');
  const view = section?.querySelector<HTMLElement>("[data-mind-view]");
  if (!section || !view) return;
  const all = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel, view);
  const one = (sel: string) => view.querySelector<HTMLElement>(sel)!;

  const steps = all("[data-step]");
  const meters = all("[data-meter]");
  const page = one("[data-mind-page]");
  const mapWrap = one("[data-mind-mapwrap]");
  const stage = mapWrap.parentElement!;
  const ask = one("[data-mind-ask]");
  const me = one("[data-me]");
  const flies = all("[data-fly]");
  const badges = all("[data-badge]");
  const swipes = all("[data-swipe]");
  const phrase = Object.fromEntries(all("[data-phrase]").map((p) => [p.dataset.phrase!, p]));
  const link = Object.fromEntries(all<SVGLineElement>("[data-link]").map((l) => [l.dataset.link!, l]));
  const stuck = flies.find((f) => f.dataset.fly === "sleep")!;
  const others = flies.filter((f) => f !== stuck);
  const tiltOf = (f: HTMLElement) => parseFloat((f.firstElementChild as HTMLElement).style.getPropertyValue("--tilt")) || 0;

  // Each sticker starts on its phrase, about as tall as the line it came from.
  const start = (f: HTMLElement) => {
    const p = rest(phrase[f.dataset.fly!]);
    const o = rest(f);
    const node = f.firstElementChild as HTMLElement;
    return { x: p.x + p.w / 2 - o.x, y: p.y + p.h / 2 - o.y, scale: Math.min(0.5, (p.h * 1.6) / node.offsetWidth) };
  };

  // Phones, last step: the map moves up (and shrinks if it must) to make room for Kata.
  const room = () => {
    const h = stage.clientHeight;
    const free = h - ask.offsetHeight - 14;
    const m = mapWrap.offsetHeight;
    const k = Math.min(1, free / m);
    return { k, y: (k < 1 ? 0 : (free - m) / 2) - (h - m) / 2 };
  };

  const T = desktop
    ? { lift: 0.3, gap: 0.034, fly: 0.12, me: 0.28, stamp: 0.64 }
    : { lift: 0.29, gap: 0.026, fly: 0.13, me: 0.44, stamp: 0.67 };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: desktop ? 0.6 : 0.4,
      invalidateOnRefresh: true,
    },
  });

  // Captions take turns, one fully out before the next comes in; the meter keeps count.
  const IN = [0, 0.13, 0.3, 0.77];
  steps.forEach((step, i) => {
    if (i === 0) tl.fromTo(step, { opacity: 1, y: 0 }, { opacity: 0, y: -14, duration: 0.03 }, IN[1] - 0.035);
    else {
      tl.fromTo(step, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.03 }, IN[i]);
      if (i < steps.length - 1) tl.to(step, { opacity: 0, y: -14, duration: 0.03 }, IN[i + 1] - 0.035);
    }
  });
  meters.forEach((m, i) =>
    i === 0 ? gsap.set(m, { scaleX: 1 }) : tl.fromTo(m, { scaleX: 0 }, { scaleX: 1, duration: 0.03 }, IN[i])
  );

  // 1 · Kata reads the page: each phrase gets its marker.
  tl.fromTo(page, { autoAlpha: 1, y: 0, scale: 1 }, { autoAlpha: 1, duration: 0.01 }, 0);
  // One tween per element: a staggered fromTo inside a scrubbed timeline only sets its
  // first target's start state up front.
  swipes.forEach((sw, i) => tl.fromTo(sw, { scaleX: 0 }, { scaleX: 1, duration: 0.03 }, 0.135 + i * 0.022));

  // 2 · The phrases lift off as stickers and land on the map around you.
  tl.fromTo(me, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.035, ease: EASE_OUT }, T.me);
  flies.forEach((f, i) => {
    const at = T.lift + i * T.gap;
    const swipe = phrase[f.dataset.fly!].querySelector("[data-swipe]");
    tl.fromTo(
      f,
      { x: () => start(f).x, y: () => start(f).y, scale: () => start(f).scale, rotation: -18, autoAlpha: 0 },
      { y: () => start(f).y - 12, scale: () => start(f).scale * 1.3, rotation: -10, autoAlpha: 1, duration: 0.025, ease: EASE_OUT },
      at
    );
    tl.to(swipe, { opacity: 0.3, duration: 0.02 }, at);
    const flight = desktop ? at + 0.025 : Math.max(at + 0.025, T.me + 0.01 + i * 0.018);
    // Small while it crosses the page, full size as it lands.
    tl.to(f, { x: 0, duration: T.fly, ease: "power2.inOut" }, flight);
    tl.to(f, { y: 0, rotation: 0, duration: T.fly, ease: "power3.inOut" }, flight);
    tl.to(f, { scale: 1, duration: T.fly, ease: "power2.in" }, flight);
    tl.fromTo(link[f.dataset.fly!], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.025 }, flight + T.fly * 0.8);
  });
  if (!desktop) {
    // On phones the page slips away under its stickers, leaving the map.
    tl.to(page, { y: () => stage.clientHeight * 0.16, scale: 0.94, autoAlpha: 0, duration: 0.07, ease: "power2.in" }, 0.37);
  }

  // 3 · Every thread gets its status.
  badges.forEach((b, i) =>
    tl.fromTo(
      b,
      { autoAlpha: 0, scale: 1.7, rotation: -22 },
      { autoAlpha: 1, scale: 1, rotation: -4, duration: 0.03, ease: EASE_OUT },
      T.stamp + i * 0.016
    )
  );

  // 4 · Kata picks up the stuck one and asks about it.
  tl.to(stuck, { scale: 1.14, rotation: -tiltOf(stuck), duration: 0.05, ease: EASE_OUT }, 0.79);
  tl.to(others, { autoAlpha: 0.4, duration: 0.04 }, 0.79);
  tl.to(
    others.map((f) => link[f.dataset.fly!]),
    { autoAlpha: 0, duration: 0.04 },
    0.79
  );
  if (desktop) tl.to(page, { autoAlpha: 0.55, duration: 0.04 }, 0.79);
  else tl.fromTo(mapWrap, { y: 0, scale: 1 }, { y: () => room().y, scale: () => room().k, transformOrigin: "50% 0%", duration: 0.05, ease: "power2.inOut" }, 0.79);
  tl.fromTo(ask, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.05, ease: EASE_OUT }, desktop ? 0.81 : 0.83);
  tl.set({}, {}, 1);
}

/** Section headings rise line by line, masked, the first time they scroll in. */
function reveals({ gsap, SplitText, EASE_OUT, belowFold }: Motion) {
  gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
    if (!belowFold(el)) return;
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: EASE_OUT,
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }),
    });
  });
}

/**
 * One moment per section as it arrives: notes taped on, moments and starters put down.
 * Opacity, not autoAlpha: hidden things can't take focus, and the stamps must be
 * reachable by keyboard before their section has scrolled in.
 */
function arrivals({ gsap, EASE_OUT, belowFold }: Motion) {
  const scene = (name: string) => document.querySelector<HTMLElement>(`[data-scene="${name}"]`);
  const once = (trigger: Element, start = "top 78%") => ({ trigger, start, once: true });

  const today = scene("questions");
  const notes = today ? gsap.utils.toArray<HTMLElement>("[data-question]", today) : [];
  if (today && notes.length && belowFold(today)) {
    gsap.fromTo(
      notes,
      { opacity: 0, y: -40, scale: 1.05, rotation: (i, el: HTMLElement) => Number(el.dataset.tilt) + (i % 2 ? 8 : -8) },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotation: (_i, el: HTMLElement) => Number(el.dataset.tilt),
        duration: 0.75,
        ease: EASE_OUT,
        stagger: 0.14,
        scrollTrigger: once(today, "top 70%"),
      }
    );
  }

  const people = scene("people");
  const moments = people ? gsap.utils.toArray<HTMLElement>("[data-moment] > *", people) : [];
  if (people && moments.length && belowFold(people)) {
    gsap.from(moments, {
      opacity: 0,
      y: 56,
      rotation: (i) => [-4, 3, -2, 2][i] ?? 0,
      duration: 0.85,
      ease: EASE_OUT,
      stagger: 0.12,
      scrollTrigger: once(people),
    });
  }

  const roles = scene("roles");
  const starters = roles ? gsap.utils.toArray<HTMLElement>("[data-role] > article", roles) : [];
  if (roles && starters.length && belowFold(roles)) {
    gsap.from(starters, {
      opacity: 0,
      y: 64,
      rotation: (i) => (i % 2 ? 5 : -5),
      duration: 0.85,
      ease: EASE_OUT,
      stagger: 0.07,
      scrollTrigger: once(roles, "top 85%"),
    });
  }

  const vault = scene("private");
  const badges = vault ? gsap.utils.toArray<HTMLElement>("[data-badge]", vault) : [];
  if (vault && badges.length && belowFold(vault)) {
    gsap.from(badges, {
      opacity: 0,
      scale: 1.8,
      rotation: (i) => (i ? 24 : -24),
      duration: 0.6,
      ease: EASE_OUT,
      stagger: 0.18,
      scrollTrigger: once(vault, "top 65%"),
    });
  }

  const seal = document.querySelector<HTMLElement>("[data-begin-seal]");
  if (seal && belowFold(seal)) {
    gsap.from(seal, {
      opacity: 0,
      scale: 1.8,
      rotation: -24,
      duration: 0.6,
      ease: EASE_OUT,
      scrollTrigger: once(seal, "top 85%"),
    });
  }
}

function direct(motion: Motion) {
  const { gsap, ScrollTrigger } = motion;
  let lenis: { destroy: () => void } | null = null;
  let tick: ((time: number) => void) | null = null;

  const mm = gsap.matchMedia();
  // Between them these conditions cover every width; reduce opts out entirely.
  mm.add(
    {
      desktop: "(min-width: 1024px)",
      compact: "(max-width: 1023px)",
      reduce: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, reduce } = context.conditions ?? {};
      if (reduce) return;
      // Page order. The only runway is in CSS, so nothing here changes the page height.
      mindScene(motion, Boolean(desktop));
      reveals(motion);
      arrivals(motion);
    }
  );

  // Smooth scroll for fine pointers only; touch keeps native scrolling.
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fine && !calm) {
    import("lenis").then(({ default: Lenis }) => {
      const l = new Lenis({ autoRaf: false, anchors: true });
      l.on("scroll", ScrollTrigger.update);
      tick = (time: number) => l.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      lenis = l;
    });
  }

  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    mm.revert();
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
  };
}

/**
 * The header, with or without motion: over a dark chapter it takes on the chapter's
 * tokens, and its CTA is the view's one primary action only while neither big CTA
 * (hero, closing) is on screen.
 */
function wireHeader() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  if (!header) return () => {};
  const chapters = document.querySelectorAll<HTMLElement>(".chapter");
  const cta = header.querySelector<HTMLElement>("[data-cta-lit]");
  const bigs = document.querySelectorAll<HTMLElement>("[data-cta-big]");
  const over = new Set<Element>();
  const seen = new Set<Element>();
  let dark: IntersectionObserver | null = null;

  // A chapter counts while it's under the header's middle: the observer's root is that
  // one-pixel line, so the header flips exactly as an edge passes under it.
  const watchChapters = () => {
    dark?.disconnect();
    const mid = Math.round(header.offsetHeight / 2);
    dark = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? over.add(e.target) : over.delete(e.target)));
        header.classList.toggle("chapter", over.size > 0);
      },
      { rootMargin: `-${mid}px 0px -${Math.max(0, window.innerHeight - mid - 1)}px 0px` }
    );
    chapters.forEach((c) => dark!.observe(c));
  };
  watchChapters();
  window.addEventListener("resize", watchChapters);

  const lit = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    cta?.toggleAttribute("data-lit", seen.size === 0);
  });
  bigs.forEach((b) => lit.observe(b));

  return () => {
    dark?.disconnect();
    lit.disconnect();
    window.removeEventListener("resize", watchChapters);
  };
}

export default function Scenes() {
  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};
    const unheader = wireHeader();
    import("@/lib/motion")
      .then((motion) => {
        if (!cancelled) teardown = direct(motion);
      })
      // If the motion bundle can't load, fall back to the complete static layout.
      .catch(() => document.documentElement.classList.remove("js"));
    return () => {
      cancelled = true;
      teardown();
      unheader();
    };
  }, []);
  return null;
}
