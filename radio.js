/* Destellos de Gracia Radio — reproducción continua local */
(()=>{
'use strict';
const C=window.RadioCore,tracks=window.RADIO_TRACKS,$=id=>document.getElementById(id),audio=$('player');
const KEY='destellos-web-v1',DB='destellos-web-reportes-v1';
const media={id:{kind:'id',title:'Liora · Destellos de Gracia Radio',file:'liora-identificacion.m4a'},musicIntro:{kind:'musicIntro',title:'Liora · Un momento de piano',file:'liora-piano.m4a'},music:{kind:'music',title:'Luz al caminar · piano',file:'piano.m4a'},panoramaIntro:{kind:'panoramaIntro',title:'Liora · Esto es Panorama',file:'liora-panorama.m4a'},return:{kind:'return',title:'Liora · Regresamos a la Palabra',file:'liora-regreso.m4a'}};
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
let rotation={bag:C.validBag(saved.bag,tracks.length)?saved.bag:[],round:Number.isInteger(saved.round)?saved.round:0,last:Number.isInteger(saved.last)?saved.last:-1};
const positions=saved.positions&&typeof saved.positions==='object'?saved.positions:{};
let aired=Array.isArray(saved.aired)?saved.aired.filter(x=>typeof x==='string').slice(-100):[];
let db=null,current=null,revision=0,objectUrl=null,started=false,errors=0,pendingEpisode=null,pilotQueued=false,lastSave=0,wakeLock=null;
const episodes=new Map();
$('schedule').checked=saved.schedule!==false;
function log(text){const li=document.createElement('li');li.textContent=C.prTime().clock+' · '+text;$('log').prepend(li);while($('log').children.length>100)$('log').lastElementChild.remove();}
function persist(){
 if(current?.kind==='sermon'&&audio.readyState>=1&&Number.isFinite(audio.currentTime))positions[current.file]=audio.ended?0:audio.currentTime;
 const state={...rotation,positions,aired,schedule:$('schedule').checked,currentSermon:current?.kind==='sermon'?current.index:saved.currentSermon};
 saved=state;try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){$('archiveStatus').textContent='El navegador no permite guardar el progreso. La radio sigue funcionando durante esta sesión.';}
}
function update(){
 const now=C.prTime();$('clock').textContent=now.date+' · '+now.clock+' · Puerto Rico';
 $('round').textContent='Ronda '+Math.max(1,rotation.round)+' · '+rotation.bag.length+' prédicas pendientes de seleccionar';
 const latest=C.latestSlot(now),due=$('schedule').checked?C.due([...episodes.values()],aired,now):null;
 $('scheduleStatus').textContent=!$('schedule').checked?'Reportes automáticos desactivados.':due?'Reporte de hoy listo: '+due.slot.name+'. Entrará al terminar el bloque actual.':!latest?'La programación informativa comienza a las 06:00.':'Continúan las prédicas y el piano. '+latest.name+': '+(aired.includes(now.date+':'+latest.id)?'edición ya emitida.':'sin edición vigente pendiente.');
 for(const s of C.slots){
  const ep=episodes.get(s.id),p=$('info-'+s.id);
  p.textContent=!ep?'Pendiente de audio.':ep.date!==now.date?'Archivo del '+ep.date+' · No se emite hoy.':aired.includes(now.date+':'+s.id)?'Edición de hoy emitida.':'Edición de hoy disponible · '+duration(ep.duration)+'.';
 }
}
function duration(n){return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
async function holdAwake(){try{if('wakeLock'in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request('screen');}catch(e){/* El usuario conserva el control de reposo del Mac. */}}
function releaseAwake(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}}
async function playItem(item){
 persist();audio.pause();const token=++revision;current=item;
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
 $('title').textContent=item.title;
 $('kind').textContent=item.kind==='sermon'?'Predicación completa':item.kind==='panorama'?(item.pilot?'Panorama · archivo piloto del 28 de octubre de 2026':'Panorama · edición '+item.episode.date):item.kind==='music'?'Piano instrumental':'La voz de Liora';
 audio.src=item.blob?(objectUrl=URL.createObjectURL(item.blob)):(item.file.startsWith('https://')?item.file:item.file.split('/').map(encodeURIComponent).join('/'));
 audio.load();$('status').textContent='Preparando '+item.title+'…';
 const seek=Number(item.kind==='sermon'?positions[item.file]:0)||0;
 audio.onloadedmetadata=()=>{
  if(token!==revision)return;
  if(seek>0&&Number.isFinite(audio.duration)&&seek<audio.duration-2)audio.currentTime=seek;
 };
 log(item.title);update();
 try{await audio.play();if(token===revision){$('status').textContent='Escuchando '+item.title;holdAwake();}}
 catch(e){if(token===revision)$('status').textContent='Pulsa ▶ en el reproductor para comenzar o continuar.';}
}
function sermon(){
 const next=C.take(rotation,tracks.length);rotation={bag:next.bag,round:next.round,last:next.last};
 const t=tracks[next.index];return playItem({kind:'sermon',index:next.index,title:t.title,file:t.url,positionFile:t.file});
}
function startNews(due){pendingEpisode=due;return playItem(media.panoramaIntro);}
function newsAtBoundary(){
 if(pilotQueued){pilotQueued=false;$('pilotStatus').textContent='El piloto se está reproduciendo como archivo de prueba.';startNews({episode:{date:'2026-10-28',title:'Panorama · piloto del 28 de octubre de 2026'},pilot:true});return true;}
 if(!$('schedule').checked)return false;
 const due=C.due([...episodes.values()],aired,C.prTime());if(!due)return false;startNews(due);return true;
}
function advance(completed=true){
 const previous=current;
 if(previous?.kind==='sermon'&&completed)positions[previous.file]=0;
 if(previous?.kind==='panoramaIntro'){
  const d=pendingEpisode;
  // La medianoche o un cambio de horario no deben convertir una edición vieja en vigente.
  if(!d?.pilot){const now=C.prTime(),latest=C.latestSlot(now);if(!d||d.episode.date!==now.date||latest?.id!==d.slot.id){pendingEpisode=null;return sermon();}}
  return playItem(d.pilot?{kind:'panorama',pilot:true,title:d.episode.title,file:'panorama-piloto-2026-10-28.m4a'}:{kind:'panorama',title:d.slot.name,episode:d.episode,key:d.key,blob:d.episode.blob,file:d.episode.url});
 }
 if(previous?.kind==='panorama'){
  if(completed&&previous.key){aired.push(previous.key);aired=aired.slice(-100);persist();log('Edición de Panorama terminada.');}
  pendingEpisode=null;return playItem(media.return);
 }
 if(previous?.kind==='return')return sermon();
 if(previous?.kind==='musicIntro')return playItem(media.music);
 if(newsAtBoundary())return;
 if(previous?.kind==='sermon')return playItem(media.musicIntro);
 if(previous?.kind==='music')return playItem(media.id);
 return sermon();
}
function begin(){
 if(started){audio.play().catch(()=>{$('status').textContent='Pulsa ▶ para continuar.';});return;}
 started=true;errors=0;playItem(media.id);
}
audio.addEventListener('ended',()=>{errors=0;advance(true);});
audio.addEventListener('error',()=>{
 if(!started)return;
 errors++;log('No se pudo abrir '+(current?.title||'el archivo')+'.');
 if(errors>=5){revision++;audio.pause();started=false;releaseAwake();$('status').textContent='No se pudieron abrir varios archivos. Comprueba tu conexión a internet y vuelve a encender la radio.';return;}
 $('status').textContent='No se pudo abrir este bloque; continuamos con otro.';
 // Una entrada informativa fallida no debe dar paso a un informe sin presentación.
 if(current?.kind==='panoramaIntro'){pendingEpisode=null;sermon();}else advance(false);
});
audio.addEventListener('playing',()=>{$('status').textContent='Escuchando '+(current?.title||'la radio');holdAwake();});
audio.addEventListener('pause',()=>{if(!audio.ended){$('status').textContent='En pausa. Pulsa ▶ para continuar.';releaseAwake();}});
audio.addEventListener('timeupdate',()=>{if(Date.now()-lastSave>3000){persist();lastSave=Date.now();}});
$('start').addEventListener('click',begin);
$('next').addEventListener('click',()=>{if(!started)begin();else{errors=0;advance(false);}});
$('schedule').addEventListener('change',()=>{persist();update();});
$('pilot').addEventListener('click',()=>{pilotQueued=true;$('pilotStatus').textContent='Piloto añadido al próximo cambio de bloque. No interrumpirá la prédica.';if(!started)begin();});
window.addEventListener('pagehide',()=>{persist();releaseAwake();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!audio.paused)holdAwake();});
function renderLibrary(){
 const query=$('search').value.trim().toLocaleLowerCase('es');$('library').replaceChildren();let count=0;
 tracks.forEach((t,i)=>{
  if(!t.title.toLocaleLowerCase('es').includes(query))return;count++;
  const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=String(i+1).padStart(3,'0')+' · '+t.title;
  button.addEventListener('click',()=>{if(rotation.round===0){rotation.round=1;rotation.bag=C.shuffle(tracks.map((_,n)=>n));}rotation.bag=rotation.bag.filter(x=>x!==i);rotation.last=i;started=true;playItem({kind:'sermon',index:i,title:t.title,file:t.url});});li.append(button);$('library').append(li);
 });$('count').textContent=count+' de '+tracks.length+' prédicas';
}
$('search').addEventListener('input',renderLibrary);
for(const s of C.slots){
 const box=document.createElement('div');box.className='program-slot';const heading=document.createElement('h3');heading.textContent=s.name+' · '+s.format;const info=document.createElement('p');info.id='info-'+s.id;info.className='note';box.append(heading,info);$('slots').append(box);
 const option=document.createElement('option');option.value=s.id;option.textContent=s.name;$('slot').append(option);
}
$('date').value=C.prTime().date;
function openArchive(){return new Promise(resolve=>{
 try{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('episodes',{keyPath:'slot'});
  request.onerror=request.onblocked=()=>resolve(false);
  request.onsuccess=()=>{db=request.result;db.onversionchange=()=>{db.close();db=null;};const tx=db.transaction('episodes','readonly'),get=tx.objectStore('episodes').getAll();get.onsuccess=()=>{for(const ep of get.result)if(C.slots.some(s=>s.id===ep.slot)&&ep.blob)episodes.set(ep.slot,ep);resolve(true);};get.onerror=()=>resolve(false);};
 }catch(e){resolve(false);}
});}
function storeEpisode(ep){return new Promise(resolve=>{if(!db)return resolve(false);try{const tx=db.transaction('episodes','readwrite');tx.objectStore('episodes').put(ep);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);}catch(e){resolve(false);}});}
function audioDuration(file){return new Promise((resolve,reject)=>{
 const probe=document.createElement('audio'),url=URL.createObjectURL(file);let finished=false;
 function finish(error,value){if(finished)return;finished=true;clearTimeout(timer);probe.removeAttribute('src');probe.load();URL.revokeObjectURL(url);error?reject(error):resolve(value);}
 const timer=setTimeout(()=>finish(new Error('No se pudo comprobar la duración.')),15000);
 probe.onloadedmetadata=()=>finish(Number.isFinite(probe.duration)&&probe.duration>0?null:new Error('Duración inválida.'),probe.duration);
 probe.onerror=()=>finish(new Error('El navegador no pudo abrir este formato.'));probe.preload='metadata';probe.src=url;
});}
$('upload').addEventListener('change',async()=>{
 const file=$('upload').files[0];if(!file)return;
 if(!$('reviewed').checked||!$('date').value){$('uploadStatus').textContent='Indica la fecha y confirma que revisaste el reporte.';return;}
 const slot=$('slot').value,date=$('date').value;$('upload').disabled=true;$('uploadStatus').textContent='Comprobando el audio…';
 try{
  const duration=await audioDuration(file),ep={slot,date,duration,reviewed:true,title:file.name,blob:file};episodes.set(slot,ep);const stored=await storeEpisode(ep);
  $('uploadStatus').textContent='Audio incorporado · '+durationText(duration)+'. '+(date===C.prTime().date?'Puede emitirse hoy en su horario.':'Se conserva con su fecha; no se emitirá hoy.');
  $('archiveStatus').textContent=stored?'Reportes guardados en este navegador. Conserva los archivos originales; borrar los datos del navegador elimina estas copias.':'El reporte funciona en esta sesión. Vuelve a cargarlo al abrir si el navegador no permite conservarlo.';
  $('reviewed').checked=false;update();log('Reporte cargado: '+date+' · '+slot);
 }catch(e){$('uploadStatus').textContent=e.message;}finally{$('upload').disabled=false;$('upload').value='';}
});
function durationText(n){return Math.floor(n/60)+' min '+Math.floor(n%60)+' s';}
openArchive().then(ok=>{$('archiveStatus').textContent=ok?'Guardado local de reportes disponible. No incluye producción automática de noticias.':'Sin guardado permanente de reportes; los archivos cargados funcionarán durante esta sesión.';update();});

async function sharedEditions(){
 try{
  const response=await fetch('ediciones.json',{cache:'no-store'});if(!response.ok)return;
  const records=await response.json();if(!Array.isArray(records))return;
  for(const ep of records){
   if(!C.slots.some(s=>s.id===ep.slot)||!/^\d{4}-\d{2}-\d{2}$/.test(ep.date)||ep.reviewed!==true||!Number.isFinite(ep.duration)||ep.duration<=0||typeof ep.url!=='string')continue;
   const url=new URL(ep.url,location.href);if(url.protocol!=='https:')continue;
   episodes.set(ep.slot,{...ep,url:url.href});
  }update();
 }catch(e){/* Sin reporte vigente, continúan las prédicas y el piano. */}
}
renderLibrary();update();sharedEditions();setInterval(update,15000);setInterval(sharedEditions,300000);

})();
