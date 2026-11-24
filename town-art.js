"use strict";

function TownArt(canvas){
  const g=canvas.getContext("2d");
  if(!g)throw Error("Canvas 2D unavailable");
  const {width,height}=Town, ink="#182430", warm="#ffd68e";
  const map=new Image();
  map.src="town-map.webp";
  const people=new Image();
  people.src="town-people.webp";
  const walk=new Image();
  walk.src="town-walk.webp";
  const sequence=[0,1,2,1];
  const steps={
    down:[[65,14,81,149],[67,189,78,152],[64,370,82,152]],
    right:[[233,13,96,148],[238,187,85,154],[234,370,92,151]],
    up:[[408,14,81,149],[411,189,77,152],[406,371,85,152]],
    left:[[580,13,93,148],[583,188,82,153],[580,370,91,150]]
  };
  const sprites={
    down:[68,36,87,152],right:[293,38,83,150],up:[512,38,87,150],left:[733,38,84,150],
    master:[54,261,116,155],keeper:[54,261,116,155],mechanic:[287,256,105,161],vendor:[511,259,108,158]
  };
  const actors=Town.landmarks.filter(spot=>spot.actor).map(spot=>({x:spot.x,y:spot.y-5,role:spot.actor}));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  let viewW=640,viewH=360,scale=1,camX=null,camY=null,ready=false;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  function rect(x,y,w,h,color){
    g.fillStyle=color;
    g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function resize(){
    const area=canvas.parentElement.getBoundingClientRect();
    if(!area.width||!area.height)return;
    const density=Math.min(2,devicePixelRatio||1);
    const w=Math.round(area.width*density),h=Math.round(area.height*density);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    scale=clamp(area.width/805,.70,1.85)*density;
    viewW=w/scale;viewH=h/scale;
    g.imageSmoothingEnabled=false;
  }
  if(typeof ResizeObserver==="function")new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener("resize",resize);
  resize();
  async function preload(){
    await Promise.all([map.decode(),people.decode(),walk.decode()]);
    ready=true;
  }
  function drawPawn(actor,animate){
    const walking=!actor.role&&actor.moving&&animate;
    const frame=walking?steps[actor.dir][sequence[Math.floor(actor.stride/12)%sequence.length]]:sprites[actor.role||actor.dir];
    const [sx,sy,sw,sh]=frame;
    const h=walking?Math.round(sh*.41):actor.role?59:61,w=Math.round(sw*h/sh);
    const ax=Math.round(actor.x-w/2),ay=Math.round(actor.y-h);
    g.fillStyle="#1426326b";
    g.beginPath();g.ellipse(actor.x,actor.y-1,w*.45,3.5,0,0,Math.PI*2);g.fill();
    if(actor.role==="keeper")g.filter="hue-rotate(28deg) saturate(.65)";
    g.drawImage(walking?walk:people,sx,sy,sw,sh,ax,ay,w,h);
    if(actor.role==="keeper")g.filter="none";
  }
  function placard(spot,active,t){
    const moving=active&&!reduced.matches?Math.round(Math.sin(t*.004)*2):0;
    const y=spot.y-(spot.actor?76:22)+moving;
    g.font="700 15px Alegreya, Georgia, serif";
    g.textAlign="center";
    const w=Math.ceil(g.measureText(spot.label).width)+18;
    rect(spot.x-w/2,y-20,w,22,ink);
    rect(spot.x-w/2,y-20,w,1,active?"#f1bf74":"#6f8890");
    g.fillStyle=warm;g.fillText(spot.label,spot.x,y-4);
  }
  function draw(player,active,ts,effects=true){
    if(!ready)return;
    const maxX=Math.max(0,width-viewW),maxY=Math.max(0,height-viewH);
    const targetX=clamp(player.x-viewW*.5,0,maxX),targetY=clamp(player.y-viewH*.53,0,maxY);
    camX=camX===null||Math.abs(targetX-camX)>viewW?targetX:camX+(targetX-camX)*.16;
    camY=camY===null||Math.abs(targetY-camY)>viewH?targetY:camY+(targetY-camY)*.16;
    g.setTransform(1,0,0,1,0,0);g.fillStyle="#15232e";g.fillRect(0,0,canvas.width,canvas.height);
    const px=Math.max(0,(viewW-width)/2),py=Math.max(0,(viewH-height)/2);
    g.setTransform(scale,0,0,scale,Math.round((px-camX)*scale),Math.round((py-camY)*scale));
    g.drawImage(map,0,0,width,height);
    const animate=effects&&!reduced.matches;
    if(animate){
      for(let i=0;i<25;i++){
        const x=(i*101+ts*.011)%width,y=845+(i*19)%169;
        if(x>670&&x<862)continue;
        rect(x,y,4+i%13,1,i%5===0?"#dbb17b":"#6ca5a9");
      }
    }
    for(const actor of [...actors,player].sort((a,b)=>a.y-b.y))drawPawn(actor,animate);
    for(const spot of Town.landmarks){
      if(spot===active||Math.hypot(spot.x-player.x,spot.y-player.y)<125)placard(spot,spot===active,ts);
    }
  }
  function portrait(role){
    if(!sprites[role]||!people.naturalWidth)return null;
    const [x,y,w,h]=sprites[role], output=document.createElement("canvas");
    output.className="talk-avatar";output.width=48;output.height=48;
    output.setAttribute("aria-hidden","true");
    const ctx=output.getContext("2d");
    if(!ctx)return null;
    const size=Math.min(w,Math.round(h*.49));
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(people,x+(w-size)/2,y,size,size,0,0,48,48);
    return output;
  }
  return {draw,resize,preload,portrait};
}
