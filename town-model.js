"use strict";

const Town=(()=>{
  const width=1536,height=1024,radius=8;
  const spawn={x:798,y:738};
  const landmarks=[
    {id:"yard",x:330,y:664,label:"Верфь Лины",action:"Верфь",actor:"mechanic"},
    {id:"port",x:764,y:709,label:"Капитан Марин",action:"Контракты",actor:"master"},
    {id:"boat",x:772,y:929,label:"Причал катера",action:"Сесть за штурвал"},
    {id:"market",x:1280,y:653,label:"Рыночная площадь",action:"Поговорить с Ниной",actor:"vendor"},
    {id:"tower",x:1300,y:233,label:"Смотритель маяка",action:"Поговорить",actor:"keeper"},
    {id:"park",x:179,y:274,label:"Сад канатчиков",action:"Прочитать табличку"}
  ];
  // Walkable ground traced against the exported map. Connected lanes meet at the public squares.
  const walkable=[
    [[16,728],[72,722],[407,723],[438,718],[555,714],[642,694],[906,694],[967,722],[1186,720],[1222,690],[1347,689],[1379,720],[1517,730],[1517,750],[839,752],[817,778],[821,975],[720,975],[723,780],[699,752],[16,752]],
    [[303,725],[303,684],[287,674],[283,648],[311,617],[337,604],[359,594],[401,595],[401,664],[356,688],[326,685],[325,725]],
    [[1211,729],[1219,678],[1198,641],[1203,601],[1238,569],[1274,550],[1367,568],[1373,595],[1349,637],[1352,691],[1371,726]],
    [[562,720],[567,655],[565,596],[570,553],[595,511],[614,480],[621,452],[602,439],[612,412],[639,403],[656,439],[642,483],[622,527],[610,581],[603,636],[605,698],[625,721]],
    [[613,417],[622,366],[621,337],[643,309],[678,263],[676,215],[721,184],[834,177],[877,193],[883,248],[892,275],[939,302],[938,359],[918,402],[898,434],[647,438]],
    [[685,207],[699,179],[793,161],[890,164],[959,178],[1057,182],[1090,162],[1102,118],[1099,87],[1134,85],[1154,111],[1144,154],[1123,194],[1080,215],[1022,206],[944,207],[877,208],[795,206]],
    [[1103,194],[1136,143],[1148,120],[1204,100],[1261,101],[1262,127],[1212,143],[1198,169],[1208,193],[1244,212],[1282,215],[1327,218],[1332,243],[1271,247],[1222,225],[1182,208],[1164,183],[1137,212]],
    [[622,321],[643,334],[636,355],[529,353],[476,357],[449,369],[423,400],[392,420],[359,423],[331,408],[307,381],[281,345],[268,309],[271,282],[285,253],[305,230],[317,246],[299,267],[290,297],[304,338],[337,383],[367,396],[396,388],[418,362],[450,336],[514,327]],
    [[290,254],[279,268],[225,285],[176,290],[123,277],[75,262],[44,241],[24,218],[15,192],[23,166],[39,151],[50,170],[41,195],[50,219],[84,241],[136,254],[179,263],[221,258],[270,239]]
  ];
  const solid=[
    [[691,224],[725,204],[797,203],[835,225],[850,269],[838,302],[801,321],[725,316],[695,297],[679,267]],
    [[642,370],[731,370],[737,411],[643,411]],[[794,369],[879,367],[886,407],[791,409]]
  ];
  function inside(polygon,x,y){
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
    }
    return inside;
  }
  function ground(x,y){
    return walkable.some(poly=>inside(poly,x,y))&&!solid.some(poly=>inside(poly,x,y));
  }
  function passable(x,y){
    return Number.isFinite(x)&&Number.isFinite(y)&&ground(x,y)&&
      [[-radius,0],[radius,0],[0,-radius],[0,radius]].every(([dx,dy])=>ground(x+dx,y+dy));
  }
  function create(position=spawn){
    const p=position&&passable(position.x,position.y)?position:spawn;
    return {x:p.x,y:p.y,dir:"down",stride:0,moving:false};
  }
  function update(player,input,dt){
    const speed=142,length=Math.max(1,Math.hypot(input.x,input.y));
    const dx=input.x/length*speed*dt,dy=input.y/length*speed*dt;
    const beforeX=player.x,beforeY=player.y;
    if(passable(player.x+dx,player.y))player.x+=dx;
    if(passable(player.x,player.y+dy))player.y+=dy;
    player.moving=player.x!==beforeX||player.y!==beforeY;
    if(player.moving){
      player.stride+=Math.hypot(player.x-beforeX,player.y-beforeY);
      player.dir=Math.abs(input.x)>Math.abs(input.y) ? input.x>0?"right":"left" : input.y>0?"down":"up";
    }
  }
  function nearest(player){
    let best=null,dist=47;
    for(const place of landmarks){
      const d=Math.hypot(place.x-player.x,place.y-player.y);
      if(d<=dist){best=place;dist=d;}
    }
    return best;
  }
  function district(player){
    if(player.y>758)return "Пристань";
    if(player.x>1100&&player.y<370)return "Маячный холм";
    if(player.x>1140&&player.y>455)return "Рыночный квартал";
    if(player.x<296&&player.y<375)return "Сад канатчиков";
    if(player.y<464)return "Фонтанная площадь";
    return "Старая гавань";
  }
  return {width,height,spawn,landmarks,create,update,nearest,district,passable};
})();
if(typeof module!=="undefined")module.exports=Town;
