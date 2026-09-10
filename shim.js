/* Minimal DOM — jsdom proksi tərəfindən bloklandığı üçün.
   Məqsəd render funksiyalarını xətasız işlətmək və məntiqi yoxlamaq. */
const fs = require('fs');
const vm = require('vm');

function mkClassList(el) {
  const s = new Set();
  return {
    add: (...c) => c.forEach(x => s.add(x)),
    remove: (...c) => c.forEach(x => s.delete(x)),
    toggle: (c, f) => { const on = f === undefined ? !s.has(c) : !!f; on ? s.add(c) : s.delete(c); return on; },
    contains: c => s.has(c),
    _set: s
  };
}
function mkEl(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(), _html: '', textContent: '', value: '', dataset: {}, style: {},
    children: [], files: null, href: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild(c) { this.children.push(c); return c; }, remove() {}, click() {},
    addEventListener() {}, focus() {}, scrollIntoView() {}
  };
  el.classList = mkClassList(el);
  return el;
}

function boot(path) {
  const html = fs.readFileSync(path, 'utf8');
  const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

  const byId = {};
  const get = id => (byId[id] = byId[id] || mkEl());
  const tabs = ['today', 'train', 'fuel', 'prog'].map(t => { const b = mkEl('button'); b.dataset.tab = t; return b; });
  tabs[0].classList.add('on');
  const checks = {};                                   // data-set → element

  const document = {
    querySelector(sel) {
      if (sel === '.tabbar button.on') return tabs.find(b => b.classList.contains('on')) || tabs[0];
      const m = /^\.check\[data-set="(.+)"\]$/.exec(sel);
      if (m) return checks[m[1]] || null;
      if (sel.startsWith('#')) return get(sel.slice(1));
      return mkEl();
    },
    querySelectorAll(sel) {
      if (sel === '.tabbar button') return tabs;
      return [];
    },
    getElementById(id) { return byId[id] || null; },
    createElement: mkEl,
    addEventListener() {},
    body: mkEl()
  };

  const store = {};
  const win = {
    document,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    navigator: { onLine: true, vibrate: () => {}, wakeLock: null, serviceWorker: null },
    location: { href: 'https://example.com/gym/' },
    addEventListener() {},
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
    scrollTo() {}, requestAnimationFrame: fn => fn(),
    Blob: function (parts) { this.parts = parts; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: function () { this.readAsText = () => {}; },
    AudioContext: function () {
      return {
        currentTime: 0, destination: {},
        createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: {}, type: '' }),
        createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } })
      };
    },
    alert: m => { win.__alert = m; },
    confirm: () => true,
    console,
    /* test qoşqusu: ✓ düymələrini qeyd et ki, toggleDone tam re-render etməsin */
    __registerCheck: (k, el) => { checks[k] = el; }
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(js, win, { filename: 'forge.js' });
  /* const/let top-level bağlantıları globalThis-də görünmür — canlı getter-lərlə açırıq */
  vm.runInContext(`Object.defineProperties(globalThis, {
    PROGRAM:{get:()=>PROGRAM, configurable:true},
    ALTS:{get:()=>ALTS, configurable:true},
    EXMAP:{get:()=>EXMAP, configurable:true},
    DEFAULTS:{get:()=>DEFAULTS, configurable:true},
    MEALS:{get:()=>MEALS, configurable:true},
    MEAL_BASE:{get:()=>MEAL_BASE, configurable:true},
    RULES:{get:()=>RULES, configurable:true},
    state:{get:()=>state, set:v=>{state=v}, configurable:true},
    LOADTYPE:{get:()=>LOADTYPE, configurable:true},
    LOADS:{get:()=>LOADS, configurable:true},
    DEFAULT_GYM:{get:()=>DEFAULT_GYM, configurable:true},
    gymOf:{get:()=>gymOf, configurable:true},
    loadOf:{get:()=>loadOf, configurable:true},
    unitLabel:{get:()=>unitLabel, configurable:true},
    unitShort:{get:()=>unitShort, configurable:true},
    round2:{get:()=>round2, configurable:true},
    dataFrozen:{get:()=>dataFrozen, configurable:true},
    recoveredFrom:{get:()=>recoveredFrom, configurable:true},
    storageOK:{get:()=>storageOK, configurable:true}
  })`, win, { filename: 'expose.js' });
  /* renderTrain-in yaratdığı ✓ düymələrini stub kimi qeydiyyatdan keçir */
  win.__mountChecks = () => {
    if (!win.state.active) return;
    Object.keys(win.state.active.ex).forEach(k =>
      win.state.active.ex[k].forEach((_, i) => {
        const el = mkEl('button'); checks[`${k}-${i}`] = el;
      }));
  };
  return win;
}

module.exports = { boot };
