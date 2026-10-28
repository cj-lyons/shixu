export type WellbeingKey='move'|'water';
export type WellbeingConfig={move:{enabled:boolean;minutes:number};water:{enabled:boolean;minutes:number};workHours:boolean;start:string;end:string;idlePause:boolean;floralCard:boolean};
export type WellbeingState={config:WellbeingConfig;next:Record<WellbeingKey,number|null>;withinHours:boolean;notificationsEnabled:boolean;naturalIdle:boolean;idleSupported:boolean;meetingUntil:number|null};
