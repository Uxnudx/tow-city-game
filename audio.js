"use strict";

const TowAudio=(()=>{
  let ctx, master, effects, ambience, engine, engineGain, noise, musicBus, musicMix, muted=false, volume=.72;
  let musicVolume=.55,mood="town",nextBeat=0,beat=0,scheduled=false;
  const chords=[
    [55,59,62,67],[50,57,62,66],[52,55,59,64],[48,55,60,64],
    [55,59,62,67],[54,57,62,66],[52,55,59,64],[48,52,55,60],
    [57,60,64,69],[52,55,59,64],[48,55,60,64],[50,57,62,66],
    [55,59,62,67],[52,55,59,64],[48,52,55,60],[50,54,57,62]
  ];
  const melody=[
    [null,67,71,null,74,71],[69,null,66,62,null,66],[67,71,null,76,74,null],[72,67,64,null,67,null],
    [67,null,71,74,79,null],[78,74,null,69,66,null],[67,71,76,null,74,71],[72,null,67,64,null,null],
    [69,72,76,null,79,76],[71,null,67,64,67,null],[72,null,76,79,76,null],[74,69,66,69,null,null],
    [71,74,79,null,74,71],[76,null,74,71,67,null],[72,67,64,null,67,69],[66,null,69,74,null,null]
  ];
  function unlock(){
    if(!ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      ctx=new Audio();
      master=ctx.createGain();
      master.gain.value=muted ? 0 : .78*volume;
      master.connect(ctx.destination);
      effects=ctx.createGain();effects.gain.value=.40;effects.connect(master);
      ambience=ctx.createGain();ambience.gain.value=.38;ambience.connect(master);
      musicBus=ctx.createGain();musicBus.gain.value=musicVolume;
      musicMix=ctx.createGain();musicMix.gain.value=.66;musicMix.connect(musicBus).connect(master);
      engine=ctx.createOscillator();engine.type="triangle";engine.frequency.value=47;
      engineGain=ctx.createGain();engineGain.gain.value=0;
      engine.connect(engineGain).connect(ambience);engine.start();
      noise=ctx.createBuffer(1,ctx.sampleRate*.32,ctx.sampleRate);
      const samples=noise.getChannelData(0);
      let previous=0;
      for(let i=0;i<samples.length;i++){
        previous=.7*previous+.3*(Math.random()*2-1);
        samples[i]=previous;
      }
    }
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    if(!scheduled){
      scheduled=true;
      schedule();
    }
  }
  function note(midi,at,length,gainLevel,voice){
    const pitch=440*Math.pow(2,(midi-69)/12),osc=ctx.createOscillator(),env=ctx.createGain();
    osc.type=voice==="melody"?"triangle":"sine";
    osc.frequency.value=pitch;
    env.gain.setValueAtTime(.0001,at);
    env.gain.exponentialRampToValueAtTime(gainLevel,at+(voice==="melody"?.047:.017));
    env.gain.exponentialRampToValueAtTime(Math.max(.0002,gainLevel*.31),at+length*.5);
    env.gain.exponentialRampToValueAtTime(.0001,at+length);
    osc.connect(env).connect(musicMix);osc.start(at);osc.stop(at+length+.02);
  }
  function schedule(){
    if(ctx?.state==="running"&&!document.hidden&&musicVolume>0&&!muted){
      const step=.257;
      if(nextBeat<ctx.currentTime)nextBeat=ctx.currentTime+.07;
      while(nextBeat<ctx.currentTime+.18){
        const bar=Math.floor(beat/6)%chords.length, part=beat%6, chord=chords[bar];
        if(part===0||part===3)note(chord[part===0?0:1]-12,nextBeat,.75,.115,"bass");
        note(chord[[0,1,2,1,3,2][part]]+12,nextBeat,.50,.048,"pluck");
        if(melody[bar][part]!==null)note(melody[bar][part],nextBeat,part===0?.78:.44,.105,"melody");
        if(mood==="sea"&&(part===2||part===5))note(chord[2],nextBeat,.37,.043,"pluck");
        beat++;nextBeat+=step;
      }
    }
    setTimeout(schedule,110);
  }
  function music(nextMood){
    if(mood===nextMood)return;
    mood=nextMood;
    if(musicMix)musicMix.gain.setTargetAtTime({title:.78,town:.60,sea:.77,dialogue:.26,pause:.36}[mood],ctx.currentTime,.25);
  }
  function tone(freq,target,delay,length,type,volume){
    const at=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(freq,at);
    osc.frequency.exponentialRampToValueAtTime(target,at+length);
    gain.gain.setValueAtTime(.001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.012);
    gain.gain.exponentialRampToValueAtTime(.001,at+length);
    osc.connect(gain).connect(effects);
    osc.start(at);osc.stop(at+length+.01);
  }
  function splash(volume,freq){
    const src=ctx.createBufferSource(), gain=ctx.createGain(), filter=ctx.createBiquadFilter(),at=ctx.currentTime;
    src.buffer=noise;filter.type="bandpass";filter.frequency.value=freq;
    gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.001,at+.28);
    src.connect(filter).connect(gain).connect(effects);src.start();
  }
  function play(event){
    if(!ctx)return;
    switch(event){
      case "contract": tone(261,392,0,.16,"triangle",.27);tone(523,523,.12,.23,"sine",.3);break;
      case "hook": tone(360,180,0,.09,"square",.18);splash(.2,900);break;
      case "pair": tone(480,370,0,.11,"square",.17);tone(630,460,.09,.13,"triangle",.24);break;
      case "release": tone(290,120,0,.12,"triangle",.20);break;
      case "dock": [392,494,587].forEach((hz,i)=>tone(hz,hz,i*.083,.26,"triangle",.29));splash(.23,1100);break;
      case "bump": tone(110,39,0,.13,"triangle",.40);splash(.40,650);break;
      case "tide": tone(330,280,0,.25,"triangle",.30);tone(330,250,.29,.30,"triangle",.27);break;
      case "lost": tone(160,80,0,.28,"triangle",.26);splash(.38,700);break;
      case "result": [392,523,659].forEach((hz,i)=>tone(hz,hz,i*.13,.30,"triangle",.23));break;
    }
  }
  function motor(speed,active){
    if(!ctx)return;
    engine.frequency.setTargetAtTime(45+speed*.30,ctx.currentTime,.09);
    engineGain.gain.setTargetAtTime(active ? .014+Math.min(speed,155)*.0011 : 0,ctx.currentTime,.08);
  }
  function configure(nextMuted,nextVolume,nextMusic){
    muted=nextMuted;volume=nextVolume;
    musicVolume=nextMusic;
    if(master)master.gain.setTargetAtTime(muted ? 0 : .78*volume,ctx.currentTime,.04);
    if(musicBus)musicBus.gain.setTargetAtTime(musicVolume,ctx.currentTime,.12);
  }
  return {unlock,play,motor,configure,music};
})();
