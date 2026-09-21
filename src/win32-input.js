const koffi = require('koffi');
if (process.platform !== 'win32') throw new Error('Kairo Control 4.0 input module requires Windows.');
const user32 = koffi.load('user32.dll');
const POINT = koffi.struct('POINT', { x: 'long', y: 'long' });
const GetCursorPos = user32.func('bool __stdcall GetCursorPos(POINT *point)');
const SetCursorPos = user32.func('bool __stdcall SetCursorPos(int x, int y)');
const GetSystemMetrics = user32.func('int __stdcall GetSystemMetrics(int index)');
const mouse_event = user32.func('void __stdcall mouse_event(uint flags, uint dx, uint dy, uint data, uintptr extraInfo)');
const keybd_event = user32.func('void __stdcall keybd_event(uint vk, uint scan, uint flags, uintptr extraInfo)');
const ShowWindow = user32.func('bool __stdcall ShowWindow(void* hWnd, int nCmdShow)');
const GetConsoleWindow = koffi.load('kernel32.dll').func('void* __stdcall GetConsoleWindow()');
const MOUSE_LEFTDOWN=0x0002, MOUSE_LEFTUP=0x0004, MOUSE_RIGHTDOWN=0x0008, MOUSE_RIGHTUP=0x0010, MOUSE_MIDDLEDOWN=0x0020, MOUSE_MIDDLEUP=0x0040;
const KEYUP=0x0002, UNICODE=0x0004;
const VK={ENTER:0x0D,ESC:0x1B,TAB:0x09,BACKSPACE:0x08,SPACE:0x20,ARROWUP:0x26,ARROWDOWN:0x28,ARROWLEFT:0x25,ARROWRIGHT:0x27,HOME:0x24,END:0x23,DELETE:0x2E,INSERT:0x2D,SHIFT:0x10,CTRL:0x11,ALT:0x12,WIN:0x5B};
function cursor(){const p={x:0,y:0};GetCursorPos(p);return {x:p.x,y:p.y}}
function move(x,y){SetCursorPos(Math.round(x),Math.round(y))}
function click(button='left'){const b=button==='right'?[MOUSE_RIGHTDOWN,MOUSE_RIGHTUP]:button==='middle'?[MOUSE_MIDDLEDOWN,MOUSE_MIDDLEUP]:[MOUSE_LEFTDOWN,MOUSE_LEFTUP];mouse_event(b[0],0,0,0,0);mouse_event(b[1],0,0,0,0)}
function doubleClick(){click('left');setTimeout(()=>click('left'),70)}
function scroll(delta){mouse_event(0x0800,0,0,Math.trunc(delta),0)}
function size(){return {width:GetSystemMetrics(0),height:GetSystemMetrics(1)}}
function key(name){const vk=VK[String(name).toUpperCase()];if(vk==null)return false;keybd_event(vk,0,0,0);keybd_event(vk,0,KEYUP,0);return true}
function typeText(text){
  const value=String(text||'').slice(0,4000);
  for(const ch of value){
    const cp=ch.codePointAt(0);
    if(cp<=0xFFFF){ keybd_event(0,cp,UNICODE,0); keybd_event(0,cp,UNICODE|KEYUP,0); }
    else { const n=cp-0x10000; const hi=0xD800+(n>>10), lo=0xDC00+(n&0x3FF); keybd_event(0,hi,UNICODE,0); keybd_event(0,hi,UNICODE|KEYUP,0); keybd_event(0,lo,UNICODE,0); keybd_event(0,lo,UNICODE|KEYUP,0); }
  }
}
function lock(){ require('child_process').spawn('rundll32.exe',['user32.dll,LockWorkStation'],{windowsHide:true,detached:true,stdio:'ignore'}).unref(); }
module.exports={cursor,move,click,doubleClick,scroll,size,key,typeText,lock};
