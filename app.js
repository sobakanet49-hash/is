(function(){
"use strict";
const KEY="istools_v1";
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=s=>esc(s).replace(/`([^`]+)`/g,"<code>$1</code>");
const uid=()=>Math.random().toString(36).slice(2,9);
const dstr=t=>t?new Date(t).toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"}):"—";
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const PASS=60;

/* ---------- storage ---------- */
let mem=null;
function load(){try{const s=localStorage.getItem(KEY);if(s)return JSON.parse(s)}catch(e){}return mem}
function save(){mem=DB;try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}
function seed(){
  const now=Date.now(),day=864e5;
  const d={users:[{id:"t1",role:"teacher",name:"Преподаватель курса",email:"teacher@ist.edu",pass:"teacher123",group:"",created:now-90*day}],session:null,prog:{},over:{}};
  const mk=(id,name,email,group,done,pend,scores)=>{
    d.users.push({id,role:"student",name,email,pass:"demo123",group,demo:true,created:now-40*day});
    d.prog[id]={};
    for(let i=1;i<=done+pend;i++){
      const best=scores[i%scores.length];
      const p={checks:{},best,attempts:1+(i%2),last:now-(done+pend-i)*day,sub:null};
      for(let k=0;k<4;k++)p.checks["t"+k]=true;
      if(i<=done)p.sub={file:"lab"+i+"_report.pdf",size:120000+i*9100,note:"",date:now-(done+pend-i)*day,status:"graded",grade:Math.min(100,best-4+(i%3)*4),comment:i%2?"Работа выполнена полно, оформление аккуратное.":"Хорошо. Добавьте больше выводов в конце отчёта."};
      else p.sub={file:"lab"+i+"_report.docx",size:98000+i*7300,note:"Прошу проверить работу.",date:now-day,status:"review",grade:null,comment:""};
      d.prog[id][i]=p;
    }
  };
  mk("d1","Анна Иванова","anna@example.edu","ИС-21",5,2,[92,88,100,84,96]);
  mk("d2","Тимур Каримов","timur@example.edu","ИС-21",2,1,[76,68,84]);
  mk("d3","Елена Петрова","elena@example.edu","ИС-22",1,0,[100]);
  return d;
}
let DB=load()||seed();
save();

/* ---------- model ---------- */
const me=()=>DB.users.find(u=>u.id===DB.session)||null;
const lab=n=>LABS.find(l=>l.n===n);
const ov=n=>DB.over[n]||{};
const goalOf=l=>ov(l.n).goal||l.goal;
const tasksOf=l=>ov(l.n).tasks||l.tasks;
const advOf=l=>ov(l.n).adv||l.adv;
const peek=(u,n)=>(DB.prog[u]||{})[n];
function P(u,n){DB.prog[u]=DB.prog[u]||{};return DB.prog[u][n]=DB.prog[u][n]||{checks:{},best:null,attempts:0,sub:null,last:0}}
function labState(u,l){
  const p=peek(u,l.n);
  const out={p,frac:0,passed:false,submitted:false,graded:false,score:0,progress:0,status:"new"};
  if(!p)return out;
  const tn=tasksOf(l).length;
  const c=Object.keys(p.checks||{}).filter(k=>p.checks[k]&&+k.slice(1)<tn).length;
  out.frac=tn?Math.min(1,c/tn):0;
  out.passed=p.best!=null&&p.best>=PASS;
  out.submitted=!!p.sub;
  out.graded=!!(p.sub&&p.sub.status==="graded");
  out.score=Math.round(((p.best||0)*0.4+(out.graded?p.sub.grade*0.6:0))*10)/10;
  out.progress=Math.round(40*out.frac+(out.passed?30:0)+(out.submitted?30:0));
  const act=c>0||p.attempts>0||out.submitted;
  out.status=(out.passed&&out.submitted)?"done":act?"doing":"new";
  return out;
}
function mark(pct){return pct>=90?{n:5,t:"Отлично"}:pct>=75?{n:4,t:"Хорошо"}:pct>=60?{n:3,t:"Удовлетворительно"}:{n:2,t:"Неудовлетворительно"}}
function summary(u){
  let done=0,points=0,graded=0,sub=0,last=0;
  LABS.forEach(l=>{const s=labState(u,l);if(s.status==="done")done++;if(s.graded)graded++;if(s.submitted)sub++;points+=s.score;if(s.p&&s.p.last>last)last=s.p.last});
  const pct=Math.round(points/LABS.length);
  return{done,points:Math.round(points),pct,graded,sub,last,mark:mark(pct),eligible:done===LABS.length&&pct>=PASS};
}
const statusText={new:"Не начата",doing:"В процессе",done:"Завершена"};
const subText={review:"На проверке",graded:"Проверена"};

/* ---------- icons ---------- */
const ic=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ICON={
  home:ic('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  labs:ic('<path d="M9 3h6"/><path d="M10 3v6L5 19a1.5 1.5 0 001.3 2h11.4A1.5 1.5 0 0019 19l-5-10V3"/><path d="M7.5 15h9"/>'),
  user:ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  teach:ic('<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M7 10.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-5.5"/>'),
  out:ic('<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4"/><path d="M19 12H9"/>'),
  login:ic('<path d="M14 4h5v16h-5"/><path d="M9 8l-4 4 4 4"/><path d="M5 12h10"/>'),
  menu:ic('<path d="M4 6h16M4 12h16M4 18h16"/>')
};

/* ---------- app shell ---------- */
const toastEl=$("#toast");let tt;
function toast(m){toastEl.textContent=m;toastEl.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove("show"),2600)}
function go(h){if(location.hash.slice(1)===h)route();else location.hash=h}

function renderNav(r){
  const u=me();
  const item=(h,i,t,on)=>`<a href="#${h}" class="${on?"on":""}">${ICON[i]}<span>${t}</span></a>`;
  let h="";
  h+=item("home","home","Главная",r.name==="home");
  if(u){
    h+=item("labs","labs","Лабораторные работы",r.name==="labs"||r.name==="lab");
    if(u.role==="student")h+=item("cabinet","user","Личный кабинет",r.name==="cabinet"||r.name==="cert");
    if(u.role==="teacher")h+=item("teacher","teach","Панель преподавателя",r.name==="teacher");
    h+='<div class="sep"></div><button data-act="logout" type="button">'+ICON.out+'<span>Выйти</span></button>';
  }else h+=item("auth","login","Вход и регистрация",r.name==="auth");
  let card="";
  if(u&&u.role==="student"){
    const s=summary(u);
    card=`<div class="sidecard"><div class="who"><div class="ava">${esc(u.name.slice(0,1).toUpperCase())}</div><span><strong>${esc(u.name)}</strong><small>${esc(u.group||"Студент")}</small></span></div><b>Прогресс: ${s.done} из ${LABS.length}</b><div class="bar"><i style="width:${Math.round(s.done/LABS.length*100)}%"></i></div><small>Баллы: ${s.points} из ${LABS.length*100}</small></div>`;
  }else if(u){
    card=`<div class="sidecard"><div class="who"><div class="ava">П</div><span><strong>${esc(u.name)}</strong><small>Преподаватель</small></span></div></div>`;
  }else card=`<div class="sidecard"><b>Гостевой режим</b><small>Войдите, чтобы сохранять прогресс и проходить тесты.</small></div>`;
  $("#nav").innerHTML=h;$("#sidecard").innerHTML=card;
}

function parse(){
  const h=location.hash.slice(1)||"home";
  const m=h.match(/^lab-(\d+)$/);
  if(m&&lab(+m[1]))return{name:"lab",n:+m[1]};
  if(["home","labs","cabinet","cert","teacher","auth"].includes(h))return{name:h};
  return{name:"home"};
}
function route(){
  let r=parse();const u=me();
  if(["labs","lab","cabinet","cert"].includes(r.name)&&!u){r={name:"auth"};}
  if(["cabinet","cert"].includes(r.name)&&u.role!=="student")r={name:"home"};
  if(r.name==="teacher"&&(!u||u.role!=="teacher"))r={name:"auth"};
  if(r.name==="cert"&&!summary(u).eligible)r={name:"cabinet"};
  document.body.classList.remove("nav-open");
  renderNav(r);
  const v=$("#view");
  const map={home:vHome,labs:vLabs,lab:()=>vLab(r.n),cabinet:vCabinet,cert:vCert,teacher:vTeacher,auth:vAuth};
  v.innerHTML=map[r.name]();
  v.classList.remove("view");void v.offsetWidth;v.classList.add("view");
  if(r.name==="lab")wireLab(r.n);
  window.scrollTo(0,0);
}

/* ---------- views ---------- */
function ring(pct){
  const c=2*Math.PI*52;
  return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Прогресс ${Math.round(pct)}%"><circle cx="60" cy="60" r="52" class="rt"/><circle cx="60" cy="60" r="52" class="rv" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-pct/100)).toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="60" text-anchor="middle" class="rn">${Math.round(pct)}%</text><text x="60" y="78" text-anchor="middle" class="rs">курса</text></svg>`;
}
function vHome(){
  const u=me();const st=u&&u.role==="student";
  const s=st?summary(u):{done:0,points:0,pct:0};
  const tools=[...new Set(LABS.flatMap(l=>l.tools))];
  const qn=LABS.reduce((a,l)=>a+l.test.length,0);
  const prog=st?`${ring(s.done/LABS.length*100)}<small>Выполнено ${s.done} из ${LABS.length} работ · ${s.points} баллов</small>`
    :u?`${ring(0)}<small>Откройте панель преподавателя, чтобы проверять работы</small>`
    :`${ring(0)}<small>Войдите, чтобы прогресс сохранялся автоматически</small>`;
  const startLabel=st&&s.done>0&&s.done<LABS.length?"Продолжить обучение":"Начать обучение";
  return `<div class="stack">
  <section class="hero"><div><span class="kick">Дисциплина · IS Tools – Образовательная лаборатория</span>
  <h1>Инструментальные средства информационной системы</h1>
  <p>Практический курс для студентов вузов: от выбора инструментов и проектирования ИС до баз данных, веб-интерфейса, REST API, тестирования, безопасности и применения искусственного интеллекта. В каждой работе есть теория, пошаговая инструкция, задания, тест и сдача отчёта преподавателю.</p>
  <div class="row"><button class="btn light" data-act="start" type="button">${startLabel}</button><a class="btn outline-w" href="#${u?"labs":"auth"}">Программа курса</a></div></div>
  <div class="pcard">${prog}</div></section>
  <div class="stats">
   <div class="card stat"><b>${LABS.length}</b><span>лабораторных работ</span></div>
   <div class="card stat"><b>${qn}</b><span>тестовых вопросов</span></div>
   <div class="card stat"><b>${tools.length}</b><span>инструментов в курсе</span></div>
   <div class="card stat"><b>${st?s.done+" / "+LABS.length:LABS.length*100}</b><span>${st?"выполнено работ":"максимум баллов"}</span></div>
  </div>
  <div class="two">
   <section class="card"><h2 class="h2">Цели обучения</h2><p class="sub">К концу курса студент сможет:</p><ul class="ticks">
    <li>выбирать инструментальные средства под этапы жизненного цикла ИС;</li><li>проектировать структуру, процессы и базу данных информационной системы;</li><li>создавать веб-интерфейсы и интерактивные формы;</li><li>использовать СУБД, MS Access, Excel и no-code платформы;</li><li>тестировать систему и обеспечивать безопасность входа.</li></ul></section>
   <section class="card"><h2 class="h2">Задачи обучения</h2><p class="sub">Что студент делает на практике:</p><ul class="ticks">
    <li>выполняет 15 лабораторных работ по пошаговым инструкциям;</li><li>отмечает выполненные задания, прогресс сохраняется автоматически;</li><li>проходит тест после каждой работы, минимальный балл ${PASS}%;</li><li>загружает отчёт и получает оценку и комментарий преподавателя;</li><li>защищает итоговый проект и получает сертификат.</li></ul></section>
  </div>
  <section class="card"><h2 class="h2">Как оцениваются работы</h2><p class="sub">Каждая лабораторная работа даёт до 100 баллов.</p>
   <div class="rules"><div class="rule"><b>40%</b><span>автоматическая проверка теста (лучшая попытка)</span></div><div class="rule"><b>60%</b><span>оценка преподавателя за отчёт</span></div><div class="rule"><b>≥ ${PASS}%</b><span>порог зачёта по тесту и по курсу в целом</span></div><div class="rule"><b>5 · 4 · 3</b><span>оценка по итоговому проценту: 90, 75 и 60</span></div></div></section>
  <section class="card"><h2 class="h2">Инструменты курса</h2><p class="sub">Программы и сервисы, с которыми работает студент.</p><div class="chips">${tools.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div></section>
  </div>`;
}

