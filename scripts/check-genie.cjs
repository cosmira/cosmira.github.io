const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/genie.js'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const groups = [...page.matchAll(/<g\b([^>]+)>/g)].map(match => ({
  classes: (match[1].match(/class="([^"]+)"/)?.[1] || '').split(' '),
  quality: match[1].match(/data-quality="([^"]+)"/)?.[1],
}));
const sheetGroups = groups.filter(group => group.classes.includes('genie-paper'));
assert.equal(sheetGroups.length, 2);
assert(sheetGroups.every(group => group.classes.includes('genie-quality') && group.quality === 'checked'), 'The animated parent owns the quality used by CSS');
assert(groups.filter(group => group.classes.includes('genie-sheet-content')).every(group => !group.quality), 'Child artwork never overrides its parent result');
assert.equal(groups.filter(group => group.quality).length, 3, 'Only the two airborne cards and the front stack page own results');

function setup(reduce = false) {
  const classes = new Set(['is-guarded']);
  const timers = new Map();
  let nextTimer = 0;
  let click;
  let change;
  let visible;
  const label = {};
  const animations = ['running', 'finished'].map(playState => ({
    playState,
    play() { this.playState = 'running'; },
    pause() { this.playState = 'paused'; },
  }));
  const papers = Array.from({length: sheetGroups.length}, () => ({
    dataset: {},
    addEventListener(event, callback) { this[event] = callback; },
  }));
  const pile = {dataset: {}};
  const media = {matches: reduce, addEventListener: (_, handler) => { change = handler; }};
  const motion = {
    hidden: true,
    addEventListener: (_, handler) => { click = handler; },
    querySelector: selector => selector === 'span' ? label : {setAttribute() {}},
  };
  const scene = {
    classList: {
      contains: name => classes.has(name), add: name => classes.add(name),
      toggle(name, force = !classes.has(name)) { force ? classes.add(name) : classes.delete(name); return force; },
    },
    querySelector: selector => selector === '.genie-motion' ? motion : selector === '.genie-pile-front' ? pile : {},
    querySelectorAll: () => papers,
    getAnimations: () => animations,
  };
  vm.runInNewContext(source, {
    document: {querySelector: () => scene}, matchMedia: () => media,
    clearInterval: id => timers.delete(id),
    setInterval: (handler, delay) => { assert.equal(delay, 8000); timers.set(++nextTimer, handler); return nextTimer; },
    IntersectionObserver: class { constructor(handler) { visible = value => handler([{isIntersecting: value}]); } observe() {} },
  });
  return {classes, timers, papers, pile, label, animations, motion,
    click: () => click(), visible: value => visible(value),
    phase: () => timers.values().next().value(),
    reduce(value) { media.matches = value; change(); },
  };
}
const state = setup();
assert.deepEqual(state.papers.map(paper => paper.dataset.quality), ['issue', 'unchecked']);
state.visible(true);
assert.equal(state.timers.size, 1);
const original = state.papers.map(paper => paper.dataset.quality);
state.phase();
assert(state.classes.has('is-guarded'));
assert.deepEqual(state.papers.map(paper => paper.dataset.quality), original, 'Fitted cuffs never recolor airborne sheets');
state.papers[0].animationiteration();
assert.equal(state.pile.dataset.quality, 'issue', 'The front page records the result that landed');
assert.equal(state.papers[0].dataset.quality, 'checked', 'A new guarded sheet contains checked code');
state.phase();
assert.equal(state.papers[0].dataset.quality, 'checked', 'A checked sheet retains its result after cuffs leave');
state.papers[0].animationiteration();
assert.equal(state.pile.dataset.quality, 'checked');
assert.equal(state.papers[0].dataset.quality, 'issue');
state.click();
assert.equal(state.label.textContent, 'Resume animation');
assert.equal(state.timers.size, 0);
assert.equal(state.animations[0].playState, 'paused', 'Pause freezes active animation and transition objects');
assert.equal(state.animations[1].playState, 'finished');
state.click();
assert.equal(state.animations[0].playState, 'running');
assert.equal(state.animations[1].playState, 'finished', 'Resume never restarts a finished transition');
assert.equal(state.timers.size, 1);
state.visible(false);
assert.equal(state.timers.size, 0);
assert.equal(state.animations[0].playState, 'paused');
state.visible(true);
state.click();
state.reduce(true);
assert(state.classes.has('is-guarded'));
assert(state.papers.every(paper => paper.dataset.quality === 'checked'));
assert.equal(state.pile.dataset.quality, 'checked');
assert.equal(state.timers.size, 0, 'Reduced motion is static even when selected while paused');
state.reduce(false);
assert.equal(state.timers.size, 0, 'The user pause survives a preference change');
const reduced = setup(true);
reduced.visible(true);
assert(reduced.classes.has('is-guarded'));
assert(reduced.papers.every(paper => paper.dataset.quality === 'checked'));
assert.equal(reduced.pile.dataset.quality, 'checked');
assert.equal(reduced.timers.size, 0);
console.log('PASS genie birth results, landed stack, phases, pause/resume, viewport and reduced motion');
