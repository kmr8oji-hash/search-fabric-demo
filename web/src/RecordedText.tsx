import { Fragment, type ReactNode } from "react";
import { SourceLink } from "./Results";

// Small, inert formatting subset for saved snippets. Never renders HTML or embeds.
function inline(text: string): ReactNode[] {
  return text.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    const link = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    return link ? <SourceLink key={index} url={link[2]}>{link[1]}</SourceLink> : <Fragment key={index}>{part}</Fragment>;
  });
}
export function RecordedText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  return <div className="cr-recorded">{blocks.map((block, i) => {
    const lines = block.split("\n");
    if (lines.every(line => /^[-*] /.test(line))) return <ul key={i}>{lines.map((line, n) => <li key={n}>{inline(line.slice(2))}</li>)}</ul>;
    if (lines.every(line => /^\d+\. /.test(line))) return <ol key={i}>{lines.map((line, n) => <li key={n}>{inline(line.replace(/^\d+\. /, ""))}</li>)}</ol>;
    if (lines.every(line => /^> ?/.test(line))) return <blockquote key={i}>{inline(lines.map(line => line.replace(/^> ?/, "")).join("\n"))}</blockquote>;
    if (lines.length === 1 && /^#{1,3} /.test(block)) return <h4 key={i}>{inline(block.replace(/^#{1,3} /, ""))}</h4>;
    if (lines.length > 2 && /^\|.*\|$/.test(lines[0]) && /^\|[\s:|\-]+\|$/.test(lines[1]) && lines.slice(2).every(line => /^\|.*\|$/.test(line))) {
      const cells = (line: string) => line.slice(1, -1).split("|").map(cell => cell.trim());
      return <table key={i}><thead><tr>{cells(lines[0]).map((cell, n) => <th key={n}>{inline(cell)}</th>)}</tr></thead><tbody>{lines.slice(2).map((line, row) => <tr key={row}>{cells(line).map((cell, n) => <td key={n}>{inline(cell)}</td>)}</tr>)}</tbody></table>;
    }
    return <p key={i}>{inline(block)}</p>;
  })}</div>;
}
