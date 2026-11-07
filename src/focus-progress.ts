type CycleTimer={mode:'focus'|'short'|'long';finished:boolean;prepared?:boolean;end:number|null;duration:number};

export function focusProgress(completed:number,timer:CycleTimer|null,remaining:number,longMinutes:number){
 const count=Math.max(0,Math.floor(completed));
 const focusing=!!timer&&timer.mode==='focus'&&!timer.finished&&!timer.prepared;
 const done=count%4||(count&&!focusing?4:0);
 const active=focusing?done:null;
 const fraction=focusing&&timer.duration>0?Math.min(1,Math.max(0,1-remaining/timer.duration)):0;
 let label=`本轮 ${done}/4 段 · 慢慢开始`;
 if(focusing)label=`本轮 ${done}/4 段 · 第 ${done+1} 段${timer.end?'专注中':'已暂停'}`;
 else if(done===4)label=timer?.mode==='long'&&!timer.prepared
   ?timer.finished?'长休息结束 · 准备好再开始新一轮':`本轮 4/4 段 · ${timer.end?'正在长休息':'长休息已暂停'}`
   :`本轮 4/4 段 · 可以长休息 ${longMinutes} 分钟`;
 else if(count)label=`本轮 ${done}/4 段 · 再推进 ${4-done} 段可长休息`;
 return {done,active,fraction,label};
}
