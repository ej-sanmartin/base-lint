import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

let parseImplementation = parse;

export function __setParseImplementationForTesting(
  implementation: typeof parse | null,
): void {
  parseImplementation = implementation ?? parse;
}

export function parseJavaScript(code: string, filePath: string): TSESTree.Program | null {
  try {
    return parseImplementation(code, {
      loc: true,
      range: true,
      jsx: filePath.endsWith('x'),
      comment: false,
      errorOnUnknownASTType: false,
      useJSXTextNode: true,
      warnOnUnsupportedTypeScriptVersion: false,
      loggerFn: () => {},
    });
  } catch (error) {
    return null;
  }
}

export type NodeVisitor = (node: TSESTree.Node, parent: TSESTree.Node | null) => void;

export function traverse(node: TSESTree.Node, visitor: NodeVisitor, parent: TSESTree.Node | null = null): void {
  visitor(node, parent);
  for (const key of Object.keys(node) as (keyof typeof node)[]) {
    const value = node[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          traverse(child as TSESTree.Node, visitor, node);
        }
      }
    } else if (typeof value === 'object' && 'type' in (value as TSESTree.Node)) {
      traverse(value as TSESTree.Node, visitor, node);
    }
  }
}
