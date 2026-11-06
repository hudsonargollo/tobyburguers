"use client";

import { useEffect, useRef, useState } from "react";

// Editorial type motion shared by the storefront: words rise out of blur as a
// heading enters view, and a single word can rotate in place.

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function SplitText({
  text,
  className = "",
  delay = 0,
  stagger = 70,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.12em]">
            <span
              className={`inline-block will-change-transform ${shown && !reduced ? "split-word is-in" : "split-word"}`}
              style={{ animationDelay: `${delay + i * stagger}ms` }}
            >
              {word}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

export function RotatingWord({
  words,
  className = "",
  interval = 2800,
}: {
  words: string[];
  className?: string;
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [reduced, words.length, interval]);

  // Longest word reserves the width so the headline never jumps.
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className={`inline-grid align-bottom ${className}`}>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-pre">
        {longest}
      </span>
      <span key={index} className="rotate-word col-start-1 row-start-1 whitespace-pre">
        {words[index]}
      </span>
    </span>
  );
}
