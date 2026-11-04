import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const presentation = read('demo-presentation.js');
const html = read('index.html');
const css = read('definitivo.css');

function stub(id) {
  return { id, attrs: {}, children: [], hidden: false, setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] ?? null; }, append(c) { this.children.push(c); }, remove() {},
    addEventListener() {}, querySelector() { return null; }, set innerHTML(v) { this.html = v; } };
}

function loadPresentation(search) {
  const byId = {}; const listeners = {}; const opened = []; let fullscreenCalls = 0;
  for (const id of ['startDemo', 'calendarLink', 'pv-OFFICE', 'pv-STUDENT']) byId[id] = stub(id);
  const classes = new Set();
  const doc = { title: '', getElementById: id => byId[id] || null, addEventListener: (t, f) => { listeners[t] = f; },
    createElement: () => { const n = stub(''); Object.defineProperty(n, 'innerHTML', { set(v) { n.html = v; byId.presentationCalendar = stub('presentationCalendar'); byId.presentationFullscreen = stub('presentationFullscreen'); } }); return n; },
    querySelector: s => (s === '.exit' ? {} : null),
    documentElement: { requestFullscreen() { fullscreenCalls++; return Promise.resolve(); } } };
  doc.body = stub('body'); doc.body.classList = { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) };
  const win = { setView() {}, setTab() {}, toast() {}, open(href, name, features) { const w = { opener: 'x' }; opened.push({ href, name, features, w }); return w; } };
  vm.runInNewContext(presentation, { window: win, document: doc, location: { href: 'https://x.test/index.html' + search }, URL, history: { replaceState() {} } });
  listeners.DOMContentLoaded();
  return { byId, opened, classes, fullscreen: () => fullscreenCalls };
}

test('Apri Casey opens view=casey in its own window, preserving demo/libero, without fullscreen', () => {
  const { byId, opened, classes, fullscreen } = loadPresentation('?demo=1&libero=1&secret=x');
  let prevented = false;
  byId.startDemo.onclick({ preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(opened.length, 1);
  const u = new URL(opened[0].href);
  assert.equal(u.pathname, '/index.html');
  assert.equal(u.searchParams.get('view'), 'casey');
  assert.equal(u.searchParams.get('demo'), '1');
  assert.equal(u.searchParams.get('libero'), '1');
  assert.equal(u.searchParams.get('secret'), null);
  assert.equal(opened[0].name, 'casey-totem');
  assert.equal(opened[0].w.opener, null);
  assert.equal(fullscreen(), 0);
  assert.ok(!classes.has('show'), 'current page stays in overview');
});

test('calendar links preserve demo params; Schermo intero still requests fullscreen', async () => {
  const { byId, opened, fullscreen } = loadPresentation('?demo=1');
  assert.equal(new URL(byId.calendarLink.href).searchParams.get('demo'), '1');
  byId.calendarLink.onclick({ preventDefault() {} });
  assert.equal(opened[0].name, 'casey-calendar');
  assert.equal(new URL(opened[0].href).searchParams.get('view'), 'calendar');
  assert.equal(new URL(opened[0].href).searchParams.get('demo'), '1');
  byId.presentationFullscreen.onclick();
  await new Promise(r => setImmediate(r));
  assert.equal(fullscreen(), 1);
});

// Runs the real renderTabs/setView/setTab from index.html with a minimal DOM.
function loadDashboard() {
  const pick = name => { const i = html.indexOf('function ' + name + '('); let d = 0, j = html.indexOf('{', i);
    for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) break; } return html.slice(i, j + 1); };
  const nodes = {}; const get = id => (nodes[id] ||= { innerHTML: '', classList: { on: false, toggle(c, v) { this.on = v; } } });
  const ctx = { document: { getElementById: get }, window: {}, queue: [], D: { personTab: 'La mia pratica', officeMail: 'office@x' }, tabCalls: [] };
  vm.runInNewContext('var VIEW="OFFICE",TAB="CAL";' + pick('esc') + pick('renderTabs') +
    'function renderAll(){renderTabs();}function setTab(t){tabCalls.push(t);TAB=t;renderAll();}' +
    'function setView(v){VIEW=v;renderAll();}this.api={setView,setTab,renderTabs,get TAB(){return TAB}};', ctx);
  const labels = () => [...get('tabs').innerHTML.matchAll(/data-command="setTab\('(\w+)'\)">([^<]+)/g)].map(m => [m[1], m[2]]);
  return { api: ctx.api, labels, ctx, get };
}

test('calendar mode shows the tab bar: office tabs, student tabs after switching, tab click calls setTab', () => {
  assert.match(css, /body\.calendar-only \.panel>\.tabs\{display:flex/);
  assert.match(html, /definitivo\.css\?v=20261104-fullpanel/);
  const { api, labels, ctx, get } = loadDashboard();
  api.renderTabs();
  assert.deepEqual(labels().map(t => t[0]), ['CAL', 'MAIL', 'QUEUE', 'ROUTE', 'FEED']);
  assert.equal(get('v-CAL').classList.on, true);
  api.setView('STUDENT'); api.setTab('CAL');
  assert.deepEqual(labels(), [['CHECK', 'La mia pratica'], ['CAL', 'Il mio calendario'], ['MAIL', 'Le mie email']]);
  // Delegated click on a rendered tab button dispatches setTab through dashboard-events.js.
  let click;
  const doc = { addEventListener: (t, f) => { if (t === 'click') click = f; }, getElementById: () => null };
  const sandbox = { document: doc, setTab: t => api.setTab(t), queue: [] };
  vm.runInNewContext(read('dashboard-events.js'), sandbox);
  ctx.tabCalls.length = 0;
  click({ target: { closest: () => ({ dataset: { command: "setTab('MAIL')" } }) } });
  assert.deepEqual(ctx.tabCalls, ['MAIL']);
  assert.equal(get('v-MAIL').classList.on, true);
});