let LF="all";
function vLabs(){
  const u=me();
  const st=u.role==="student";
  const list=LABS.map(l=>({l,s:st?labState(u.id,l):{status:"new",progress:0,score:0}}));
  const cnt={all:list.length,new:0,doing:0,done:0};list.forEach(x=>cnt[x.s.status]++);
  const f=list.filter(x=>LF==="all"||x.s.status===LF);
  const chip=(k,t)=>`<button type="button" class="chip ${LF===k?"on":""}" data-act="filter" data-v="${k}">${t} · ${cnt[k]}</button>`;
  return `<div class="stack"><div><h1 class="h2" style="font-size:28px">Лабораторные работы</h1><p class="muted">${st?"Выберите работу, чтобы открыть теорию, инструкцию, задания и тест.":"Просмотр программы курса. Прогресс ведут только студенты."}</p></div>
  ${st?`<div class="chips">${chip("all","Все")}${chip("new","Не начаты")}${chip("doing","В процессе")}${chip("done","Завершены")}</div>`:""}
  <div class="cards">${f.map(({l,s})=>`<a class="lcard ${s.status}" href="#lab-${l.n}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div class="lnum">${l.n}</div>${st?`<span class="pill ${s.status}">${statusText[s.status]}</span>`:""}</div><h3>${esc(l.t)}</h3><p>${esc(goalOf(l))}</p><div class="chips">${l.tools.slice(0,3).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>${st?`<div class="bar"><i style="width:${s.progress}%"></i></div><div class="lfoot"><span>Готовность ${s.progress}%</span><span>${s.score} / 100 б.</span></div>`:""}</a>`).join("")||'<div class="card empty">В этой категории пока нет работ.</div>'}</div></div>`;
}

