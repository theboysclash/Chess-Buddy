import type { SiteInfo } from "../../shared/types";

interface SiteStatusProps {
  site: SiteInfo | null;
}

export function SiteStatus({ site }: SiteStatusProps) {
  const supported = site?.supported ?? false;
  const board = site?.boardDetected ?? false;
  const name = site?.name ?? "No page";
  const status = !site
    ? "Unknown"
    : supported
      ? board
        ? "Ready"
        : "No board"
      : "Unsupported";

  return (
    <div className="site-footer">
      <span>{name}</span>
      <span>
        {status}
        {supported && board ? " · Board detected" : ""}
      </span>
    </div>
  );
}
