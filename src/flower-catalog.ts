export const seasons = [{id:'all',label:'全部'}, {id:'spring',label:'春'}, {id:'summer',label:'夏'}, {id:'autumn',label:'秋'}, {id:'winter',label:'冬'}] as const;
export type Season = 'spring'|'summer'|'autumn'|'winter';
export type FlowerShape = 'sakura'|'peach'|'tulip'|'magnolia'|'cornflower'|'lotus'|'hydrangea'|'sunflower'|'chrysanthemum'|'osmanthus'|'cosmos'|'dahlia'|'plum'|'camellia'|'wintersweet'|'narcissus';
export interface FlowerTheme {id:string;label:string;flowerName:string;season:Season;colorName:string;meaning:string;subtitle:string;shape:FlowerShape;color:string;petal:string;petalLight:string;stroke:string;center:string;centerLight:string}
export const themes = [
 {id:'sakura',label:'樱花',flowerName:'樱花',season:'spring',colorName:'樱粉',meaning:'温柔 · 珍惜当下',subtitle:'把温柔，留给今天',shape:'sakura',color:'#b9557a',petal:'#e9a3bc',petalLight:'#fff4f7',stroke:'#d889a6',center:'#d6a357',centerLight:'#fff8d9'},
 {id:'peach',label:'桃花',flowerName:'桃花',season:'spring',colorName:'桃粉',meaning:'美好 · 相遇',subtitle:'把新的相遇，种进春天',shape:'peach',color:'#b35c6e',petal:'#ee9fb0',petalLight:'#fff0f2',stroke:'#d27c93',center:'#be5a77',centerLight:'#ffe2bd'},
 {id:'tulip',label:'郁金香',flowerName:'郁金香',season:'spring',colorName:'丁香紫',meaning:'真诚 · 祝福',subtitle:'认真对待，每一个开始',shape:'tulip',color:'#8663a7',petal:'#bb99db',petalLight:'#f5eaff',stroke:'#9670b8',center:'#d4b06b',centerLight:'#fff2cb'},
 {id:'magnolia',label:'玉兰',flowerName:'玉兰',season:'spring',colorName:'玉白',meaning:'纯净 · 高洁',subtitle:'留一点清白，给自己的心',shape:'magnolia',color:'#79765a',petal:'#eee9d9',petalLight:'#ffffff',stroke:'#c3bd9f',center:'#b49b60',centerLight:'#fff2c9'},
 {id:'blue',label:'晴空蓝',flowerName:'矢车菊',season:'summer',colorName:'晴空蓝',meaning:'宁静 · 希望',subtitle:'清清爽爽，专注当下',shape:'cornflower',color:'#366ca9',petal:'#80addf',petalLight:'#e7f3ff',stroke:'#6296c9',center:'#3e70a6',centerLight:'#a5c8ec'},
 {id:'lotus',label:'荷花',flowerName:'荷花',season:'summer',colorName:'荷塘绿',meaning:'清雅 · 从容',subtitle:'心有清风，慢慢向前',shape:'lotus',color:'#3d7b69',petal:'#e8b3c1',petalLight:'#fff4f6',stroke:'#c6859f',center:'#c9ac54',centerLight:'#fff2aa'},
 {id:'hydrangea',label:'绣球',flowerName:'绣球',season:'summer',colorName:'雾紫',meaning:'团聚 · 感谢',subtitle:'把细小的美好，聚在一起',shape:'hydrangea',color:'#7866a8',petal:'#bba8db',petalLight:'#f0ebff',stroke:'#a08bc4',center:'#b9c78d',centerLight:'#f0f6d7'},
 {id:'sunflower',label:'向日葵',flowerName:'向日葵',season:'summer',colorName:'日光金',meaning:'向阳 · 热爱',subtitle:'朝着光，推进一点点',shape:'sunflower',color:'#a37122',petal:'#f2c755',petalLight:'#fff0af',stroke:'#d1a134',center:'#735238',centerLight:'#a17b4a'},
 {id:'chrysanthemum',label:'秋日金菊',flowerName:'菊花',season:'autumn',colorName:'菊花金',meaning:'从容 · 坚韧',subtitle:'一盏暖阳，从容向前',shape:'chrysanthemum',color:'#946b21',petal:'#e8bc54',petalLight:'#fff2bd',stroke:'#cf9b2c',center:'#bd7b1e',centerLight:'#fff2a4'},
 {id:'osmanthus',label:'桂花',flowerName:'桂花',season:'autumn',colorName:'桂花杏',meaning:'收获 · 美好',subtitle:'努力的日子，自有芬芳',shape:'osmanthus',color:'#9d783e',petal:'#edcd82',petalLight:'#fff3d2',stroke:'#d3ad64',center:'#b38537',centerLight:'#fff0b5'},
 {id:'cosmos',label:'波斯菊',flowerName:'波斯菊',season:'autumn',colorName:'玫粉',meaning:'自在 · 和谐',subtitle:'按自己的节奏，好好生长',shape:'cosmos',color:'#a45683',petal:'#dc97bd',petalLight:'#fff0fa',stroke:'#be76a2',center:'#d2ac4d',centerLight:'#fff1aa'},
 {id:'dahlia',label:'大丽花',flowerName:'大丽花',season:'autumn',colorName:'莓红',meaning:'丰盛 · 感谢',subtitle:'每一份积累，都在盛开',shape:'dahlia',color:'#a24f63',petal:'#d78b9e',petalLight:'#ffebef',stroke:'#b6677c',center:'#c89466',centerLight:'#ffe2b0'},
 {id:'plum',label:'梅花',flowerName:'梅花',season:'winter',colorName:'梅红',meaning:'坚韧 · 希望',subtitle:'寒意里，也有新的生机',shape:'plum',color:'#a34e6d',petal:'#dc91ac',petalLight:'#ffe8f1',stroke:'#bb6b8b',center:'#d5ad61',centerLight:'#fff3c1'},
 {id:'camellia',label:'山茶',flowerName:'山茶',season:'winter',colorName:'山茶红',meaning:'真挚 · 欣赏',subtitle:'认真盛开，也温柔待己',shape:'camellia',color:'#b25b51',petal:'#de9a91',petalLight:'#fff0e9',stroke:'#c37c73',center:'#d7b766',centerLight:'#fff4c7'},
 {id:'wintersweet',label:'蜡梅',flowerName:'蜡梅',season:'winter',colorName:'蜡梅黄',meaning:'坚守 · 温暖',subtitle:'把心里的光，留到花开',shape:'wintersweet',color:'#8e792e',petal:'#e3ce78',petalLight:'#fff4c6',stroke:'#c0a34d',center:'#a67d50',centerLight:'#efcf9d'},
 {id:'narcissus',label:'中国水仙',flowerName:'中国水仙',season:'winter',colorName:'水仙白',meaning:'新生 · 祝福',subtitle:'给新的日子，一个清新的开始',shape:'narcissus',color:'#5c7b68',petal:'#f7f6e9',petalLight:'#ffffff',stroke:'#c6cbb4',center:'#dab653',centerLight:'#fff1a5'},
] as const satisfies readonly FlowerTheme[];
export type Theme = typeof themes[number]['id'];
export const isTheme=(value:unknown):value is Theme=>themes.some(t=>t.id===value);
export const seasonLabel=(season:Season)=>seasons.find(s=>s.id===season)!.label;
function blend(a:string,b:string,weight:number){const parts=[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-weight)+parseInt(b.slice(i,i+2),16)*weight).toString(16).padStart(2,'0'));return '#'+parts.join('');}
export function paletteFor(theme:FlowerTheme):Record<string,string>{
 const a=theme.color;
 return {'--green':a,'--dark':blend('#292731',a,.3),'--paper':blend('#ffffff',a,.025),'--warm':blend('#ffffff',a,.07),'--line':blend('#ffffff',a,.17),'--text':blend('#37343d',a,.18),'--muted':blend('#716a72',a,.17),'--soft-muted':blend('#8b828b',a,.12),'--surface':'#fffefe','--sidebar':blend('#ffffff',a,.06),'--tint':blend('#ffffff',a,.085),'--tint-strong':blend('#ffffff',a,.20),'--accent':a,'--accent-dark':blend('#20222a',a,.8),'--accent-text':blend('#424048',a,.76),'--tag-bg':blend('#ffffff',a,.055),'--petal-light':theme.petalLight,'--petal':theme.petal,'--petal-stroke':theme.stroke,'--flower-center-light':theme.centerLight,'--flower-center':theme.center,'--leaf':blend('#b6c7ad',a,.08),'--stem':blend('#8ba183',a,.08)};
}
