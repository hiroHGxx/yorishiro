// index.template.html + model-viewer → index.html
// 公開物は単一HTML（外部スクリプトを持たない）にする決めごとに従い、
// model-viewer を版を固定して取り寄せ、中身を照合してから畳み込む。
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const NE = dirname(dirname(fileURLToPath(import.meta.url)));
const HAN = '4.3.1';
const URL_ = `https://cdn.jsdelivr.net/npm/@google/model-viewer@${HAN}/dist/model-viewer.min.js`;
const SHA = '283b0672384614b4847636c306fc93fe4b1fcadc76d668b4e47f0ca76bcf033b';
const HIKAE = join(NE, 'scripts', `model-viewer-${HAN}.min.js`);

async function toriyoseru(){
  if(existsSync(HIKAE)) return readFileSync(HIKAE, 'utf8');
  process.stdout.write(`取り寄せ: ${URL_}\n`);
  const r = await fetch(URL_);
  if(!r.ok) throw new Error(`jsdelivr が ${r.status}`);
  const s = await r.text();
  mkdirSync(dirname(HIKAE), {recursive:true});
  writeFileSync(HIKAE, s);
  return s;
}

const lib = await toriyoseru();
const sha = createHash('sha256').update(lib).digest('hex');
if(sha !== SHA) throw new Error(`model-viewer の中身が違う\n  期待 ${SHA}\n  実際 ${sha}`);
if(lib.includes('</script')) throw new Error('</script を含むのでインラインにできない');

const tpl = readFileSync(join(NE, 'index.template.html'), 'utf8');
if(!tpl.includes('/*__MODEL_VIEWER__*/')) throw new Error('雛形に差し込み口がない');
let out = tpl.replace('/*__MODEL_VIEWER__*/', () => `/* @google/model-viewer ${HAN} — Apache-2.0 — ${URL_} */\n${lib}`);

// 版の印: 焼いた日時 + git の短い印（端末に届いている版を、画面の ≡ で確かめられるように）
const {execSync} = await import('node:child_process');
let inshu = 'nogit';
try{ inshu = execSync('git rev-parse --short HEAD', {cwd:NE}).toString().trim(); }catch(e){}
const d = new Date();
const z = n => String(n).padStart(2,'0');
const shirushi = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())} (${inshu})`;
if(!out.includes('__BUILD__')) throw new Error('雛形に版の差し込み口がない');
out = out.replace('__BUILD__', shirushi);
writeFileSync(join(NE, 'index.html'), out);
process.stdout.write(`焼けた: index.html ${(Buffer.byteLength(out)/1024).toFixed(0)}KB（model-viewer ${HAN} 同梱・版 ${shirushi}）\n`);
