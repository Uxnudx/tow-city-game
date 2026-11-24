"use strict";

const by=id=>document.getElementById(id);
const key="tow-city/port-v2";
const prefsKey="tow-city/settings";
let prefs={muted:false,volume:72,music:55,effects:true,fps:60};
try {
  const saved=JSON.parse(localStorage.getItem(prefsKey));
  if(saved){
    prefs={muted:saved.muted===true,volume:Number.isFinite(saved.volume)?Math.max(0,Math.min(100,saved.volume)):72,
      music:Number.isFinite(saved.music)?Math.max(0,Math.min(100,saved.music)):55,
      effects:saved.effects!==false,fps:saved.fps===30?30:60};
  }
}catch{}
let save;
try {save=Harbor.normalize(JSON.parse(localStorage.getItem(key)));}
catch {save=Harbor.normalize(null);}
function persist(){try{localStorage.setItem(key,JSON.stringify(save));}catch{}}

let state=Harbor.create(null,save.selected), menu="loading", accumulator=0, previous=0;
let opener=null, paused=false, yardFromMenu=false, lastDraw=0, lastHud=-Infinity;
let art=null,townArt=null,scene="sea";
const townPositionKey="tow-city/walk-v2";
let savedPosition=null;
try{savedPosition=JSON.parse(localStorage.getItem(townPositionKey));}catch{}
let walker=Town.create(savedPosition);
function rememberPosition(){
  if(scene!=="town")return;
  try{localStorage.setItem(townPositionKey,JSON.stringify({x:walker.x,y:walker.y}));}catch{}
}
function setScene(next){
  if(next!=="town")rememberPosition();
  scene=next;
  document.body.dataset.scene=next;
  by("sea").hidden=next!=="sea";
  by("town").hidden=next!=="town";
  held.clear();
  accumulator=0;
  if(next==="town")townArt?.resize();
}
function portraitPlaceholder(){
  return document.createElement("span");
}
const held=new Set();
const inputKeys={KeyA:"left",ArrowLeft:"left",KeyD:"right",ArrowRight:"right",KeyW:"up",ArrowUp:"up",KeyS:"down",ArrowDown:"down"};
const mission=()=>state.mission;
const near=(x,r)=>Math.abs(state.boat.x-x)<=r;
const landingReady=()=>scene==="sea"&&!mission()&&near(Harbor.landing,49)&&Math.abs(state.boat.v)<32;

function cue(event,x=state.boat.x){
  TowAudio.play(event);
  if(prefs.effects)art?.burst(event,x);
}
function enter(index,job=null){
  if(job?.district!==undefined){
    const offered=Harbor.districtJob(save,job.district);
    if(!offered||offered.id!==job.id)return;
    job=offered;
  }else if(job){
    const offered=job.operation?Harbor.calls(save.incidents):Harbor.jobs(save.day);
    if((!job.operation&&Harbor.reputation(save)<1)||!offered.some(entry=>entry.id===job.id))return;
  }else if(!Harbor.unlocked(save,index))return;
  state=Harbor.create(index,save.selected,job,save.route);
  setScene("sea");
  menu=null;
  accumulator=0;
  closeMenu(false);
  cue("contract");
}
function berth(){
  const m=mission();
  return m&&state.cargo&&!state.cargo.moored&&Math.abs(state.cargo.x-m.to)<=54;
}
function interact(){
  TowAudio.unlock();
  if(menu){closeMenu();return;}
  if(paused){paused=false;accumulator=0;return;}
  if(scene==="town"){townInteract();return;}
  if(mission()){
    if(Harbor.inspect(state))return;
    const stars=state.response ? Harbor.respond(state) : Harbor.settle(state);
    if(stars){
      state.events.length=0;
      cue("dock",state.cargo?.x??state.boat.x);
      const before=Harbor.reputation(save);
      const bonus=Harbor.objectiveBonus(state);
      const coins=state.job?.district!==undefined ? Harbor.payDistrict(save,state,stars) :
        state.response ? Harbor.payCall(save,state,stars) :
        state.job ? Harbor.payJob(save,state,stars) : Harbor.pay(save,state.index,stars)+bonus;
      if(!state.job)save.coins+=bonus;
      persist();
      const after=Harbor.reputation(save);
      const opened=Harbor.missions.filter(m=>m.rep>before&&m.rep<=after).map(m=>m.name);
      result(stars,coins,opened,bonus);
    }
    return;
  }
  if(landingReady()&&townArt){returnHarbor(true);return;}
  if(near(Harbor.landing,49)&&townArt)return;
  if(near(Harbor.yard,65)) openYard();
  else if(near(Harbor.port,70)) openBoard();
}
function townInteract(){
  const spot=Town.nearest(walker);
  if(!spot)return;
  if(spot.id==="boat"){state=Harbor.create(null,save.selected);setScene("sea");return;}
  openTownChat(spot.id);
}
function openTownChat(id){
  const talk=TownStory.conversation(id,save);
  openMenu("chat","СТАРАЯ ГАВАНЬ",talk.speaker,"Закончить разговор");
  const transcript=document.createElement("div"), actions=document.createElement("div");
  transcript.className="conversation";
  transcript.setAttribute("role","log");
  transcript.setAttribute("aria-live","polite");
  actions.className="dialogue-actions";
  by("panel-body").append(transcript,actions);
  function bubble(who,text,role){
    const row=document.createElement("div"), name=document.createElement("strong"), line=document.createElement("p");
    row.className="dialogue-line "+role;
    name.textContent=who;
    line.textContent=text;
    if(role!=="note-line"){
      const portrait=townArt?.portrait(role==="hero-line"?"down":({port:"master",yard:"mechanic",market:"vendor",tower:"keeper"})[id]);
      if(portrait)row.append(portrait);
    }
    const copy=document.createElement("div");
    copy.append(name,line);
    row.append(copy);
    transcript.append(row);
  }
  function show(id){
    const node=talk.nodes[id];
    actions.replaceChildren();
    bubble(talk.speaker,node.text,"npc-line");
    for(const option of node.choices||[]){
      actions.append(menuButton(option.label,()=>{
        bubble("Ты",option.text,"hero-line");
        if(option.action){
          const finale=option.action==="council"||option.action==="record";
          const changed=finale ? TownStory.end(save,option.action) : TownStory.mark(save,option.action);
          if(changed){persist();bubble("Журнал",finale?"Концовка записана.":"Свидетельство добавлено.","note-line");}
        }
        show(option.target);
      }));
    }
    if(node.link)actions.append(menuButton(node.link.label,()=>{
      if(node.link.kind==="quest")briefing(node.link.id);
      else if(node.link.kind==="yard"){yardFromMenu=false;openYard();}
      else openBoard();
    },true));
    transcript.scrollTop=transcript.scrollHeight;
    (actions.firstElementChild||by("panel-close")).focus({preventScroll:true});
  }
  show(talk.entry);
}