function labHead(l){
  const u=me();const st=u.role==="student";
  if(!st)return `<div class="lmeta"><div><small>Режим</small><b>Просмотр</b></div><div><small>Тест</small><b>${l.test.length} вопроса</b></div></div>`;
  const s=labState(u.id,l);const p=s.p;
  return `<div class="row"><span class="pill ${s.status}">${statusText[s.status]}</span>${s.submitted?`<span class="pill ${p.sub.status}">Отчёт: ${subText[p.sub.status].toLowerCase()}</span>`:""}</div>
  <div class="bar"><i style="width:${s.progress}%"></i></div>
  <div class="lmeta"><div><small>Готовность</small><b>${s.progress}%</b></div><div><small>Тест (лучший)</small><b>${p&&p.best!=null?p.best+"%":"—"}</b></div><div><small>Попыток</small><b>${p?p.attempts:0}</b></div><div><small>Баллы за работу</small><b>${s.score} / 100</b></div></div>`;
}
function vLab(n){
  const u=me();const st=u.role==="student";const l=lab(n);
  const s=st?labState(u.id,l):{p:null};const p=s.p||{checks:{}};
  const tasks=tasksOf(l),adv=advOf(l);
  const secs=[["goal","Цель"],["theory","Теория"],["tools","Инструменты"],["steps","Инструкция"],["tasks","Задания"],["adv","Повышенной сложности"],["qs","Вопросы"],["test","Тест"],["send","Сдача работы"]];
  const sec=(id,num,title,body)=>`<section class="card sec" id="sec-${id}"><h2><i>${num}</i>${title}</h2>${body}</section>`;
  const sub=p.sub;
  const subInfo=sub?`<div class="note" style="margin-bottom:14px">Отправлено: <b>${esc(sub.file)}</b> (${Math.max(1,Math.round(sub.size/1024))} КБ), ${dstr(sub.date)}. Статус: <b>${subText[sub.status]}</b>.${sub.status==="graded"?`<br>Оценка преподавателя: <b>${sub.grade} / 100</b>${sub.comment?`. Комментарий: ${esc(sub.comment)}`:""}`:""}</div>`:"";
  return `<div class="stack">
  <section class="card lhead"><div class="crumb"><a href="#labs">Лабораторные работы</a> / Работа ${n}</div><h1>Лабораторная работа №${n}. ${esc(l.t)}</h1><div id="labStatus" class="lhead">${labHead(l)}</div></section>
  <nav class="secnav" aria-label="Разделы работы">${secs.map(x=>`<button type="button" class="chip" data-scroll="sec-${x[0]}">${x[1]}</button>`).join("")}</nav>
  ${sec("goal",1,"Цель работы",`<p>${esc(goalOf(l))}</p>`)}
  ${sec("theory",2,"Теоретические сведения",l.theory.map(t=>`<p>${fmt(t)}</p>`).join(""))}
  ${sec("tools",3,"Используемые программные инструменты",`<div class="chips">${l.tools.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>`)}
  ${sec("steps",4,"Подробная пошаговая инструкция",`<ol class="steps">${l.steps.map(t=>`<li><span>${fmt(t)}</span></li>`).join("")}</ol>`)}
  ${sec("tasks",5,"Практические задания",`<p class="muted" style="margin-bottom:12px">${st?"Отмечайте выполненные задания: прогресс сохраняется автоматически.":"Список заданий для студентов."}</p><div class="checks">${tasks.map((t,i)=>`<label class="check ${p.checks["t"+i]?"on":""}"><input type="checkbox" data-check="${i}" ${p.checks["t"+i]?"checked":""} ${st?"":"disabled"}><span>${fmt(t)}</span></label>`).join("")}</div>`)}
  ${sec("adv",6,"Дополнительные задания повышенной сложности",`<div class="advs">${adv.map(t=>`<div class="adv">★ ${fmt(t)}</div>`).join("")}</div>`)}
  ${sec("qs",7,"Контрольные вопросы",`<ol class="plain" style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:7px">${l.qs.map(t=>`<li>${fmt(t)}</li>`).join("")}</ol>`)}
  ${sec("test",8,"Тестирование",st?`<p class="muted" style="margin-bottom:14px">Ответьте на ${l.test.length} вопроса. Для зачёта нужно набрать не менее ${PASS}%. Засчитывается лучшая попытка.</p><form id="testForm">${l.test.map((q,i)=>`<fieldset class="q" data-q="${i}"><legend>${i+1}. ${fmt(q[0])}</legend>${shuffle(q[1].map((_,j)=>j)).map(j=>`<label class="opt"><input type="radio" name="q${i}" value="${j}"><span>${fmt(q[1][j])}</span></label>`).join("")}<p class="expl" hidden></p></fieldset>`).join("")}<div class="row"><button class="btn primary" type="submit">Проверить ответы</button><button class="btn" type="button" data-act="retake">Пройти заново</button></div><div id="testRes"></div></form>`:`<div class="note">Тест доступен студентам. Правильные ответы для проверки: ${l.test.map((q,i)=>`${i+1}) ${esc(q[1][q[2]])}`).join("; ")}.</div>`)}
  ${sec("send",9,"Загрузка выполненной работы",st?`<div id="subInfo">${subInfo}</div><form id="subForm"><div class="field"><label for="subFile">Файл отчёта (PDF, DOCX, ZIP, изображение)</label><input id="subFile" type="file"></div><div class="field"><label for="subNote">Комментарий преподавателю</label><textarea id="subNote" placeholder="Например: ссылка на репозиторий или особенности решения"></textarea></div><div class="row"><button class="btn primary" type="submit">Отправить на проверку</button></div><p class="err" id="subErr"></p></form>`:`<div class="note">Поле загрузки отчёта доступно студентам.</div>`)}
  <div class="row" style="justify-content:space-between">${n>1?`<a class="btn" href="#lab-${n-1}">← Работа ${n-1}</a>`:"<span></span>"}${n<LABS.length?`<a class="btn primary" href="#lab-${n+1}">Работа ${n+1} →</a>`:`<a class="btn primary" href="#${st?"cabinet":"labs"}">${st?"В личный кабинет":"К списку"}</a>`}</div>
  </div>`;
}

function wireLab(n){
  const u=me();if(u.role!=="student")return;
  const l=lab(n);
  const form=$("#testForm");
  if(form){
    form.addEventListener("submit",e=>{
      e.preventDefault();
      const groups=$$("fieldset.q",form);
      let ok=0;
      for(const g of groups){if(!$("input:checked",g)){toast("Ответьте на все вопросы теста");return}}
      groups.forEach((g,i)=>{
        const q=l.test[i];const val=+$("input:checked",g).value;
        $$(".opt",g).forEach(o=>{o.classList.remove("right","wrong");const v=+$("input",o).value;if(v===q[2])o.classList.add("right");else if(v===val)o.classList.add("wrong")});
        if(val===q[2])ok++;
        const ex=$(".expl",g);ex.hidden=false;ex.textContent=(val===q[2]?"Верно. ":"Неверно. ")+q[3];
        $$("input",g).forEach(x=>x.disabled=true);
      });
      const pct=Math.round(ok/l.test.length*100);
      const p=P(u.id,n);p.attempts++;p.last=Date.now();if(p.best==null||pct>p.best)p.best=pct;save();
      $("#testRes").innerHTML=`<div class="result ${pct>=PASS?"ok":"bad"}"><b>${pct}%</b><span>Правильных ответов: ${ok} из ${l.test.length}. ${pct>=PASS?"Тест сдан.":"Тест не сдан, попробуйте ещё раз."}</span></div>`;
      refreshLab(l);
    });
  }
  const sf=$("#subForm");
  if(sf)sf.addEventListener("submit",e=>{
    e.preventDefault();
    const f=$("#subFile").files[0];const p=P(u.id,n);
    if(!f&&!p.sub){$("#subErr").textContent="Выберите файл с выполненной работой.";return}
    $("#subErr").textContent="";
    const note=$("#subNote").value.trim();
    p.sub={file:f?f.name:p.sub.file,size:f?f.size:p.sub.size,note,date:Date.now(),status:"review",grade:null,comment:""};
    p.last=Date.now();save();
    toast("Работа отправлена на проверку");
    $("#subFile").value="";
    refreshLab(l);
  });
}
function refreshLab(l){
  const u=me();
  const h=$("#labStatus");if(h)h.innerHTML=labHead(l);
  const p=peek(u.id,l.n);const sub=p&&p.sub;const si=$("#subInfo");
  if(si)si.innerHTML=sub?`<div class="note" style="margin-bottom:14px">Отправлено: <b>${esc(sub.file)}</b> (${Math.max(1,Math.round(sub.size/1024))} КБ), ${dstr(sub.date)}. Статус: <b>${subText[sub.status]}</b>.${sub.status==="graded"?`<br>Оценка преподавателя: <b>${sub.grade} / 100</b>${sub.comment?`. Комментарий: ${esc(sub.comment)}`:""}`:""}</div>`:"";
  renderNav(parse());
}

function vCabinet(){
  const u=me();const s=summary(u);
  const rows=LABS.map(l=>{const x=labState(u.id,l);const p=x.p;return `<tr class="pick" data-go="lab-${l.n}"><td>${l.n}</td><td>${esc(l.t)}</td><td><span class="pill ${x.status}">${statusText[x.status]}</span></td><td class="num">${p&&p.best!=null?p.best+"%":"—"}</td><td>${p&&p.sub?`<span class="pill ${p.sub.status}">${subText[p.sub.status]}</span>`:'<span class="muted">не сдана</span>'}</td><td class="num">${x.score}</td></tr>`}).join("");
  const need=[];
  if(s.done<LABS.length)need.push(`завершить все работы (${s.done} из ${LABS.length}): сдать тест и отправить отчёт`);
  if(s.pct<PASS)need.push(`набрать не менее ${PASS}% баллов (сейчас ${s.pct}%), для этого преподаватель должен проверить отчёты`);
  return `<div class="stack"><div><h1 class="h2" style="font-size:28px">Личный кабинет</h1><p class="muted">${esc(u.name)}${u.group?" · группа "+esc(u.group):""} · ${esc(u.email)}</p></div>
  <div class="stats">
   <div class="card stat"><b>${s.done} / ${LABS.length}</b><span>работ завершено</span></div>
   <div class="card stat"><b>${s.points}</b><span>баллов из ${LABS.length*100}</span></div>
   <div class="card stat"><b>${s.pct}%</b><span>итоговый процент</span></div>
   <div class="card stat"><b>${s.mark.n}</b><span>${s.mark.t}</span></div>
  </div>
  <section class="card"><h2 class="h2">Сертификат</h2>${s.eligible?`<p class="sub">Курс завершён. Сертификат готов.</p><button class="btn primary" data-act="cert" type="button">Открыть сертификат</button>`:`<p class="sub">Сертификат формируется автоматически после завершения курса. Чтобы его получить, нужно:</p><ul class="plain">${need.map(t=>`<li>${t}</li>`).join("")}</ul>`}</section>
  <section class="card"><h2 class="h2">Мои лабораторные работы</h2><p class="sub">Нажмите на строку, чтобы открыть работу.</p><div class="tablewrap"><table><thead><tr><th>№</th><th>Название</th><th>Статус</th><th class="num">Тест</th><th>Отчёт</th><th class="num">Баллы</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <section class="card"><h2 class="h2">Профиль</h2><form id="profForm"><div class="fgrid"><div class="field"><label for="pName">Имя и фамилия</label><input id="pName" type="text" value="${esc(u.name)}" required></div><div class="field"><label for="pGroup">Группа</label><input id="pGroup" type="text" value="${esc(u.group||"")}"></div></div><button class="btn" type="submit">Сохранить профиль</button></form></section></div>`;
}

function vCert(){
  const u=me();const s=summary(u);
  const code="IST-"+new Date().getFullYear()+"-"+u.id.toUpperCase().slice(0,5);
  return `<div class="cert-wrap"><div class="row"><a class="btn" href="#cabinet">← В личный кабинет</a></div>
  <div class="cert"><div class="logo">IS</div><span class="kick" style="color:#58698a">IS Tools – Образовательная лаборатория</span><h1>Сертификат</h1><p>подтверждает, что</p><div class="nm">${esc(u.name)}</div>
  <p>успешно завершил(а) курс «Инструментальные средства информационной системы» и выполнил(а) все ${LABS.length} лабораторных работ, включая итоговый проект.</p>
  <p><b>Результат: ${s.points} из ${LABS.length*100} баллов (${s.pct}%) · оценка ${s.mark.n} (${s.mark.t.toLowerCase()})</b></p>
  <div class="sig"><div>${dstr(Date.now())}<br>Дата выдачи</div><div>${esc(code)}<br>Номер сертификата</div><div>Преподаватель курса<br>Подпись</div></div></div></div>`;
}

let AUTHTAB="login";
function vAuth(){
  const reg=AUTHTAB==="reg";
  return `<div class="auth card"><h1 class="h2" style="font-size:26px">${reg?"Регистрация студента":"Вход в платформу"}</h1><p class="sub">${reg?"Создайте аккаунт, чтобы сохранять прогресс и получить сертификат.":"Введите e-mail и пароль."}</p>
  <div class="tabs"><button type="button" data-act="authtab" data-v="login" class="${reg?"":"on"}">Вход</button><button type="button" data-act="authtab" data-v="reg" class="${reg?"on":""}">Регистрация</button></div>
  <form id="authForm" novalidate>${reg?`<div class="field"><label for="aName">Имя и фамилия</label><input id="aName" type="text" autocomplete="name"></div><div class="field"><label for="aGroup">Группа</label><input id="aGroup" type="text" placeholder="ИС-21"></div>`:""}
  <div class="field"><label for="aMail">E-mail</label><input id="aMail" type="email" autocomplete="email"></div>
  <div class="field"><label for="aPass">Пароль</label><input id="aPass" type="password" autocomplete="${reg?"new-password":"current-password"}" placeholder="${reg?"Не менее 6 символов":""}"></div>
  <p class="err" id="aErr"></p><button class="btn primary" type="submit" style="width:100%">${reg?"Создать аккаунт":"Войти"}</button></form>
  ${reg?"":`<div class="note" style="margin-top:18px">Демонстрационный преподаватель: <b>teacher@ist.edu</b> / <b>teacher123</b>. <button type="button" class="btn sm" data-act="demoT" style="margin-top:8px">Подставить данные</button></div>`}</div>`;
}

let T={tab:"students",sel:null,rf:"review",lab:1};
function allStudents(){return DB.users.filter(u=>u.role==="student")}
function vTeacher(){
  const tabs=[["students","Студенты"],["review","Проверка работ"],["tasks","Задания"]];
  const pend=allStudents().reduce((a,u)=>a+LABS.filter(l=>{const p=peek(u.id,l.n);return p&&p.sub&&p.sub.status==="review"}).length,0);
  return `<div class="stack"><div><h1 class="h2" style="font-size:28px">Панель преподавателя</h1><p class="muted">Студентов: ${allStudents().length} · Работ на проверке: ${pend}</p></div>
  <div class="tabs">${tabs.map(t=>`<button type="button" class="${T.tab===t[0]?"on":""}" data-act="ttab" data-v="${t[0]}">${t[1]}${t[0]==="review"&&pend?` (${pend})`:""}</button>`).join("")}</div>
  ${T.tab==="students"?tStudents():T.tab==="review"?tReview():tTasks()}</div>`;
}
function tStudents(){
  const st=allStudents();
  const rows=st.map(u=>{const s=summary(u);return `<tr class="pick ${T.sel===u.id?"sel":""}" data-act="sel" data-id="${u.id}"><td><b>${esc(u.name)}</b>${u.demo?' <span class="pill info">демо</span>':""}</td><td>${esc(u.group||"—")}</td><td>${esc(u.email)}</td><td class="num">${s.done} / ${LABS.length}</td><td class="num">${s.points}</td><td class="num">${s.pct}%</td><td>${s.mark.n}</td></tr>`}).join("");
  let det="";
  const su=st.find(x=>x.id===T.sel);
  if(su){const s=summary(su);det=`<section class="card"><h2 class="h2">${esc(su.name)}</h2><p class="sub">Группа ${esc(su.group||"—")} · последняя активность: ${s.last?dstr(s.last):"нет"} · оценка ${s.mark.n} (${s.mark.t.toLowerCase()})</p><div class="tablewrap"><table><thead><tr><th>№</th><th>Работа</th><th>Статус</th><th class="num">Тест</th><th>Отчёт</th><th class="num">Оценка преподавателя</th></tr></thead><tbody>${LABS.map(l=>{const x=labState(su.id,l);const p=x.p;return `<tr><td>${l.n}</td><td>${esc(l.t)}</td><td><span class="pill ${x.status}">${statusText[x.status]}</span></td><td class="num">${p&&p.best!=null?p.best+"%":"—"}</td><td>${p&&p.sub?`<span class="pill ${p.sub.status}">${subText[p.sub.status]}</span>`:'<span class="muted">—</span>'}</td><td class="num">${x.graded?p.sub.grade:"—"}</td></tr>`}).join("")}</tbody></table></div></section>`}
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2 class="h2" style="margin:0">Список студентов</h2><input id="stSearch" type="text" placeholder="Поиск по имени или группе" style="max-width:280px" aria-label="Поиск студентов"></div><p class="sub" style="margin-top:6px">Нажмите на студента, чтобы увидеть детали по каждой работе.</p>
  <div class="tablewrap"><table><thead><tr><th>Студент</th><th>Группа</th><th>E-mail</th><th class="num">Работ</th><th class="num">Баллы</th><th class="num">%</th><th>Оценка</th></tr></thead><tbody id="stBody">${rows}</tbody></table></div></section>${det}`;
}
function tReview(){
  const items=[];
  allStudents().forEach(u=>LABS.forEach(l=>{const p=peek(u.id,l.n);if(p&&p.sub)items.push({u,l,p,sub:p.sub})}));
  items.sort((a,b)=>b.sub.date-a.sub.date);
  const f=items.filter(x=>T.rf==="all"||x.sub.status===T.rf);
  const chip=(k,t)=>`<button type="button" class="chip ${T.rf===k?"on":""}" data-act="rf" data-v="${k}">${t}</button>`;
  return `<div class="stack"><div class="chips">${chip("review","На проверке")}${chip("graded","Проверенные")}${chip("all","Все")}</div>
  ${f.map(x=>{const id=x.u.id+"_"+x.l.n;return `<div class="sub-item"><div class="sub-info"><b>${esc(x.u.name)}</b> <span class="muted">· ${esc(x.u.group||"")}</span><div style="margin:6px 0">Работа ${x.l.n}. ${esc(x.l.t)}</div><div class="row"><span class="pill ${x.sub.status}">${subText[x.sub.status]}</span><span class="muted">${dstr(x.sub.date)}</span></div><div style="margin-top:8px">Файл: <b>${esc(x.sub.file)}</b> (${Math.max(1,Math.round(x.sub.size/1024))} КБ)</div><div class="muted" style="margin-top:4px">Тест: ${x.p.best!=null?x.p.best+"%":"—"}${x.sub.note?" · Комментарий студента: "+esc(x.sub.note):""}</div></div>
  <div class="sub-grade"><div class="field"><label for="g_${id}">Оценка за работу (0–100)</label><input id="g_${id}" type="number" min="0" max="100" value="${x.sub.grade==null?"":x.sub.grade}"></div><div class="field"><label for="c_${id}">Комментарий студенту</label><textarea id="c_${id}">${esc(x.sub.comment||"")}</textarea></div><button class="btn primary sm" type="button" data-act="grade" data-u="${x.u.id}" data-l="${x.l.n}">${x.sub.status==="graded"?"Обновить оценку":"Сохранить оценку"}</button></div></div>`}).join("")||'<div class="card empty">Здесь пока нет работ.</div>'}</div>`;
}
function tTasks(){
  const l=lab(T.lab);const o=ov(l.n);
  return `<section class="card"><h2 class="h2">Создание и редактирование заданий</h2><p class="sub">Измените цель и списки заданий. Каждая строка — отдельное задание. Изменения сразу видны студентам.</p>
  <div class="field"><label for="tLab">Лабораторная работа</label><select id="tLab" data-act="tlab">${LABS.map(x=>`<option value="${x.n}" ${x.n===T.lab?"selected":""}>${x.n}. ${esc(x.t)}</option>`).join("")}</select></div>
  <div class="field"><label for="tGoal">Цель работы</label><textarea id="tGoal">${esc(goalOf(l))}</textarea></div>
  <div class="field"><label for="tTasks">Практические задания (по одному в строке)</label><textarea id="tTasks" style="min-height:130px">${esc(tasksOf(l).join("\n"))}</textarea></div>
  <div class="field"><label for="tAdv">Задания повышенной сложности (по одному в строке)</label><textarea id="tAdv">${esc(advOf(l).join("\n"))}</textarea></div>
  <div class="row"><button class="btn primary" type="button" data-act="saveTasks">Сохранить изменения</button><button class="btn danger" type="button" data-act="resetTasks" ${o.goal||o.tasks||o.adv?"":"disabled"}>Вернуть исходные</button></div></section>`;
}

