import { type ReactNode } from "react";
import Link from "next/link";

/** Basit markdown: kalın, italik, link, alıntı, satır sonu */
export function renderForumBody(body: string) {
  const lines = body.split("\n");
  const elements: ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="my-1 border-l-2 border-primary/40 pl-3 text-muted italic"
        >
          {inlineFormat(line.slice(2))}
        </blockquote>,
      );
      return;
    }
    if (line.trim() === "") {
      elements.push(<br key={i} />);
      return;
    }
    elements.push(
      <p key={i} className={i > 0 ? "mt-1" : ""}>
        {inlineFormat(line)}
      </p>,
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // URL, **bold**, *italic*, @mention
  const regex =
    /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(@[\p{L}\p{N}_.-]+(?:\s[\p{L}\p{N}_.-]+)*)/gu;

  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      parts.push(
        <a
          key={key++}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary underline hover:no-underline"
        >
          {match[1].length > 48 ? match[1].slice(0, 45) + "…" : match[1]}
        </a>,
      );
    } else if (match[3]) {
      parts.push(<strong key={key++}>{match[3]}</strong>);
    } else if (match[5]) {
      parts.push(<em key={key++}>{match[5]}</em>);
    } else if (match[6]) {
      const name = match[6].slice(1);
      parts.push(
        <span key={key++} className="font-medium text-primary">
          @{name}
        </span>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

export function LinkPreview({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-primary hover:border-primary"
    >
      <span className="truncate">{url}</span>
    </a>
  );
}

export function extractFirstUrl(body: string): string | null {
  const m = body.match(/https?:\/\/[^\s<]+[^<.,:;"')\]\s]/);
  return m?.[0] ?? null;
}