function hook(){
  if(menu||paused||!mission())return;
  TowAudio.unlock();
  Harbor.attach(state);
}
function returnHarbor(atPier=false){
  state=Harbor.create(null,save.selected);
  paused=false;
  if(atPier===true)walker=Town.create({x:772,y:911});
  if(townArt)setScene("town");
  menu=null;
  closeMenu(false);
}
function openMenu(kind,tag,title,close="Продолжить"){
  if(!menu)opener=document.activeElement;
  menu=kind;
  held.clear();
  by("panel-tag").textContent=tag;
  by("panel-title").textContent=title;
  by("panel-body").replaceChildren();
  by("panel-close").textContent=close;
  by("panel-close").hidden=kind==="home"||kind==="title";
  by("panel").dataset.screen=kind;
  by("panel").hidden=false;
  by("game-hud").inert=true;
  by("hamburger").setAttribute("aria-expanded","true");
}
function showMenuFocus(){
  (by("panel-body").querySelector(".primary:not(:disabled)")||by("panel-body").querySelector("button:not(:disabled)")||by("panel-close")).focus();
}
function closeMenu(restore=true){
  if(menu==="title"||menu==="loading")return;
  if(menu==="result"){returnHarbor();return;}
  if(menu==="briefing"){openBoard();return;}
  if(menu==="district"){openBoard("districts");return;}
  if(menu==="settings"||(menu==="yard"&&yardFromMenu)){yardFromMenu=false;openHome();return;}
  if(menu==="home")paused=false;
  menu=null;by("panel").hidden=true;accumulator=0;
  by("game-hud").inert=false;
  by("hamburger").setAttribute("aria-expanded","false");
  if(restore&&opener instanceof HTMLElement)opener.focus();
  opener=null;
}
function addRow(title,desc,label,action,disabled=false){
  const row=document.createElement("div");
  row.className="row";
  const copy=document.createElement("div"),name=document.createElement("strong"),detail=document.createElement("p");
  name.textContent=title;detail.textContent=desc;copy.append(name,detail);
  const button=document.createElement("button");
  button.textContent=label;button.disabled=disabled;button.onclick=action;
  if(!disabled&&!by("panel-body").querySelector("button:not(:disabled)"))button.className="primary";
  row.append(copy,button);by("panel-body").append(row);
}
function paragraph(text){
  const p=document.createElement("p");p.textContent=text;by("panel-body").append(p);
}
function npc(id,name,line){
  const card=document.createElement("div"), copy=document.createElement("div"), title=document.createElement("strong"), speech=document.createElement("p");
  card.className="npc";
  title.textContent=name;
  speech.textContent=line;
  copy.append(title,speech);
  card.append(art?.character(id)??portraitPlaceholder(),copy);
  by("panel-body").append(card);
}
function applyPrefs(){
  TowAudio.configure(prefs.muted,prefs.volume/100,prefs.music/100);
  const sound=by("sound");
  if(sound){
    sound.textContent=prefs.muted ? "Звук выключен" : "Звук включён";
    sound.setAttribute("aria-pressed",String(!prefs.muted));
  }
  try {localStorage.setItem(prefsKey,JSON.stringify(prefs));}catch{}
}
function menuButton(label,callback,primary=false){
  const button=document.createElement("button");
  button.textContent=label;button.onclick=callback;
  if(primary)button.className="primary";
  return button;
}
function fullscreenLabel(){
  const active=Boolean(document.fullscreenElement);
  for(const button of document.querySelectorAll(".fullscreen-toggle")){
    button.textContent=active?"Выйти из полноэкранного":"На весь экран";
    button.setAttribute("aria-pressed",String(active));
    button.hidden=!document.fullscreenEnabled;
  }
}
async function toggleFullscreen(){
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(document.fullscreenEnabled)await document.documentElement.requestFullscreen();
  }catch{
    const screen=by("panel").hidden ? by("current") : by("panel-body");
    const note=document.createElement("p");
    note.className="fullscreen-message";
    note.textContent="Полноэкранный режим недоступен в этой вкладке. Игра заполняет окно браузера.";
    screen.querySelector(".fullscreen-message")?.remove();
    screen.append(note);
  }
}
function openTitle(failed){
  by("loading-screen").hidden=true;
  document.body.dataset.view="title";
  openMenu("title","ПОРТОВАЯ СЛУЖБА","Город на буксире");
  const logline=document.createElement("p");
  logline.className="title-logline";
  logline.textContent="Веди катер через прилив и возвращай жизнь в гавань.";
  by("panel-body").append(logline);
  const actions=document.createElement("div");
  actions.className="title-actions";
  const played=save.results.some(Boolean)||save.incidents>0||save.day>0||save.duties.some(Boolean);
  const start=menuButton(played?"Продолжить":"Начать игру",()=>{
    TowAudio.unlock();
    menu=null;
    paused=false;
    document.body.dataset.view="play";
    setScene(townArt?"town":"sea");
    closeMenu(false);
    by(scene)?.focus({preventScroll:true});
  },true);
  const full=menuButton("На весь экран",toggleFullscreen);
  full.className="fullscreen-toggle";
  const info=document.createElement("a");
  info.href="onepager.html";info.textContent="О проекте ↗";
  const listen=menuButton("Включить музыку",()=>{
    TowAudio.unlock();
    if(prefs.muted||prefs.music===0){prefs.muted=false;prefs.music=prefs.music||55;applyPrefs();}
    listen.hidden=true;
  });
  listen.className="title-music";
  actions.append(start,full,info,listen);
  by("panel-body").append(actions);
  if(failed)paragraph("Часть графики не загрузилась. Можно попробовать обновить вкладку.");
  fullscreenLabel();
  showMenuFocus();
}
function openHome(){
  openMenu("home","БОРТОВАЯ ПАНЕЛЬ",mission() ? "Рейс на паузе" : "Пауза");
  const layout=document.createElement("div");
  layout.className="home-menu";
  const sailing=()=>{paused=false;closeMenu(false);by("hamburger").blur();};
  const fleetItem=menuButton("Выбор катера",()=>{yardFromMenu=true;openYard();});
  fleetItem.disabled=Boolean(mission());
  layout.append(
    menuButton(mission()?"Продолжить рейс":"Вернуться к штурвалу",sailing,true),
    fleetItem,menuButton("Настройки",openSettings)
  );
  if(!mission()){
    layout.append(menuButton("Срочные вызовы",()=>openBoard("calls")));
    layout.append(menuButton("Районные смены",()=>openBoard("districts")));
  }
  if(!mission()&&scene==="sea"&&townArt)layout.append(menuButton("Сойти на берег",returnHarbor));
  if(mission())layout.append(menuButton("Прервать рейс",returnHarbor));
  by("panel-body").append(layout);
  const toggles=document.createElement("div");
  toggles.className="pause-toggles";
  const sound=menuButton("",()=>{
    TowAudio.unlock();
    prefs.muted=!prefs.muted;
    applyPrefs();
  });
  sound.id="sound";
  const full=menuButton("На весь экран",toggleFullscreen);
  full.className="fullscreen-toggle";
  toggles.append(sound,full);
  by("panel-body").append(toggles);
  applyPrefs();
  fullscreenLabel();
  showMenuFocus();
}
function openSettings(){
  openMenu("settings","ПАРАМЕТРЫ","Настройки","Назад в меню");
  const area=document.createElement("div");
  area.className="settings-list";
  function control(title,input,changed){
    const label=document.createElement("label"), name=document.createElement("span");
    name.textContent=title;
    label.append(name,input);
    input.addEventListener("input",()=>{
      TowAudio.unlock();
      changed();
      applyPrefs();
    });
    area.append(label);
  }
  const volume=document.createElement("input"), music=document.createElement("input"), mute=document.createElement("input"),
    effects=document.createElement("input"), fps=document.createElement("select");
  Object.assign(volume,{type:"range",min:0,max:100,value:prefs.volume});
  Object.assign(music,{type:"range",min:0,max:100,value:prefs.music});
  Object.assign(mute,{type:"checkbox",checked:prefs.muted});
  Object.assign(effects,{type:"checkbox",checked:prefs.effects});
  fps.append(new Option("60 кадров/с",60),new Option("30 кадров/с",30));
  fps.value=String(prefs.fps);
  control("Громкость",volume,()=>{prefs.volume=Number(volume.value);});
  control("Музыка",music,()=>{prefs.music=Number(music.value);});
  control("Отключить звук",mute,()=>{prefs.muted=mute.checked;});
  control("Дым, брызги и качка",effects,()=>{prefs.effects=effects.checked;});
  control("Частота отрисовки",fps,()=>{prefs.fps=Number(fps.value);lastDraw=0;});
  by("panel-body").append(area);
  volume.focus();
}
function openBoard(tab="story"){
  openMenu("board","РАСПОРЯЖЕНИЯ ПОРТА","Доска контрактов","Закрыть");
  const tabs=document.createElement("div");
  tabs.className="yard-tabs";
  for(const [id,label] of [["story","Сюжет"],["districts","Районы"],["calls","Вызовы"],["jobs","Заказы"],["journal","Журнал"]]){
    const button=menuButton(label,()=>openBoard(id));
    button.setAttribute("aria-pressed",String(tab===id));
    tabs.append(button);
  }
  by("panel-body").append(tabs);
  if(tab==="districts"){
    npc("master","Портовые районы","Откройте десять портовых районов. В каждой смене четыре связанных этапа. После каждого этапа прогресс сохраняется.");
    if(!save.results[0])paragraph("Первая районная смена откроется после доставки пекарни в сюжетном рейсе.");
    Harbor.districts.forEach((district,index)=>{
      const completed=save.duties[index],job=Harbor.districtJob(save,index);
      addRow(district.name,completed+"/"+district.stages.length+" · "+district.brief,
        job ? completed ? "Продолжить" : "Брифинг" : completed===district.stages.length ? "Готово" : "Закрыто",
        ()=>districtBriefing(index),!job);
    });
    showMenuFocus();
    return;
  }
  if(tab==="calls"){
    npc("master","Капитан Марин","На фарватере три срочных вызова. Выбери, где помочь. После возвращения пришлю новые координаты.");
    paragraph("Дежурство "+(save.incidents+1)+" · Закрыто вызовов: "+save.incidents);
    Harbor.calls(save.incidents).forEach(call=>{
      const briefing=(call.limit ? call.limit+" с на поиск · " : "")+call.points.length+" точки · "+call.pay+" монет. "+call.other;
      addRow(call.name,briefing,"Выйти на вызов",()=>enter(null,call));
    });
    showMenuFocus();
    return;
  }
  if(tab==="jobs"){
    npc("master","Капитан Марин","На эту смену три заказа. Выполни один, и я повешу новые.");
    paragraph("Смена "+(save.day+1)+" · Выполнено заказов: "+save.day);
    Harbor.jobs(save.day).forEach(job=>{
      const conditions=[job.gate?"Мост":null,job.flow<0?"Встречное течение":"Попутное течение",
        job.deadline?job.deadline+" с на доплату":null].filter(Boolean).join(" · ");
      addRow(job.name,job.pay+" монет · "+conditions+". "+job.other,"Принять",()=>enter(null,job),Harbor.reputation(save)<1);
    });
    if(Harbor.reputation(save)<1)paragraph("Заказы откроются после первой сюжетной доставки.");
    showMenuFocus();
    return;
  }
  if(tab==="journal"){
    const finished=save.results.flatMap((stars,index)=>stars ? [index] : []);
    if(!finished.length)paragraph("После рейсов здесь появятся записи капитана и механика.");
    for(const i of finished){
      const [, ,name,line]=Harbor.story[i];
      npc(name==="Лина" ? "mechanic" : "master",Harbor.missions[i].name+" · "+name,line);
    }
    showMenuFocus();
    return;
  }
  npc("master","Капитан Марин","Выбери доставку. У причала сбрасывай ход заранее, понтон ещё движется по инерции.");
  const chapterTitles={0:"Глава I · Вернуть порт",4:"Глава II · Ночь без света",8:"Глава III · До рассвета"};
  Harbor.missions.forEach((m,i)=>{
    if(chapterTitles[i]){
      const heading=document.createElement("h3");
      heading.className="chapter";
      heading.textContent=chapterTitles[i];
      by("panel-body").append(heading);
    }
    const open=Harbor.unlocked(save,i), stars=save.results[i];
    addRow(m.name,(stars ? stars+"/3 звёзд · " : "")+m.pay+" монет · "+m.other,
      open ? stars ? "Повторить" : "Брифинг" : !save.results[m.requires??i-1] ? "Предыдущий рейс" : "Реп. "+m.rep,
      ()=>briefing(i),!open);
  });
  showMenuFocus();
}
function districtBriefing(index){
  const district=Harbor.districts[index],job=Harbor.districtJob(save,index);
  if(!job)return;
  openMenu("district","РАЙОННАЯ СМЕНА",district.name,"К районам");
  paragraph(district.brief);
  district.stages.forEach((step,i)=>{
    const status=i<job.stage ? "Выполнено · " : i===job.stage ? "Следующий этап · " : "";
    if(i===job.stage){
      addRow(status+step.name,step.other+" · "+step.pay+" монет до премий.","Начать этап",()=>enter(null,job));
    }else paragraph(status+step.name);
  });
  showMenuFocus();
}
function briefing(index){
  const [name,line]=Harbor.story[index];
  openMenu("briefing","СЮЖЕТНЫЙ РЕЙС",Harbor.missions[index].name,"К контрактам");
  npc(name==="Лина" ? "mechanic" : "master",name,line);
  paragraph(Harbor.missions[index].other);
  if(index===8){
    addRow("Внешний пролив","Короче. Встречное течение и разводной мост.","Идти через пролив",()=>{
      save.route="outer";persist();enter(index);
    });
    addRow("Защищённый канал","Длиннее. Слабое течение и обязательная остановка на посту.","Идти каналом",()=>{
      save.route="shelter";persist();enter(index);
    });
  }else addRow("Награда",Harbor.missions[index].pay+" монет за доставку","Принять рейс",()=>enter(index));
  showMenuFocus();
}
function openYard(tab="fleet",focused=save.selected){
  openMenu("yard","МАСТЕРСКАЯ ЛИНЫ · "+save.coins+" МОНЕТ","Сухой док",yardFromMenu ? "Назад в меню" : "Отойти от верфи");
  const tabs=document.createElement("div");
  tabs.className="yard-tabs";
  for(const [id,label] of [["fleet","Флот"],["parts","Прокачка"]]){
    const button=document.createElement("button");
    button.textContent=label;
    button.setAttribute("aria-pressed",String(tab===id));
    button.onclick=()=>openYard(id);
    tabs.append(button);
  }
  by("panel-body").append(tabs);
  const equipped=Harbor.ships[save.selected];
  if(tab==="fleet"){
    const layout=document.createElement("div"), roster=document.createElement("div"), detail=document.createElement("section");
    layout.className="fleet-layout";
    roster.className="fleet-list";
    roster.setAttribute("aria-label","Суда");
    detail.className="fleet-detail";
    detail.setAttribute("aria-label","Характеристики судна");
    const entries=new Map();
    const catalog=Object.entries(Harbor.ships).sort(([,a],[,b])=>a.rep-b.rep);
    for(const [id,ship] of catalog){
      const button=document.createElement("button"), copy=document.createElement("span"), name=document.createElement("strong"), stateLabel=document.createElement("small");
      name.textContent=ship.name;
      stateLabel.textContent=id===save.selected ? "В рейсе" : save.fleet[id].owned ? "На верфи" : ship.cost+" монет";
      copy.append(name,stateLabel);
      button.append(art?.portrait(id)??portraitPlaceholder(),copy);
      button.onclick=()=>inspectShip(id);
      roster.append(button);
      entries.set(id,button);
    }
    function inspectShip(id){
      for(const [key,entry] of entries)entry.setAttribute("aria-pressed",String(key===id));
      const ship=Harbor.ships[id], owned=save.fleet[id].owned, current=id===save.selected;
      const locked=Harbor.reputation(save)<ship.rep, funds=save.coins>=ship.cost;
      const name=document.createElement("h3"), copy=document.createElement("p"), stats=document.createElement("dl"), action=document.createElement("button");
      const display=document.createElement("div"), label=document.createElement("span");
      display.className="ship-display";
      label.textContent=current?"Ваш катер":owned?"В вашем флоте":"На продаже";
      display.append(art?.portrait(id,true)??portraitPlaceholder(),label);
      name.textContent=ship.name+" · "+ship.role;
      copy.textContent=ship.description;
      const values=Harbor.specs({ship:id},save.fleet[id].levels);
      for(const [label,value] of [["Тяга",Math.round(values.thrust)],["Трос",values.limit],["Тормоз",values.braking.toFixed(1)]]){
        const group=document.createElement("div"), term=document.createElement("dt"), data=document.createElement("dd");
        term.textContent=label;data.textContent=String(value);group.append(term,data);stats.append(group);
      }
      action.className="primary";
      action.textContent=current ? "Выбран" : owned ? "Выбрать катер" : locked ? "Нужна репутация "+ship.rep :
        funds ? "Купить за "+ship.cost : "Нужно "+ship.cost+" монет";
      action.disabled=current||(!owned&&(locked||!funds));
      action.onclick=()=>{
        if(!Harbor.selectShip(save,id))return;
        state.ship=id;
        persist();
        TowAudio.play("contract");
        openYard("fleet",id);
      };
      detail.replaceChildren(display,name,copy,stats,action);
    }
    layout.append(roster,detail);
    by("panel-body").append(layout);
    inspectShip(focused);
    entries.get(focused).focus();
    return;
  }
  npc("mechanic","Настройка · "+equipped.name,"Проверяю отдельно двигатель, трос, реверс и корпус этого катера.");
  const levels=save.fleet[save.selected].levels;
  const stats=Harbor.specs(state,levels);
  paragraph("Тяга "+Math.round(stats.thrust)+" · Трос "+stats.limit+" · Тормоз "+stats.braking.toFixed(1));
  for(const [id,item] of Object.entries(Harbor.upgrades)){
    const level=levels[id], price=item.price[level];
    addRow(item.name+" "+level+"/"+item.price.length,item.description,
      price===undefined ? "Максимум" : "Купить · "+price,()=>{
        if(Harbor.buy(save,id)){persist();TowAudio.play("contract");openYard("parts");}
      },price===undefined||save.coins<price);
  }
  showMenuFocus();
}
function result(stars,coins,opened,bonus){
  if(state.job?.district!==undefined){
    const index=state.job.district,district=Harbor.districts[index],next=Harbor.districtJob(save,index);
    openMenu("result",next?"ЭТАП ВЫПОЛНЕН":"РАЙОН ОТКРЫТ",district.name,"Вернуться в бухту");
    paragraph(mission().name+" · "+stars+"/3 звёзд · +"+coins+" монет.");
    paragraph("Смена: "+save.duties[index]+"/"+district.stages.length+" этапов. Результат сохранён.");
    if(next)addRow(next.name,next.other,"Следующий этап",()=>enter(null,next));
    else if(Harbor.districts[index+1])paragraph("Открыта следующая смена: «"+Harbor.districts[index+1].name+"».");
    else paragraph("Все портовые районы снова работают. Срочные вызовы и ежедневные заказы остаются доступны.");
    showMenuFocus();
    return;
  }
  openMenu("result",state.response?"ВЫЗОВ ЗАКРЫТ":"ГРУЗ ДОСТАВЛЕН",mission().name,"Вернуться в бухту");
  paragraph(stars+"/3 звёзд · +"+coins+" монет");
  if(bonus)paragraph("В эту выплату включена доплата за условие рейса: "+bonus+" монет.");
  if(state.response){
    paragraph("Точек обработано: "+state.response.collected+"/"+state.response.targets.length+". Дежурство "+(save.incidents+1)+" уже на доске.");
  }else paragraph("Доставка даёт звезду. Целый трос и аккуратная швартовка дают ещё две.");
  if(state.job&&!state.response)paragraph("Доска заказов обновилась. Следующая смена: "+(save.day+1)+".");
  else if(!state.response){
    const [,,name,line]=Harbor.story[state.index];
    npc(name==="Лина" ? "mechanic" : "master",name,line);
    if(state.index===0&&save.incidents===0){
      const rescue=Harbor.calls(0).find(call=>call.operation==="rescue");
      if(rescue)addRow(rescue.name,rescue.other,"Выйти на помощь",()=>enter(null,rescue));
    }
    if(state.index===0&&save.duties[0]===0)paragraph("Открыта смена «Старая набережная». На доске контрактов перейдите в раздел «Районы».");
    if(opened.length)paragraph("Доступны контракты: "+opened.join(", ")+".");
    if(save.results.every(Boolean)&&!save.story.ending)paragraph("Последний рейс выполнен. Поговорите с Марином на берегу, чтобы закрыть историю.");
    else if(save.story.ending)paragraph("История завершена. На доске продолжают появляться новые заказы.");
  }
  showMenuFocus();
}
by("panel-close").onclick=()=>menu==="result" ? returnHarbor() : closeMenu();
by("retry").onclick=()=>{if(mission()&&!menu)enter(state.index,state.job);by("retry").blur();};
by("touch-hook").onclick=hook;
by("touch-action").onclick=interact;
by("disembark").onclick=()=>{if(landingReady()&&!menu)returnHarbor(true);};
by("hamburger").onclick=()=>{
  if(menu==="result")returnHarbor();
  yardFromMenu=false;
  openHome();
};
document.addEventListener("fullscreenchange",fullscreenLabel);
fullscreenLabel();
function controls(){
  const has=direction=>Array.from(held).some(k=>k.endsWith(":"+direction));
  return {x:Number(has("right"))-Number(has("left")),y:Number(has("down"))-Number(has("up")),
    brake:has("brake")||has("up")||has("down")};
}
for(const button of document.querySelectorAll("[data-control]")){
  const mark=event=>event.pointerId+":"+button.dataset.control;
  button.onpointerdown=event=>{
    if(menu||paused)return;
    TowAudio.unlock();button.setPointerCapture(event.pointerId);held.add(mark(event));
  };
  button.onlostpointercapture=event=>held.delete(mark(event));
}
window.addEventListener("keydown",event=>{
  if(event.ctrlKey||event.altKey||event.metaKey)return;
  const code=event.code;
  if(menu){
    if(code==="Escape"&&menu!=="title"){event.preventDefault();closeMenu();}
    if(code==="Tab"){
      const buttons=[...by("panel").querySelectorAll("button:not(:disabled):not([hidden]), a[href]:not([hidden]), input, select")];
      if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}
      else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}
    }
    return;
  }
  if(code in inputKeys){
    event.preventDefault();TowAudio.unlock();
    if(!paused)held.add(code+":"+inputKeys[code]);
    return;
  }
  if(event.repeat)return;
  if(code==="Space"&&event.target instanceof HTMLButtonElement)return;
  if(code==="Space"||code==="KeyE"||code==="Escape"||code==="KeyR")event.preventDefault();
  if(code==="Space")hook();
  if(code==="KeyE")interact();
  if(code==="KeyR"&&mission())enter(state.index,state.job);
  if(code==="Escape"){
    openHome();
  }
});
window.addEventListener("keyup",event=>held.delete(event.code+":"+inputKeys[event.code]));
function loseFocus(){held.clear();if(!menu&&mission()){paused=true;accumulator=0;}}
window.addEventListener("blur",loseFocus);
window.addEventListener("pagehide",rememberPosition);
window.addEventListener("focus",()=>{if(paused&&!menu&&mission())openHome();});
document.addEventListener("visibilitychange",()=>{if(document.hidden)loseFocus();});

