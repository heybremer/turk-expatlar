import { Fragment, ReactNode } from "react";
import { Linking, Text } from "react-native";

/** Basit markdown: kalın, italik, link, alıntı, satır sonu (web'deki forum-markdown.tsx ile aynı mantık) */
export function renderForumBody(body: string, textClassName = "text-sm text-text leading-5"): ReactNode {
  const lines = body.split("\n");
  return (
    <Text className={textClassName}>
      {lines.map((line, i) => {
        const isQuote = line.startsWith("> ");
        const content = isQuote ? line.slice(2) : line;
        return (
          <Fragment key={i}>
            {i > 0 && <Text>{"\n"}</Text>}
            {isQuote ? (
              <Text className="italic text-muted">{inlineFormat(content)}</Text>
            ) : (
              inlineFormat(content)
            )}
          </Fragment>
        );
      })}
    </Text>
  );
}

function inlineFormat(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
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
      const url = match[1];
      parts.push(
        <Text key={key++} className="text-primary underline" onPress={() => Linking.openURL(url).catch(() => {})}>
          {url.length > 48 ? url.slice(0, 45) + "…" : url}
        </Text>,
      );
    } else if (match[3]) {
      parts.push(
        <Text key={key++} className="font-bold">
          {match[3]}
        </Text>,
      );
    } else if (match[5]) {
      parts.push(
        <Text key={key++} className="italic">
          {match[5]}
        </Text>,
      );
    } else if (match[6]) {
      parts.push(
        <Text key={key++} className="font-medium text-primary">
          {match[6]}
        </Text>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

export function extractFirstUrl(body: string): string | null {
  const m = body.match(/https?:\/\/[^\s<]+[^<.,:;"')\]\s]/);
  return m?.[0] ?? null;
}
