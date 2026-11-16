import {chromium} from '../frontend/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
await fs.mkdir('tmp',{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('https://www.eneba.com',{waitUntil:'domcontentloaded',timeout:45000});
 console.log(await page.title());
 await page.screenshot({path:'tmp/eneba-reference.png'});
 console.log((await page.locator('body').innerText()).slice(0,1800));
}catch(e){console.log('Reference inspection limitation: '+e.message)}finally{await browser.close()}
