const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createWellbeingCard}=require('../desktop/wellbeing-card.cjs');
const handlers=new Map(),listeners=new Map(),windows=[],actions=[];
let pendingAppearance,delayedLoad=false;
class Window extends EventEmitter{
 constructor(){super();this.destroyed=false;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=()=>{};windows.push(this);}
 setMenu(){}isDestroyed(){return this.destroyed;}showInactive(){}
 loadURL(url){this.url=url;return delayedLoad?new Promise((_resolve,reject)=>{this.abort=reject;}):Promise.resolve();}
 close(){this.destroyed=true;this.emit('closed');this.abort?.(Error('ERR_ABORTED'));}
}
const controller=createWellbeingCard({BrowserWindow:Window,screen:{getCursorScreenPoint:()=>({x:0,y:0}),getDisplayNearestPoint:()=>({workArea:{x:0,y:0,width:1200,height:900}})},ipcMain:{on:(key,handler)=>listeners.set(key,handler),handle:(key,handler)=>handlers.set(key,handler)},appearance:()=>pendingAppearance??Promise.resolve('sakura'),act:(key,action)=>actions.push([key,action])});
const message={key:'wellbeing:test:1',body:'测试',wellbeingKeys:['move','water']};
(async()=>{
 let resolveAppearance;pendingAppearance=new Promise(resolve=>{resolveAppearance=resolve;});const first=controller.show(message);controller.close();resolveAppearance('sakura');assert.equal(await first,false);assert.equal(windows.length,0);
 pendingAppearance=null;delayedLoad=true;const second=controller.show(message);await new Promise(resolve=>setImmediate(resolve));controller.close();assert.equal(await second,false,'Cancellation must not become a failed card or trigger notification fallback');
 delayedLoad=false;assert.equal(await controller.show(message),true);const card=windows.at(-1),action=handlers.get('shixu:wellbeing-card-act');
 const event={sender:card.webContents,senderFrame:{url:card.url}};
 await assert.rejects(()=>action({...event,sender:{}},message.key,'done'));
 await assert.rejects(()=>action(event,'old-card','done'));
 await action(event,message.key,'snooze');assert.deepEqual(actions,[['move','snooze'],['water','snooze']]);assert.equal(card.isDestroyed(),true);
 console.log('Passed: pending-card cancellation, aborted-load cancellation, trusted sender and stale-card rejection, grouped actions.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>controller.close());
