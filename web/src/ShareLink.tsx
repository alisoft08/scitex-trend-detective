// AI-assisted: Codex (OpenAI). Share the exact case or comparison.
import { useState } from "react";
import { useLocale } from "./i18n";

export function ShareLink({ href, label }: { href: string; label: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState("");
  const [showLink, setShowLink] = useState(false);
  const url = new URL(href, location.href).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
    } catch {
      setShowLink(true);
    }
  }

  return <div className="share-control">
    <button className="btn research-secondary" onClick={() => void copy()}>{copied === url ? t("Link copied", "Enlace copiado") : label}</button>
    {showLink && <input aria-label={t("Shareable link", "Enlace para compartir")} readOnly value={url} onFocus={(e) => e.target.select()} />}
    <span className="sr-only" role="status">{copied === url ? t("Link copied to clipboard", "Enlace copiado al portapapeles") : ""}</span>
  </div>;
}
