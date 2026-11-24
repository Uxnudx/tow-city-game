"use strict";

function HarborArt(canvas){
  let g=canvas.getContext("2d");
  g.imageSmoothingEnabled=false;
  let viewWidth=640,viewHeight=360,verticalOffset=0;
  const viewport=canvas.parentElement;
  function resize(){
    const box=viewport.getBoundingClientRect();
    if(!box.width||!box.height)return;
    const aspect=box.width/box.height;
    viewWidth=Math.max(340,Math.round(aspect*360));
    viewHeight=viewWidth/aspect;
    verticalOffset=viewHeight*.6972-251;
    const height=Math.min(720,Math.max(360,Math.round(box.height*Math.min(devicePixelRatio,2))));
    const width=Math.max(1,Math.round(aspect*height));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    g.imageSmoothingEnabled=false;
    g.setTransform(width/viewWidth,0,0,height/viewHeight,0,verticalOffset*height/viewHeight);
  }
  if(typeof ResizeObserver==="function")new ResizeObserver(resize).observe(viewport);
  else window.addEventListener("resize",resize);
  resize();
  const background=new Image();
  background.src="harbor.webp";
  const tugboat=new Image();
  tugboat.src="tugboat.webp";
  const fleet=new Image();
  fleet.src="fleet.webp";
  const fleetFrames={
    swift:[11,101,200,69,113],bull:[234,40,195,132,117],
    foam:[462,83,182,88,94],reed:[676,85,200,85,118],
    hammer:[11,259,202,145,118],orca:[231,260,198,144,114],atlas:[453,244,203,160,121]
  };
  const sprites=new Image();
  sprites.src="harbor-sprites.webp";
  const fittings=new Image();
  fittings.src="harbor-fittings.webp";
  const fixtureFrames={pier:[17,54,429,126],buoy:[597,39,139,146],
    tower:[152,215,145,222],span:[449,287,430,98]};
  const frames={
    bakery:[12,14,202,197],clinic:[237,5,192,204],
    shop:[453,17,200,193],forge:[676,5,200,205],
    tea:[10,226,205,212],light:[241,226,184,212],
    master:[492,236,128,193],mechanic:[722,236,108,193]
  };
  const waterline=251;
  const palette={bakery:["#bd6552","#f4bd87"],clinic:["#3c7778","#aad1bd"],shop:["#976448","#dfaa6e"],
    forge:["#66536f","#b08278"],tea:["#a25564","#e8a6a5"],light:["#a85346","#f7dab0"]};
  const ink="#1e2337", dark="#352b38", brass="#ffc869";
  const particles=[];
  let camera=0,last=0,now=0,trim=0,lastSpeed=0,lastBoat=null,wakeDelay=0,bridgeLift=0;
  function r(x,y,w,h,color){
    g.fillStyle=color;
    g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function p(points,color){
    g.fillStyle=color;g.beginPath();
    points.forEach(([x,y],i)=>i ? g.lineTo(Math.round(x),Math.round(y)) : g.moveTo(Math.round(x),Math.round(y)));
    g.closePath();g.fill();
  }
  function fixture(id,x,y,w,h){
    if(!fittings.complete||!fittings.naturalWidth)return false;
    g.drawImage(fittings,...fixtureFrames[id],Math.round(x),Math.round(y),w,h);
    return true;
  }
  function buoy(x,y,lit,signal){
    if(!fixture("buoy",x-8,y-16,16,17)){
      r(x-8,y-6,16,7,ink);r(x-5,y-8,10,3,"#b17354");
    }
    if(signal)r(x-2,y-13,4,4,signal);
    if(lit){
      r(x-9,y+2,6,1,"#76aabb");
      r(x+4,y+4,7,1,"#76aabb");
    }
  }
  function sprite(id,x,bottom,maxWidth,maxHeight){
    if(!sprites.complete||!sprites.naturalWidth)return false;
    const [sx,sy,sw,sh]=frames[id],scale=Math.min(maxWidth/sw,maxHeight/sh);
    const w=Math.round(sw*scale),h=Math.round(sh*scale);
    g.drawImage(sprites,sx,sy,sw,sh,Math.round(x-w/2),Math.round(bottom-h),w,h);
    return true;
  }
  function guard(x,y,id){
    if(sprite(id,x,y,36,52))return;
    r(x+2,y-26,11,13,ink);r(x+3,y-22,8,7,"#efb182");
    r(x+2,y-25,11,3,"#668097");r(x,y-16,14,13,"#354965");
    r(x+4,y-15,4,10,"#bc6e49");r(x+1,y-4,5,4,ink);r(x+8,y-4,5,4,ink);
  }
  function dock(world,label,color){
    const x=Math.round(world-camera),y=waterline-18;
    if(x<-100||x>740)return;
    if(!fixture("pier",x-56,y-16,112,34)){
      r(x-56,y-7,112,12,"#93634b");
      for(const dx of [-46,0,46])r(x+dx-3,y,7,18,dark);
    }
    if(label!=="Причал")guard(x-9,y-7,label==="Верфь" ? "mechanic" : "master");
    const labelTop=y-(label==="Причал" ? 55 : 76);
    g.font='700 12px Alegreya, Georgia, serif';
    const width=g.measureText(label).width+12;
    r(x-width/2,labelTop,width,16,ink); r(x-width/2+1,labelTop+1,2,14,color);
    g.fillStyle="#fff0da";g.textAlign="center";g.fillText(label,x,labelTop+12);
  }
  function drawBridge(x,lift,open){
    if(x<-175||x>815)return;
    const pivotY=waterline-30;
    for(const sign of [-1,1]){
      const pivotX=x+sign*81;
      g.save();
      g.translate(pivotX,pivotY);
      g.scale(-sign,1);
      g.rotate(-lift*1.20);
      if(!fixture("span",0,-14,83,19))r(0,-10,83,15,"#755a48");
      g.restore();
      if(!fixture("tower",pivotX-18,waterline-67,39,83))r(pivotX-13,waterline-64,26,72,"#726877");
      r(pivotX-4,pivotY-20,8,12,ink);
      r(pivotX-2,pivotY-17,4,5,open?"#abe4a0":"#f68970");
    }
  }
  function debris(x,y,t){
    if(x<-25||x>665)return;
    const lift=Math.sin(t*3.5+x*.12)*1.5;
    p([[x-17,y+lift],[x-13,y-5+lift],[x+16,y-5+lift],[x+19,y+2+lift],[x+12,y+6+lift],[x-14,y+5+lift]],dark);
    r(x-13,y-3+lift,28,4,"#b08255");
    r(x-9,y-4+lift,2,8,"#755942");
    r(x+8,y-5+lift,3,8,"#78614c");
    r(x-16,y+6+lift,9,1,"#79aebf");
  }
  function drawResponse(state,t){
    const m=state.mission,response=state.response;
    for(const obstacle of response.obstacles)debris(obstacle.x-camera,waterline+5,t);
    for(const target of response.targets){
      if(target.missed)continue;
      const x=target.x-camera;
      if(x<-50||x>690)continue;
      const y=waterline+Math.sin(t*3+x*.05)*1.6;
      if(m.operation==="lights"){
        fixture("tower",x-9,y-44,19,53);
        buoy(x+5,y+5,true,target.done?"#a1dbad":"#a78b77");
      }else if(!target.done&&m.operation==="sweep"){
        debris(x,y,t);
        r(x-3,y-16,6,3,brass);
      }else if(!target.done){
        p([[x-19,y-3],[x+20,y-3],[x+13,y+5],[x-12,y+5]],ink);
        p([[x-16,y-3],[x+17,y-3],[x+12,y+2],[x-11,y+2]],"#d39b66");
        for(const dx of [-6,6]){
          r(x+dx-2,y-15,4,4,"#f6bc83");
          r(x+dx-3,y-11,6,8,"#e58b54");
        }
        if(Math.sin(t*4)>-.3)r(x-1,y-24,3,3,brass);
      }
    }
    if(m.operation==="rescue")dock(m.to,"Спасательный причал","#9fd9ad");
  }
  function waypoint(x,y,t,reduced){
    const top=y+(reduced?0:Math.round(Math.sin(t*4)*2));
    p([[x-7,top-1],[x+7,top-1],[x,top+7]],ink);
    p([[x-5,top],[x+5,top],[x,top+5]],brass);
  }
  function hull(id){
    if(id==="tug"){
      if(tugboat.complete&&tugboat.naturalWidth)g.drawImage(tugboat,102,8,649,441,-54,-62,108,73);
      return;
    }
    if(!fleet.complete||!fleet.naturalWidth)return;
    const [x,y,width,height,displayWidth]=fleetFrames[id];
    const displayHeight=Math.round(height*displayWidth/width);
    g.drawImage(fleet,x,y,width,height,-Math.round(displayWidth/2),11-displayHeight,displayWidth,displayHeight);
  }
  function portrait(id,large=false){
    const output=document.createElement("canvas");
    output.width=large ? 292 : 128;
    output.height=large ? 168 : 72;
    output.className="ship-portrait";
    output.setAttribute("aria-hidden","true");
    const draw=()=>{
      const previous=g;
      g=output.getContext("2d");
      g.imageSmoothingEnabled=false;
      g.clearRect(0,0,output.width,output.height);
      g.save();
      g.translate(output.width/2,output.height*.84);
      const scale=large ? 1.78 : .77;
      g.scale(scale,scale);
      hull(id);
      g.restore();
      g=previous;
    };
    const image=id==="tug" ? tugboat : fleet;
    if(!image.complete)image.addEventListener("load",draw,{once:true});
    draw();
    return output;
  }
  function boat(state,t,y,effects){
    const x=state.boat.x-camera;
    g.save();g.translate(Math.round(x),Math.round(y));
    g.rotate(trim);g.scale(state.boat.dir,1);
    hull(state.ship);
    if(effects&&["tug","bull","atlas","hammer"].includes(state.ship)){
      const base=state.ship==="bull" ? -25 : -19;
      const throttle=state.boat.drive>0 ? 1 : .35;
      for(let i=0;i<5;i++){
        const trail=(t*(10+throttle*13)+i*6)%28;
        const width=Math.max(2,5+trail*.14);
        r(base-trail*(.5+throttle*.5),-47-trail,width,3,
          "rgba(239,218,198,"+(.6*(1-trail/29))+")");
      }
    }
    g.restore();
  }
  function cargo(kind,x,y,moored,t){
    if(sprite(kind,x,y+7,91,99)){
      if(moored)buoy(x+53,y+2,true);
      return;
    }
    const [roof,wall]=palette[kind];
    p([[x-46,y-6],[x+46,y-6],[x+42,y+7],[x-42,y+7]],ink);
    r(x-44,y-7,88,5,"#c88759");r(x-41,y,82,4,"#855640");
    r(x-31,y-45,62,38,ink);r(x-29,y-43,58,34,wall);
    p([[x-36,y-42],[x-12,y-63],[x+28,y-58],[x+36,y-40]],ink);
    p([[x-32,y-43],[x-12,y-60],[x+26,y-56],[x+32,y-43]],roof);
    for(let i=0;i<3;i++)r(x-22+i*5,y-47-i*3,37-i*3,1,"#704650");
    r(x-12,y-35,36,4,roof);r(x-12,y-31,36,3,"#f3d5a4");
    for(const dx of [-23,3,14]){
      r(x+dx,y-28,8,14,"#684a44");r(x+dx+1,y-27,6,10,"#ffd58c");
      r(x+dx+4,y-27,1,10,"#b17455");r(x+dx+1,y-22,6,1,"#b17455");
    }
    r(x-10,y-26,9,19,"#895845");r(x-8,y-24,5,12,"#bd845c");
    r(x-28,y-16,8,4,"#745862");r(x-27,y-19,5,3,"#d47c80");
    for(const dx of [-42,39]){r(x+dx,y-12,3,11,"#b67e59");r(x+dx-1,y-12,5,2,"#e1a275");}
    if(moored)buoy(x+53,y+2,true);
    if(kind==="light"){
      r(x-3,y-80,8,20,ink);r(x-2,y-78,6,10,"#ffe294");
      r(x-7,y-82,16,4,roof);r(x-1,y-79,4,8,Math.sin(t*3)>0?"#fff4be":"#f1a156");
    }
  }
  function foam(x,y,t,v){
    for(let i=0;i<27;i++){
      const a=(i*7+t*(7+Math.abs(v)*.17))%69;
      const dx=(v<0?1:-1)*a,dy=(i*13)%12;
      const shade=i%3===0 ? "#e4eddf" : i%3===1 ? "#8db5bc" : "#5b93ac";
      r(x+dx-14,y+dy,2+(i%4)*2,1+(i%2),shade);
    }
  }
  function burst(event,x){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    for(let i=0;i<15;i++){
      const a=Math.random()*Math.PI*2,s=15+Math.random()*35;
      particles.push({x,y:waterline-8,dx:Math.cos(a)*s,dy:Math.sin(a)*s-18,life:.32+Math.random()*.51,
        color:event==="dock" ? "#ffce79" : event==="bump" ? "#f7a27c" : "#e9e7d0"});
    }
  }
  function draw(state,save,ts,effects=true){
    const delta=Math.min(.06,(ts-last)/1000||0);last=ts;now+=delta;
    const reduced=!effects||reducedMotion.matches;
    if(lastBoat!==state.boat){lastSpeed=state.boat.v;trim=0;wakeDelay=0;bridgeLift=0;lastBoat=state.boat;}
    const acceleration=state.boat.v-lastSpeed;
    lastSpeed=state.boat.v;
    const motion=state.ship==="swift" ? 1.45 : state.ship==="bull" ? .57 : 1;
    const wave=reduced ? 0 : Math.sin(now*3.7)*.018;
    const pull=state.hooked&&state.cargo ? Math.sign(state.boat.x-state.cargo.x)*state.tension*.05 : 0;
    const target=reduced ? 0 : Math.max(-.18,Math.min(.18,-acceleration*.023*motion+wave+pull));
    trim+=(target-trim)*Math.min(1,delta*7);
    const lead=viewWidth*.38125;
    camera+=(Math.max(0,state.boat.x-lead)-camera)*Math.min(1,delta*8);
    if(Math.abs(state.boat.x-camera)>viewWidth+20)camera=Math.max(0,state.boat.x-lead);
    r(0,-verticalOffset,viewWidth,viewHeight,"#426482");
    if(background.complete&&background.naturalWidth){
      const src=background.naturalWidth;
      const crop=Math.min(Math.round(src*.98),Math.round(background.naturalHeight*viewWidth/viewHeight));
      const margin=src-crop;
      const pan=(1+Math.sin(camera/770-1.57))/2;
      g.drawImage(background,Math.floor(margin*(.24+pan*.76)),0,crop,background.naturalHeight,0,-verticalOffset,viewWidth,viewHeight);
    }
    for(let i=0;i<(reduced ? 0 : 56);i++){
      const x=((i*107+now*(6+i%5)-camera*.82)%680+680)%680-12,y=204+(i*29)%92;
      r(x,y,3+i%13,1,i%4===0?"#dba97c":"#5891a9");
    }
    if(!state.mission){
      let berth=0;
      save.results.forEach((stars,index)=>{
        if(!stars)return;
        const x=462+berth++*96-camera;
        if(x>-55&&x<695)cargo(Harbor.missions[index].kind,x,waterline-22,false,now);
      });
    }
    dock(Harbor.yard,"Верфь","#77c9bc");
    dock(Harbor.port,"Контракты",brass);
    if(!state.mission){
      const x=Harbor.landing-camera;
      buoy(x-14,waterline+14,true,"#92d7b7");
      buoy(x+14,waterline+14,true,"#92d7b7");
      if(Math.abs(state.boat.x-Harbor.landing)<78){
        g.font='700 11px Alegreya, Georgia, serif';
        g.textAlign="center";
        const label="На берег", labelWidth=g.measureText(label).width+10;
        r(x-labelWidth/2,waterline+22,labelWidth,15,ink);
        g.fillStyle="#bde6bd";g.fillText(label,x,waterline+33);
      }
    }
    if(!state.mission&&!save.results.some(Boolean)){
      waypoint(Harbor.port-camera,waterline-104,now,reduced);
    }
    const mission=state.mission, bridge=Harbor.bridge(state);
    if(state.response){
      drawResponse(state,now);
    }else if(mission){
      dock(mission.to,"Причал",brass);
      const x=mission.to-camera;
      for(const dx of [-52,52])buoy(x+dx,waterline+9,true);
      if(state.index===0&&!save.results[0]&&state.hooked)waypoint(x,waterline-83,now,reduced);
      if(mission.check){
        const check=mission.check-camera;
        dock(mission.check,state.checked?"Осмотр пройден":"Контрольный пост","#79c3da");
        buoy(check,waterline+10,true,state.checked?"#7dcb9f":"#6cb4db");
      }
    }
    if(bridge){
      bridgeLift+=(Number(bridge.open)-bridgeLift)*Math.min(1,delta*5.8);
      drawBridge(bridge.x-camera,reduced ? Number(bridge.open) : bridgeLift,bridge.open);
    }
    const passOffset=state.passing&&state.cargo ? 17*Math.max(0,1-Math.abs(state.boat.x-state.cargo.x)/100) : 0;
    const y=waterline+passOffset+(reduced ? 0 : Math.sin(now*(state.ship==="swift"?5.1:3.5))*1.9*motion);
    if(state.cargo){
      const cx=state.cargo.x-camera,cy=waterline+Math.sin(now*3.4+2)*1.9,bx=state.boat.x-camera;
      if(state.hooked){
        const anchor=state.ship==="bull" ? 54 : state.ship==="swift" ? 46 : 49;
        const direction=Math.sign(bx-cx)||1;
        const a=bx-(state.passing?state.boat.dir:direction)*anchor,b=cx+direction*40;
        g.beginPath();g.moveTo(Math.round(a),y-9);g.quadraticCurveTo((a+b)/2,y-1+(1-state.tension)*7,b,cy-10);
        g.lineWidth=3;g.strokeStyle=ink;g.stroke();g.lineWidth=1;
        g.strokeStyle=state.tension>.82?"#fb986f":"#ffd48b";g.stroke();
      }
      if(!reduced&&Math.abs(state.cargo.v)>5)foam(cx,cy+3,now,state.cargo.v);
      cargo(mission.kind,cx,cy,state.cargo.moored,now);
      if(state.index===0&&!save.results[0]&&!state.hooked)waypoint(cx,cy-101,now,reduced);
    }
    if(!reduced&&Math.abs(state.boat.v)>7){
      foam(state.boat.x-camera,y+4,now,state.boat.v);
      wakeDelay-=delta;
      if(!reduced&&wakeDelay<=0&&particles.length<100){
        const direction=Math.sign(state.boat.v),swash=state.boat.drive<0;
        const length=state.ship==="bull" ? 53 : state.ship==="swift" ? 48 : 44;
        for(let i=0;i<(swash?5:3);i++){
          particles.push({x:state.boat.x-direction*(length-i*3),y:y+4+i*2,
            dx:-direction*(11+i*8),dy:-5-i*7,life:.29+i*.065,color:i%2?"#9fcccf":"#e2f1e3"});
        }
        wakeDelay=state.ship==="swift" ? .045 : state.ship==="bull" ? .105 : .075;
      }
    }
    boat(state,reduced?0:now,y,!reduced);
    for(let i=particles.length-1;i>=0;i--){
      const pt=particles[i];pt.life-=delta;
      if(pt.life<=0){particles.splice(i,1);continue;}
      pt.x+=pt.dx*delta;pt.y+=pt.dy*delta;pt.dy+=80*delta;
      r(pt.x-camera,pt.y,2,2,pt.color);
    }
  }
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  function character(id){
    const output=document.createElement("canvas");
    output.width=128;output.height=160;
    output.className="npc-portrait";
    output.setAttribute("aria-hidden","true");
    const render=()=>{
      const previous=g;
      g=output.getContext("2d");
      g.imageSmoothingEnabled=false;
      sprite(id,64,156,120,152);
      g=previous;
    };
    if(!sprites.complete)sprites.addEventListener("load",render,{once:true});
    else render();
    return output;
  }
  function preload(progress){
    const ui=["workshop","hud-plaque","hud-lever","hud-chart","hud-counter","title-screen"].map(name=>{
      const image=new Image();
      image.src=name+".webp";
      return image;
    });
    const images=[background,tugboat,fleet,sprites,fittings,...ui];
    const names=["Бухта","Буксир","Флот","Грузы и персонажи","Причалы и мосты","Мастерская","Табличка","Штурвал","Планшет","Приборы","Титульная иллюстрация"];
    let loaded=0;
    return Promise.all(images.map((image,i)=>image.decode().then(
      ()=>{progress(++loaded,names[i],images.length);return true;},
      ()=>{progress(++loaded,names[i],images.length);return false;}
    )));
  }
  return {draw,burst,portrait,character,preload};
}

