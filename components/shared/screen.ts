"use client";

/*
 * What's on the writer's screen, for Maru: the posts in view, by id (the server reads them
 * itself, with what the writer may see), and the one they're on. That's the one their pointer
 * or focus was last in, if it's still in view, else the one that takes up most of the screen.
 */

let last: { id: string; at: number } | null = null;
let watching = false;

/** Notes the post the pointer or focus is in. Once per page load; cheap, passive listeners. */
export function watchPosts() {
  if (watching || typeof document === "undefined") return;
  watching = true;
  const note = (e: Event) => {
    const post = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-screen-post]") : null;
    if (post?.dataset.screenPost && !post.closest('[role="dialog"]')) last = { id: post.dataset.screenPost, at: Date.now() };
  };
  document.addEventListener("pointerover", note, { passive: true });
  document.addEventListener("focusin", note);
}

/** The posts mostly in view, top to bottom (at most six), and the one they're on. */
export function postsInView(): { ids: string[]; here: string | null } {
  const height = window.innerHeight;
  const seen = [...document.querySelectorAll<HTMLElement>("[data-screen-post]")]
    .filter((el) => !el.closest('[role="dialog"]'))
    .map((el) => {
      const box = el.getBoundingClientRect();
      const shown = Math.max(0, Math.min(box.bottom, height) - Math.max(box.top, 0));
      return { id: el.dataset.screenPost ?? "", box, shown };
    })
    // A sliver at the edge isn't something they're reading.
    .filter(({ id, box, shown }) => id && box.width > 0 && (shown >= box.height * 0.4 || shown >= height * 0.35))
    .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
    .slice(0, 6);
  const ids = seen.map((s) => s.id);
  const pointed = last && Date.now() - last.at < 2 * 60_000 && ids.includes(last.id) ? last.id : null;
  const most = [...seen].sort((a, b) => b.shown - a.shown)[0]?.id ?? null;
  return { ids, here: pointed ?? most };
}
