import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}const f=p===root?path.join(root,'index.html'):p;res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('游戏已启动 http://127.0.0.1:4173'));
