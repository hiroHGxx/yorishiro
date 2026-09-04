// 実物を測る: 丈が本当に効いているか・押し所・文字の床・読み込み
import {createRequire} from 'node:module';
const require_ = createRequire('/Users/USER/Documents/user/kitan-circle/kitan-works/shikifuda-kasane/');
const puppeteer = require_('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_ = process.argv[2] || 'https://hirohgxx.github.io/yorishiro/';
const b = await puppeteer.launch({executablePath:CHROME, headless:'new', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage();
await p.setViewport({width:393, height:852, deviceScaleFactor:2, isMobile:true, hasTouch:true});
const warui = [];
p.on('console', m => { if(m.type()==='error') warui.push(m.text().slice(0,160)); });
p.on('pageerror', e => warui.push('pageerror: ' + String(e).slice(0,160)));
await p.goto(URL_, {waitUntil:'networkidle2', timeout:60000});
await p.waitForFunction(() => {
  const m = document.querySelector('model-viewer');
  return m && m.loaded;
}, {timeout:60000});
await new Promise(r => setTimeout(r, 1500));

const d = await p.evaluate(async () => {
  const mv = document.querySelector('model-viewer');
  const dim = mv.getDimensions();
  const take = async n => {
    const btn = document.querySelector('#take');
    while(document.querySelector('#take .ji').textContent !== String(n)) {
      btn.click(); await new Promise(r => setTimeout(r, 900));
    }
    return document.querySelector('model-viewer').getDimensions();
  };
  const d15 = await take(15), d30 = await take(30), d20 = await take(20);
  const chiisai = [...document.querySelectorAll('button,a')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && (r.height < 44 || r.width < 24);
  }).map(e => (e.textContent||'').trim().slice(0,10) + ':' + Math.round(e.getBoundingClientRect().height));
  const yuka = [...document.querySelectorAll('*')].filter(e => {
    const t = [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim());
    return t && parseFloat(getComputedStyle(e).fontSize) < 12;
  }).map(e => e.tagName + ':' + getComputedStyle(e).fontSize);
  return {
    hajime:{y:+dim.y.toFixed(4), x:+dim.x.toFixed(4)},
    take15:+d15.y.toFixed(4), take20:+d20.y.toFixed(4), take30:+d30.y.toFixed(4),
    shigusa: mv.availableAnimations,
    hashira: document.querySelectorAll('#hashira .fuda').length,
    chiisai, yuka,
    kao: document.querySelector('#na-n').textContent,
  };
});
console.log(JSON.stringify(d, null, 1));
console.log('赤い声:', warui.length ? warui : 'なし');
await p.screenshot({path:'/private/tmp/claude-501/-Users-USER-Documents-user-kitan-circle/cc79b2f4-6dcf-4bbd-9cfe-7911569b5d91/scratchpad/yorishiro-live.png'});
await b.close();
