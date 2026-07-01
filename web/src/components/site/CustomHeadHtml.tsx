"use client";

import { useEffect } from "react";

export function CustomHeadHtml({ html }: { html: string | null }) {
  useEffect(() => {
    if (!html?.trim()) return;

    const template = document.createElement("template");
    template.innerHTML = html;
    const nodes = Array.from(template.content.childNodes);
    nodes.forEach((node) => document.head.appendChild(node));

    return () => {
      nodes.forEach((node) => node.remove());
    };
  }, [html]);

  return null;
}
