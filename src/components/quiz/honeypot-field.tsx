"use client";

import { forwardRef } from "react";

/**
 * Uncontrolled trap field — must not use a label/name that triggers autofill
 * (e.g. "company website"). Password managers fill those and cause false 400s.
 */
export const HoneypotField = forwardRef<HTMLInputElement>(
  function HoneypotField(_props, ref) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <input
          ref={ref}
          type="text"
          name="hp_trap"
          id="hp_trap"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
          readOnly
          onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
          data-protonpass-ignore
        />
      </div>
    );
  }
);
