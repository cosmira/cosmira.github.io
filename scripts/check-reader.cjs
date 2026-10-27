const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '../assets/rule-reader.js'), 'utf8');
const start = source.indexOf("  document.querySelector('.skip').addEventListener");
const end = source.indexOf("  element('share').addEventListener", start);
assert(start >= 0 && end > start, 'Skip handler exists');

for (const reading of [false, true]) {
  let handler;
  let focused;
  let prevented = false;
  let scrolled = false;
  const search = {tabIndex: 0, focus() { focused = 'search'; }};
  const panel = {tabIndex: 0, focus() { focused = 'panel'; }};
  vm.runInNewContext(source.slice(start, end), {
    document: {
      body: {classList: {contains: () => reading}},
      querySelector: () => ({addEventListener: (_, callback) => { handler = callback; }}),
    },
    element: () => search,
    panel,
    window: {scrollTo: () => { scrolled = true; }},
  });
  handler({preventDefault: () => { prevented = true; }});
  assert(prevented, 'Skip link does not change the rule route');
  assert.equal(focused, reading ? 'panel' : 'search');
  assert.equal(search.tabIndex, 0, 'Search stays in sequential keyboard navigation');
  assert.equal(panel.tabIndex, reading ? -1 : 0, 'Reading panel can receive focus');
  assert.equal(scrolled, reading, 'Reading panel scrolls to its start');
}
const page = fs.readFileSync(path.join(__dirname, '../rules.html'), 'utf8');
const ruleIndex = JSON.parse(page.match(/id="rule-index">(.*?)<\/script>/s)[1]);
const summaryStart = source.indexOf('    const first = content.firstElementChild;');
const summaryEnd = source.indexOf('    const policy = content.firstElementChild;', summaryStart);
assert(summaryStart >= 0 && summaryEnd > summaryStart, 'Summary renderer exists');
for (const id of ['no_unused_private_state', 'useless_variable', 'max_dependencies']) {
  const upstream = 'The upstream rule summary.';
  const paragraph = {
    tagName: 'P', firstChild: {nodeType: 3, textContent: upstream},
    childNodes: [upstream], remove() {},
  };
  const summary = {hidden: true, replaceChildren(...children) { this.textContent = children.join(''); }};
  vm.runInNewContext(source.slice(summaryStart, summaryEnd), {
    content: {firstElementChild: paragraph}, Node: {TEXT_NODE: 3},
    element: () => summary, ruleIndex, id,
  });
  assert.equal(summary.textContent, ruleIndex[id].summary || upstream, 'Reader uses the catalog editorial summary when present');
  assert.equal(summary.hidden, false);
}
console.log('PASS skip-link keyboard navigation and corrected rule summaries');
