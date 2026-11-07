import assert from 'node:assert/strict';
import {focusProgress} from '../src/focus-progress.ts';
const focus={mode:'focus',finished:false,duration:1500,end:123};
const rest={mode:'long',finished:false,duration:900,end:123};
assert.deepEqual(focusProgress(0,null,1500,15),{done:0,active:null,fraction:0,label:'本轮 0/4 段 · 慢慢开始'});
for(let count=0;count<9;count++){
 const r=focusProgress(count,focus,750,15);assert.equal(r.done,count%4);assert.equal(r.active,count%4);assert.equal(r.fraction,.5);
 const finished=focusProgress(count,{...focus,finished:true,end:null},0,15);assert.equal(finished.active,null);assert.equal(finished.done,count%4||(count?4:0));
}
const paused=focusProgress(2,{...focus,end:null},750,15);assert.equal(paused.fraction,.5);assert.match(paused.label,/已暂停/);
assert.match(focusProgress(4,{...focus,finished:true,end:null},0,20).label,/长休息 20 分钟/);
assert.match(focusProgress(4,rest,800,15).label,/正在长休息/);
assert.equal(focusProgress(4,rest,800,15).done,4);
assert.match(focusProgress(4,{...rest,finished:true,end:null},0,15).label,/长休息结束/);
assert.equal(focusProgress(4,focus,1500,15).done,0);
assert.equal(focusProgress(1,{...focus,prepared:true,end:null},1500,15).active,null);
assert.equal(focusProgress(0,focus,2000,15).fraction,0);
assert.equal(focusProgress(0,focus,-1,15).fraction,1);
console.log('Passed: four-stage progress, live fraction, pause, completion, long rest and next cycle.');
