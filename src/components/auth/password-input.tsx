"use client";

import { useState } from "react";

/** Show / hide control for password fields: a small accent pill with an eye that
 *  fills in when the password is revealed. */
export function RevealToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={shown}
      aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
      className={`group/reveal mr-2 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[0.6rem] font-bold uppercase leading-none tracking-[0.16em] transition-[color,background-color,border-color,box-shadow] duration-300 ${
        shown
          ? "border-accent bg-gradient-to-r from-accent-soft via-accent to-accent-strong text-brand shadow-[0_6px_16px_-8px_rgba(232,190,26,0.9)]"
          : "border-accent/45 bg-transparent text-accent-strong hover:border-accent hover:bg-accent/10"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 transition-transform duration-500 ${shown ? "rotate-[360deg] scale-110" : "group-hover/reveal:scale-110"}`}
      >
        <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" fill={shown ? "currentColor" : "none"} fillOpacity={shown ? 0.16 : 0} />
        <circle cx="12" cy="12" r="2.7" />
        {shown && <path d="M4 4l16 16" strokeWidth="1.4" />}
      </svg>
      {/* Both words share one grid cell, so the pill is always as wide as the
          longer one and never jumps; the trailing letter-spacing is trimmed so
          the word sits optically centred. */}
      <span className="-mr-[0.16em] grid">
        <span className={`col-start-1 row-start-1 ${shown ? "invisible" : ""}`}>Ver</span>
        <span className={`col-start-1 row-start-1 ${shown ? "" : "invisible"}`}>Ocultar</span>
      </span>
    </button>
  );
}

// Password field with the show / hide toggle (used by the admin sign-in).
export function PasswordInput({
  name,
  autoComplete,
  required = false,
  minLength,
  className = "",
}: {
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${className} pr-24`}
      />
      <span className="absolute right-0 top-1/2 -translate-y-1/2">
        <RevealToggle shown={show} onToggle={() => setShow((s) => !s)} />
      </span>
    </div>
  );
}
