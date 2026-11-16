import assert from 'node:assert/strict';
import {chromium} from '../frontend/node_modules/playwright/index.mjs';
const origin=process.argv[2]||'http://localhost:8082';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const expected=process.argv[3]||'Great games. Better deals.';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(origin);
 await page.getByRole('heading',{name:expected,exact:true}).waitFor();
 await page.screenshot({path:'tmp/database-banner.png'});
 console.log('PASS: browser rendered the expected database-backed banner title.');
 await page.setViewportSize({width:393,height:851});
 await page.screenshot({path:'tmp/mobile-top.png'});
}finally{await browser.close()}
