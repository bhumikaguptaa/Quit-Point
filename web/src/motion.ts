/** Shared scroll-into-view trigger used by every chart/grid grow-in. */
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animateOnVisible(el: Element, className: string, threshold = 0.3) {
  if (REDUCE_MOTION) {
    el.classList.add(className);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.classList.add(className);
          observer.disconnect();
        }
      }
    },
    { threshold },
  );
  observer.observe(el);
}
