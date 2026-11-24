"use strict";

const Harbor=(()=>{
  const step=1/60, port=335, yard=154, landing=232;
  const missions=[
    {name:"Хлеб к вечерней смене",cargo:"Пекарня",kind:"bakery",rep:0,pay:90,bonus:30,mass:1.5,from:505,to:1050,flow:6,gate:0,other:"Ровная вода. Научитесь брать груз и гасить инерцию у причала."},
    {name:"Лекарства на Маяк",cargo:"Аптека",kind:"clinic",rep:1,pay:115,bonus:40,mass:1.7,from:510,to:1500,flow:-30,gate:0,other:"Встречное течение. Держите ход и берегите стекло на подходе."},
    {name:"Пока разводят мост",cargo:"Мастерская",kind:"shop",rep:2,pay:140,bonus:50,mass:2.1,from:530,to:1730,flow:13,gate:1110,other:"У разводного моста дождитесь зелёного сигнала. Пройти должны и катер, и груз."},
    {name:"Чугун на верфь",cargo:"Литейная",kind:"forge",rep:3,pay:170,bonus:60,mass:3.4,from:560,to:2050,flow:-28,gate:0,other:"Тяжёлый понтон. Набирайте ход плавно, чтобы не перегружать трос."},
    {name:"Вода поднимается",cargo:"Чайная",kind:"tea",rep:4,pay:200,bonus:70,mass:2.2,from:540,to:2350,flow:40,gate:1590,other:"Попутный прилив разгоняет груз. Тормозите заранее перед мостом и у причала."},
    {name:"Последний фонарь",cargo:"Маяк",kind:"light",rep:5,pay:260,bonus:90,mass:3.2,from:570,to:2700,flow:-38,gate:1840,other:"Тяжёлый груз, штормовые порывы и разводной мост."},
    {name:"Пломба на кабеле",cargo:"Мастерская",kind:"shop",rep:6,requires:5,pay:210,bonus:70,mass:2.3,from:540,to:2220,flow:-24,gate:0,check:1360,other:"Остановите понтон у поста, чтобы Лина проверила кабель."},
    {name:"Письмо под дверью",cargo:"Чайная",kind:"tea",rep:7,requires:6,pay:230,bonus:80,mass:2.1,from:530,to:2590,flow:24,gate:1600,check:1060,other:"Заберите судовой журнал на промежуточной остановке. Мост за постом."},
    {name:"Сухая смена",cargo:"Литейная",kind:"forge",rep:8,requires:7,pay:285,bonus:100,mass:3.4,from:580,to:3190,flow:-38,gate:2090,other:"Выберите маршрут вместе с Линой. Доставка запчастей для насосов."},
    {name:"Последняя очередь",cargo:"Аптека",kind:"clinic",rep:9,requires:8,pay:245,bonus:105,mass:1.8,from:560,to:2820,flow:35,gate:1640,fragile:true,other:"Хрупкий груз. Доплата за целые ампулы и трос."},
    {name:"Пекарня к рассвету",cargo:"Пекарня",kind:"bakery",rep:10,requires:9,pay:265,bonus:100,mass:1.9,from:550,to:3130,flow:-28,gate:0,deadline:42,other:"Срочный заказ. Успейте за 42 секунды после захвата груза ради доплаты."},
    {name:"Свет для обоих берегов",cargo:"Маяк",kind:"light",rep:11,requires:10,pay:380,bonus:150,mass:3.6,from:570,to:3600,flow:-34,gate:2260,check:1330,other:"Примите сигнал у поста и доставьте плавучий маяк к открытому фарватеру."}
  ];
  const story=[
    ["Марин","У пекаря тесто уже поднялось, а его понтон так и стоит посреди бухты. Поставь пекарню к рабочему причалу, пока не разошлась вечерняя смена.","Марин","От пекарни уже несут хлеб на дальний причал. Там, говорят, свет в аптеке до сих пор не включили."],
    ["Марин","На Маяке ждут лекарства. Причальный смотритель ушёл искать фонарь, так что ловить твой понтон с берега будет некому.","Лина","Ампулы приняли. Странно другое: фонарь погас до шторма. У мастерской мог сохраниться журнал включений."],
    ["Лина","Забери мастерскую за мостом. Если пожарные поднимут пролёт, дождись, пока из проёма выйдет и понтон.","Лина","Журнал пуст за последний час. Нельзя вскрыть шкаф с проводкой голыми руками. Нужны инструменты из литейной."],
    ["Лина","У литейщика есть ключ для старого щита. Понтон тяжёлый, поэтому трос натягивай постепенно.","Марин","Ключ у Лины. Пока она разбирает щит, надо освободить проход у чайной. Прилив уже дошёл до ступеней."],
    ["Марин","Хозяйка чайной держит запасной прожектор, но его зальёт вместе с понтоном. Выведи её к верхнему причалу.","Лина","Прожектор работает. Под его светом видно, что плавучий маяк сорвало со швартовов. Его ещё можно вернуть."],
    ["Лина","Маяку нужен новый кабель. Пока просто доставь его к стенке. С такой волной на месте ничего не подключим.","Лина","Он на месте, но пломба на кабеле чужая. Кто-то отключил питание накануне шторма. Покажи кабель на контрольном посту."],
    ["Лина","Понтон с инструментами проведи через контрольный пост. Пломбу запишем в журнал, иначе потом её никто не признает.","Марин","На пломбе знак старого насосного союза. Их журнал в чайной: смотритель оставил его под дверью."],
    ["Марин","Когда подойдёшь к контрольному посту, Лина заберёт журнал с понтона. Она будет ждать уже на другом берегу.","Лина","Вот и запись. Смотритель отключил кабель, чтобы не загорелся затопленный насос. Его можно снова запустить, если заменить клапан."],
    ["Лина","Литейная привезёт клапан. Через внешний пролив короче, но против струи. В защищённом канале придётся остановиться у поста.","Лина","Клапан сел на место. Вода уходит. Попроси Марина перенести аптеку ближе к сухому проходу."],
    ["Марин","Пронеси аптеку за мостом. На нижних полках ампулы, поэтому береги понтон, даже если упустишь удобное окно.","Марин","Аптеку открыли. Теперь рабочим нужен хлеб к утренней смене, иначе половина команды разойдётся по домам."],
    ["Марин","На восточном берегу пекарь уже разжёг печь. Если успеешь до гудка, доплачу из сменной кассы.","Лина","Две бригады на месте, насос работает. Осталось выставить маяк так, чтобы его видели с обоих берегов."],
    ["Лина","У поста я проверю сигнал. Потом веди маяк через мост к створу. Марин соберёт людей у береговых фонарей.","Марин","Оба берега ответили. Смотритель передал ключи от второго причала. Гавань снова принимает суда." ]
  ];
  const jobTypes=[
    {label:"Инспекция",detail:"Остановите понтон у контрольного поста перед сдачей груза."},
    {label:"Хрупкий груз",detail:"Доплата, если доставите груз без ударов и обрыва троса."},
    {label:"Срочная доставка",detail:"Таймер начинается при захвате груза. Опоздание снимает только доплату."}
  ];
  function jobs(day){
    return jobTypes.map((type,slot)=>{
      let seed=(Math.imul(day+1,2246822519)^Math.imul(slot+1,3266489917))>>>0;
      const pick=max=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)%max;};
      const base=missions[pick(6)], from=480+pick(140), to=2180+pick(1700);
      const flow=[-34,-26,17,27,39][pick(5)];
      const gate=day>0&&pick(3)!==0 ? Math.round((from+to)*.57) : 0;
      const check=slot===0 ? Math.round(from+(to-from)*.28) : 0;
      return {id:day+":"+slot,name:type.label+" · "+base.cargo,cargo:base.cargo,kind:base.kind,
        from,to,flow,gate,check,fragile:slot===1,deadline:slot===2?Math.ceil((to-from)/63)+17:0,
        mass:Math.min(base.mass,2.9),pay:100+Math.round((to-from)/18)+(gate?35:0),bonus:48+pick(32),other:type.detail};
    });
  }
  const operations=[
    {type:"rescue",name:"Люди за бортом",action:"Поднять людей",other:"Догони дрейфующие шлюпки, сбрось ход для подбора и отвези людей к спасательному причалу."},
    {type:"sweep",name:"Затор в фарватере",action:"Взять обломок",other:"Поймай дрейфующие обломки на малом ходу. Если врезаться, их отнесёт дальше."},
    {type:"lights",name:"Огни погасли",action:"Починить огонь",other:"Восстанови огни вдоль пролива. Течение и обломки мешают удерживать катер у опор."}
  ];
  function calls(turn){
    return operations.map((op,slot)=>{
      const seed=(Math.imul(turn+1,0x9e3779b1)^Math.imul(slot+1,0x85ebca6b))>>>0;
      const count=3+Math.min(2,Math.floor(turn/3));
      const gap=235+(seed%9)*17, start=610+(seed%7)*38;
      const to=start+gap*(count-1)+520, flow=((seed>>>6)%2?1:-1)*(20+((seed>>>8)%21));
      const points=Array.from({length:count},(_,i)=>start+gap*i+((seed>>>(i+4))%7)*19);
      return {...op,id:"call:"+turn+":"+slot,operation:op.type,points,to,flow,
        limit:op.type==="rescue"?34+count*12:0,pay:[170,145,160][slot]+count*13,
        obstacles:[start+gap*.54,start+gap*1.5,start+gap*(count-1)+120]};
    });
  }
  function districtPatrol(name,type,points,flow,gate=0){
    const op=operations.find(item=>item.type===type);
    const to=points.at(-1)+(type==="rescue"?620:170);
    return {...op,name,operation:type,points,to,flow,gate,limit:type==="rescue"?Math.ceil(to/90)+30:0,
      pay:104+points.length*13,obstacles:points.slice(1,-1).filter((_,i)=>i%2===0).map(x=>x-165)};
  }
  function districtTow(name,cargo,to,flow,gate=0,check=0,deadline=0){
    const base=missions[cargo];
    return {name,cargo:base.cargo,kind:base.kind,mass:base.mass,from:base.from,to,flow,gate,check,
      fragile:base.fragile,deadline,pay:160+Math.round(to/53),bonus:54,
      other:check?"Подцепите понтон, остановитесь на контрольном посту и доставьте груз к причалу.":
        "Подцепите понтон и пришвартуйте его на дальнем причале."};
  }
  const districts=[
    {name:"Старая набережная",brief:"Марин возвращает движение на городскую набережную. У причалов всё ещё плавают доски, а ночные фонари погасли.",stages:[
      districtPatrol("Освободить лестницы","sweep",[620,1160,1730,2730,3570,4510],18),
      districtPatrol("Огни вдоль стены","lights",[645,1200,1970,2845,3860,4950],-15,2370),
      districtTow("Пекарня на северной линии",0,5280,-21,2990,2130),
      districtPatrol("Последняя шлюпка","rescue",[950,1840,3020,4130,5000],25,2500)
    ]},
    {name:"Рыночный квартал",brief:"Нина открывает плавучие лавки. Сначала верните освещение и заберите людей с оторванных понтонов, потом перевезите стекло.",stages:[
      districtPatrol("Фонари у рыбных рядов","lights",[800,1040,1880,3180,4390,5100],24),
      districtPatrol("Перевозчики без вёсел","rescue",[840,1965,2850,3550,5275],-22,2400),
      districtPatrol("Ящики на пути парома","sweep",[720,1530,1745,2970,3410,4660,5290],29),
      districtTow("Аптечное стекло",9,5660,28,3190,1930,83)
    ]},
    {name:"Сухой док",brief:"Лина берёт ночную смену в доке, но не откроет стапели, пока водолазы не вернутся и инструменты не пройдут осмотр.",stages:[
      districtTow("Инструменты к стапелям",2,5620,-28,2940,1800),
      districtPatrol("Водолазы у опор","rescue",[925,1820,2640,3780,4990,5810],-30,3100),
      districtPatrol("Сигналы у ворот","lights",[650,1640,2540,3060,3890,5340],32,2140),
      districtPatrol("Щепа у западной стенки","sweep",[720,1210,2475,3370,4200,4700,5540],-19)
    ]},
    {name:"Южные склады",brief:"На нижнем берегу нужен сухой причал. Вода идёт к складам с отливом, поэтому каждый выход начинается при другом течении.",stages:[
      districtPatrol("Сетями забило створ","sweep",[630,1490,1920,2780,3390,4150,5780],-33),
      districtTow("Клапаны для южного насоса",3,6040,-29,2940,2040),
      districtPatrol("Сменщики на бочках","rescue",[810,1690,3020,4230,5515,6130],31,3590),
      districtPatrol("Красные фонари складов","lights",[780,1550,2480,2970,3680,4520,5830],-23,3160)
    ]},
    {name:"Маячный холм",brief:"Смотритель размечает подход к холму по внешней стене. За разводным мостом фонари нужны раньше, чем придут буксиры.",stages:[
      districtPatrol("Внешний створ","lights",[720,1870,2720,3565,4780,5530,6520],-31,2480),
      districtPatrol("Шлюпки под ветром","rescue",[760,1895,2965,4030,5340,6150],16,3350),
      districtTow("Кабель вверх по проливу",5,6350,27,2840,1740),
      districtPatrol("Старые буи и цепи","sweep",[730,1830,2410,3205,4140,4840,5810,6410],-25)
    ]},
    {name:"Канатная слобода",brief:"Канатчики отдают пустой пирс под спасательный пункт. Новый пункт нужно обозначить, снабдить и проверить в работе.",stages:[
      districtPatrol("Путь к запасному пирсу","sweep",[680,1340,2170,3090,4040,4690,6020,6710],30),
      districtPatrol("Огни запасного причала","lights",[800,1590,2540,3650,4760,5310,6420],20,3100),
      districtTow("Провизия для спасателей",4,6580,-26,3690,2040,97),
      districtPatrol("Первый настоящий вызов","rescue",[730,1680,2860,3900,5110,6370],-34,4250)
    ]},
    {name:"Дальний мол",brief:"На внешнем молу работает только один пост. Придётся чередовать хрупкие грузы и операции на открытой воде.",stages:[
      districtTow("Сигнальные лампы в ящиках",9,6840,38,3470,1580),
      districtPatrol("Мол после шквала","sweep",[600,1450,2230,3150,4220,4730,5890,6870],37),
      districtPatrol("Смотрители за волноломом","rescue",[830,1840,2680,3820,5100,6220,6850],-24,3000),
      districtPatrol("Цепочка ведущих огней","lights",[680,1320,2420,3590,4675,5860,6700],-33,2780)
    ]},
    {name:"Порог пролива",brief:"Вода напирает с двух сторон моста. Лина просит освободить путь пожарной бригаде и провести насос через контрольный пост.",stages:[
      districtPatrol("Валы у первого пролёта","lights",[740,1630,2570,3830,4880,5670,7190],29,3010),
      districtPatrol("Пожарная бригада","rescue",[980,2110,2960,3960,4870,6280,7080],-29,3450),
      districtTow("Насос к воротам пролива",3,7340,-35,4480,2420),
      districtPatrol("Деревья у гидропоста","sweep",[780,1610,2760,3200,4500,5380,6530,7230],-35)
    ]},
    {name:"Восточный фарватер",brief:"Отсюда в город идут первые суда с рассвета. Подготовьте фарватер, прежде чем выставить аптечный понтон у прибойного причала.",stages:[
      districtPatrol("Шлюпки первой смены","rescue",[800,1950,2870,3630,4990,6540,7350],22,4350),
      districtPatrol("Западные обломки","sweep",[900,1350,2340,3520,4470,5810,6770,7440],25),
      districtTow("Срочная доставка ампул",9,7560,-24,3730,2460,110),
      districtPatrol("Огни под мостом","lights",[950,1710,2890,3950,5030,6220,7360],-32,3380)
    ]},
    {name:"Два берега",brief:"Главная смена проверяет все службы на дальней линии. Спасатели, буксиры и смотрители должны закрыть работу до открытия фарватера.",stages:[
      districtPatrol("Освободить дальнюю линию","sweep",[710,1575,2510,3470,4430,5590,6570,7800],-26),
      districtPatrol("Поставить два берега на связь","lights",[800,1940,2650,3960,4810,6470,7700],35,3220),
      districtPatrol("Эвакуация с внешней стены","rescue",[875,1935,2930,4265,5360,6580,7540],-31,3860),
      districtTow("Маяк к открытому фарватеру",5,8200,-34,4710,2510)
    ]}
  ];
  function districtJob(save,index){
    const district=districts[index], stage=save.duties[index];
    if(!district||!district.stages[stage]||(index===0 ? !save.results[0] : save.duties[index-1]!==districts[index-1].stages.length))return null;
    return {...district.stages[stage],id:"district:"+index+":"+stage,district:index,stage};
  }
  const upgrades={
    engine:{name:"Двигатель",description:"+12% базовой тяги за уровень",price:[95,175,240,315,410]},
    winch:{name:"Лебёдка",description:"+70 к пределу натяжения за уровень",price:[100,180,250,325,420]},
    brake:{name:"Реверс",description:"+14% эффективности тормоза за уровень",price:[85,155,220,285,375]},
    hull:{name:"Корпус",description:"Меньше сносит течением и выше порог удара",price:[90,165,230,300,390]}
  };
  const ships={
    tug:{name:"Буксир",role:"Универсальный",description:"Ровная тяга и прочный трос. Подойдёт для любого заказа.",cost:0,rep:0,thrust:310,limit:485,braking:4.8,drift:.46,armor:56,towing:.62},
    swift:{name:"Стриж",role:"Быстроходный",description:"Быстро разгоняется и резко тормозит. Натяжение на тяжёлом грузе растёт быстрее.",cost:135,rep:2,thrust:383,limit:365,braking:6.2,drift:.62,armor:46,towing:.83},
    bull:{name:"Бизон",role:"Тяжёлый буксир",description:"Держит тяжёлый груз и слабее сносится течением. Дольше останавливается.",cost:230,rep:4,thrust:280,limit:645,braking:3.75,drift:.31,armor:72,towing:.40},
    foam:{name:"Пенка",role:"Маневровый катер",description:"Самый короткий тормозной путь. Трос рассчитан на лёгкие понтоны.",cost:120,rep:1,thrust:276,limit:420,braking:7.4,drift:.46,armor:50,towing:.70},
    reed:{name:"Камыш",role:"Речной катер",description:"Слабее всех дрейфует на течении. На тихой воде разгоняется неспешно.",cost:155,rep:3,thrust:265,limit:510,braking:5.25,drift:.19,armor:58,towing:.62},
    hammer:{name:"Молот",role:"Бронированный траулер",description:"Лучше переносит жёсткий контакт с понтоном. Тяжёлый корпус медленно сбрасывает ход.",cost:250,rep:5,thrust:296,limit:560,braking:3.55,drift:.38,armor:104,towing:.53},
    orca:{name:"Косатка",role:"Спасательный катер",description:"Мощный двигатель и уверенный тормоз. На попутном течении требует внимания.",cost:300,rep:6,thrust:403,limit:505,braking:5.75,drift:.70,armor:61,towing:.74},
    atlas:{name:"Атлас",role:"Океанский буксир",description:"Самый прочный трос во флоте. Под тяжёлым грузом держит ход, но тормозит медленнее всех.",cost:390,rep:8,thrust:290,limit:760,braking:3.15,drift:.28,armor:82,towing:.32}
  };
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function normalize(value){
    const fleet=Object.fromEntries(Object.keys(ships).map(id=>{
      const saved=value?.fleet?.[id];
      const levels=saved?.levels??(id==="tug" ? value?.levels : null);
      return [id,{
        owned:id==="tug"||saved?.owned===true,
        levels:Object.fromEntries(Object.keys(upgrades).map(key=>
          [key,clamp(Math.floor(Number(levels?.[key])||0),0,upgrades[key].price.length)]))
      }];
    }));
    return {
      coins:Number.isSafeInteger(value?.coins)&&value.coins>=0 ? value.coins : 0,
      results:missions.map((_,i)=>clamp(Math.floor(Number(value?.results?.[i])||0),0,3)),
      day:Number.isSafeInteger(value?.day)&&value.day>=0 ? value.day : 0,
      incidents:Number.isSafeInteger(value?.incidents)&&value.incidents>=0 ? value.incidents : 0,
      duties:districts.map((district,index)=>Number.isInteger(value?.duties?.[index])?
        clamp(value.duties[index],0,district.stages.length):0),
      route:value?.route==="shelter"||value?.route==="outer" ? value.route : null,
      story:{
        flags:["testimony","inspection","marinPromise","linaFamily","ninaShop"].filter(flag=>Array.isArray(value?.story?.flags)&&value.story.flags.includes(flag)),
        ending:["council","record"].includes(value?.story?.ending) ? value.story.ending : null
      },
      fleet,
      selected:Object.hasOwn(fleet,value?.selected)&&fleet[value.selected].owned ? value.selected : "tug"
    };
  }
  function reputation(save){return save.results.reduce((n,stars)=>n+stars,0);}
  function unlocked(save,index){
    const m=missions[index];
    return Boolean(m&&(save.results[index]>0||
      (reputation(save)>=m.rep&&(index===0||save.results[m.requires??index-1]>0))));
  }
  function create(index=null,ship="tug",job=null,route=null){
    let m=job||missions[index]||null;
    if(index===8&&route==="shelter")m={...m,to:3570,flow:13,gate:0,check:1690};
    const response=m?.operation ? {
      targets:m.points.map(x=>({x,done:false,missed:false})),
      obstacles:m.operation==="sweep" ? [] : m.obstacles.map((x,i)=>({x,origin:x,phase:i*1.7})),
      expired:false,collected:0,hits:0
    } : null;
    return {index,job,route,mission:m,response,checked:false,loadedAt:null,ship,boat:{x:224,v:0,dir:1,drive:0},cargo:m&&!response ? {x:m.from,v:0,moored:true} : null,
      time:0,hooked:false,passing:false,tension:0,strain:0,damage:0,breaks:0,hit:0,hitAt:-10,events:[],done:false};
  }
  function currentAt(state,x){
    const m=state.mission;
    if(!m||x<440)return 0;
    const portShelter=clamp((m.to+15-x)/250,0,1);
    const postShelter=m.check&&!state.checked ? clamp(Math.abs(m.check-x)/185,.15,1) : 1;
    const shelter=Math.min(portShelter,postShelter);
    return (m.flow+(state.index>=4 ? 16*Math.sin(state.time*.82) : 0))*shelter;
  }
  function wind(state){return currentAt(state,state.boat.x);}
  function bridge(state){
    const x=state.mission?.gate;
    if(!x)return null;
    const phase=state.time%16;
    return {x,open:phase>=5,remaining:Math.ceil((phase<5 ? 5 : 16)-phase)};
  }
  function attach(state){
    if(!state.cargo||state.done)return false;
    if(state.hooked){state.hooked=false;state.tension=0;state.events.push("release");return true;}
    if(Math.abs(state.boat.x-state.cargo.x)>108 || (state.cargo.moored&&state.boat.x-state.cargo.x<52))return false;
    if(state.loadedAt===null)state.loadedAt=state.time;
    state.cargo.moored=false;state.hooked=true;state.events.push("hook");return true;
  }
  function checkpointReady(state){
    const c=state.cargo,x=state.mission?.check;
    return Boolean(x&&!state.checked&&c&&!c.moored&&Math.abs(c.x-x)<=58&&Math.abs(c.v)<=30&&Math.abs(state.boat.v)<=38);
  }
  function inspect(state){
    if(!checkpointReady(state))return false;
    state.checked=true;
    state.events.push("contract");
    return true;
  }
  function nextTarget(state){
    if(!state.response)return null;
    return state.response.targets.reduce((best,target)=>{
      if(target.done||target.missed)return best;
      return !best||Math.abs(target.x-state.boat.x)<Math.abs(best.x-state.boat.x)?target:best;
    },null);
  }
  function respond(state){
    const m=state.mission, response=state.response;
    if(!response||state.done)return 0;
    const target=nextTarget(state);
    if(target&&Math.abs(target.x-state.boat.x)<=58&&Math.abs(state.boat.v)<=45){
      target.done=true;response.collected++;
      state.events.push("contract");
      if(m.operation!=="rescue"&&response.collected===response.targets.length){
        state.done=true;
        return 1+Number(response.hits<=2)+Number(response.hits===0);
      }
    }
    if(m.operation==="rescue"&&response.collected>0&&(!nextTarget(state)||response.expired)&&
      Math.abs(state.boat.x-m.to)<=65&&Math.abs(state.boat.v)<=40){
      state.done=true;
      return 1+Number(response.collected>=2)+Number(response.collected===response.targets.length);
    }
    return 0;
  }
  function objectiveBonus(state){
    const m=state.mission;
    if(m.fragile&&state.damage===0&&state.breaks===0)return 35;
    if(m.deadline&&state.loadedAt!==null&&state.time-state.loadedAt<=m.deadline)return 45;
    if(m.check&&state.checked)return 24;
    return 0;
  }
  function settle(state){
    const m=state.mission,c=state.cargo;
    if(!m||c.moored||Math.abs(c.x-m.to)>54||Math.abs(c.v)>27||Math.abs(state.boat.v)>35)return 0;
    if(state.done||(m.check&&!state.checked))return 0;
    state.done=true;state.hooked=false;state.events.push("dock");
    return 1+Number(state.breaks===0&&state.damage<=1)+Number(state.breaks===0&&state.damage===0&&Math.abs(c.x-m.to)<=26&&Math.abs(c.v)<=14);
  }
  function payJob(save,state,stars){
    if(!stars||!state.done||!state.job||!jobs(save.day).some(job=>job.id===state.job.id))return 0;
    const coins=state.job.pay+(stars-1)*Math.round(state.job.bonus/2)+objectiveBonus(state);
    save.coins+=coins;save.day++;
    return coins;
  }
  function payCall(save,state,stars){
    if(!stars||!state.done||!state.response||!calls(save.incidents).some(call=>call.id===state.job.id))return 0;
    const coins=state.job.pay+28*(stars-1);
    save.coins+=coins;save.incidents++;
    return coins;
  }
  function payDistrict(save,state,stars){
    const job=state.job;
    if(!stars||!state.done||!job||districtJob(save,job.district)?.id!==job.id)return 0;
    const finishing=job.stage===districts[job.district].stages.length-1;
    const coins=job.pay+24*(stars-1)+objectiveBonus(state)+(finishing?110:0);
    save.coins+=coins;
    save.duties[job.district]++;
    return coins;
  }
  function pay(save,index,stars){
    const m=missions[index], previous=save.results[index];
    const value=n=>n ? m.pay+(n-1)*Math.round(m.bonus/2) : 0;
    if(!stars)return 0;
    const coins=Math.max(0,value(stars)-value(previous))+(previous ? Math.floor(m.pay*.27) : 0);
    save.coins+=coins;save.results[index]=Math.max(previous,stars);
    return coins;
  }
  function buy(save,id){
    const upgrade=upgrades[id];
    if(!upgrade)return false;
    const levels=save.fleet[save.selected].levels;
    const price=upgrade.price[levels[id]];
    if(price===undefined||save.coins<price)return false;
    save.coins-=price;levels[id]++;return true;
  }
  function selectShip(save,id){
    if(!Object.hasOwn(ships,id))return false;
    const ship=ships[id],entry=save.fleet[id];
    if(!entry.owned){
      if(save.coins<ship.cost||reputation(save)<ship.rep)return false;
      save.coins-=ship.cost;
      entry.owned=true;
    }
    save.selected=id;
    return true;
  }
  function specs(state,levels){
    const s=ships[state.ship];
    return {thrust:s.thrust*(1+.12*levels.engine),limit:s.limit+70*levels.winch,
      braking:s.braking*(1+.14*levels.brake),drift:s.drift*(1-.09*levels.hull),
      armor:s.armor+6*levels.hull,towing:s.towing};
  }
  function update(state,input,levels){
    if(state.done)return;
    state.time+=step;
    const boat=state.boat,cargo=state.cargo,m=state.mission,current=wind(state),s=specs(state,levels);
    if(cargo&&!cargo.moored){
      const gap=boat.x-cargo.x;
      // At low speed, helm toward the tow to pass alongside and take up the line on the other side.
      if(state.passing&&Math.abs(gap)>99)state.passing=false;
      if(state.hooked&&Math.abs(input.x)>=.5&&input.x*gap<0&&Math.abs(gap)<96&&Math.abs(boat.v)<70){
        state.passing=true;
      }
    }
    boat.drive=input.brake ? -1 : Math.abs(input.x);
    if(input.x&&(Math.abs(boat.v)<12||Math.sign(boat.v)===Math.sign(input.x)))boat.dir=Math.sign(input.x);
    const traction=state.hooked ? 1 : 1.13;
    boat.v+=input.x*s.thrust*step*traction;
    boat.v+=(current*s.drift-boat.v)*(input.brake ? s.braking : 1.92)*step;
    if(state.hooked){
      const d=boat.x-cargo.x, gap=Math.abs(d), sign=Math.sign(d);
      const spring=Math.max(0,(gap-77)*10.5+(boat.v-cargo.v)*sign*2.4);
      const force=gap>77 ? Math.min(610,spring) : 0;
      boat.v-=force*sign*step*s.towing;
      cargo.v+=force*sign*step/m.mass;
      state.tension=clamp(force/s.limit,0,1);
      state.strain=clamp(state.strain+(state.tension>.91 ? step : -step*2),0,1);
      if(state.strain>.67){
        state.hooked=false;state.strain=0;state.tension=0;state.breaks++;state.events.push("lost");
      }
    }else {state.tension=0;state.strain=0;}
    const gate=bridge(state);
    function travel(body,limit,isCargo){
      const old=body.x,next=old+body.v*step;
      body.x=clamp(next,60,limit);
      if(body.x!==next)body.v*=-.22;
      if(gate&&!gate.open&&(old<gate.x)!==(body.x<gate.x)){
        const fast=Math.abs(body.v)>40;
        body.x=gate.x+(old<gate.x ? -.8 : .8);body.v*=-.26;
        if(fast&&state.time-state.hitAt>.35){
          state.hitAt=state.time;state.hit++;if(isCargo)state.damage++;state.events.push("bump");
        }
      }
    }
    travel(boat,m ? m.to+280 : 638,false);
    if(state.response){
      const response=state.response;
      if(m.limit&&state.time>m.limit&&!response.expired){
        response.expired=true;
        for(const target of response.targets)target.missed=!target.done;
        state.events.push("lost");
      }
      if(m.operation!=="lights"){
        for(const target of response.targets)if(!target.done&&!target.missed){
          target.x=clamp(target.x+(m.flow*.48+Math.sin(state.time*.68+target.x*.003)*11)*step,480,m.to-95);
          if(m.operation==="sweep"&&Math.abs(target.x-boat.x)<30&&Math.abs(boat.v)>78&&state.time-state.hitAt>.55){
            target.x=clamp(target.x+Math.sign(boat.v)*105,480,m.to-75);
            boat.v*=.68;state.hitAt=state.time;response.hits++;state.events.push("bump");
          }
        }
      }
      for(const obstacle of response.obstacles){
        obstacle.x=obstacle.origin+Math.sin(state.time*.84+obstacle.phase)*94;
        if(Math.abs(boat.x-obstacle.x)<22&&Math.abs(boat.v)>65&&state.time-state.hitAt>.65){
          boat.v*=.54;state.hitAt=state.time;response.hits++;state.events.push("bump");
        }
      }
    }
    if(cargo&&!cargo.moored){
      cargo.v+=(currentAt(state,cargo.x)-cargo.v)*(state.hooked&&input.brake ? 2.9+levels.brake*.85 : 1.12)*step;
      travel(cargo,m.to+254,true);
      const gap=boat.x-cargo.x,side=Math.sign(gap)||1;
      const impact=(cargo.v-boat.v)*side;
      if(!state.passing&&Math.abs(gap)<59&&impact>20){
        boat.x=clamp(cargo.x+side*59,60,m.to+280);
        boat.v=cargo.v;cargo.v-=side*impact*.16;
        if(impact>s.armor&&state.time-state.hitAt>.35){
          state.hitAt=state.time;state.damage++;state.events.push("bump");
        }
      }
    }
  }
  return {step,port,yard,landing,missions,story,jobs,calls,districts,districtJob,ships,upgrades,normalize,reputation,unlocked,create,wind,bridge,attach,settle,inspect,respond,nextTarget,checkpointReady,objectiveBonus,pay,payJob,payCall,payDistrict,buy,selectShip,specs,update};
})();
if(typeof module!=="undefined")module.exports=Harbor;