function setText(id,text){const n=by(id);if(n.textContent!==text)n.textContent=text;}
function hud(){
  const touch=matchMedia("(pointer: coarse), (max-width: 760px)").matches;
  const use=touch?"Действие":"E", rope=touch?"Трос":"Пробел";
  const m=mission(),nearCargo=state.cargo&&near(state.cargo.x,108)&&(!state.cargo.moored||state.boat.x-state.cargo.x>=52),
    gate=Harbor.bridge(state),current=Harbor.wind(state);
  setText("money",String(save.coins));setText("rep",String(Harbor.reputation(save)));
  by("disembark").hidden=!townArt||!landingReady()||Boolean(menu);
  if(scene==="town"){
    const spot=Town.nearest(walker);
    setText("mission-title","Старая гавань");
    setText("location","Пешком");
    setText("current",Town.district(walker));
    by("retry").hidden=true;by("tow").hidden=true;
    setText("goal",spot?.label||TownStory.goal(save));
    setText("detail",spot?(touch?"Нажмите кнопку «"+spot.action+"».":"Нажмите E · "+spot.action):
      "Загляните на рынок, в сад и к маяку. Катер ждёт на южном причале.");
    by("prompt").hidden=!spot||Boolean(menu);
    setText("prompt",spot ? (touch?"":"E · ")+spot.action : "");
    setText("touch-action",spot?.action||"Действие");
    return;
  }
  setText("mission-title",m?.district!==undefined ?
    Harbor.districts[m.district].name+" · "+(m.stage+1)+"/"+Harbor.districts[m.district].stages.length : m?.name||"Вечерняя гавань");
  const target=m?.check&&!state.checked?m.check:m?.to;
  setText("location",state.response ? state.response.collected+" / "+state.response.targets.length+" · "+m.name :
    m ? m.cargo+" · "+(state.cargo.x>target ? "← " : "→ ")+Math.round(Math.abs(target-state.cargo.x)/5)+" м до "+(target===m.check?"поста":"причала") : Harbor.ships[state.ship].name+" · Бухта");
  setText("current",gate&&near(gate.x,220) ? (gate.open?"Мост открыт ещё ":"Мост закрыт · открытие через ")+gate.remaining+" с" :
    Math.abs(current)<10 ? "Тихая вода" : current<0 ? "← Встречное течение" : "Попутное течение →");
  by("retry").hidden=!m||Boolean(menu);
  by("tow").hidden=!state.hooked;
  by("rope-meter").value=state.tension;
  let title,detail,prompt="";
  if(paused){
    title="Пауза";detail="Откройте меню или нажмите E, чтобы продолжить рейс.";
  }else if(!m){
    title="Свободное плавание";
    detail="Чтобы вернуться в город, сбросьте ход у причала между верфью и капитаном.";
    if(townArt&&near(Harbor.landing,49)){
      title="Причал · выход в город";
      detail=landingReady()?(touch?"Нажмите «На берег».":"Нажмите E, чтобы выйти на причал пешком."):"Притормозите, чтобы высадиться.";
      if(landingReady())prompt=use+" · Сойти на берег";
    }else if(near(Harbor.port,70))prompt=use+" · Доска контрактов";
    else if(near(Harbor.yard,65))prompt=use+" · Верфь";
  }else if(state.done){
    title="Груз доставлен";detail="Оплата и репутация зачислены.";
    if(state.response){title="Вызов закрыт";detail="Оплата зачислена.";}
  }else if(state.response){
    const response=state.response, next=Harbor.nextTarget(state);
    if(m.operation==="rescue"&&response.expired&&!response.collected){
      title="Время вышло";detail="Шлюпки унесло в море. Начните рейс заново или вернитесь в бухту.";
    }else if(m.operation==="rescue"&&!next){
      title="На борт поднято: "+response.collected;
      detail="Доставьте людей на спасательный причал. До него "+Math.round(Math.abs(m.to-state.boat.x)/5)+" м.";
      if(near(m.to,65)&&Math.abs(state.boat.v)<=40)prompt=use+" · Высадить людей";
    }else{
      title=m.action+" · "+response.collected+"/"+response.targets.length;
      const dx=next.x-state.boat.x;
      detail=(dx<0?"← ":"→ ")+Math.round(Math.abs(dx)/5)+" м до ближайшей точки. Сбавьте ход перед действием.";
      if(m.limit)detail+=" До ухода шлюпок: "+Math.max(0,Math.ceil(m.limit-state.time))+" с.";
      if(Math.abs(dx)<=58&&Math.abs(state.boat.v)<=45)prompt=use+" · "+m.action;
    }
  }else if(m.check&&!state.checked&&!state.cargo.moored&&Math.abs(state.cargo.x-m.check)<225){
    title="3 · Контрольный пост";
    detail="Замедлите понтон у синего буя. Без отметки груз на причале не примут.";
    if(Harbor.checkpointReady(state))prompt=use+" · Пройти осмотр";
  }else if(berth()&&m.check&&!state.checked){
    title="Пропущен контрольный пост";detail="Развернитесь и верните груз к синему бую для осмотра.";
  }else if(berth()){
    title="3 · Пришвартуйте груз";detail=touch ? "Удерживайте тормоз. Когда груз замедлится, нажмите «Действие»." : "Удерживайте тормоз. Когда груз замедлится, нажмите E.";
    if(Math.abs(state.cargo.v)<=27&&Math.abs(state.boat.v)<=35)prompt=use+" · Пришвартовать";
  }else if(!state.hooked){
    title="2 · Подцепите груз";
    detail=state.breaks ? "Трос сорвало. Сбавьте ход, сблизьтесь с понтоном и подцепите его снова." :
      "Пройдите чуть правее дома. Как появится подсказка, подцепите понтон кормовым тросом.";
    if(nearCargo)prompt=rope+" · Подцепить";
  }else{
    title="3 · Доставьте груз к причалу";
    detail=state.passing ? "Катер обходит понтон. Трос остаётся закреплён." :
      state.tension>.82 ? "Трос перегружен. Сбросьте тягу, пока он не сорвался." :
      Math.abs(m.to-state.cargo.x)<220 ? "Доведите сам дом между буями и тормозите заранее." :
      "Идите вправо. Следите за течением и натяжением троса.";
  }
  if(m?.deadline&&state.loadedAt!==null&&!state.done&&!paused){
    const remaining=Math.ceil(m.deadline-state.time+state.loadedAt);
    detail+=" "+(remaining>0?"До потери доплаты: "+remaining+" с.":"Срок доплаты истёк. Доставка ещё оплачивается.");
  }
  if(m?.fragile&&state.loadedAt!==null&&!state.done&&!paused){
    detail+=state.damage||state.breaks ? "Груз повреждён или трос оборван. Базовая оплата сохранена." :
      "Доплата за хрупкий груз пока сохраняется.";
  }
  setText("goal",title);setText("detail",detail);
  by("prompt").hidden=!prompt||Boolean(menu);setText("prompt",prompt);
  const actionLabel=paused?"Продолжить":townArt&&landingReady()?"На берег":!m&&near(Harbor.port,70)?"Контракт":!m&&near(Harbor.yard,65)?"Верфь":
    prompt&&state.response?"Выполнить":prompt&&m?.check&&!state.checked&&Harbor.checkpointReady(state)?"Осмотр":
    prompt&&berth()?"Швартовка":"Действие";
  setText("touch-action",actionLabel);
}
function loop(ts){
  if(!menu&&!paused){
    accumulator+=Math.min(.1,(ts-previous)/1000||0);
    while(accumulator>=Harbor.step){
      const input=controls();
      if(scene==="town")Town.update(walker,input,Harbor.step);
      else Harbor.update(state,input,save.fleet[state.ship].levels);
      accumulator-=Harbor.step;
    }
  }
  previous=ts;
  for(const ev of state.events)cue(ev,ev==="hook"||ev==="lost" ? state.cargo?.x : state.boat.x);
  state.events.length=0;
  TowAudio.motor(Math.abs(state.boat.v),scene==="sea"&&!paused&&!menu);
  TowAudio.music(menu==="loading"||menu==="title"?"title":menu==="chat"?"dialogue":menu?"pause":scene);
  if(ts-lastHud>=80){hud();lastHud=ts;}
  if(prefs.fps===60||ts-lastDraw>=32){
    if(scene==="town")townArt?.draw(walker,Town.nearest(walker),ts,prefs.effects);
    else art?.draw(state,save,ts,prefs.effects);
    lastDraw=ts;
  }
  requestAnimationFrame(loop);
}
applyPrefs();
hud();
try {art=HarborArt(by("sea"));}
catch(error){
  console.error(error);
  by("sea").replaceWith(Object.assign(document.createElement("p"),{
    id:"sea",
    tabIndex:-1,
    className:"graphics-unavailable",
    textContent:"Графика не запустилась. Откройте игру в обычной вкладке браузера."
  }));
}
try {townArt=TownArt(by("town"));}catch(error){console.error(error);}
requestAnimationFrame(loop);
async function loadGame(){
  const total=(art?11:0)+(townArt?3:0);
  let completed=0;
  function progress(label,count=1){
    completed+=count;
    by("loading-progress").max=total;
    by("loading-progress").value=completed;
    by("loading-caption").textContent=label+" · "+completed+"/"+total;
  }
  const [sea,town]=await Promise.allSettled([
    art?art.preload((_,label)=>progress(label)):Promise.resolve(null),
    townArt?townArt.preload().finally(()=>progress("Карта и персонажи",3)):Promise.resolve(null)
  ]);
  if(town.status==="rejected")townArt=null;
  const failed=!art||!townArt||sea.status==="rejected"||sea.value?.some(value=>!value);
  openTitle(failed);
}
loadGame();

