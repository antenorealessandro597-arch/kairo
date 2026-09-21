const fs=require('fs'),path=require('path');
const files=['server.js','src/win32-input.js','public/index.html','public/app.js','public/style.css','relay/server.js','relay/public/index.html','relay/public/app.js','relay/public/style.css'];
for(const f of files){const p=path.join(__dirname,f);if(!fs.existsSync(p))throw new Error('Faltando: '+f);}
for(const f of ['server.js','src/win32-input.js','relay/server.js','public/app.js','relay/public/app.js']){const vm=require('vm');new vm.Script(fs.readFileSync(path.join(__dirname,f),'utf8'),{filename:f});console.log('Syntax OK:',f)}
console.log('Kairo Control 4.0 check OK.');
