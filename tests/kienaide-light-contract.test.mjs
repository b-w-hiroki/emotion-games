import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const hero=readFileSync(new URL('../assets/kienaide-hero.svg',import.meta.url),'utf8');
test('flame-driven light has no constant alpha floor',()=>{
 assert.match(app,/\.48\*lightStrength/);
 assert.match(app,/\.13\*lightStrength/);
 assert.match(app,/\.44\*lightStrength/);
 assert.doesNotMatch(app,/\.035\+\.13\*lightStrength/);
 assert.doesNotMatch(app,/\.2\+\.44\*lightStrength/);
});
test('hero SVG does not contain baked fire reflection layer',()=>{
 assert.doesNotMatch(hero,/fire reflection on scarf/);
 assert.doesNotMatch(hero,/ellipse cx="180" cy="230" rx="57" ry="65"/);
});
