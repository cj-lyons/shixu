import type { Energy } from './music-library';
export const bundledTracks=[
 {id:'original',title:'自创音乐',flower:'原创',file:'original-music.mp3'},
 {id:'sakura-1',title:'樱花1',flower:'樱花 · 温柔与珍惜',file:'sakura-1.mp3'},
 {id:'cornflower-1',title:'蓝色矢车菊1',flower:'矢车菊 · 宁静与希望',file:'cornflower-1.mp3'},
 {id:'cornflower-2',title:'蓝色矢车菊2',flower:'矢车菊 · 宁静与希望',file:'cornflower-2.mp3'},
 {id:'sunflower-1',title:'向日葵1',flower:'向日葵 · 向阳与热爱',file:'sunflower-1.mp3'},
] as const;
export type BundledTrackId=typeof bundledTracks[number]['id'];
export const defaultEnergyTracks:Record<Energy,BundledTrackId>={low:'sakura-1',medium:'cornflower-1',high:'sunflower-1'};
export const isBundledTrack=(id:unknown):id is BundledTrackId=>bundledTracks.some(t=>t.id===id);
export const bundledTrack=(id:BundledTrackId)=>bundledTracks.find(t=>t.id===id)!;