/* ---------- events ---------- */
document.addEventListener("click",e=>{
  const sc=e.target.closest("[data-scroll]");
  if(sc){const el=document.getElementById(sc.dataset.scroll);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
  const g=e.target.closest("tr[data-go]");
  if(g){go(g.dataset.go);return}
  const b=e.target.closest("[data-act]");
  if(!b||b.tagName==="SELECT")return;
  const a=b.dataset.act,u=me();
  if(a==="menu"){document.body.classList.toggle("nav-open");return}
  if(a==="start"){
    if(!u)return go("auth");
    if(u.role==="teacher")return go("teacher");
    const next=LABS.find(l=>labState(u.id,l).status!=="done");
    return go("lab-"+(next?next.n:1));
  }
  if(a==="logout"){DB.session=null;save();go("home");route();toast("Вы вышли из аккаунта");return}
  if(a==="filter"){LF=b.dataset.v;route();return}
  if(a==="retake"){route();return}
  if(a==="cert"){go("cert");return}
  if(a==="authtab"){AUTHTAB=b.dataset.v;route();return}
  if(a==="demoT"){$("#aMail").value="teacher@ist.edu";$("#aPass").value="teacher123";return}
  if(a==="ttab"){T.tab=b.dataset.v;route();return}
  if(a==="sel"){T.sel=T.sel===b.dataset.id?null:b.dataset.id;route();return}
  if(a==="rf"){T.rf=b.dataset.v;route();return}
  if(a==="grade"){
    const id=b.dataset.u+"_"+b.dataset.l;
    const gv=$("#g_"+id).value;const gn=Number(gv);
    if(gv===""||!isFinite(gn)||gn<0||gn>100){toast("Введите оценку от 0 до 100");return}
    const p=P(b.dataset.u,+b.dataset.l);
    p.sub.grade=Math.round(gn);p.sub.comment=$("#c_"+id).value.trim();p.sub.status="graded";
    save();toast("Оценка сохранена");route();return}
  if(a==="saveTasks"){
    const clean=v=>v.split("\n").map(x=>x.trim()).filter(Boolean);
    const t=clean($("#tTasks").value);
    if(!t.length){toast("Добавьте хотя бы одно практическое задание");return}
    const goal=$("#tGoal").value.trim();
    if(!goal){toast("Цель работы не может быть пустой");return}
    DB.over[T.lab]={goal,tasks:t,adv:clean($("#tAdv").value)};
    save();toast("Задания обновлены");route();return}
  if(a==="resetTasks"){delete DB.over[T.lab];save();toast("Исходные задания восстановлены");route();return}
});
document.addEventListener("change",e=>{
  const c=e.target.closest("[data-check]");
  if(c){
    const u=me(),r=parse();if(!u||r.name!=="lab")return;
    const p=P(u.id,r.n);p.checks["t"+c.dataset.check]=c.checked;p.last=Date.now();save();
    c.closest(".check").classList.toggle("on",c.checked);
    refreshLab(lab(r.n));return;
  }
  if(e.target.id==="tLab"){T.lab=+e.target.value;route()}
});
document.addEventListener("input",e=>{
  if(e.target.id==="stSearch"){
    const q=e.target.value.trim().toLowerCase();
    $$("#stBody tr").forEach(tr=>{tr.hidden=q&&!tr.textContent.toLowerCase().includes(q)});
  }
});
document.addEventListener("submit",e=>{
  const f=e.target;
  if(f.id==="authForm"){
    e.preventDefault();
    const mail=$("#aMail").value.trim().toLowerCase(),pass=$("#aPass").value;const err=$("#aErr");
    if(AUTHTAB==="reg"){
      const name=$("#aName").value.trim(),group=$("#aGroup").value.trim();
      if(name.length<3){err.textContent="Введите имя и фамилию.";return}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)){err.textContent="Введите корректный e-mail.";return}
      if(pass.length<6){err.textContent="Пароль должен содержать не менее 6 символов.";return}
      if(DB.users.some(u=>u.email.toLowerCase()===mail)){err.textContent="Аккаунт с таким e-mail уже существует. Войдите.";return}
      const nu={id:uid(),role:"student",name,email:mail,pass,group,created:Date.now()};
      DB.users.push(nu);DB.session=nu.id;save();toast("Добро пожаловать, "+name.split(" ")[0]+"!");go("labs");route();
    }else{
      const u=DB.users.find(x=>x.email.toLowerCase()===mail&&x.pass===pass);
      if(!u){err.textContent="Неверный e-mail или пароль.";return}
      DB.session=u.id;save();toast("Вы вошли в систему");go(u.role==="teacher"?"teacher":"labs");route();
    }
    return;
  }
  if(f.id==="profForm"){
    e.preventDefault();const u=me();const n=$("#pName").value.trim();
    if(n.length<3){toast("Введите имя и фамилию");return}
    u.name=n;u.group=$("#pGroup").value.trim();save();toast("Профиль сохранён");route();
  }
});
window.addEventListener("hashchange",route);
$("#menuBtn").addEventListener("click",()=>document.body.classList.toggle("nav-open"));
$("#scrim").addEventListener("click",()=>document.body.classList.remove("nav-open"));
route();
})();
