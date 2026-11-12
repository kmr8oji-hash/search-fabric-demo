import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname;
const target=p==='/'?'/index.html':p;
if(!['/index.html','/portfolio-demo.html','/LICENSE.txt','/THIRD_PARTY_NOTICES.txt'].includes(target)&&!/^\/assets\/[\w.-]+\.(js|css)$/.test(target)){res.writeHead(403);res.end('DEMO_ONLY');return}
try{const data=await readFile(path.join(root,target));res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.txt':'text/plain; charset=utf-8'}[path.extname(target)],'X-Content-Type-Options':'nosniff'});res.end(data)}catch{res.writeHead(404);res.end()}
}).listen(5286,'127.0.0.1',()=>console.log('http://127.0.0.1:5286/'));
