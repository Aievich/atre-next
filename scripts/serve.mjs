import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {handlePressRequest} from './press-inbox.mjs';

const root=path.resolve('dist');
const inbox=path.resolve(process.env.ATRE_PRESS_INBOX||'.local/press-requests');
const port=Number(process.env.ATRE_SITE_PORT||8173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if (url.pathname==='/api/press-requests') return await handlePressRequest(req,res,inbox);
    if (req.method!=='GET'&&req.method!=='HEAD') {
      res.writeHead(405,{'Allow':'GET, HEAD'});
      return res.end();
    }
    let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if (!file.startsWith(root+path.sep)&&file!==root) {
      res.writeHead(403);
      return res.end();
    }
    if ((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
