const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8');const app=fs.readFileSync(path.join(__dirname,'public/app.js'),'utf8');const relay=fs.readFileSync(path.join(__dirname,'relay/public/index.html'),'utf8');
const required=['toggleMirror','fullscreen','rotate','viewer','screen','cursor','pairing','newCode','copyCode','sendText','voiceBig'];
for(const id of required)if(!html.includes('id="'+id+'"'))throw new Error('UI local incompleta: '+id);
for(const token of ['mirror_set','mouse_move','mouse_click','mouse_double','scroll','type_text','launch','lock','SpeechRecognition','fullscreen','pairingCode'])if(!app.includes(token))throw new Error('Função ausente: '+token);
for(const token of ['Código do PC','Conectar'])if(!relay.includes(token))throw new Error('Relay UI incompleta: '+token);
const ra=fs.readFileSync(path.join(__dirname,'relay/public/app.js'),'utf8');for(const token of ['controller_hello','pairingCode','/control'])if(!ra.includes(token))throw new Error('Relay JS incompleto: '+token);
console.log('Selftest OK: dashboard moderno, espelhamento, fullscreen, cursor, teclado, texto, apps, voz e acesso remoto presentes.');
