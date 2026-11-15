// AI-assisted: Claude (Anthropic). LaTeX math rendered by KaTeX as native MathML (no web fonts needed).
import katex from "katex";
import { useMemo } from "react";

export function Tex({ children, block = false, label }: { children: string; block?: boolean; label?: string }) {
  const html = useMemo(
    () => katex.renderToString(children, { output: "mathml", displayMode: block, throwOnError: false, strict: "ignore" }),
    [children, block],
  );
  const Tag = block ? "div" : "span";
  return <Tag className={block ? "tex tex-block" : "tex"} aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />;
}
