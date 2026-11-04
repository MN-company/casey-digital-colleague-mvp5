import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../demo-presentation.js', import.meta.url), 'utf8');

function el(id, doc) {
  const e = { id, attrs: {}, children: [], listeners: {}, hidden: false, tabIndex: 0, className: '', parent: null,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; },
    append(c) { c.parent = this; this.children.push(c); doc.reg(c); },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); doc.unreg(this); },
    addEventListener(t, f) { this.listeners[t] = f; }, focus() { doc.focused = this; },
    querySelector(sel) { return doc.byId[sel.slice(1)]; },
    set innerHTML(html) {
      for (const [, id, sel, label] of html.matchAll(/id="([^"]+)" role="tab" aria-selected="(\w+)">([^<]+)</g)) {
        const b = el(id, doc); b.attrs.role = 'tab'; b.attrs['aria-selected'] = sel; b.textContent = label; this.append(b);
      }
    },
  };
  return e;
}

function load(search) {
  const listeners = {};
  const doc = { byId: {}, focused: null, title: '',
    reg(c) { if (c.id) this.byId[c.id] = c; c.children.forEach(x => this.reg(x)); },
    unreg(c) { if (this.byId[c.id] === c) delete this.byId[c.id]; c.children.forEach(x => this.unreg(x)); },
    getElementById(id) { return this.byId[id] || null; },
    createElement() { return el('', doc); },
    addEventListener(t, f) { listeners[t] = f; },
    querySelector(sel) { return sel === '.top .in' ? topIn : sel === '.exit' ? {} : null; },
  };
  const classes = new Set();
  doc.body = el('body', doc); doc.body.classList = { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) };
  doc.documentElement = {};
  const topIn = el('top-in', doc);
  for (const id of ['startDemo', 'calendarLink', 'presentationCalendar', 'presentationFullscreen', 'pv-OFFICE', 'pv-STUDENT']) doc.reg(el(id, doc));
  doc.byId['pv-OFFICE'].attrs['aria-selected'] = 'true';
  const calls = [];
  const win = {
    setView(v) { calls.push(['view', v]); doc.byId['pv-OFFICE'].setAttribute('aria-selected', v === 'OFFICE'); doc.byId['pv-STUDENT'].setAttribute('aria-selected', v === 'STUDENT'); },
    setTab(t) { calls.push(['tab', t]); }, toast() {},
  };
  const href = 'https://x.test/index.html' + search;
  const ctx = { window: win, document: doc, location: { href }, URL, history: { replaceState() {} } };
  vm.runInNewContext(source, ctx);
  listeners.DOMContentLoaded();
  return { doc, calls, classes, win };
}

for (const search of ['?view=calendar', '?vista=lim']) {
  test(`calendar mode ${search} renders accessible office/student switch`, () => {
    const { doc, calls, classes } = load(search);
    assert.ok(classes.has('calendar-only'));
    const box = doc.getElementById('calendarViewSwitch');
    assert.ok(box);
    assert.equal(box.getAttribute('role'), 'tablist');
    assert.match(box.className, /\bseg\b/);
    assert.equal(doc.getElementById('calview-OFFICE').getAttribute('aria-selected'), 'true');
    calls.length = 0;
    doc.getElementById('calview-STUDENT').onclick();
    assert.deepEqual(calls, [['view', 'STUDENT'], ['tab', 'CAL']]);
    assert.equal(doc.getElementById('calview-STUDENT').getAttribute('aria-selected'), 'true');
    assert.equal(doc.getElementById('calview-OFFICE').getAttribute('aria-selected'), 'false');
    box.listeners.keydown({ key: 'ArrowLeft', preventDefault() {} });
    assert.equal(doc.getElementById('calview-OFFICE').getAttribute('aria-selected'), 'true');
    assert.equal(doc.focused, doc.getElementById('calview-OFFICE'));
  });
}

test('switch is not rendered outside calendar mode and is removed on leaving it', () => {
  assert.equal(load('').doc.getElementById('calendarViewSwitch'), null);
  assert.equal(load('?view=casey').doc.getElementById('calendarViewSwitch'), null);
  const { doc, win } = load('?view=calendar');
  assert.ok(doc.getElementById('calendarViewSwitch'));
  win.__caseyPresentation.applyMode('overview');
  assert.equal(doc.getElementById('calendarViewSwitch'), null);
});
