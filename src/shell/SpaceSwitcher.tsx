import { BookOpen, PenLine } from "lucide-react";
import type { InklystSpace } from "./space";
import { useSpace } from "./SpaceContext";

export function SpaceSwitcher({
  compact = false,
  variant = "pill",
}: {
  compact?: boolean;
  /** pill = horizontal (Reader topnav / profile). dock = vertical icons for Studio rail. */
  variant?: "pill" | "dock";
}) {
  const { space, setSpace } = useSpace();

  if (variant === "dock") {
    return (
      <div className="space-switch-dock" role="group" aria-label="Espaço Inklyst">
        <button
          type="button"
          className={space === "reader" ? "dock-btn on" : "dock-btn"}
          aria-pressed={space === "reader"}
          aria-label="Reader"
          title="Reader"
          onClick={() => setSpace("reader", { persist: true })}
        >
          <span className="dock-ico">
            <BookOpen size={18} />
          </span>
          Reader
        </button>
        <button
          type="button"
          className={space === "studio" ? "dock-btn on" : "dock-btn"}
          aria-pressed={space === "studio"}
          aria-label="Studio"
          title="Studio"
          onClick={() => setSpace("studio", { persist: true })}
        >
          <span className="dock-ico">
            <PenLine size={18} />
          </span>
          Studio
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-switch compact" : "space-switch"} role="group" aria-label="Espaço Inklyst">
      <button
        type="button"
        className={space === "reader" ? "space-switch-btn on" : "space-switch-btn"}
        aria-pressed={space === "reader"}
        onClick={() => setSpace("reader", { persist: true })}
      >
        Reader
      </button>
      <button
        type="button"
        className={space === "studio" ? "space-switch-btn on" : "space-switch-btn"}
        aria-pressed={space === "studio"}
        onClick={() => setSpace("studio", { persist: true })}
      >
        Studio
      </button>
    </div>
  );
}

export function spaceLabel(space: InklystSpace) {
  return space === "reader" ? "Reader" : "Studio";
}
