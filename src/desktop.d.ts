type DesktopMusicCommand={type:'toggle'}|{type:'select';id:string}|{type:'automatic'};
type DesktopTimer = { id:string; goal?:string; prepared?:boolean; mode:'focus'|'short'|'long'; duration:number; remaining:number; end:number|null; finishedAt?:number; taskId:string; title:string; finished:boolean };
interface Window {
  shixuDesktop?: {
    openContentAdmin():Promise<{opened:boolean}>;
    chooseMusicDirectory():Promise<{canceled:boolean}>;
    getReminderState(): Promise<{ enabled:boolean; supported:boolean; timer:DesktopTimer|null; lastNotification:{ status:string }|null }>;
    enableReminders(): Promise<{ enabled:boolean; supported:boolean }>;
    reportMusicState(state:{ready:boolean;playing:boolean;title:string;id:string|null;automatic:boolean}):Promise<void>;
    onMusicCommand(callback:(command:DesktopMusicCommand)=>void):()=>void;
    onReminderState(callback:(state:{enabled:boolean;supported:boolean})=>void):()=>void;
    syncTimer(timer:DesktopTimer|null): Promise<DesktopTimer|null>;
    onTimerCommand?(callback:()=>void):()=>void;
    onTimer(callback:(timer:DesktopTimer|null)=>void): ()=>void;
  };
}
