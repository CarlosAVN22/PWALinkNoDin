import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const base=resolve('public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf','.mp4':'video/mp4','.webm':'video/webm'};
const port=Number(process.env.PORT||3000);
http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const url=new URL(req.url,'http://localhost');
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/'||pathname.endsWith('/'))pathname+='/index.html';
  const target=resolve(base,'.'+pathname);
  if(target!==base&&!target.startsWith(base+sep)){res.writeHead(403);res.end('No autorizado');return;}
  const file=await stat(target);
  if(!file.isFile()){res.writeHead(404);res.end('No encontrado');return;}
  res.writeHead(200,{'Content-Type':mime[extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache','Content-Length':file.size});
  if(req.method==='HEAD'){res.end();return;}
  res.end(await readFile(target));
 }catch(err){res.writeHead(err.code==='ENOENT'?404:500);res.end(err.code==='ENOENT'?'No encontrado':'Error del servidor');}
}).listen(port,()=>console.log(`LinkNoDin disponible en http://localhost:${port}`));
