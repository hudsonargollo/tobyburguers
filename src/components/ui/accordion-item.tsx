"use client";

import type { MouseEvent, ReactNode, SyntheticEvent } from "react";

// Smooth, exclusive accordion built on <details>.
// Plain <details> snaps open/closed; this animates the height + fade with the
// Web Animations API (works in every modern browser, incl. iPhone Safari).
// Items with the same `group` behave as one accordion: opening one smoothly
// closes the others. Without JS it still works as a normal <details>.

const OPEN_MS = 420;
const CLOSE_MS = 320;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // soft "ease-out-quint"

const running = new WeakMap<HTMLElement, Animation>();

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bodyOf(details: HTMLDetailsElement) {
  return details.querySelector<HTMLElement>(":scope > [data-acc-body]");
}

function setState(details: HTMLDetailsElement, state: "open" | "closed") {
  details.dataset.state = state;
  details.querySelector(":scope > summary")?.setAttribute("aria-expanded", String(state === "open"));
}

function animate(body: HTMLElement, from: number, to: number, ms: number, done?: () => void) {
  running.get(body)?.cancel();
  const anim = body.animate(
    [
      { height: `${from}px`, opacity: from === 0 ? 0 : 1 },
      { height: `${to}px`, opacity: to === 0 ? 0 : 1 },
    ],
    { duration: ms, easing: EASE }
  );
  running.set(body, anim);
  // `finished` resolves even when no frame is painted; it rejects on cancel (re-click), which we ignore.
  anim.finished.then(
    () => {
      running.delete(body);
      done?.();
    },
    () => {}
  );
  // Safety net: if the page isn't painting (background tab), still end in the right state.
  setTimeout(() => {
    if (anim.playState === "running") anim.finish();
  }, ms + 150);
}

function close(details: HTMLDetailsElement) {
  const body = bodyOf(details);
  setState(details, "closed");
  if (!body || reducedMotion()) {
    details.open = false;
    return;
  }
  const from = body.getBoundingClientRect().height;
  animate(body, from, 0, CLOSE_MS, () => {
    details.open = false;
  });
}

function open(details: HTMLDetailsElement) {
  const body = bodyOf(details);
  // Height mid-way through a closing animation (so a quick re-click reverses smoothly).
  const from = details.open && body ? body.getBoundingClientRect().height : 0;
  details.open = true;
  setState(details, "open");
  if (!body || reducedMotion()) return;
  animate(body, from, body.scrollHeight, OPEN_MS);
}

export function AccordionItem({
  title,
  group,
  defaultOpen,
  className,
  summaryClassName,
  icon,
  children,
}: {
  title: ReactNode;
  /** Items sharing a group: only one open at a time. */
  group?: string;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  /** Indicator shown at the right; style it with `group-data-[state=open]:` classes. */
  icon: ReactNode;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault(); // we toggle (and animate) ourselves; also covers Enter / Space
    const details = e.currentTarget.parentElement as HTMLDetailsElement;
    if (details.dataset.state === "open") {
      close(details);
      return;
    }
    if (group) {
      document
        .querySelectorAll<HTMLDetailsElement>(`details[data-acc-group="${group}"][data-state="open"]`)
        .forEach((d) => d !== details && close(d));
    }
    open(details);
  };

  // Browser-initiated toggles (e.g. find-in-page) keep the icon in sync.
  const onToggle = (e: SyntheticEvent<HTMLDetailsElement>) => {
    const d = e.currentTarget;
    if (d.open && d.dataset.state !== "open") setState(d, "open");
  };

  return (
    <details
      open={defaultOpen}
      data-state={defaultOpen ? "open" : "closed"}
      data-acc-group={group}
      onToggle={onToggle}
      className={`group ${className ?? ""}`}
    >
      <summary
        onClick={onClick}
        aria-expanded={Boolean(defaultOpen)}
        className={`flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden ${summaryClassName ?? ""}`}
      >
        {title}
        {icon}
      </summary>
      <div data-acc-body className="overflow-hidden">
        {children}
      </div>
    </details>
  );
}
