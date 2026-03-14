"use client";

import { useEffect, useRef } from "react";

/**
 * Mounts an IntersectionObserver that adds `.visible` to every `.reveal`
 * element within the document. Renders nothing — purely a side-effect hook.
 */
export function ScrollReveal() {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    // Observe existing + future elements
    function observeAll() {
      document.querySelectorAll(".reveal").forEach((el) => {
        observer.observe(el);
      });
    }

    observeAll();

    // MutationObserver to catch dynamically added elements (e.g. pricing re-render)
    const mutation = new MutationObserver(observeAll);
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
