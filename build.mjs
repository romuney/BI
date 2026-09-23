// Собирает src/ в один самодостаточный HTML-файл без внешних зависимостей.
// Запуск: node build.mjs  →  AI-v-BI.html
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const read = f => readFileSync(join(SRC, f), 'utf8');
let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);
writeFileSync('AI-v-BI.html', html);
console.log(`AI-v-BI.html — ${(html.length / 1024).toFixed(0)} KB`);
