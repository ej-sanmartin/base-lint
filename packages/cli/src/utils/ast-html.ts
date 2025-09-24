import { parse, HTMLElement } from 'node-html-parser';

export interface InlineAsset {
  type: 'script' | 'style';
  content: string;
  line: number;
}

export function extractInlineAssets(html: string): InlineAsset[] {
  const root = parse(html, {
    script: true,
    style: true,
    comment: false,
  });
  const assets: InlineAsset[] = [];
  const nodes = root.querySelectorAll('script, style');
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src) continue;
      const content = node.innerHTML;
      assets.push({ type: 'script', content, line: computeLine(html, getNodeStart(node)) });
    } else if (node.tagName === 'STYLE') {
      const content = node.innerHTML;
      assets.push({ type: 'style', content, line: computeLine(html, getNodeStart(node)) });
    }
  }
  return assets;
}

function computeLine(content: string, index: number): number {
  if (index <= 0) return 1;
  const prefix = content.slice(0, index);
  return prefix.split(/\r?\n/).length;
}

function getNodeStart(node: HTMLElement): number {
  if (Array.isArray((node as any).range) && (node as any).range.length > 0) {
    return (node as any).range[0] as number;
  }
  const raw = node.toString();
  const root = node.root;
  if (root) {
    const html = root.toString();
    return html.indexOf(raw);
  }
  return 0;
}
