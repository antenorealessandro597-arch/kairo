const fs=require('fs');
const path=require('path');
// Tiny .env loader so the ZIP works without an extra dotenv dependency.
try{const envPath=path.join(__dirname,'.env'); if(fs.existsSync(envPath)){for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}}catch{}
const os=require('os');
const https=require('https');
const crypto=require('crypto');
const {spawn}=require('child_process');
const express=require('express');
const selfsigned=require('selfsigned');
const {WebSocketServer,WebSocket}=require('ws');
const screenshot=require('screenshot-desktop');
const sharp=require('sharp');
const winInput=require('./src/win32-input');

const PORT=Number(process.env.PORT||3443), HOST='0.0.0.0';
const FPS=Math.max(1,Math.min(12,Number(process.env.KAIRO_FPS||6)));
const MAX_WIDTH=Number(process.env.KAIRO_MAX_WIDTH||1600);
const JPEG_QUALITY=Number(process.env.KAIRO_JPEG_QUALITY||62);
const ROOT=__dirname, DATA=path.join(ROOT,'data');
fs.mkdirSync(DATA,{recursive:true});
const app=express(); app.disable('x-powered-by'); app.use(express.json({limit:'512kb'})); app.use(express.static(path.join(ROOT,'public')));
const certDir=path.join(DATA,'cert'), keyPath=path.join(certDir,'key.pem'), certPath=path.join(certDir,'cert.pem'); fs.mkdirSync(certDir,{recursive:true});

function ips(){const out=[];for(const list of Object.values(os.networkInterfaces()))for(const n of (list||[]))if(n.family==='IPv4'&&!n.internal)out.push(n.address);return out;}
async function cert(){if(fs.existsSync(keyPath)&&fs.existsSync(certPath))return;const alt=['kairo.local','localhost',...ips()];const p=await selfsigned.generate([{name:'commonName',value:'kairo.local'}],{algorithm:'sha256',keySize:2048,notAfterDate:new Date(Date.now()+365*864e5),extensions:[{name:'basicConstraints',cA:false,critical:true},{name:'keyUsage',digitalSignature:true,keyEncipherment:true,critical:true},{name:'extKeyUsage',serverAuth:true},{name:'subjectAltName',altNames:alt.map(x=>/^[0-9.]+$/.test(x)?{type:7,ip:x}:{type:2,value:x})}]});fs.writeFileSync(keyPath,p.private);fs.writeFileSync(certPath,p.cert);}

const cloudFile=path.join(DATA,'cloud.json');
function loadCloud(){try{return JSON.parse(fs.readFileSync(cloudFile,'utf8'));}catch{return null}}
function saveCloud(v){fs.writeFileSync(cloudFile,JSON.stringify(v,null,2));}
let cloud=loadCloud()||{deviceId:'pc-'+crypto.randomBytes(5).toString('hex'),token:crypto.randomBytes(24).toString('base64url'),name:process.env.KAIRO_DEVICE_NAME||'Meu PC'};
cloud.name=process.env.KAIRO_DEVICE_NAME||cloud.name||'Meu PC'; if(process.env.KAIRO_DEVICE_ID)cloud.deviceId=process.env.KAIRO_DEVICE_ID; if(process.env.KAIRO_RELAY_TOKEN)cloud.token=process.env.KAIRO_RELAY_TOKEN; saveCloud(cloud);
let pairing=crypto.randomBytes(5).toString('hex').toUpperCase(); let pairingExpires=Date.now()+15*60*1000;
function newPairing(){pairing=crypto.randomBytes(5).toString('hex').toUpperCase();pairingExpires=Date.now()+15*60*1000;return pairing;}

let mirror=false,busy=false,lastFrame=null,lastMeta=null,lastMouse={x:0,y:0},clients=new Set();
function broadcast(o){const d=JSON.stringify(o);for(const ws of clients)if(ws.readyState===WebSocket.OPEN)ws.send(d)}
function mouse(){try{return winInput.cursor()}catch{return lastMouse}}
async function frame(){if(!mirror||busy)return;busy=true;try{const raw=await screenshot({format:'jpg'});const md=await sharp(raw).metadata();let p=sharp(raw);if(md.width&&md.width>MAX_WIDTH)p=p.resize({width:MAX_WIDTH});const jpg=await p.jpeg({quality:JPEG_QUALITY,mozjpeg:true}).toBuffer();const sm=await sharp(jpg).metadata();const pos=mouse();const s=winInput.size();lastMouse=pos;lastFrame=jpg.toString('base64');lastMeta={width:sm.width||md.width||s.width,height:sm.height||md.height||s.height,screenWidth:s.width,screenHeight:s.height,mouse:pos,ts:Date.now()};}catch(e){broadcast({type:'mirror_error',message:String(e.message||e)})}finally{busy=false}}
setInterval(async()=>{if(mirror){await frame();if(lastFrame)broadcast({type:'frame',image:lastFrame,meta:lastMeta})}},Math.round(1000/FPS));

