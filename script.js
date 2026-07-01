const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const storeKey='ppu-v2';
let songs=[], current=null, A=null, B=null, loop=false, metro=null, audioCtx=null, mediaRecorder=null, chunks=[], sessionRecords=0;
const state=load();
function load(){try{return JSON.parse(localStorage.getItem(storeKey))||{favorites:{},history:{},notes:{},minutes:{},lastDate:null,streak:0,dark:false}}catch(e){return {favorites:{},history:{},notes:{},minutes:{},lastDate:null,streak:0,dark:false}}}
function save(){localStorage.setItem(storeKey,JSON.stringify(state));renderStats();}
function today(){return new Date().toISOString().slice(0,10)}
function touchPractice(min=0){const t=today(); if(state.lastDate!==t){const y=new Date();y.setDate(y.getDate()-1); const yd=y.toISOString().slice(0,10); state.streak=state.lastDate===yd?(state.streak||0)+1:1; state.lastDate=t;} if(current){state.minutes[current.id]=(state.minutes[current.id]||0)+min;} save();}
async function init(){ if(state.dark) document.body.classList.add('dark'); songs=await fetch('songs.json').then(r=>r.json()); current=songs[0]; setupSong(current); renderSongs(); buildRating(); bind(); renderStats(); showView('home'); }
function bind(){
 $$('.nav').forEach(b=>b.onclick=()=>showView(b.dataset.view)); $$('[data-open-song]').forEach(b=>b.onclick=()=>{setupSong(songs.find(s=>s.id===b.dataset.openSong));showView('practice')});
 $('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');state.dark=document.body.classList.contains('dark');$('#themeBtn').textContent=state.dark?'☀️ 浅色':'🌙 深色';save()};
 $('#resetBtn').onclick=()=>{if(confirm('确定清除本机所有练习记录、评分、收藏和笔记吗？')){localStorage.removeItem(storeKey);location.reload();}};
 $('#favoriteBtn').onclick=toggleFav; $('#favInSong').onclick=toggleFav;
 $('#playBtn').onclick=()=> $('#audio').paused?$('#audio').play():$('#audio').pause(); $('#back5').onclick=()=>$('#audio').currentTime=Math.max(0,$('#audio').currentTime-5); $('#fwd5').onclick=()=>$('#audio').currentTime+=5;
 $('#rate').onchange=e=>$('#audio').playbackRate=parseFloat(e.target.value);
 $('#setA').onclick=()=>{A=$('#audio').currentTime;updateAB()}; $('#setB').onclick=()=>{B=$('#audio').currentTime;updateAB()}; $('#loopBtn').onclick=()=>{loop=!loop;$('#loopBtn').textContent='A-B 循环：'+(loop?'开':'关')};
 $('#audio').ontimeupdate=()=>{ if(loop&&A!=null&&B!=null&&$('#audio').currentTime>=B) $('#audio').currentTime=A; };
 $('#audio').onplay=()=>touchPractice(1);
 $('#minusTempo').onclick=()=>changeTempo(-1); $('#plusTempo').onclick=()=>changeTempo(1); $('#metroBtn').onclick=toggleMetro;
 $('#recBtn').onclick=toggleRecord;
 $$('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
 $('#saveRating').onclick=saveRating; $('#saveNotes').onclick=()=>{state.notes[current.id]=$('#notes').value;save();alert('笔记已保存')};
 $('#search').oninput=renderSongs;
}
function showView(id){$$('.view').forEach(v=>v.classList.remove('show')); $('#'+id).classList.add('show'); $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id)); $('#pageTitle').textContent={home:'赞美诗练歌平台',songs:'全部诗歌',practice:'今日练歌',report:'成长报告',library:'敬拜资料库',settings:'设置'}[id]; if(id==='report') renderReport();}
function showTab(id){$$('.tabBody').forEach(v=>v.classList.remove('show')); $('#'+id).classList.add('show'); $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));}
function setupSong(song){current=song; $('#audio').src=song.audio; $('#scoreImg').src=song.score; $('#songTitle').textContent=song.title; $('#songMeta').textContent=`${song.englishTitle} · Key ${song.key} · ♩=${song.tempo} · ${song.meter}`; $('#tempoNum').textContent=song.tempo; $('#notes').value=state.notes[song.id]||''; $('#lyrics').innerHTML=song.lyrics.map(l=>`<p>${l}</p>`).join(''); updateFavButtons(); renderHistory();}
function renderSongs(){const q=($('#search')?.value||'').toLowerCase(); $('#songList').innerHTML=songs.filter(s=>(s.title+s.englishTitle+s.category+s.key).toLowerCase().includes(q)).map(s=>`<article class="songCard"><span class="tag">${s.category}</span><h3>${s.title}</h3><p>${s.englishTitle} · Key ${s.key} · ♩=${s.tempo}</p><button class="primary" onclick="openSong('${s.id}')">进入练习</button></article>`).join('');}
window.openSong=id=>{setupSong(songs.find(s=>s.id===id));showView('practice')}
function toggleFav(){state.favorites[current.id]=!state.favorites[current.id];save();updateFavButtons();}
function updateFavButtons(){const on=state.favorites[current.id]; $('#favoriteBtn').textContent=on?'★ 已收藏':'☆ 收藏'; $('#favInSong').textContent=on?'★':'☆';}
function updateAB(){const f=t=>t==null?'--:--':`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`; $('#abStatus').textContent=`A ${f(A)} / B ${f(B)}`;}
function changeTempo(n){$('#tempoNum').textContent=Math.max(30,parseInt($('#tempoNum').textContent)+n)}
function tick(){ if(!audioCtx) audioCtx=new AudioContext(); const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.frequency.value=880; g.gain.value=.08; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+.05); }
function toggleMetro(){ if(metro){clearInterval(metro);metro=null;$('#metroBtn').textContent='Start';return} tick(); metro=setInterval(tick,60000/parseInt($('#tempoNum').textContent)); $('#metroBtn').textContent='Stop';}
function setRecStatus(txt, cls=''){const el=$('#recStatus'); if(el){el.textContent=txt; el.className='recStatus '+cls;}}
async function toggleRecord(){
 if(mediaRecorder&&mediaRecorder.state==='recording'){
   mediaRecorder.stop(); $('#recBtn').textContent='🎙 开始录音'; setRecStatus('正在生成回听音频…','on'); return;
 }
 if(!window.isSecureContext){setRecStatus('需要 https 网站才可录音','err'); alert('录音需要在 GitHub Pages 的 https 网址中打开，不能用 file:// 本地文件录音。'); return;}
 if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){setRecStatus('此浏览器不支持麦克风录音','err'); alert('当前浏览器不支持网页录音。请用 Chrome/Edge，或在 iPhone/Mac 上更新 Safari 后重试。'); return;}
 if(!window.MediaRecorder){setRecStatus('此浏览器不支持 MediaRecorder','err'); alert('当前浏览器不支持 MediaRecorder 录音。建议换 Chrome 浏览器打开 GitHub Pages 网址。'); return;}
 try{
   setRecStatus('正在请求麦克风权限…','on');
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   chunks=[];
   const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? {mimeType:'audio/webm;codecs=opus'} : (MediaRecorder.isTypeSupported('audio/mp4') ? {mimeType:'audio/mp4'} : {});
   mediaRecorder=new MediaRecorder(stream, options);
   mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data)};
   mediaRecorder.onerror=()=>{setRecStatus('录音发生错误','err');};
   mediaRecorder.onstop=()=>{
     const type=mediaRecorder.mimeType || options.mimeType || 'audio/webm';
     const blob=new Blob(chunks,{type});
     $('#recAudio').src=URL.createObjectURL(blob);
     sessionRecords++; $('#recordCount').textContent=sessionRecords;
     stream.getTracks().forEach(t=>t.stop());
     setRecStatus('录音已完成，可点击回听','on');
   };
   mediaRecorder.start();
   $('#recBtn').textContent='■ 停止录音';
   setRecStatus('正在录音…请唱歌，完成后点停止','on');
 }catch(e){
   const msg = e && e.name==='NotAllowedError' ? '麦克风权限被拒绝，请在浏览器地址栏允许麦克风' : '没有取得麦克风权限，或当前环境不支持录音';
   setRecStatus(msg,'err'); alert(msg);
 }
}
function buildRating(){const items=['音准','节奏','气息','咬字','情感表达','熟练度']; $('#ratingForm').innerHTML=items.map(i=>`<div class="rateItem"><label><span>${i}</span><b id="v-${i}">4</b></label><input type="range" min="1" max="5" value="4" data-rate="${i}"></div>`).join(''); $$('[data-rate]').forEach(r=>r.oninput=()=>$('#v-'+r.dataset.rate).textContent=r.value);}
function saveRating(){const vals=[...$$('[data-rate]')].map(r=>+r.value); const total=vals.reduce((a,b)=>a+b,0); const score=Math.round(total/30*100); const rec={date:new Date().toLocaleString(),score,detail:vals}; state.history[current.id]=state.history[current.id]||[]; state.history[current.id].unshift(rec); state.history[current.id]=state.history[current.id].slice(0,50); $('#ratingResult').textContent=`本次综合：${score} 分`; touchPractice(3); renderHistory(); save();}
function renderHistory(){const h=state.history[current.id]||[]; $('#history').innerHTML=h.length?h.map(x=>`<div class="histItem"><span>${x.date}</span><strong>${x.score} 分</strong></div>`).join(''):'<p style="color:var(--muted)">还没有评分记录。</p>';}
function allScores(){return Object.values(state.history).flat().map(x=>x.score)}
function renderStats(){const scores=allScores(); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):'--'; const best=scores.length?Math.max(...scores):'--'; const mins=Object.values(state.minutes||{}).reduce((a,b)=>a+b,0); $('#avgScore').textContent=avg; $('#bestScore').textContent=best; $('#totalMinutes').textContent=mins+' 分钟'; $('#streak').textContent=(state.streak||0)+' 天'; $('#themeBtn').textContent=document.body.classList.contains('dark')?'☀️ 浅色':'🌙 深色';}
function renderReport(){const scores=allScores(); const mins=Object.values(state.minutes||{}).reduce((a,b)=>a+b,0); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0; $('#reportBox').innerHTML=`<h3>总体练习</h3><p>累计练习：${mins} 分钟｜评分次数：${scores.length}｜平均分：${avg||'--'}</p><div class="bar"><i style="width:${Math.min(avg,100)}%"></i></div><h3>最近评分</h3>${scores.slice(0,10).map(s=>`<div class="histItem"><span>练习评分</span><strong>${s} 分</strong></div>`).join('')||'<p>暂无评分。</p>'}`;}
init();
