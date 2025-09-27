import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Root, Rule, AtRule } from 'postcss';
import { traverse } from './ast-js.js';
import { walkRules } from './ast-css.js';

export interface Detection {
  featureId: string;
  featureName: string;
  line: number | null;
  column: number | null;
}

interface JsDetectionOptions {
  strict: boolean;
}

export function detectJsFeatures(ast: TSESTree.Program, options: JsDetectionOptions): Detection[] {
  const detections: Detection[] = [];
  traverse(ast, (node, parent) => {
    if (node.type === 'MemberExpression') {
      const memberDetection = detectMemberExpression(node, options);
      if (memberDetection) {
        detections.push(memberDetection);
      }
    } else if (node.type === 'NewExpression') {
      const ctorDetection = detectConstructor(node);
      if (ctorDetection) {
        detections.push(ctorDetection);
      }
    } else if (node.type === 'Identifier') {
      const idleDetection = detectGlobalIdentifier(node, parent);
      if (idleDetection) {
        detections.push(idleDetection);
      }
    }
  });
  return detections;
}

export function detectCssFeatures(root: Root): Detection[] {
  const detections: Detection[] = [];
  walkRules(root, (node: Rule | AtRule) => {
    if (node.type === 'rule') {
      const selector = node.selector ?? '';
      if (selector.includes(':has(')) {
        detections.push(createDetection('has', ':has() selector', node));
      }
      if (selector.includes(':where(')) {
        detections.push(createDetection('where', ':where() selector', node));
      }
    }
    if (node.type === 'atrule') {
      if (node.name === 'container') {
        detections.push(createDetection('container-queries', '@container queries', node));
      }
    }
  });
  return detections;
}

function detectMemberExpression(node: TSESTree.MemberExpression, options: JsDetectionOptions): Detection | null {
  if (!options.strict && node.computed) {
    return null;
  }
  const objectName = getIdentifierName(node.object);
  const propertyName = node.property && node.property.type === 'Identifier' ? node.property.name : null;
  if (!objectName || !propertyName) {
    return null;
  }
  const mapping: Record<string, Detection | undefined> = {
    'navigator.share': {
      featureId: 'share',
      featureName: 'Web Share API',
      line: node.property.loc?.start.line ?? node.loc?.start.line ?? null,
      column: (node.property.loc?.start.column ?? node.loc?.start.column ?? 0) + 1,
    },
    'navigator.usb': {
      featureId: 'webusb',
      featureName: 'WebUSB API',
      line: node.property.loc?.start.line ?? node.loc?.start.line ?? null,
      column: (node.property.loc?.start.column ?? node.loc?.start.column ?? 0) + 1,
    },
    'Notification.requestPermission': {
      featureId: 'notifications',
      featureName: 'Notifications API',
      line: node.property.loc?.start.line ?? node.loc?.start.line ?? null,
      column: (node.property.loc?.start.column ?? node.loc?.start.column ?? 0) + 1,
    },
  };
  return mapping[`${objectName}.${propertyName}`] ?? null;
}

function detectConstructor(node: TSESTree.NewExpression): Detection | null {
  if (node.callee.type === 'Identifier') {
    const name = node.callee.name;
    if (name === 'Notification') {
      return {
        featureId: 'notifications',
        featureName: 'Notifications API',
        line: node.callee.loc?.start.line ?? node.loc?.start.line ?? null,
        column: (node.callee.loc?.start.column ?? node.loc?.start.column ?? 0) + 1,
      };
    }
    if (name === 'BroadcastChannel') {
      return {
        featureId: 'broadcast-channel',
        featureName: 'BroadcastChannel API',
        line: node.callee.loc?.start.line ?? node.loc?.start.line ?? null,
        column: (node.callee.loc?.start.column ?? node.loc?.start.column ?? 0) + 1,
      };
    }
    if (name === 'IdleDetector') {
      return {
        featureId: 'idle-detection',
        featureName: 'Idle Detection API',
        line: node.callee.loc?.start.line ?? node.loc?.start.line ?? null,
        column: (node.callee.loc?.start.column ?? node.loc?.start.column ?? 0) + 1,
      };
    }
  }
  return null;
}

function detectGlobalIdentifier(node: TSESTree.Identifier, parent: TSESTree.Node | null): Detection | null {
  if (node.name === 'IdleDetector') {
    if (parent && parent.type === 'NewExpression' && parent.callee === node) {
      return null;
    }
    return {
      featureId: 'idle-detection',
      featureName: 'Idle Detection API',
      line: node.loc?.start.line ?? null,
      column: (node.loc?.start.column ?? 0) + 1,
    };
  }
  return null;
}

function createDetection(featureId: string, featureName: string, node: Rule | AtRule): Detection {
  const position = node.source?.start;
  return {
    featureId,
    featureName,
    line: position?.line ?? null,
    column: position ? position.column + 1 : null,
  };
}

function getIdentifierName(node: TSESTree.LeftHandSideExpression): string | null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  /* c8 ignore next 3 */
  if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
    return getIdentifierName(node.expression as TSESTree.LeftHandSideExpression);
  }
  /* c8 ignore next 3 */
  if (node.type === 'TSNonNullExpression') {
    return getIdentifierName(node.expression as TSESTree.LeftHandSideExpression);
  }
  /* c8 ignore next 3 */
  if (node.type === 'ChainExpression') {
    return getIdentifierName(node.expression as TSESTree.LeftHandSideExpression);
  }
  if (node.type === 'MemberExpression') {
    if (node.property.type === 'Identifier' && !node.computed) {
      const objectName = getIdentifierName(node.object);
      if (objectName) {
        return `${objectName}.${node.property.name}`;
      }
    }
  }
  return null;
}
