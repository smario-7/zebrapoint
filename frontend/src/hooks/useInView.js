import { useState, useEffect, useRef } from "react";

/**
 * Zwraca ref i flagę inView gdy element wchodzi do viewportu.
 * @param {{ once?: boolean, rootMargin?: string, threshold?: number }} options
 *   - once: po pierwszym wejściu nie resetuje (domyślnie true)
 *   - rootMargin, threshold: opcje IntersectionObserver
 */
export function useInView(options = {}) {
  const { once = true, rootMargin = "0px 0px -60px 0px", threshold = 0 } = options;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once && el) observer.unobserve(el);
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, inView };
}
