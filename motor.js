(function(root){
'use strict';
const slots=[
 {id:'p06',minute:360,name:'06:00 · Panorama 12M',format:'aprox. 12 minutos'},
 {id:'p08',minute:480,name:'08:00 · Panorama al día',format:'reporte breve'},
 {id:'p10',minute:600,name:'10:00 · Actualización',format:'si hay novedades verificadas'},
 {id:'p12',minute:720,name:'12:00 · Panorama 24M',format:'aprox. 24 minutos'},
 {id:'p15',minute:900,name:'15:00 · Panorama de la tarde',format:'actualización'},
 {id:'p19',minute:1140,name:'19:00 · Panorama al cierre',format:'balance del día'},
 {id:'p21',minute:1260,name:'21:00 · Panorama en la noche',format:'aprox. 12 minutos'}
];
function prTime(date=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
 return {date:p.year+'-'+p.month+'-'+p.day,minute:Number(p.hour)*60+Number(p.minute),clock:p.hour+':'+p.minute};
}
function shuffle(items,random=Math.random){
 const a=items.slice();
 for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 return a;
}
function validBag(bag,n){return Array.isArray(bag)&&bag.every(x=>Number.isInteger(x)&&x>=0&&x<n)&&new Set(bag).size===bag.length;}
function take(state,n,random=Math.random){
 if(!n)throw new Error('Biblioteca vacía');
 let bag=validBag(state.bag,n)?state.bag.slice():[];
 let round=Number.isInteger(state.round)&&state.round>0?state.round:0;
 if(!bag.length){
  round++;bag=shuffle(Array.from({length:n},(_,i)=>i),random);
  if(n>1&&bag[0]===state.last)[bag[0],bag[1]]=[bag[1],bag[0]];
 }
 const index=bag.shift();return {index,bag,round,last:index};
}
function latestSlot(now){return slots.filter(s=>s.minute<=now.minute).pop()||null;}
function due(episodes,aired,now){
 const slot=latestSlot(now);if(!slot)return null;
 const episode=episodes.find(e=>e.slot===slot.id&&e.date===now.date&&e.reviewed===true&&(e.blob||(typeof e.url==='string'&&e.url.startsWith('https://')))&&Number.isFinite(e.duration)&&e.duration>0);
 if(!episode)return null;
 const key=now.date+':'+slot.id;
 return aired.includes(key)?null:{episode,key,slot};
}
const api={slots,prTime,shuffle,validBag,take,latestSlot,due};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.RadioCore=api;
})(typeof window!=='undefined'?window:globalThis);
