/* 御霊の GLB を「佇む姿」で焼き、丈を当てた USDZ にする。
 *   node scripts/build-usdz.mjs [slug ...]     引数なしで14柱すべて
 * なぜ事前に焼くか:
 *   ① 押してから数秒待たせない（実行時変換が要らなくなる）
 *   ② ios-src に # を付けられる＝AR Quick Look の下に「よりしろ」の帯を出せる
 *   ③ 皮つきの姿を焼き込める（実行時変換は束ね姿のまま置かれる） */
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const require_ = createRequire(new URL('../../shikifuda-kasane/', import.meta.url));
const puppeteer = require_('puppeteer-core');
const NE = dirname(dirname(fileURLToPath(import.meta.url)));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const THREE_V = '0.180.0';
const MOTO_TAKE = 1.9;

// 名簿は index.template.html の MITAMA 表から読む（二重管理を作らない）
const tpl = readFileSync(join(NE,'index.template.html'),'utf8');
const MITAMA = [...tpl.matchAll(/\{id:"(\w+)",\s*asset:"([\w]+)",\s*name:"([^"]+)",\s*kana:"([^"]+)",\s*tag:"([^"]+)"\}/g)]
  .map(m => ({id:m[1], asset:m[2], name:m[3], kana:m[4], tag:m[5]}));
if(!MITAMA.length) throw new Error('名簿を読めなかった');
const TAKE = [15, 20, 30];

const erabi = process.argv.slice(2);
const shu = erabi.length ? MITAMA.filter(m => erabi.includes(m.id)) : MITAMA;

const b = await puppeteer.launch({executablePath:CHROME, headless:'new'});
const p = await b.newPage();
await p.setContent(`<!doctype html><meta charset=utf-8><script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@${THREE_V}/build/three.module.js",
"three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_V}/examples/jsm/"}}
<\/script><body>`, {waitUntil:'domcontentloaded'});

mkdirSync(join(NE,'usdz'), {recursive:true});
let goukei = 0;
for(const m of shu){
  for(const cm of TAKE){
    const t0 = Date.now();
    const arr = await p.evaluate(async (asset, bairitsu) => {
      const THREE = await import('three');
      const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
      const {USDZExporter} = await import('three/addons/exporters/USDZExporter.js');
      const buf = await (await fetch('https://kura.vibe.co.jp/model3d/' + asset + '.glb')).arrayBuffer();
      const g = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));

      // 「佇む」の姿を作る
      const mixer = new THREE.AnimationMixer(g.scene);
      const clip = g.animations.find(a => a.name === 'idle') || g.animations[0];
      if(clip) mixer.clipAction(clip).play();
      mixer.setTime(0);
      g.scene.updateMatrixWorld(true);

      // 皮つきを、その姿のまま静かなメッシュへ焼く
      //（USDZ は骨を持てない。焼かないと束ね姿のまま置かれる）
      const yakumono = [];
      g.scene.traverse(o => { if(o.isSkinnedMesh) yakumono.push(o); });
      for(const sm of yakumono){
        const src = sm.geometry, n = src.attributes.position.count;
        const pos = new Float32Array(n * 3), v = new THREE.Vector3();
        for(let i = 0; i < n; i++){ sm.getVertexPosition(i, v); pos[i*3]=v.x; pos[i*3+1]=v.y; pos[i*3+2]=v.z; }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        if(src.attributes.uv) geo.setAttribute('uv', src.attributes.uv.clone());
        if(src.index) geo.setIndex(src.index.clone());
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, sm.material);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(sm.matrixWorld);     // 皮つきの節の変換は無視される決まりなので世界行列を使う
        sm.parent.add(mesh);
        sm.visible = false;
      }
      const soto = new THREE.Group();
      soto.scale.setScalar(bairitsu);
      soto.add(g.scene);
      soto.updateMatrixWorld(true);
      const out = await new USDZExporter().parseAsync(soto);
      return Array.from(new Uint8Array(out));
    }, m.asset, (cm/100)/MOTO_TAKE);
    const buf = Buffer.from(arr);
    const na = `${m.id}-${cm}.usdz`;
    writeFileSync(join(NE,'usdz',na), buf);
    goukei += buf.length;
    process.stdout.write(`${na.padEnd(22)} ${(buf.length/1048576).toFixed(2)}MB  ${Date.now()-t0}ms\n`);
  }
}
process.stdout.write(`合計 ${(goukei/1048576).toFixed(1)}MB\n`);
await b.close();
