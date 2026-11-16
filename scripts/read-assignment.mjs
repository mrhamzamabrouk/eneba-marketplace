import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../.tools/package.json', import.meta.url));
const canvas = require('@napi-rs/canvas');
globalThis.DOMMatrix = canvas.DOMMatrix;
globalThis.ImageData = canvas.ImageData;
globalThis.Path2D = canvas.Path2D;
const {getDocument} = await import('../.tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
const document = await getDocument({data:new Uint8Array(await fs.readFile('.private/Eneba Internship Assignment.pdf')),useSystemFonts:true}).promise;
await fs.mkdir('tmp/pdfs',{recursive:true});
for(let n=1;n<=document.numPages;n++){
 const page=await document.getPage(n);
 const text=await page.getTextContent();
 console.log(`PAGE ${n}\n`+text.items.map(x=>x.str||'').join(' '));
 const viewport=page.getViewport({scale:1.5});
 const surface=canvas.createCanvas(viewport.width,viewport.height);
 await page.render({canvasContext:surface.getContext('2d'),viewport}).promise;
 await fs.writeFile(`tmp/pdfs/assignment-${n}.png`,surface.toBuffer('image/png'));
}