const allowedApps={
 spotify:{command:'spotify.exe',args:[]}, chrome:{command:'chrome.exe',args:[]}, discord:{command:'Discord.exe',args:[]}, explorer:{command:'explorer.exe',args:[]}, notepad:{command:'notepad.exe',args:[]}, calculator:{command:'calc.exe',args:[]}
};
function launch(name){const a=allowedApps[String(name).toLowerCase()];if(!a)throw new Error('Aplicativo não permitido.');spawn(a.command,a.args,{detached:true,windowsHide:true,stdio:'ignore'}).unref();}
async function action(a){if(!a||typeof a!=='object')return;if(a.type==='mirror_set'){mirror=!!a.enabled;if(!mirror){lastFrame=null;lastMeta=null}broadcast({type:'mirror_state',enabled:mirror});if(mirror){await frame();if(lastFrame)broadcast({type:'frame',image:lastFrame,meta:lastMeta})}return}if(a.type==='mouse_move'){winInput.move(Number(a.x),Number(a.y));return}if(a.type==='mouse_click'){winInput.click(a.button||'left');return}if(a.type==='mouse_double'){winInput.doubleClick();return}if(a.type==='scroll'){winInput.scroll(Math.max(-20,Math.min(20,Number(a.amount)||0))*120);return}if(a.type==='type_text'){winInput.typeText(a.text||'');return}if(a.type==='key'){winInput.key(a.key||'');return}if(a.type==='launch'){launch(a.name);return}if(a.type==='lock'){winInput.lock();return}}

let relay=null;
function connectRelay(){const url=process.env.KAIRO_RELAY_URL||'';if(!url)return;const u=url.replace(/\/$/,'')+'/agent';relay=new WebSocket(u);relay.on('open',()=>{console.log('☁️ Relay conectado:',url);relay.send(JSON.stringify({type:'agent_hello',deviceId:cloud.deviceId,token:cloud.token,pairingCode:pairing,name:cloud.name}));broadcast({type:'cloud_state',online:true,pairing,expiresAt:pairingExpires,name:cloud.name});});relay.on('message',async raw=>{try{const m=JSON.parse(raw.toString());if(m.type==='controller_connected'||m.type==='controller_disconnected')broadcast(m);else if(m.type==='hello_ok')broadcast({type:'cloud_state',online:true,pairing,expiresAt:pairingExpires,name:cloud.name});else if(m.type==='action'){try{await action(m.action);relay.send(JSON.stringify({type:'action_result',ok:true,requestId:m.requestId}))}catch(e){relay.send(JSON.stringify({type:'action_result',ok:false,requestId:m.requestId,error:String(e.message||e)}))}}else if(m.type==='mirror_request'){if(mirror&&lastFrame)relay.send(JSON.stringify({type:'frame',image:lastFrame,meta:lastMeta}))}else if(m.type==='controller_info')broadcast(m);}catch(e){console.error('Relay message:',e.message)}});relay.on('close',()=>{broadcast({type:'cloud_state',online:false,pairing,expiresAt:pairingExpires});setTimeout(connectRelay,4000)});relay.on('error',()=>{});}
setInterval(()=>{if(Date.now()>pairingExpires){newPairing();if(relay&&relay.readyState===WebSocket.OPEN)relay.send(JSON.stringify({type:'agent_hello',deviceId:cloud.deviceId,token:cloud.token,pairingCode:pairing,name:cloud.name}));broadcast({type:'cloud_state',online:!!(relay&&relay.readyState===WebSocket.OPEN),pairing,expiresAt:pairingExpires,name:cloud.name})}},30000);

app.get('/api/config',(req,res)=>res.json({version:'4.0.0',mode:'local',device:cloud.name,deviceId:cloud.deviceId,relayConfigured:!!process.env.KAIRO_RELAY_URL,relayUrl:process.env.KAIRO_RELAY_URL||null,pairing,expiresAt:pairingExpires,ips:ips(),port:PORT,fps:FPS}));
app.post('/api/new-pairing',(req,res)=>res.json({pairing:newPairing(),expiresAt:pairingExpires}));
app.get('/api/health',(req,res)=>res.json({ok:true,mirror,cloudOnline:!!(relay&&relay.readyState===WebSocket.OPEN),fps:FPS}));

(async()=>{await cert();const server=https.createServer({key:fs.readFileSync(keyPath),cert:fs.readFileSync(certPath)},app);const wss=new WebSocketServer({server,path:'/ws'});wss.on('connection',ws=>{clients.add(ws);ws.send(JSON.stringify({type:'hello',version:'4.0.0',mirrorEnabled:mirror,ips:ips(),port:PORT,device:cloud.name,pairing,expiresAt:pairingExpires,cloudOnline:!!(relay&&relay.readyState===WebSocket.OPEN)}));ws.on('message',async raw=>{try{await action(JSON.parse(raw.toString()))}catch(e){ws.send(JSON.stringify({type:'action_error',message:String(e.message||e)}))}});ws.on('close',()=>clients.delete(ws))});server.listen(PORT,HOST,()=>{console.log(`Kairo Control 4.0: https://localhost:${PORT}`);console.log(`LAN: ${ips().map(ip=>`https://${ip}:${PORT}`).join(' | ')||'nenhum IP detectado'}`);console.log(`☁️ Relay: ${process.env.KAIRO_RELAY_URL||'desativado'}`);console.log(`Código remoto atual: ${pairing}`);connectRelay();});})();
