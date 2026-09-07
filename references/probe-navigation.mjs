import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(resolve(process.cwd(),'package.json'))('@playwright/test');
const results=[];let requests=0;
const server=createServer((request,response)=>{
 if(request.url==='/slow'){requests++;const timer=setTimeout(()=>response.end('{}'),5000);request.on('close',()=>clearTimeout(timer));return;}
 response.setHeader('content-type','text/html');response.end(`<h1>Controlled navigation</h1><script>
 addEventListener('error',event=>console.debug('JS_EVENT:'+event.message));
 addEventListener('unhandledrejection',event=>console.debug('JS_EVENT:'+event.reason));
 setInterval(()=>fetch('/slow',{method:'POST'}).catch(()=>{}),1);addEventListener('pagehide',()=>fetch('/slow',{method:'POST'}).catch(()=>{}));
 </script>`);
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();const page=await browser.newPage();const errors=[],js=[];page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack}));page.on('console',message=>{if(message.text().startsWith('JS_EVENT:'))js.push(message.text());});
 try{await page.goto(origin);for(let i=0;i<5;i++){const initial=requests;await page.reload({waitUntil:'domcontentloaded'});for(let attempt=0;attempt<100&&requests===initial;attempt++)await new Promise(resolve=>setTimeout(resolve,10));}
 results.push({name,handledNavigation:{errors:[...errors],js:[...js]}});
 await page.evaluate(()=>setTimeout(()=>{throw new Error('CONTROLLED_JS_EXCEPTION');},0));await new Promise(resolve=>setTimeout(resolve,100));results.at(-1).negativeControl={errors:errors.filter(error=>error.message==='CONTROLLED_JS_EXCEPTION').length,js:js.filter(value=>value.includes('CONTROLLED_JS_EXCEPTION')).length};
 }finally{await browser.close();}
}
server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const result of results){assert.equal(result.handledNavigation.js.length,0);assert.deepEqual(result.negativeControl,{errors:1,js:1});}process.stdout.write(JSON.stringify({results,summary:results.map(result=>({engine:result.name,handledNativeErrors:result.handledNavigation.errors.length,handledJsErrors:result.handledNavigation.js.length,negativeControl:result.negativeControl}))},null,2)+'\n');
