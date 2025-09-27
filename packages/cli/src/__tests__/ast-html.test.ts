import test from 'node:test';
import assert from 'node:assert/strict';

import { extractInlineAssets } from '../utils/ast-html.js';

test('extractInlineAssets collects inline scripts and styles', () => {
  const html = "<script>console.log('inline');</script>\n<style>.box { color: red; }</style>";

  const assets = extractInlineAssets(html);
  assert.equal(assets.length, 2);

  const [script, style] = assets;
  assert.equal(script.type, 'script');
  assert.equal(script.content, "console.log('inline');");
  assert.equal(script.line, 1);

  assert.equal(style.type, 'style');
  assert.equal(style.content, '.box { color: red; }');
  assert.ok(style.line >= script.line);
});

test('extractInlineAssets ignores external scripts', () => {
  const html = `
    <script src="bundle.js"></script>
    <script>console.log('kept');</script>
  `;

  const assets = extractInlineAssets(html);
  assert.equal(assets.length, 1);
  assert.equal(assets[0]?.content, "console.log('kept');");
});
