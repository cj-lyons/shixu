type DesktopMusicCommand={type:'toggle'}|{type:'select';id:string}|{type:'automatic'};
type DesktopTimer = { id:string; goal?:string; prepared?:boolean; mode:'focus'|'short'|'long'; duration:number; remaining:number; end:number|null; finishedAt?:number; taskId:string; title:string; finished:boolean };
interface Window {
  shixuDesktop?: {
    getCustomReminders?():Promise<import('./custom-reminders').CustomReminderState>;
    saveCustomReminder?(value:{id?:string;title:string;at:string;repeat:import('./custom-reminders').CustomReminder['repeat']}):Promise<import('./custom-reminders').CustomReminderState>;
    toggleCustomReminder?(id:string):Promise<import('./custom-reminders').CustomReminderState>;
    removeCustomReminder?(id:string):Promise<import('./custom-reminders').CustomReminderState>;
    actCustomReminder?(key:string,action:'done'|'snooze'):Promise<import('./custom-reminders').CustomReminderState>;
    openContentAdmin():Promise<{opened:boolean}>;
    chooseMusicDirectory():Promise<{canceled:boolean}>;
    getReminderState(): Promise<{ enabled:boolean; supported:boolean; timer:DesktopTimer|null; lastNotification:{ status:string }|null }>;
    enableReminders(): Promise<{ enabled:boolean; supported:boolean }>;
    getWellbeing?():Promise<import('./wellbeing-types').WellbeingState>;
    configureWellbeing?(value:import('./wellbeing-types').WellbeingConfig):Promise<import('./wellbeing-types').WellbeingState>;
    actWellbeing?(key:import('./wellbeing-types').WellbeingKey,action:'done'|'snooze'):Promise<import('./wellbeing-types').WellbeingState>;
    testWellbeing?():Promise<import('./wellbeing-types').WellbeingState>;
    pauseWellbeing?(minutes:0|30|60):Promise<import('./wellbeing-types').WellbeingState>;
    reportMusicState(state:{ready:boolean;playing:boolean;title:string;id:string|null;automatic:boolean}):Promise<void>;
    onMusicCommand(callback:(command:DesktopMusicCommand)=>void):()=>void;
    onReminderState(callback:(state:{enabled:boolean;supported:boolean})=>void):()=>void;
    syncTimer(timer:DesktopTimer|null): Promise<DesktopTimer|null>;
    onTimerCommand?(callback:()=>void):()=>void;
    onTimer(callback:(timer:DesktopTimer|null)=>void): ()=>void;
  };
}
