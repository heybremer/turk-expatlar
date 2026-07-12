"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/**
 * Mobilde filtre kalabalığını daraltılabilir bir panel arkasına alır;
 * md ve üzeri ekranlarda içerik her zaman görünür.
 */
export function MobileFilterToggle({
  children,
  activeCount = 0,
  label = "Filtreler",
}: {
  children: React.ReactNode;
  activeCount?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[40px] items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-primary hover:text-primary md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {label}
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`${open ? "mt-3 block" : "hidden"} md:mt-0 md:block`}>{children}</div>
    </div>
  );
}
