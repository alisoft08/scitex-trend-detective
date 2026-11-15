// AI-assisted: Codex (OpenAI). Share the exact case or comparison.
import { useState } from "react";

export function ShareLink({ href }: { href: string }) {
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
    <button className="btn research-secondary" onClick={() => void copy()}>{copied === url ? "Link copied" : "Copy link"}</button>
    {showLink && <input aria-label="Shareable link" readOnly value={url} onFocus={(e) => e.target.select()} />}
    <span className="sr-only" role="status">{copied === url ? "Link copied to clipboard" : ""}</span>
  </div>;
}
