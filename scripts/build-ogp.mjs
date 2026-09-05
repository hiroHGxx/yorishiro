// ogp.jpg（1200×630）を焼く。宣伝用に別の絵を描かず、この道具が実際に出す絵を使う。
//   node scripts/build-ogp.mjs [URL]
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const require_ = createRequire(new URL('../../shikifuda-kasane/', import.meta.url));
const puppeteer = require_('puppeteer-core');
const NE = dirname(dirname(fileURLToPath(import.meta.url)));
const URL_ = process.argv[2] || 'https://hirohgxx.github.io/yorishiro/';

const b = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new'});
const p = await b.newPage();
await p.setViewport({width:1200, height:630, deviceScaleFactor:2});
await p.goto(URL_, {waitUntil:'networkidle2', timeout:60000});
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, {timeout:60000});
await p.evaluate(() => {
  const mv = document.querySelector('model-viewer');
  document.querySelector('#tobari').remove();
  document.querySelector('#kamae').remove();
  document.querySelector('#shirase').remove();
  mv.cameraOrbit = '16deg 79deg 165%';
  mv.style.left = '38%';                       // 御霊は右寄せ、左に題を置く
  const su = document.createElement('div');
  su.style.cssText = `position:absolute; left:6.2%; top:50%; transform:translateY(-50%);
    max-width:44%; z-index:5; font-family:"Shippori Mincho B1","Hiragino Mincho ProN",serif;`;
  su.innerHTML = `
    <div style="font-size:74px; font-weight:700; letter-spacing:.16em; color:#E8E4D8; line-height:1.1">よりしろ</div>
    <div style="height:2px; width:130px; background:#D9A94C; margin:22px 0 20px"></div>
    <div style="font-family:'Zen Kaku Gothic New',sans-serif; font-size:25px; line-height:1.75; color:#E8E4D8">
      月蝕綺譚の御霊を、<br>いまいる場所へ。</div>
    <div style="font-family:'Zen Kaku Gothic New',sans-serif; font-size:17px; line-height:1.8; color:#9D93B5; margin-top:20px">
      カメラごしに机の上へ小さく呼び出して、写真に残す道具<br>14柱・しぐさ3つ・丈15/20/30cm</div>
    <div style="font-family:'Zen Kaku Gothic New',sans-serif; font-size:14px; color:#D9A94C; margin-top:26px; letter-spacing:.06em">
      二次創作 ／ 公式とは関係ありません</div>`;
  document.querySelector('#ba').appendChild(su);
  document.querySelector('#ba').style.height = '630px';
});
await new Promise(r => setTimeout(r, 1800));
await p.screenshot({path: join(NE,'ogp.jpg'), type:'jpeg', quality:90, clip:{x:0,y:0,width:1200,height:630}});
await b.close();
process.stdout.write('焼けた: ogp.jpg\n');
