const fs=require('fs');const path=require('path');
try{const ep=path.join(__dirname,'..','.env');if(fs.existsSync(ep)){for(const line of fs.readFileSync(ep,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}}catch{}const http=require('http');const crypto=require('crypto');const express=require('express');const {WebSocketServer,WebSocket}=require('ws');
const PORT=Number(process.env.PORT||8080),app=express();app.disable('x-powered-by');app.use(express.static(path.join(__dirname,'public')));
const server=http.createServer(app),wss=new WebSocketServer({server});
const agents=new Map(),controllers=new Map();
function clean(s){return String(s||'').slice(0,128)}
function send(ws,o){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(o))}
function closeOther(map,key){const old=map.get(key);if(old&&old.ws.readyState===WebSocket.OPEN)old.ws.close(4001,'replaced');}
function cleanupAgent(deviceId,ws){const a=agents.get(deviceId);if(a&&a.ws===ws){agents.delete(deviceId);if(a.controller)send(a.controller.ws,{type:'controller_disconnected'})}}
wss.on('connection',(ws,req)=>{const role=req.url.startsWith('/agent')?'agent':'controller';let identity=null;ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return send(ws,{type:'error',message:'JSON inválido'})}
 if(!identity){
  if(role==='agent'&&m.type==='agent_hello'){const deviceId=clean(m.deviceId),token=clean(m.token),pairing=clean(m.pairingCode);if(!deviceId||token.length<20||pairing.length<6)return send(ws,{type:'error',message:'Credenciais inválidas'});closeOther(agents,deviceId);identity={role,deviceId};agents.set(deviceId,{ws,token,pairing,name:clean(m.name)||'PC'});send(ws,{type:'hello_ok',deviceId,pairing});return}
  if(role==='controller'&&m.type==='controller_hello'){const pairing=clean(m.pairingCode).toUpperCase();const entry=[...agents.entries()].find(([,a])=>a.pairing===pairing);if(!entry)return send(ws,{type:'error',message:'Código inválido ou expirado. Gere um novo código no PC.'});const [deviceId,a]=entry;closeOther(controllers,deviceId);identity={role,deviceId};controllers.set(deviceId,{ws});a.controller={ws};send(ws,{type:'controller_ok',deviceId,name:a.name});send(a.ws,{type:'controller_connected'});return}
  return send(ws,{type:'error',message:'Primeiro autentique.'});
 }
 if(identity.role==='controller'){const a=agents.get(identity.deviceId);if(!a)return send(ws,{type:'error',message:'PC desconectado'});if(m.type==='action')send(a.ws,{type:'action',action:m.action,requestId:m.requestId||crypto.randomUUID()});else if(m.type==='mirror_request')send(a.ws,{type:'mirror_request'});else if(m.type==='ping')send(ws,{type:'pong',ts:Date.now()});else if(m.type==='frame'||m.type==='action_result')return;}
 if(identity.role==='agent'){const c=controllers.get(identity.deviceId);if(!c)return;if(m.type==='frame'||m.type==='cloud_state'||m.type==='mirror_state'||m.type==='mirror_error'||m.type==='action_result')send(c.ws,m);}
 });ws.on('close',()=>{if(!identity)return;if(identity.role==='agent')cleanupAgent(identity.deviceId,ws);else{const c=controllers.get(identity.deviceId);if(c&&c.ws===ws)controllers.delete(identity.deviceId);const a=agents.get(identity.deviceId);if(a&&a.controller&&a.controller.ws===ws){delete a.controller;send(a.ws,{type:'controller_disconnected'})}}});});
app.get('/api/config',(req,res)=>res.json({version:'4.0.0',mode:'relay',relay:true}));
app.get('/api/health',(req,res)=>res.json({ok:true,agents:agents.size,controllers:controllers.size}));
server.listen(PORT,'0.0.0.0',()=>console.log(`Kairo Relay ouvindo em http://0.0.0.0:${PORT}`));
