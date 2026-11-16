import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.argv[2]||'http://localhost:8082';
const verify=process.argv[3]==='verify';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Smoke script is restricted to local isolated test servers');
let cookie='';
async function request(path,method='GET',body,extra={}){
 const response=await fetch(origin+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined});
 const content=await response.text();return {response,content,json:()=>JSON.parse(content)};
}
assert.equal((await request('/api/ready')).response.status,200);
for(const path of ['/','/store','/product/elden-ring','/orders']){
 const r=await request(path);assert.equal(r.response.status,200);assert.match(r.content,/<div id="root"><\/div>/);
 if(path==='/')for(const match of r.content.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g))assert.equal((await request(match[1])).response.status,200);
}
assert.equal((await request('/api/not-a-route')).response.status,404);
assert.equal((await request('/missing-asset.js')).response.status,404);
const unsafe=await request('/api/auth/logout','POST',{}, {Origin:'https://foreign.invalid'});assert.equal(unsafe.response.status,403);
if(verify){
 const state=JSON.parse(await fs.readFile('.private/smoke-state.json','utf8'));
 const login=await request('/api/auth/login','POST',{email:state.email,password:'local-smoke-password-123'});assert.equal(login.response.status,200);cookie=login.response.headers.getSetCookie()[0].split(';')[0];
 const order=await request('/api/orders/'+state.id);assert.equal(order.response.status,200);assert.equal(order.json().items[0].key,state.key);assert.equal(order.json().total_cents,state.total);
 console.log('PASS: same order and fake key survived an actual container restart.');
}else{
 const email=`smoke-${crypto.randomUUID()}@example.com`;
 const signup=await request('/api/auth/register','POST',{email,password:'local-smoke-password-123'});assert.equal(signup.response.status,201);
 const setCookie=signup.response.headers.getSetCookie()[0];assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Lax/);cookie=setCookie.split(';')[0];
 const product=(await request('/api/products/cities-skylines-ii')).json();const offer=product.offers.find(x=>x.stock>0);assert.ok(offer);
 const items=[{offer_id:offer.id,quantity:1,expected_price_cents:offer.price_cents}];
 const failed=await request('/api/checkout','POST',{items,payment:'failure'},{'Idempotency-Key':crypto.randomUUID()});assert.equal(failed.response.status,402);
 const token=crypto.randomUUID();const success=await request('/api/checkout','POST',{items,payment:'success'},{'Idempotency-Key':token});assert.equal(success.response.status,201);const order=success.json();assert.equal(order.items[0].seller,offer.seller);assert.match(order.items[0].key,/^DEMO-/);
 const retry=await request('/api/checkout','POST',{items,payment:'success'},{'Idempotency-Key':token});assert.equal(retry.response.status,200);assert.equal(retry.json().id,order.id);
 await fs.mkdir('.private',{recursive:true});await fs.writeFile('.private/smoke-state.json',JSON.stringify({email,id:order.id,key:order.items[0].key,total:order.total_cents}));
 console.log('PASS: readiness, routes, assets, origin, cookies, declined/successful checkout and retry. Private restart comparison saved.');
}
