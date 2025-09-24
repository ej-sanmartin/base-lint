import postcss, { Root, Rule, AtRule } from 'postcss';

export function parseCSS(code: string, filePath: string): Root | null {
  try {
    return postcss.parse(code, { from: filePath });
  } catch (error) {
    return null;
  }
}

export function walkRules(root: Root, visitor: (node: Rule | AtRule) => void): void {
  root.walk((node) => {
    if (node.type === 'rule' || node.type === 'atrule') {
      visitor(node);
    }
  });
}
