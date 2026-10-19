import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const design = readFileSync('DESIGN.md', 'utf8');
const css = readFileSync('frontend/src/styles.css', 'utf8');
const normalize = (color) =>
  color.length === 4 ? '#' + [...color.slice(1)].map((c) => c + c).join('') : color.toLowerCase();
const tokens = [...design.matchAll(/^  ([a-z]+): '(#[0-9A-Fa-f]{6})'/gm)];
for (const [, name, color] of tokens) {
  const runtime = css.match(new RegExp(`--${name}:\\s*(#[a-f0-9]+);`, 'i'));
  assert(runtime, `Missing token: ${name}`);
  assert.equal(normalize(runtime[1]), normalize(color), `Token drift: ${name}`);
}
assert(tokens.length >= 8);
console.log(`${tokens.length} documented color tokens match runtime CSS.`);
