(function(){
"use strict";
var ICO=window.ICO,D,T;
var $=function(id){return document.getElementById(id);};
function ic(n){return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+(ICO[n]||"")+'</svg>';}
function F(x){return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g,"\u202f");}
function M(x,n){if(n===undefined)n=1;var v=(x/1e6).toFixed(n).replace(".",",");if(/,0+$/.test(v))v=v.replace(/,0+$/,"");return v;}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");}
function sum(a){return a.reduce(function(x,y){return x+y;},0);}
function pl(n,s,p){return n+"\u00a0"+(n>1?(p||s+"s"):s);}
function dd(s){return new Date(s+"T12:00:00");}
function iso(d){return d.toISOString().slice(0,10);}
function addd(s,n){return iso(new Date(dd(s).getTime()+n*864e5));}
var JOURS=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"],MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],MC=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function dc(s){if(!s)return "";var d=dd(s);return d.getDate()+"\u00a0"+MC[d.getMonth()];}
function flong(s){var d=dd(s);return JOURS[d.getDay()]+" "+d.getDate()+" "+MOIS[d.getMonth()]+" "+d.getFullYear();}

/* familles regroupées pour comparer les sociétés */
var FAM=[
  {k:"chaines",l:"Chaînes, lames",ico:"link",f:["Chaînes et guides","Lames de scie"]},
  {k:"moteur",l:"Moteur, jardin",ico:"trees",f:["Pièces moteur","Espaces verts"]},
  {k:"fluides",l:"Lubrifiants, filtres",ico:"droplets",f:["Lubrifiants","Filtration"]},
  {k:"outils",l:"Outillage",ico:"wrench",f:["Outillage","Outillage électrique","Levage","Outils de coupe"]},
  {k:"abras",l:"Abrasifs, affûtage",ico:"disc",f:["Abrasifs","Affûtage"]},
  {k:"roul",l:"Roulements",ico:"cog",f:["Roulements"]},
  {k:"transm",l:"Courroies",ico:"settings-2",f:["Courroies","Transmission"]},
  {k:"hydro",l:"Hydraulique",ico:"gauge",f:["Flexibles","Raccords","Joints","Compresseurs"]}
];
function famOf(f){for(var i=0;i<FAM.length;i++)if(FAM[i].f.indexOf(f)>=0)return FAM[i];return FAM[3];}
var ET=[
  {k:"Rupture",l:"Rupture",pl:"ruptures",c:"s-r",p:"r",col:"#C8352B"},
  {k:"Sous le seuil",l:"Sous le seuil",pl:"sous le seuil",c:"s-s",p:"o",col:"#E95B0F"},
  {k:"À surveiller",l:"À surveiller",pl:"à surveiller",c:"s-a",p:"a",col:"#D99A1E"},
  {k:"Surstock",l:"Surstock",pl:"en surstock",c:"s-x",p:"b",col:"#5B86B5"},
  {k:"OK",l:"OK",pl:"OK",c:"s-o",p:"g",col:"#BDBDB8"}
];
var ETK={};ET.forEach(function(e,i){e.i=i;ETK[e.k]=e;});
function etat(x){if(x.alerte!=="OK")return x.alerte;return x.couv>x.delai+90?"Surstock":"OK";}

var SOCS,SF=null,CUR="ensemble",FF=null,EF=null,Q="",QS="",SORT={k:"etat",up:true},PER=30,VF={ac:"",rc:"",rp:"",cm:"",im:""},CH={},MORE={rc:8,rp:6,im:8},N,D0,HS={},RALL=[];
var VNAME={ensemble:"Vue d'ensemble",stock:"Stock",achats:"Achats à lancer",commandes:"Commandes",imports:"Importations",receptions:"Réceptions",suivi:"Achats",automatique:"Automatique"};
function inSF(s){return !SF||s===SF;}
function socsIn(i){return !SF||i.socs.indexOf(SF)>=0;}
function tile(s){var p=D.par[s];return '<span class="ti">'+ic(p?p[1]:"building-2")+"</span>";}
function stag(s){return '<span class="stag">'+ic(D.par[s]?D.par[s][1]:"building-2")+esc(s)+"</span>";}

/* préparations gardées sur l'appareil */
var PREP={};try{PREP=JSON.parse(localStorage.getItem("sacri-stocks-prep")||"{}");}catch(e){}
function savePrep(){try{localStorage.setItem("sacri-stocks-prep",JSON.stringify(PREP));}catch(e){}}
var tt;function toast(m){var t=$("toast");t.innerHTML=ic("circle-check-big")+"<span>"+esc(m)+"</span>";t.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on");},2600);}

/* ---------- calculs ---------- */
function stockF(){return D.stock.filter(function(x){return inSF(x.soc)&&(!FF||famOf(x.fam).k===FF);});}
function orders(){var o={},L=[];D.cmd.forEach(function(c){if(!o[c.no]){o[c.no]={no:c.no,soc:c.soc,four:c.four,cde:c.cde,etape:c.etape,arr:c.arr,envoi:c.envoi,lines:[],mt:0,alertes:[]};L.push(o[c.no]);}
  var r=o[c.no];r.lines.push(c);r.mt+=c.mt;if(c.alerte&&r.alertes.indexOf(c.alerte)<0)r.alertes.push(c.alerte);});return L;}
function ordersF(){return orders().filter(function(o){return inSF(o.soc);});}
function openOrders(){return ordersF().filter(function(o){return o.etape!=="Reçu";});}
function envF(){return D.imp.filter(socsIn);}
function transit(){return envF().filter(function(i){return i.alerte!=="Livré";});}
function groups(){var g={},L=[];D.stock.forEach(function(x){var p=D.prop[x.ref];if(!p||!inSF(x.soc))return;if(VF.ac&&CUR==="achats"&&(D.four[x.marque]||[])[2]!==VF.ac)return;var k=x.marque+"|"+x.soc;
  if(!g[k]){g[k]={id:k,four:x.marque,soc:x.soc,lines:[],mt:0,worst:4};L.push(g[k]);}
  g[k].lines.push({x:x,q:p.q,m:p.m});g[k].mt+=p.m;g[k].worst=Math.min(g[k].worst,ETK[etat(x)].i);});
  L.sort(function(a,b){return a.worst-b.worst||b.mt-a.mt;});return L;}
function cnt(st,k){return st.filter(function(x){return etat(x)===k;}).length;}
var ALR=/Retard|manquants|non confirmé/;

/* ---------- vue d'ensemble ---------- */
function spark(data,col){var w=84,h=34,mn=Math.min.apply(null,data),mx=Math.max.apply(null,data),r=(mx-mn)||1;
  var pts=data.map(function(v,i){return [i*(w/(data.length-1)),h-3-(v-mn)/r*(h-8)];});
  var d=pts.map(function(p,i){return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1);}).join(" ");
  var a=d+" L"+w+" "+h+" L0 "+h+" Z",l=pts[pts.length-1];
  return '<svg class="spk" viewBox="0 0 '+w+" "+h+'" preserveAspectRatio="none"><path d="'+a+'" fill="'+col+'" fill-opacity=".08"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+l[0]+'" cy="'+l[1]+'" r="2.6" fill="'+col+'"/></svg>';}
function delta(a,b,goodDown,unit){var d=Math.round((b-a)*10)/10;if(!d)return '<span class="dl nt">=</span>';
  var up=d>0,cls=goodDown===null?"nt":((up!==goodDown)?"up":"dn");
  return '<span class="dl '+cls+'">'+(up?"▲":"▼")+"\u00a0"+String(Math.abs(d)).replace(".",",")+(unit||"")+"</span>";}

/* ---------- période, séries, seaux ---------- */
var PERL={7:"7 jours",30:"30 jours",90:"trimestre",365:"année"};
function perTxt(){return PER===7?"sur 7 jours":PER===30?"sur 30 jours":PER===90?"sur le trimestre":"sur un an";}
function vsTxt(){return PER===7?"vs 7 j avant":PER===30?"vs 30 j avant":PER===90?"vs trimestre avant":"sur un an";}
function di(s){return Math.round((dd(s)-dd(D0))/864e5);}
function ds(i){return addd(D0,i);}
function win(){return [N-PER,N-1];}
function inWin(s){var i=di(s);return i>=N-PER&&i<=N-1;}
function inPrev(s){var i=di(s);return PER<365&&i>=N-2*PER&&i<=N-1-PER;}
function buckets(){var B=[],e=N-1;
  if(PER===365){var t=dd(T),y=t.getFullYear(),m=t.getMonth();for(var k=11;k>=0;k--){var mm=m-k,yy=y;while(mm<0){mm+=12;yy--;}var st=iso(new Date(Date.UTC(yy,mm,1,12))),en=iso(new Date(Date.UTC(yy,mm+1,0,12)));var a=Math.max(di(st),0),b=Math.min(di(en),N-1);B.push({a:a,b:b,l:MC[mm]+(mm===0||k===11?" "+String(yy).slice(2):"")});}return B;}
  var w=PER===7?1:PER===30?5:7,nb=Math.ceil(PER/w);
  for(var j=nb-1;j>=0;j--){var b2=e-j*w,a2=Math.max(b2-w+1,N-PER);var da=dd(ds(a2)),db=dd(ds(b2));
    var l=w===1?JOURS[da.getDay()].slice(0,3)+". "+da.getDate():(w===7?dc(ds(a2)):(da.getMonth()===db.getMonth()?da.getDate()+"-"+db.getDate()+"\u00a0"+MC[db.getMonth()]:dc(ds(a2))+"-"+db.getDate()));
    B.push({a:a2,b:b2,l:l});}
  return B;}
function bOf(B,i){for(var k=0;k<B.length;k++)if(i>=B[k].a&&i<=B[k].b)return k;return -1;}
/* stock reconstitué jour par jour à partir des sorties et des entrées */
function buildHist(){D.stock.forEach(function(x){var m=D.mv[x.ref],e={},st=x.stock,h=new Array(N);if(!m){for(var t=0;t<N;t++)h[t]=x.stock;HS[x.ref]=h;return;}
  m.e.forEach(function(p){e[p[0]]=(e[p[0]]||0)+p[1];});
  for(var t2=N-1;t2>=0;t2--){h[t2]=st;st=st+m.s[t2]-(e[t2]||0);}HS[x.ref]=h;});}
function serie(key){
  var st=stockF(),out=new Array(N),i;
  if(!FF||key==="cmd"||key==="transit"){
    var src=SF?[D.ser.soc[SF]]:[D.ser.g];
    for(i=0;i<N;i++)out[i]=src[0][key][i];
  } else {
    for(i=0;i<N;i++){var v=0;st.forEach(function(x){var h=HS[x.ref][i];if(key==="rupt"){if(h<=0)v++;}else if(key==="sous"){if(h>0&&h<x.seuil)v++;}else v+=h*x.cu/1e6;});out[i]=key==="val"?Math.round(v*100)/100:v;}
  }
  var now={rupt:cnt(st,"Rupture"),sous:cnt(st,"Sous le seuil"),val:Math.round(sum(st.map(function(x){return x.val;}))/1e4)/100,cmd:openOrders().length,transit:transit().length};
  out[N-1]=now[key];return out;}
function lastP(a){return a.slice(N-PER);}
function thin(a,mx){if(a.length<=mx)return a;var o=[],st=(a.length-1)/(mx-1);for(var k=0;k<mx;k++)o.push(a[Math.round(k*st)]);return o;}
function kc(k){/* carte KPI : libellé, icône, valeur, variation, sparkline */
  var dl=k.d===undefined?"":(k.d===null?"":delta(k.d[0],k.d[1],k.gd,k.unit));
  return '<div class="kc'+(k.key?" key":"")+'"><p class="l"><span class="ic '+(k.ic||"")+'">'+ic(k.ico)+"</span>"+k.l+'</p><div class="vr"><p class="v">'+k.v+(k.u?"<small>"+k.u+"</small>":"")+"</p>"+(k.h?spark(thin(k.h,40),k.col):"")+'</div><p class="s">'+dl+(dl&&k.d?'<span>'+vsTxt()+'</span>':'')+(k.s?"<span>"+k.s+"</span>":"")+"</p></div>";}
function dPair(h){return PER<365?[h[N-1-PER],h[N-1]]:[h[0],h[N-1]];}
function renderKpis(){
  var st=stockF(),oo=openOrders(),tr=transit();
  var R=serie("rupt"),S=serie("sous"),C=serie("cmd"),TT=serie("transit"),V=serie("val");
  var K=[
    {l:"Articles en rupture",ico:"package-x",ic:"r",v:R[N-1],h:lastP(R),d:dPair(R),gd:true,col:"#EF4444",key:R[N-1]>0,s:""},
    {l:"Sous le seuil",ico:"triangle-alert",ic:"o",v:S[N-1],h:lastP(S),d:dPair(S),gd:true,col:"#E95B0F"},
    {l:"Commandes en cours",ico:"clipboard-list",ic:"s",v:oo.length,h:lastP(C),d:dPair(C),gd:null,col:"#0EA5E9"},
    {l:"Envois en transit",ico:"ship",ic:"v",v:tr.length,h:lastP(TT),d:dPair(TT),gd:null,col:"#8B5CF6"},
    {l:"Valeur du stock",ico:"warehouse",ic:"g",v:M(sum(st.map(function(x){return x.val;}))),u:"M\u00a0FCFA",h:lastP(V),d:dPair(V),gd:null,col:"#10B981",unit:"\u00a0M"}
  ];
  $("kpis").innerHTML=K.map(kc).join("");
}

function renderHeat(){
  var rows=SOCS.map(function(s){return {s:s,st:D.stock.filter(function(x){return x.soc===s;})};});
  var h='<colgroup><col class="cname">'+FAM.map(function(){return "<col>";}).join("")+'<col class="xn cst"><col class="xn cst"></colgroup>';
  h+='<thead><tr><th class="l">Société</th>'+FAM.map(function(f){return "<th>"+ic(f.ico)+'<span class="tl">'+f.l+"</span></th>";}).join("")+'<th class="n xn">Stock</th><th class="n xn">Achats à lancer</th></tr></thead><tbody>';
  rows.forEach(function(r){
    var dim=SF&&SF!==r.s;
    h+='<tr class="'+(dim?"dim":"")+'"><td class="rh'+(SF===r.s?" on":"")+'" data-soc="'+esc(r.s)+'"><span class="sn">'+tile(r.s)+'<span><span class="nm db">'+esc(r.s)+'</span><span class="mt db">'+esc(D.par[r.s][0])+"</span></span></span></td>";
    FAM.forEach(function(f){
      var a=r.st.filter(function(x){return famOf(x.fam).k===f.k;});
      if(!a.length){h+='<td class="na" title="'+esc(r.s)+' ne vend pas cette famille" aria-label="Non vendu"></td>';return;}
      var w=Math.min.apply(null,a.map(function(x){return ETK[etat(x)].i;})),e=ET[w],nw=a.filter(function(x){return ETK[etat(x)].i===w;}).length;
      var det=ET.map(function(z){var c=a.filter(function(x){return etat(x)===z.k;}).length;return c?c+" "+z.pl:"";}).filter(Boolean).join(", ");
      var LB={"Rupture":["rupture","ruptures"],"Sous le seuil":["sous seuil","sous seuil"],"À surveiller":["à surveiller","à surveiller"],"Surstock":["surstock","surstocks"]};var lab=e.k==="OK"?(a.length>1?"tous OK":"OK"):LB[e.k][nw>1?1:0];
      h+='<td class="c '+e.c+'" data-soc="'+esc(r.s)+'" data-fam="'+f.k+'" title="'+esc(r.s+" · "+f.l+" : "+a.length+" article"+(a.length>1?"s":"")+" ("+det+")")+'"><span class="cv">'+(e.k==="OK"?a.length:nw)+'</span><span class="cl">'+lab+'</span><span class="sq">'+a.slice().sort(function(p,q){return ETK[etat(p)].i-ETK[etat(q)].i;}).map(function(x){return '<i class="'+ETK[etat(x)].c+'"></i>';}).join("")+"</span></td>";
    });
    var v=sum(r.st.map(function(x){return x.val;})),nr=cnt(r.st,"Rupture"),ac=sum(r.st.map(function(x){return D.prop[x.ref]?D.prop[x.ref].m:0;}));
    h+='<td class="num xn"><b>'+M(v)+' M</b><small>'+pl(r.st.length,"article")+'</small></td><td class="num xn"><b>'+(ac?M(ac)+" M":"0 M")+"</b><small>"+(ac?pl(r.st.filter(function(x){return D.prop[x.ref];}).length,"article"):"rien à lancer")+"</small></td></tr>";
  });
  var all=D.stock;
  h+='</tbody><tfoot><tr><td class="rh">Groupe<small class="gs">articles en alerte</small></td>'+FAM.map(function(f){var a=all.filter(function(x){return famOf(x.fam).k===f.k;}),r=a.filter(function(x){var k=etat(x);return k==="Rupture"||k==="Sous le seuil";}).length;
    return '<td class="num" style="text-align:center"><b>'+r+'</b><small>sur '+a.length+"</small></td>";}).join("")+
    '<td class="num xn"><b>'+M(sum(all.map(function(x){return x.val;})))+' M</b></td><td class="num xn"><b>'+M(sum(Object.keys(D.prop).map(function(k){return D.prop[k].m;})))+" M</b></td></tr></tfoot>";
  $("hm").innerHTML=h;
  renderHeatList(rows);
  var SW={"s-r":"#C8352B","s-s":"#F6C9B0","s-a":"#FCEFD6","s-x":"#E4ECF5","s-o":"#E6F2EA"};
  var FL='<div class="famleg">'+FAM.map(function(f){return "<span>"+ic(f.ico)+f.l+"</span>";}).join("")+"</div>";
  $("hm-leg").innerHTML=FL+ET.map(function(e){return '<span><i style="background:'+SW[e.c]+'"></i>'+e.l+"</span>";}).join("")+'<span class="nv"><i style="background:#EDEDEA"></i>Non vendu</span><span class="sep"></span><span>Couleur de la case : l\'état le plus grave. Petits carrés : un par article.</span>';
  [].forEach.call($("hm").querySelectorAll("td.c"),function(td){td.onclick=function(){SF=td.dataset.soc;FF=td.dataset.fam;EF=null;Q="";$("q").value="";renderSide();badges();show("stock");};});
  [].forEach.call($("hm").querySelectorAll("tbody td.rh"),function(td){td.onclick=function(){pick(SF===td.dataset.soc?null:td.dataset.soc);};});
}


/* ---------- graphes (Chart.js, sans animation) ---------- */
var PAL=["#E95B0F","#0EA5E9","#10B981","#8B5CF6","#F59E0B","#64748B"];
var SOCC={"SACRI":"#E95B0F","DEFI":"#0EA5E9","Trans-Roulements":"#10B981","SAFIR":"#8B5CF6","PST-CI":"#F59E0B"};
function fr(x,n){return Number(x).toLocaleString("fr-FR",{maximumFractionDigits:n===undefined?1:n}).replace(/\u202f/g,"\u202f");}
function chartDefaults(){if(!window.Chart)return;var C=Chart.defaults;C.font.family='"Inter",system-ui,sans-serif';C.font.size=12;C.color="#64748B";C.animation=false;C.locale="fr-FR";C.maintainAspectRatio=false;C.responsive=true;
  C.plugins.legend.display=false;var tp=C.plugins.tooltip;tp.backgroundColor="#0F172A";tp.titleColor="#fff";tp.bodyColor="#E2E8F0";tp.padding=10;tp.cornerRadius=10;tp.boxPadding=4;tp.titleFont={weight:"600",size:12.5};tp.bodyFont={size:12.5};tp.usePointStyle=true;
  C.scale.grid.color="#EEF2F6";C.scale.border={display:false};C.elements.bar.borderRadius=5;C.elements.line.tension=.35;C.elements.point.radius=0;C.elements.point.hoverRadius=4;}
function mk(id,cfg){if(CH[id]){CH[id].destroy();delete CH[id];}var el=$(id);if(!el||!window.Chart)return null;CH[id]=new Chart(el,cfg);return CH[id];}
function axisX(o){return Object.assign({grid:{display:false},ticks:{maxRotation:0,autoSkip:true,autoSkipPadding:10}},o||{});}
function axisY(o){return Object.assign({beginAtZero:true,ticks:{precision:0,maxTicksLimit:5}},o||{});}
function gauge(id,val,max,col,vid,vtxt,sid,stxt){var v=Math.max(0,Math.min(val,max));
  mk(id,{type:"doughnut",data:{labels:["",""],datasets:[{data:[v,max-v||(max?0:1)],backgroundColor:[col,"#EEF2F6"],borderWidth:0,borderRadius:[8,0]}]},options:{rotation:-90,circumference:180,cutout:"78%",plugins:{tooltip:{enabled:false}},layout:{padding:{bottom:4}}}});
  $(vid).textContent=vtxt;$(sid).textContent=stxt;}
function donut(id,labels,data,cols,unit,vid,vtxt,legid,fmt){fmt=fmt||function(x){return fr(x);};
  mk(id,{type:"doughnut",data:{labels:labels,datasets:[{data:data,backgroundColor:cols,borderWidth:2,borderColor:"#fff",hoverOffset:4}]},options:{cutout:"70%",plugins:{tooltip:{callbacks:{label:function(c){var t=sum(c.dataset.data)||1;return " "+c.label+" : "+fmt(c.parsed)+(unit?" "+unit:"")+" ("+Math.round(c.parsed/t*100)+"\u00a0%)";}}}}}});
  if(vid)$(vid).textContent=vtxt;
  if(legid)$(legid).innerHTML=labels.map(function(l,i){return '<span class="'+(data[i]?"":"dim")+'"><i style="background:'+cols[i]+'"></i>'+esc(l)+"<b>"+fmt(data[i])+"</b></span>";}).join("");}
function tipCb(unit,n){return {callbacks:{label:function(c){var v=c.parsed.y!==undefined&&c.chart.config.options.indexAxis!=="y"?c.parsed.y:c.parsed.x;return " "+c.dataset.label+" : "+fr(v,n)+(unit?" "+unit:"");}}};}
/* ligne « aujourd'hui » pour les frises */
var todayLine={id:"today",afterDatasetsDraw:function(ch,a,o){var x=ch.scales.x;if(!x||o.at===undefined)return;var px=x.getPixelForValue(o.at),ca=ch.chartArea,g=ch.ctx;if(px<ca.left||px>ca.right)return;g.save();g.strokeStyle="#0F172A";g.lineWidth=1.5;g.setLineDash([4,3]);g.beginPath();g.moveTo(px,ca.top-4);g.lineTo(px,ca.bottom);g.stroke();g.setLineDash([]);g.fillStyle="#0F172A";g.font='600 11px Inter,system-ui';g.textAlign="center";g.fillText("Aujourd'hui",px,ca.top-8);g.restore();}};
function impCol(i){return i.alerte==="Livré"?"#10B981":/manquants|non confirmé/.test(i.alerte)?"#EF4444":/^Retard/.test(i.alerte)?"#EF4444":i.alerte==="Arrivé, en douane"?"#F59E0B":"#0EA5E9";}
function impSt(i){return i.alerte==="Livré"?"Livré":ALR.test(i.alerte)?"En alerte":i.alerte==="Arrivé, en douane"?"En douane":"En route";}
function friseChart(id,boxid,L){
  L=L.slice().sort(function(a,b){return (a.dep||a.depp)<(b.dep||b.depp)?-1:1;});
  var lab=L.map(function(i){return (i.mode==="Aérien"?"\u2708 ":"\u26f4 ")+i.four;});
  var data=L.map(function(i){var a=di(i.dep||i.depp),b=di(i.livre||i.depot);return [a,Math.max(b,a+1)];});
  $(boxid).style.height=Math.max(150,46+L.length*34)+"px";
  var mn=Math.min.apply(null,data.map(function(d){return d[0];}).concat([N-1-PER]))-2,mx=Math.max.apply(null,data.map(function(d){return d[1];}).concat([N-1]))+3;
  mk(id,{type:"bar",plugins:[todayLine],data:{labels:lab,datasets:[{label:"Envoi",data:data,backgroundColor:L.map(impCol),borderRadius:6,borderSkipped:false,barPercentage:.62,categoryPercentage:.9}]},
    options:{indexAxis:"y",layout:{padding:{top:18,right:8}},scales:{x:{type:"linear",min:mn,max:mx,grid:{color:"#EEF2F6"},ticks:{maxTicksLimit:6,callback:function(v){return dc(ds(Math.round(v)));}}},y:{grid:{display:false},ticks:{color:"#334155",font:{size:12},callback:function(v){var t=this.getLabelForValue(v);return t.length>22?t.slice(0,21)+"\u2026":t;}}}},
      plugins:{today:{at:N-1},tooltip:{callbacks:{title:function(c){return L[c[0].dataIndex].four+" · "+L[c[0].dataIndex].no;},label:function(c){var i=L[c.dataIndex];return [" "+(i.mode==="Aérien"?"Avion":"Bateau")+", "+impSt(i).toLowerCase()+(i.alerte!=="Livré"&&impSt(i)==="En alerte"?" ("+lc(i.alerte)+")":""),
        " Départ : "+(i.dep?dc(i.dep):"prévu "+dc(i.depp)),
        " "+(i.livre?"Livré le "+dc(i.livre):"Dépôt prévu le "+dc(i.depot)),
        " Pour "+i.socs.join(", ")];}}}}}});}

/* ---------- vue d'ensemble : graphes ---------- */
function flows(st,B){var E=B.map(function(){return 0;}),S=B.map(function(){return 0;});
  st.forEach(function(x){var m=D.mv[x.ref];if(!m)return;for(var t=N-PER;t<N;t++){var k=bOf(B,t);if(k>=0)S[k]+=m.s[t]*x.cu;}m.e.forEach(function(p){var k=bOf(B,p[0]);if(k>=0&&p[0]>=N-PER)E[k]+=p[1]*x.cu;});});
  return {E:E.map(function(v){return Math.round(v/1e4)/100;}),S:S.map(function(v){return Math.round(v/1e4)/100;})};}
function renderEnsCharts(){
  var st=stockF(),B=buckets(),f=flows(st,B);
  $("t-es").textContent="Entrées et sorties";$("u-es").textContent="Valeur au coût d'achat, en M FCFA, "+perTxt();
  $("x-es").innerHTML='<p class="xv"><b>'+fr(sum(f.E))+'</b> M entrés</p><p class="xv"><b>'+fr(sum(f.S))+"</b> M sortis</p>";
  mk("c-es",{type:"bar",data:{labels:B.map(function(b){return b.l;}),datasets:[{label:"Entrées",data:f.E,backgroundColor:"#10B981",barPercentage:.75,categoryPercentage:.7},{label:"Sorties",data:f.S,backgroundColor:"#E95B0F",barPercentage:.75,categoryPercentage:.7}]},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX(),y:axisY({ticks:{maxTicksLimit:5,callback:function(v){return fr(v)+" M";}}})},plugins:{tooltip:tipCb("M FCFA",2)}}});
  /* couverture */
  var cov=st.filter(function(x){return x.couv>=x.delai;}).length,sh=st.length-cov,sx=st.filter(function(x){return etat(x)==="Surstock";}).length;
  var pc=st.length?Math.round(cov/st.length*100):0;
  gauge("c-gc",cov,st.length||1,pc>=80?"#10B981":pc>=60?"#F59E0B":"#EF4444","gc-v",pc+"\u00a0%","gc-s",cov+" articles sur "+st.length+" couverts");
  $("u-gc").textContent="Articles dont le stock tient au-delà du délai d'approvisionnement";
  $("gc-leg").innerHTML='<span><i style="background:#EF4444"></i>'+pl(sh,"article")+" sous le délai</span><span><i style=\"background:#10B981\"></i>"+pl(cov-sx,"article")+" couvert"+(cov-sx>1?"s":"")+"</span>"+(sx?'<span><i style="background:#0EA5E9"></i>'+sx+" en surstock</span>":"");
  /* familles */
  var fv=FAM.map(function(F){return sum(st.filter(function(x){return famOf(x.fam).k===F.k;}).map(function(x){return x.val;}))/1e6;});
  var idx=FAM.map(function(F,i){return i;}).filter(function(i){return fv[i]>0;}).sort(function(a,b){return fv[b]-fv[a];});
  var FC=["#E95B0F","#0EA5E9","#10B981","#8B5CF6","#F59E0B","#64748B","#94A3B8","#CBD5E1"];
  donut("c-fam",idx.map(function(i){return FAM[i].l;}),idx.map(function(i){return Math.round(fv[i]*100)/100;}),idx.map(function(i,k){return FC[k];}),"M FCFA","fam-v",fr(sum(fv)),"fam-leg",function(x){return fr(x,2);});
  /* ruptures par société */
  var socs=SF?[SF]:SOCS,now=[],res=[];
  socs.forEach(function(s){var a=D.stock.filter(function(x){return x.soc===s&&(!FF||famOf(x.fam).k===FF);});
    now.push(cnt(a,"Rupture"));res.push(a.filter(function(x){if(etat(x)==="Rupture")return false;var h=HS[x.ref];for(var t=N-PER;t<N;t++)if(h[t]<=0)return true;return false;}).length);});
  $("u-rup").textContent="Nombre d'articles, "+perTxt();
  mk("c-rup",{type:"bar",data:{labels:socs,datasets:[{label:"Encore en rupture",data:now,backgroundColor:"#EF4444",stack:"a",barPercentage:.6},{label:"Rupture résolue",data:res,backgroundColor:"#CBD5E1",stack:"a",barPercentage:.6}]},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX({stacked:true,ticks:{maxRotation:0,autoSkip:false,font:{size:11},callback:function(v){var t=this.getLabelForValue(v);return t==="Trans-Roulements"?["Trans-","Roulements"]:t;}}}),y:axisY({stacked:true})},plugins:{tooltip:tipCb("article(s)",0)}}});
  /* valeur du stock */
  var V=lastP(serie("val")),vb=B.map(function(b){return V[b.b-(N-PER)];});
  $("u-val").textContent="En M FCFA, "+perTxt();
  $("x-val").innerHTML=delta(V[0],V[V.length-1],null,"\u00a0M");
  mk("c-val",{type:"line",data:{labels:B.map(function(b){return b.l;}),datasets:[{label:"Valeur du stock",data:vb,borderColor:"#0EA5E9",backgroundColor:"rgba(14,165,233,.12)",fill:true,borderWidth:2,pointRadius:vb.length<14?3:0,pointBackgroundColor:"#0EA5E9"}]},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX(),y:{ticks:{maxTicksLimit:5,callback:function(v){return fr(v)+" M";}}}},plugins:{tooltip:tipCb("M FCFA",2)}}});
  /* frise des arrivages */
  var L=D.imp.concat(D.imph).filter(socsIn).filter(function(i){return i.alerte!=="Livré"||(i.livre&&inWin(i.livre));});
  if(L.length>9)L=L.filter(function(i){return i.alerte!=="Livré";}).concat(L.filter(function(i){return i.alerte==="Livré";}).sort(function(a,b){return a.livre<b.livre?1:-1;}).slice(0,Math.max(0,9-L.filter(function(i){return i.alerte!=="Livré";}).length)));
  $("u-fr").textContent=pl(L.filter(function(i){return i.alerte!=="Livré";}).length,"envoi")+" en cours et "+L.filter(function(i){return i.alerte==="Livré";}).length+" livrés récemment, du départ à l'entrée au dépôt";
  friseChart("c-fr","fr-box",L);
  renderRot(st,B);
}
/* carte de chaleur : articles qui tournent */
function renderRot(st,B){
  var rows=st.map(function(x){var m=D.mv[x.ref],v=B.map(function(){return 0;});if(m)for(var t=N-PER;t<N;t++){var k=bOf(B,t);if(k>=0)v[k]+=m.s[t];}return {x:x,v:v,t:sum(v),val:sum(v)*x.cu};}).filter(function(r){return r.t>0;}).sort(function(a,b){return b.val-a.val;}).slice(0,8);
  $("u-rot").textContent="Les 8 articles qui sortent le plus en valeur, "+perTxt()+". Plus la case est foncée, plus il est sorti de quantités.";
  if(!rows.length){$("rot").innerHTML='<p class="empty">Aucune sortie pour ce filtre.</p>';$("rot-leg").innerHTML="";return;}
  var SC=["#FFF7F2","#FFE4D2","#FDC6A2","#F89A63","#E95B0F","#B3440A"];
  var cols=B.length,nb=Math.min(cols,innerWidth<700?(PER===7?7:6):(PER===7?7:12)),grp=Math.ceil(cols/nb),BB=[];
  for(var k=0;k<cols;k+=grp)BB.push({i:k,j:Math.min(k+grp,cols)-1,l:B[k].l});
  var h='<div class="rg" style="grid-template-columns:minmax('+(innerWidth<700?96:120)+'px,1.6fr) repeat('+BB.length+',minmax(14px,1fr)) minmax('+(innerWidth<700?44:62)+'px,auto)"><span></span>'+BB.map(function(b,i){return '<span class="rh">'+((BB.length>8||innerWidth<700)&&i%2?"":esc(b.l))+"</span>";}).join("")+'<span class="rh" style="text-align:right">Total</span>';
  rows.forEach(function(r){var vv=BB.map(function(b){var s=0;for(var q=b.i;q<=b.j;q++)s+=r.v[q];return s;}),mx=Math.max.apply(null,vv)||1;
    h+='<span class="rn">'+esc(r.x.des)+"<small>"+esc(r.x.soc)+" · "+esc(r.x.ref)+"</small></span>";
    vv.forEach(function(v,i){var lv=v?Math.min(5,1+Math.floor(v/mx*4.999)):0;h+='<span class="rc" style="background:'+SC[lv]+'" data-tip="'+esc("<b>"+r.x.des+"</b><br>"+BB[i].l+" : "+F(v)+" "+r.x.unite+(v>1?"s":"")+" sorti"+(v>1?"s":""))+'"></span>';});
    h+='<span class="rt">'+F(r.t)+"<small>"+esc(r.x.unite)+(r.t>1?"s":"")+"</small></span>";});
  $("rot").innerHTML=h+"</div>";
  $("rot-leg").innerHTML='<span>Moins</span><span class="scale">'+SC.map(function(c){return '<i style="background:'+c+'"></i>';}).join("")+"</span><span>Plus</span><span style=\"margin-left:10px\">Échelle propre à chaque article (unités différentes).</span>";
}
/* infobulles HTML (carte de chaleur, cases) */
document.addEventListener("mousemove",function(e){var t=e.target.closest&&e.target.closest("[data-tip]"),tp=$("tip");if(!tp)return;if(!t){tp.style.display="none";return;}tp.innerHTML=t.getAttribute("data-tip");tp.style.display="block";var x=e.clientX+14,y=e.clientY+14;if(x+270>innerWidth)x=e.clientX-270;tp.style.left=x+"px";tp.style.top=y+"px";});

/* téléphone : une fiche repliable par société au lieu de la grille */
function renderHeatList(rows){
  var LB1={"Rupture":["rupture","ruptures"],"Sous le seuil":["sous le seuil","sous le seuil"],"À surveiller":["à surveiller","à surveiller"],"Surstock":["en surstock","en surstock"],"OK":["OK","OK"]};
  var h=rows.map(function(r){
    var fams=FAM.map(function(f){return {f:f,a:r.st.filter(function(x){return famOf(x.fam).k===f.k;})};});
    var sold=fams.filter(function(o){return o.a.length;}),none=fams.filter(function(o){return !o.a.length;});
    var alr=[];["Rupture","Sous le seuil"].forEach(function(k){sold.forEach(function(o){var c=o.a.filter(function(x){return etat(x)===k;}).length;if(c)alr.push(c+"\u00a0"+LB1[k][c>1?1:0]+" "+o.f.l.toLowerCase());});});
    var nr=cnt(r.st,"Rupture"),ns=cnt(r.st,"Sous le seuil"),v=sum(r.st.map(function(x){return x.val;})),ac=sum(r.st.map(function(x){return D.prop[x.ref]?D.prop[x.ref].m:0;}));
    var badge=nr?'<span class="pill r">'+pl(nr,"rupture")+"</span>":(ns?'<span class="pill o">'+ns+" sous le seuil</span>":'<span class="pill g">Tout va bien</span>');
    var sm='<summary><span class="hl-t">'+tile(r.s)+'<span style="min-width:0"><span class="nm db">'+esc(r.s)+'</span><span class="hl-s db">'+(alr.length?esc(alr.join(" · ")):"Aucune alerte")+'</span></span></span><span class="hl-r">'+badge+ic("chevron-down")+"</span></summary>";
    var body=sold.map(function(o){
      var w=Math.min.apply(null,o.a.map(function(x){return ETK[etat(x)].i;})),e=ET[w];
      var det=ET.map(function(z){var c=o.a.filter(function(x){return etat(x)===z.k;}).length;return c?c+"\u00a0"+LB1[z.k][c>1?1:0]:"";}).filter(Boolean).join(", ");
      return '<button class="hl-f" data-soc="'+esc(r.s)+'" data-fam="'+o.f.k+'"><span class="hl-c '+e.c+'">'+ic(o.f.ico)+'</span><span style="min-width:0"><span class="hl-n db">'+o.f.l+'</span><span class="hl-d db">'+det+'</span></span><span class="sq hl-q">'+o.a.slice().sort(function(p,q){return ETK[etat(p)].i-ETK[etat(q)].i;}).map(function(x){return '<i class="'+ETK[etat(x)].c+'"></i>';}).join("")+"</span>"+ic("chevron-right")+"</button>";}).join("");
    if(none.length)body+='<p class="hl-no">Non vendu : '+none.map(function(o){return o.f.l.toLowerCase();}).join(", ")+"</p>";
    body+='<div class="hl-tot"><span>Stock<b>'+M(v)+"\u00a0M\u00a0FCFA</b></span><span>Achats à lancer<b>"+M(ac)+"\u00a0M\u00a0FCFA</b></span></div>";
    return '<details class="hl'+(SF&&SF!==r.s?" dim":"")+'"'+(SF===r.s?" open":"")+">"+sm+'<div class="hl-b">'+body+"</div></details>";
  }).join("");
  $("hm-list").innerHTML=h;
  [].forEach.call($("hm-list").querySelectorAll(".hl-f"),function(b){b.onclick=function(){SF=b.dataset.soc;FF=b.dataset.fam;EF=null;Q="";$("q").value="";renderSide();badges();show("stock");};});
}

function renderLede(){
  var st=stockF(),nR=cnt(st,"Rupture"),nS=cnt(st,"Sous le seuil"),g=groups(),tr=transit();
  var t="";
  if(!SF){
    var rk=SOCS.map(function(s){var a=D.stock.filter(function(x){return x.soc===s;});return {s:s,r:cnt(a,"Rupture"),u:cnt(a,"Sous le seuil")};}).sort(function(a,b){return (b.r*2+b.u)-(a.r*2+a.u);});
    var top=rk.slice(0,2);
    t="<b>"+pl(nR,"article")+" en rupture</b> et "+nS+" sous le seuil, sur "+st.length+" suivis dans les cinq sociétés. Les plus exposées : <b>"+top.map(function(x){return x.s;}).join(" et ")+"</b> ("+top.map(function(x){return x.r+"\u00a0rupture"+(x.r>1?"s":"")+" et "+x.u+"\u00a0sous le seuil";}).join(" ; ")+"). ";
  } else {
    t="<b>"+pl(nR,"article")+" en rupture</b> et "+nS+" sous le seuil, sur "+st.length+" suivis chez "+SF+". ";
  }
  t+=(g.length?pl(sum(g.map(function(x){return x.lines.length;})),"achat")+" à lancer pour "+M(sum(g.map(function(x){return x.mt;})))+"\u00a0M\u00a0FCFA, ":"Aucun achat à lancer, ")+pl(tr.length,"envoi")+" en route ou en douane.";
  $("lede").innerHTML=t;$("h-ens").textContent=SF?"Stocks et achats · "+SF:"Stocks et achats du groupe";
}

function todos(){
  var L=[],env=envF(),oo=openOrders(),st=stockF();
  env.forEach(function(i){
    if(i.alerte==="Documents manquants")L.push({ico:"file-text",c:"late",t:"Compléter les documents de l'envoi "+i.four,m:i.docs.replace(" / "," sur ")+" reçus · arrivé le "+dc(i.arr)+" · dépôt prévu le "+dc(i.depot),go:"imports",p:"Urgent",pc:"r"});
    if(i.alerte==="Départ non confirmé")L.push({ico:"plane",c:"late",t:"Faire confirmer le départ de l'envoi "+i.four,m:"Départ prévu le "+dc(i.depp)+", pas encore de titre de transport",go:"imports",p:"Urgent",pc:"r"});
  });
  oo.forEach(function(o){
    if(o.etape==="Proforma à payer"){var r=o.lines.some(function(c){var x=D.stock.filter(function(s){return s.ref===c.ref;})[0];return x&&etat(x)==="Rupture";});
      L.push({ico:"hand-coins",c:r?"late":"o",t:"Payer la proforma "+o.four+" ("+M(o.mt,2)+"\u00a0M\u00a0FCFA)",m:o.soc+" · "+o.no+(r?" · débloque un article en rupture":""),go:"commandes",p:r?"Urgent":"Cette semaine",pc:r?"r":"o"});}
    if(o.etape==="Proforma attendue")L.push({ico:"send",c:"a",t:"Relancer "+o.four+" pour la proforma",m:o.soc+" · "+o.no+" · commandée le "+dc(o.cde),go:"commandes",p:"Cette semaine",pc:"a"});
  });
  var sc=st.filter(function(x){return etat(x)==="Rupture"&&D.prop[x.ref];});
  if(sc.length)L.push({ico:"shopping-cart",c:"late",t:pl(sc.length,"rupture")+" à recommander",m:sc.map(function(x){return x.des+" ("+x.soc+")";}).join(" · "),go:"achats",p:"Urgent",pc:"r"});
  env.filter(function(i){return /^Retard/.test(i.alerte);}).forEach(function(i){L.push({ico:"clock",c:"a",t:"Envoi "+i.four+" : "+i.alerte.toLowerCase(),m:i.socs.join(", ")+" · au port le "+dc(i.arr)+" · dépôt le "+dc(i.depot),go:"imports",p:"À suivre",pc:"a"});});
  var ord={r:0,o:1,a:2};L.sort(function(a,b){return ord[a.pc]-ord[b.pc];});
  return L;
}
function renderTodo(){
  $("todo").innerHTML=todos().map(function(x){return '<button class="row" data-goto="'+x.go+'"><span class="ty '+x.c+'">'+ic(x.ico)+'</span><span style="min-width:0"><span class="tt" style="display:block">'+esc(x.t)+'</span><span class="mm">'+esc(x.m)+'</span></span><span class="rr"><span class="pill '+x.pc+'">'+x.p+"</span></span></button>";}).join("")||'<p class="empty">Rien à traiter pour ce filtre.</p>';
}
function renderAcMini(){
  $("ac-mini").innerHTML=groups().map(function(x){var e=ET[x.worst],dn=PREP[x.id];
    return '<button class="row" data-goto="achats"><span class="ty '+(dn?"g":e.p==="r"?"late":"o")+'">'+ic(dn?"check":"shopping-cart")+'</span><span style="min-width:0"><span class="tt" style="display:block">'+esc(x.four)+' <span style="color:var(--mut);font-weight:400">pour '+esc(x.soc)+'</span></span><span class="mm">'+pl(x.lines.length,"article")+" · "+(dn?"demande préparée":(e.k==="Rupture"?"dont une rupture":"sous le seuil"))+'</span></span><span class="rr"><span class="amt">'+M(x.mt,2)+"\u00a0M</span></span></button>";}).join("")||'<p class="empty">Aucun achat à lancer pour ce filtre.</p>';
}

/* ---------- frise d'importation ---------- */
function steps(i){
  var cs=D.cmd.filter(function(c){return c.envoi===i.no;}),cde=cs.map(function(c){return c.cde;}).sort()[0]||(i.dep?addd(i.dep,i.mode==="Aérien"?-12:-24):null);
  var air=i.mode==="Aérien",arrived=!!(i.dep&&i.arr&&i.arr<=T),livre=!!i.livre;
  var s=[
    {n:"Commandé",d:dc(cde),ok:true},
    {n:air?"Envolé":"Embarqué",d:i.dep?dc(i.dep):"prévu "+dc(i.depp),ok:!!i.dep,late:!i.dep&&i.depp<T},
    {n:air?"Aéroport":"Port",d:arrived?dc(i.arr):"prévu "+dc(i.arr),ok:arrived,late:!arrived&&i.retard>3},
    {n:"Dédouané",d:livre?"fait":(arrived?(i.alerte==="Documents manquants"?"docs "+i.docs.replace(" / ","/"):"en cours"):"à venir"),ok:livre,late:arrived&&i.alerte==="Documents manquants"},
    {n:"Livré",d:livre?dc(i.livre):"prévu "+dc(i.depot),ok:livre,late:!livre&&i.depot<T}
  ];
  var last=0;s.forEach(function(x,k){if(x.ok)last=k;});
  return {s:s,last:last};
}
function friseHtml(i){
  var r=steps(i),s=r.s,last=r.last,anyLate=false;
  var h=s.map(function(x,k){var nx=k===last+1,cl=x.ok?"done":(nx?(x.late?"now late":"now"):"todo");if(nx&&x.late)anyLate=true;
    return '<div class="sp '+cl+'"><span class="pt">'+(x.ok?ic("check"):"")+'</span><span class="n">'+x.n+'</span><span class="dt'+(x.ok?"":(x.late&&nx?" r":" pv"))+'">'+esc(x.d)+"</span></div>";}).join("");
  return '<div class="fr"><span class="bg"></span><span class="fg'+(anyLate?" late":"")+'" style="width:'+(last*20)+'%"></span>'+h+"</div>";
}
function impPill(a){var c=a==="Livré"?"g":(a==="Arrivé, en douane"?"a":"r");return '<span class="pill '+c+'">'+esc(a)+"</span>";}
function impHead(i){
  return '<div class="imp-h"><span class="ty '+(i.alerte==="Livré"?"g":ALR.test(i.alerte)?"late":"b")+'">'+ic(i.mode==="Aérien"?"plane":"ship")+'</span><div style="min-width:0"><p class="tt">'+esc(i.four)+'</p><p class="mm"><span>'+(i.mode==="Aérien"?"Avion":"Bateau")+" · "+esc(i.tr)+"</span>"+i.socs.map(stag).join("")+'</p></div><div class="rt">'+impPill(i.alerte)+'<span class="v">'+M(i.val,2)+'\u00a0M\u00a0FCFA<small>documents '+i.docs.replace(" / ","\u00a0sur\u00a0")+"</small></span></div></div>";
}
function impOrder(i){return i.alerte==="Livré"?3:/manquants|non confirmé/.test(i.alerte)?0:/Retard/.test(i.alerte)?1:2;}
function renderImports(){
  renderImCharts();
  var A=envAll(),tr=A.filter(function(i){return i.alerte!=="Livré";}),late=tr.filter(function(i){return ALR.test(i.alerte);});
  var env=tr.concat(A.filter(function(i){return i.livre&&inWin(i.livre);}));
  $("im-lede").innerHTML="<b>"+pl(tr.length,"envoi")+" en route ou en douane</b> pour "+M(sum(tr.map(function(i){return i.val;})))+"\u00a0M\u00a0FCFA"+(late.length?", dont "+late.length+" en alerte.":".")+" "+pl(env.length-tr.length,"envoi")+" livré"+(env.length-tr.length>1?"s":"")+" "+perTxt()+".";
  env=env.slice().sort(function(a,b){return impOrder(a)-impOrder(b)||(impOrder(a)===3?(a.livre<b.livre?1:-1):(a.depot<b.depot?-1:1));});
  var ES=env.slice(0,MORE.im);
  $("im-n").textContent=env.length>ES.length?ES.length+" affichés sur "+env.length:"";
  $("frise").innerHTML=ES.map(function(i){return '<div class="imp">'+impHead(i)+friseHtml(i)+"</div>";}).join("")||'<p class="empty">Aucun envoi pour ces filtres.</p>';
  moreBtn("im-more","im",ES.length,env.length,renderImports);
}
function renderImMini(){
  var tr=transit().sort(function(a,b){return impOrder(a)-impOrder(b);});
  $("im-mini").innerHTML=tr.map(function(i){return '<div class="imp imp-mini" data-goto="imports" style="cursor:pointer">'+impHead(i)+friseHtml(i)+"</div>";}).join("")||'<p class="empty">Aucun envoi en route pour cette société.</p>';
}

/* ---------- stock ---------- */
var COLS=[["des","Article","l"],["soc","Société","l"],["stock","Stock"],["seuil","Seuil"],["encde","En commande"],["couv","Couverture"],["val","Valeur"],["etat","État","l"]];
function famL(k){return FAM.filter(function(f){return f.k===k;})[0].l;}
function renderStock(){
  renderStockCharts();var st=stockF();
  $("st-seg").innerHTML=[["","Tous",st.length]].concat(ET.map(function(e){return [e.k,e.l,cnt(st,e.k)];})).map(function(o){return '<button data-e="'+esc(o[0])+'" class="'+((EF||"")===o[0]?"on":"")+'">'+esc(o[1])+' <span class="c">'+o[2]+"</span></button>";}).join("");
  [].forEach.call($("st-seg").children,function(b){b.onclick=function(){EF=b.dataset.e||null;renderStock();};});
  var q=Q.toLowerCase(),r=st.filter(function(x){return (!EF||etat(x)===EF)&&(!q||(x.des+" "+x.marque+" "+x.ref+" "+x.fam+" "+x.soc).toLowerCase().indexOf(q)>=0);});
  r.sort(function(a,b){var k=SORT.k,va,vb;if(k==="etat"){va=ETK[etat(a)].i;vb=ETK[etat(b)].i;if(va===vb){va=a.couv;vb=b.couv;}}else{va=a[k];vb=b[k];}
    return (va<vb?-1:va>vb?1:0)*(SORT.up?1:-1);});
  var nR=cnt(st,"Rupture"),nS=cnt(st,"Sous le seuil"),nX=cnt(st,"Surstock");
  $("st-lede").innerHTML=pl(st.length,"article")+" suivi"+(st.length>1?"s":"")+(SF?" chez "+SF:" dans le groupe")+(FF?", famille « "+famL(FF).toLowerCase()+" »":"")+" : <b>"+nR+" en rupture</b>, "+nS+" sous le seuil"+(nX?", "+nX+" en surstock":"")+". Valeur : "+M(sum(st.map(function(x){return x.val;})))+"\u00a0M\u00a0FCFA.";
  var h="<thead><tr>"+COLS.map(function(c){return '<th class="sortable'+(c[2]?" l":"")+(SORT.k===c[0]?" on":"")+'" data-k="'+c[0]+'">'+c[1]+(SORT.k===c[0]?(SORT.up?" ↑":" ↓"):"")+"</th>";}).join("")+"</tr></thead><tbody>";
  h+=r.map(function(x){var e=ETK[etat(x)],cap=x.delai+90,w=Math.min(x.couv/cap,1)*100,mk=x.delai/cap*100;
    return '<tr><td><div class="art"><p class="nm">'+esc(x.des)+'</p><p class="mt">'+esc(x.ref)+" · "+esc(x.marque)+" · "+esc(x.fam)+" · "+F(x.conso)+" "+esc(x.unite)+(x.conso>1?"s":"")+' par mois</p></div></td>'+
      '<td class="l" data-l="Société">'+stag(x.soc)+'</td>'+
      '<td class="num'+(x.stock===0?" bad":"")+'" data-l="Stock">'+F(x.stock)+'</td><td class="num" data-l="Seuil">'+F(x.seuil)+'</td><td class="num" data-l="En commande">'+(x.encde?F(x.encde):'<span class="zero">0</span>')+"</td>"+
      '<td class="num" data-l="Couverture"><span class="cov"><span class="tr"><i style="width:'+w+"%;background:"+e.col+'"></i><b style="left:'+mk+'%"></b></span>'+x.couv+"\u00a0j</span></td>"+
      '<td class="num hm-f" data-l="Valeur">'+(x.val?M(x.val,2)+"\u00a0M":'<span class="zero">0</span>')+'</td><td class="l" data-l="État"><span class="pill '+e.p+'">'+e.l+"</span></td></tr>";}).join("")||'<tr><td colspan="8"><p class="empty">Aucun article pour ces filtres.</p></td></tr>';
  $("st-tbl").innerHTML=h+"</tbody>";
  [].forEach.call($("st-tbl").querySelectorAll("th[data-k]"),function(th){th.onclick=function(){var k=th.dataset.k;SORT=SORT.k===k?{k:k,up:!SORT.up}:{k:k,up:k==="etat"||k==="couv"};renderStock();};});
}

/* ---------- achats à lancer ---------- */
function renderAchats(){
  renderAchatsCharts();
  var g=groups(),tot=sum(g.map(function(x){return x.mt;})),nl=sum(g.map(function(x){return x.lines.length;})),np=g.filter(function(x){return PREP[x.id];}).length;
  $("ac-lede").innerHTML="<b>"+pl(nl,"article")+" à commander</b> chez "+pl(g.length,"fournisseur")+", pour "+M(tot)+"\u00a0M\u00a0FCFA. "+(np?np+" demande"+(np>1?"s":"")+" déjà préparée"+(np>1?"s":"")+". ":"")+"Les ruptures passent en premier.";
  $("ac").innerHTML=g.map(function(x){var f=D.four[x.four]||[0,"","",""],e=ET[x.worst],dn=PREP[x.id];
    return '<div class="ac'+(dn?" done":"")+'"><div class="ac-h">'+tile(x.soc)+'<div style="min-width:0"><p class="fn">'+esc(x.four)+' <span style="color:var(--mut);font-weight:400">pour '+esc(x.soc)+'</span></p><p class="fm"><span>'+ic(f[2]==="Aérien"?"plane":"ship")+(f[2]==="Aérien"?"Avion":"Bateau")+" depuis "+esc(f[1])+"</span><span>"+ic("clock")+f[0]+" jours</span></p></div>"+(dn?'<span class="pill g">'+ic("check")+"Préparée</span>":'<span class="pill '+e.p+'">'+(e.k==="Rupture"?"Rupture":"Sous le seuil")+"</span>")+'</div><div class="ac-l">'+
      x.lines.map(function(l){var y=l.x,ee=ETK[etat(y)];return '<div class="ac-r"><div style="min-width:0"><p class="nm">'+esc(y.des)+'</p><p class="mt"><span class="pill '+ee.p+'" style="padding:3px 7px">'+ee.l+"</span>stock "+F(y.stock)+" · seuil "+F(y.seuil)+(y.encde?" · "+F(y.encde)+" en commande":"")+'</p></div><p class="q">'+F(l.q)+" "+esc(y.unite)+(l.q>1?"s":"")+"<small>"+F(l.m)+" FCFA</small></p></div>";}).join("")+
      '</div><div class="ac-f"><p class="tot">Montant estimé<b>'+M(x.mt,2)+"<small>M FCFA</small></b></p>"+(dn?'<button class="btn" data-prep="'+esc(x.id)+'">'+ic("file-text")+"Revoir la demande</button>":'<button class="btn pri" data-prep="'+esc(x.id)+'">'+ic("shopping-cart")+"Préparer la commande</button>")+"</div></div>";}).join("")||'<div class="list"><p class="empty">Aucun achat à lancer pour cette société.</p></div>';
  [].forEach.call(document.querySelectorAll("[data-prep]"),function(b){b.onclick=function(){openPrep(b.dataset.prep);};});
}
function openPrep(id){
  var x=null;D.stock.forEach(function(){});var all=SF;SF=null;x=groups().filter(function(g){return g.id===id;})[0];SF=all;if(!x)return;
  var f=D.four[x.four]||[0,"","",""],dn=PREP[id],arr=addd(T,f[0]);
  var h='<div class="tags">'+stag(x.soc)+(dn?'<span class="pill g">'+ic("check")+"Préparée le "+dc(dn)+"</span>":'<span class="pill n">Brouillon</span>')+"</div>"+
    "<h3>"+esc(x.four)+", "+pl(x.lines.length,"article")+"</h3>"+
    '<p class="why">Réapprovisionnement pour '+esc(x.soc)+". Quantités calculées pour couvrir "+f[0]+" jours de délai, plus 90 jours de vente.</p>"+
    '<dl class="props"><dt>Fournisseur</dt><dd>'+esc(x.four)+"</dd><dt>Expédié depuis</dt><dd>"+esc(f[1])+"</dd><dt>Transport</dt><dd>"+ic(f[2]==="Aérien"?"plane":"ship")+(f[2]==="Aérien"?"Avion":"Bateau")+"</dd><dt>Devise</dt><dd>"+esc(f[3])+"</dd><dt>Arrivée estimée</dt><dd>"+ic("calendar-clock")+"vers le "+dc(arr)+" "+dd(arr).getFullYear()+"</dd></dl>"+
    '<div class="da"><div class="da-r h"><span>Article</span><span class="r">Qté</span><span class="r">FCFA</span></div>'+
    x.lines.map(function(l){return '<div class="da-r"><span>'+esc(l.x.des)+"<small>"+esc(l.x.ref)+" · par "+(D.mult[l.x.ref]||1)+'</small></span><span class="r">'+F(l.q)+'</span><span class="r">'+F(l.m)+"</span></div>";}).join("")+
    '<div class="da-r t"><span>Total estimé</span><span></span><span class="r">'+F(x.mt)+"</span></div></div>"+
    '<div class="warnbox">'+ic("info")+"<span>Rien ne part au fournisseur depuis ce tableau. La demande est relue par le responsable des achats, qui demande la proforma et valide la dépense.</span></div>"+
    '<div class="acts">'+(dn?'<button class="btn" id="pa-copy">'+ic("copy")+'Copier la demande</button><button class="btn ghost" id="pa-undo">'+ic("undo-2")+"Remettre en brouillon</button>":'<button class="btn pri" id="pa-ok">'+ic("check")+'Marquer comme préparée</button><button class="btn" id="pa-copy">'+ic("copy")+"Copier la demande</button>")+"</div>";
  $("dr-b").innerHTML=h;
  if($("pa-ok"))$("pa-ok").onclick=function(){PREP[id]=T;savePrep();closePrep();renderAll();toast("Demande "+x.four+" prête pour validation");};
  if($("pa-undo"))$("pa-undo").onclick=function(){delete PREP[id];savePrep();closePrep();renderAll();toast("Demande remise en brouillon");};
  $("pa-copy").onclick=function(){var t="Demande d'achat "+x.four+" pour "+x.soc+"\n"+x.lines.map(function(l){return "- "+l.x.des+" ("+l.x.ref+") : "+l.q+" "+l.x.unite+(l.q>1?"s":"")+", "+F(l.m)+" FCFA";}).join("\n")+"\nTotal estimé : "+F(x.mt)+" FCFA HT";
    var done=function(){toast("Demande copiée");};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,done);else done();};
  $("drawer").classList.add("on");$("scrim").classList.add("on");$("drawer").setAttribute("aria-hidden","false");
}
function closePrep(){$("drawer").classList.remove("on");$("scrim").classList.remove("on");$("drawer").setAttribute("aria-hidden","true");}
$("dr-x").onclick=closePrep;$("scrim").onclick=closePrep;

/* ---------- commandes ---------- */
var ETAPES=[["Proforma attendue","hourglass","Le fournisseur doit envoyer son prix"],["Proforma à payer","hand-coins","À payer avant fabrication"],["Payée, en préparation","package","Le fournisseur prépare"],["Expédiée","ship","En route vers Abidjan"],["Reçu","package-check","Entrée au dépôt"]];
function renderCommandes(){
  renderCmdCharts();var L=ordersV(),oo=L.filter(function(o){return o.etape!=="Reçu";}),blk=oo.filter(function(o){return /Proforma/.test(o.etape);});
  $("cm-lede").innerHTML="<b>"+pl(oo.length,"commande")+" en cours</b> pour "+M(sum(oo.map(function(o){return o.mt;})))+"\u00a0M\u00a0FCFA"+(blk.length?", dont "+blk.length+" bloquée"+(blk.length>1?"s":"")+" chez nous (proforma à obtenir ou à payer).":".");
  $("pipe").innerHTML=ETAPES.map(function(e){var a=L.filter(function(o){return o.etape===e[0];});
    return '<div class="col"><div class="col-h">'+ic(e[1])+"<span>"+e[0]+"<small>"+e[2]+'</small></span><span class="c">'+a.length+"</span></div>"+(a.map(function(o){
      var late=o.arr&&o.arr<T&&o.etape!=="Reçu";
      return '<div class="oc"><p class="t"><span>'+esc(o.four)+"</span>"+stag(o.soc)+'</p><p class="no">'+o.no+" · commandée le "+dc(o.cde)+'</p><p class="ls">'+o.lines.map(function(c){var x=D.stock.filter(function(s){return s.ref===c.ref;})[0];return esc(x?x.des:c.ref)+" ×\u00a0"+F(c.qte);}).join("<br>")+'</p><div class="f"><span class="m">'+M(o.mt,2)+"\u00a0M\u00a0FCFA</span>"+
        '<span class="d'+(late?" late":"")+'">'+ic(o.etape==="Reçu"?"check":"calendar-clock")+(o.etape==="Reçu"?"reçue le "+dc(o.arr):(o.arr?(late?"attendue le "+dc(o.arr):"dépôt le "+dc(o.arr)):"date à fixer"))+"</span></div>"+
        (o.alertes.length?'<p class="al">'+o.alertes.map(function(a){return '<span class="pill '+(/dépassée/.test(a)?"r":"a")+'">'+esc(a==="Manque 4"?"Réception : 4 manquants":a)+"</span>";}).join(" ")+"</p>":"")+"</div>";}).join("")||'<p class="empty">Aucune commande</p>')+"</div>";}).join("");
}

/* ---------- réceptions de la semaine ---------- */
function recF(){return (D.rec||[]).filter(function(r){return inSF(r.soc);});}
function uq(n,l){return F(n)+"\u00a0"+(n>1?l.pl:l.u);}
function recInfo(r){var man=0,ab=0,nm=0,na=0;r.l.forEach(function(l){var m=Math.max(l.cde-l.rec,0);if(m){man+=m;nm++;}if(l.ab){ab+=l.ab;na++;}});return {man:man,ab:ab,nm:nm,na:na,ok:!man&&!ab};}
function recPill(r){var i=recInfo(r),p=[];if(i.ok)return '<span class="pill g">'+ic("check")+"Conforme</span>";
  if(i.man)p.push('<span class="pill o">'+pl(i.nm,"ligne")+" incomplète"+(i.nm>1?"s":"")+"</span>");if(i.ab)p.push('<span class="pill r">'+F(i.ab)+"\u00a0abîmé"+(i.ab>1?"s":"")+"</span>");return p.join(" ");}
function waMsg(r){var i=recInfo(r),t=[];
  t.push("*Réception "+r.no+" · "+r.soc+"*");
  t.push(flong(r.date).replace(/^./,function(c){return c.toUpperCase();})+", "+r.h);
  t.push("Fournisseur : "+r.four+", commande "+r.cde);
  t.push("Arrivé par : "+r.tr);
  t.push("");
  var arr=r.l.filter(function(l){return l.rec>0;});
  t.push(i.ok?"✅ Tout est arrivé, rien ne manque :":"✅ Arrivé :");
  arr.forEach(function(l){t.push("• "+l.des+" : "+F(l.rec)+" sur "+F(l.cde)+" → "+l.emp);});
  if(i.man){t.push("");t.push("⚠️ Manque :");r.l.forEach(function(l){var m=l.cde-l.rec;if(m>0)t.push("• "+l.des+" : "+uq(m,l)+" ("+F(l.rec)+" reçu"+(l.rec>1?"s":"")+" sur "+F(l.cde)+")");});}
  if(i.ab){t.push("");t.push("🔧 Abîmé :");r.l.forEach(function(l){if(l.ab)t.push("• "+l.des+" : "+uq(l.ab,l)+", mis en zone litiges");});}
  if(r.note){t.push("");t.push("Note : "+r.note);}
  t.push("");t.push("Reçu et rangé par "+r.par+", magasin "+r.soc+".");
  return t.join("\n");}
function waHtml(s){return esc(s).replace(/\*([^*\n]+)\*/g,"<b>$1</b>").replace(/\n/g,"<br>");}
function renderReceptions(){
  var RA=recAll();renderRcCharts(RA);var R=recV().slice().sort(function(a,b){return a.date<b.date?1:-1;}),nl=sum(R.map(function(r){return r.l.length;}));
  var ok=R.filter(function(r){return recInfo(r).ok;}).length,man=sum(R.map(function(r){return recInfo(r).man;})),ab=sum(R.map(function(r){return recInfo(r).ab;}));
  $("h-rc").textContent=PER===7?"Réceptions de la semaine":"Réceptions, "+PERL[PER];$("rc-lede").innerHTML=R.length?"<b>"+pl(R.length,"réception")+" du "+dc(addd(T,-PER+1))+" au "+dc(T)+"</b>"+(SF?" chez "+esc(SF):" dans les cinq sociétés")+" : "+pl(nl,"ligne")+" d'articles, "+(R.length-ok?(R.length-ok)+" avec un écart.":"toutes conformes."):"Aucune réception sur la période"+(SF?" chez "+esc(SF):"")+".";
  var K=[{l:"Réceptions",ico:"package-check",v:R.length,s:pl(nl,"ligne")+" d'articles"},{l:"Conformes",ico:"circle-check-big",v:ok,s:"tout reçu, rien d'abîmé"},{l:"Articles manquants",ico:"triangle-alert",v:man,s:"à réclamer ou en reliquat",key:man>0},{l:"Articles abîmés",ico:"package-x",v:ab,s:"en zone litiges",key:ab>0}];
  $("rc-kpis").innerHTML=K.map(function(k){return '<div class="kc'+(k.key?" key":"")+'"><p class="l">'+ic(k.ico)+k.l+'</p><div class="vr"><p class="v">'+k.v+'</p></div><p class="s"><span>'+k.s+"</span></p></div>";}).join("");
  var RS=R.slice(0,MORE.rc);$("rc-n").textContent=R.length>RS.length?RS.length+" affichées sur "+R.length+", les plus récentes d'abord":(R.length?"Les plus récentes d'abord":"");
  $("rc").innerHTML=RS.map(function(r){var m=waMsg(r);
    var rows=r.l.map(function(l){var e=l.rec-l.cde,ec=e<0?'<span class="neg">−'+F(-e)+"</span>":'<span class="okc">'+ic("check")+"</span>";
      return '<div class="rl"><div class="rl-a"><p class="nm">'+esc(l.des)+'</p><p class="mt">'+ic("map-pin")+esc(l.emp)+(l.ab?' · <span class="abm">'+uq(l.ab,l)+" abîmé"+(l.ab>1?"s":"")+"</span>":"")+'</p></div><p class="rl-n" data-l="Commandé">'+F(l.cde)+'</p><p class="rl-n" data-l="Reçu">'+F(l.rec)+'</p><p class="rl-n" data-l="Écart">'+ec+"</p></div>";}).join("");
    return '<article class="rc" id="rc-'+r.no+'"><div class="rc-h">'+tile(r.soc)+'<div style="min-width:0"><p class="fn">'+esc(r.four)+' <span class="pr">pour '+esc(r.soc)+'</span></p><p class="fm"><span>'+ic("file-text")+r.no+"</span><span>"+ic("clipboard-list")+"Commande "+r.cde+"</span><span>"+ic("calendar-clock")+dc(r.date)+", "+esc(r.h)+'</span></p></div><div class="rc-p">'+recPill(r)+'</div></div>'+
      '<div class="rc-b"><div class="rc-t"><div class="rl h"><span>Article et emplacement</span><span class="r">Commandé</span><span class="r">Reçu</span><span class="r">Écart</span></div>'+rows+(r.note?'<p class="rc-n">'+ic("info")+"<span>"+esc(r.note)+"</span></p>":"")+'</div>'+
      '<div class="wa"><p class="wa-t">'+ic("send")+'Message WhatsApp prêt</p><div class="wa-m">'+waHtml(m)+'</div><div class="wa-a"><button class="btn" data-copy="'+r.no+'">'+ic("copy")+'Copier</button><a class="btn wa-b" href="https://wa.me/?text='+encodeURIComponent(m)+'" target="_blank" rel="noopener">'+ic("send")+"Ouvrir dans WhatsApp</a></div></div></div></article>";}).join("")||'<div class="list"><p class="empty">Aucune réception pour ces filtres.</p></div>';
  moreBtn("rc-more","rc",RS.length,R.length,renderReceptions);
  [].forEach.call($("rc").querySelectorAll("[data-copy]"),function(b){b.onclick=function(){var r=RALL.filter(function(x){return x.no===b.dataset.copy;})[0];copyTxt(waMsg(r),"Message "+r.no+" copié");};});
}
function lc(s){return s.charAt(0).toLowerCase()+s.slice(1);}
function copyTxt(t,msg){var done=function(){toast(msg);};
  var fb=function(){var a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(a);done();};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}

/* ---------- achats : commandes en cours et rapprochement ---------- */
function ddiff(a,b){return Math.round((dd(b)-dd(a))/864e5);}
function cmdRetard(o){var e=o.envoi?D.imp.filter(function(i){return i.no===o.envoi;})[0]:null;
  if(!o.arr)return {c:"n",t:"Date à fixer",k:3};
  if(o.arr<T)return {c:"r",t:pl(ddiff(o.arr,T),"jour")+" de retard",k:0};
  if(e&&e.alerte==="Départ non confirmé")return {c:"a",t:"Départ non confirmé",k:1};
  if(e&&e.retard>0&&!e.livre)return {c:"a",t:"Transport : +"+e.retard+"\u00a0j",k:2};
  return {c:"g",t:"Dans les temps",k:4};}
function rapp(r){
  if(r.fac.st!=="recue")return {s:"att",c:"n",t:"Facture attendue",ico:"hourglass",a:"Contrôler la facture à son arrivée, ligne par ligne."};
  var over=[],rel=[];r.l.forEach(function(l){var bon=l.rec-(l.ab||0);if(l.fac>bon)over.push({l:l,n:l.fac-bon});else if(bon<l.cde)rel.push({l:l,n:l.cde-bon});});
  if(over.length)return {s:"ec",c:"r",t:"Écart facture",ico:"triangle-alert",a:"Demander un avoir à "+r.four+" : "+over.map(function(o){return uq(o.n,o.l)+" de "+lc(o.l.des)+(o.l.ab?" (abîmés)":" (non reçus)");}).join(", ")+"."};
  if(rel.length)return {s:"rel",c:"a",t:"Reliquat attendu",ico:"clock",a:"Facture conforme à ce qui est reçu. Reste à livrer : "+rel.map(function(o){return uq(o.n,o.l)+" de "+lc(o.l.des);}).join(", ")+"."};
  return {s:"ok",c:"g",t:"Les trois concordent",ico:"circle-check-big",a:"Facture bonne à payer, selon le circuit de validation habituel."};}
function suiviAlerts(){return recAll().filter(function(r){return rapp(r).s==="ec";}).length;}
function renderSuivi(){
  var oo=openOrders().slice(),q=QS.toLowerCase();
  var nl=oo.filter(function(o){return cmdRetard(o).k<=2;}).length,nlate=oo.filter(function(o){return cmdRetard(o).k===0;}).length,RA=recAll(),RPA=RA.map(rapp);
  var nok=RPA.filter(function(x){return x.s==="ok";}).length,nec=RPA.filter(function(x){return x.s==="ec";}).length,nrel=RPA.filter(function(x){return x.s==="rel";}).length,natt=RPA.filter(function(x){return x.s==="att";}).length;
  $("su-lede").innerHTML="<b>"+pl(oo.length,"commande")+" en cours</b>, dont "+nl+" en retard ou à risque. Rapprochement des "+pl(RA.length,"réception")+" "+perTxt().replace("sur ","des ").replace("des 7 jours","des 7 derniers jours").replace("des 30 jours","des 30 derniers jours").replace("des le trimestre","du trimestre").replace("des un an","de l'année")+" : "+nok+" concordante"+(nok>1?"s":"")+", <b>"+pl(nec,"écart")+" de facture</b> à régler avec le fournisseur.";
  var pc=RA.length?Math.round(nok/RA.length*100):0;
  $("su-kpis").innerHTML=[
    {l:"Commandes en cours",ico:"clipboard-list",ic:"s",v:oo.length,s:nl+" en retard ou à risque"},
    {l:"En retard",ico:"clock",ic:"r",v:nlate,key:nlate>0,s:"date prévue dépassée"},
    {l:"Les trois concordent",ico:"circle-check-big",ic:"g",v:pc+"<small>%</small>",s:nok+" réception"+(nok>1?"s":"")+" sur "+RA.length},
    {l:"Écarts de facture",ico:"triangle-alert",ic:"o",v:nec,key:nec>0,s:"avoir à demander"}
  ].map(kc).join("");
  var RK=[["ok","Les trois concordent","#10B981"],["rel","Reliquat attendu","#F59E0B"],["ec","Écart facture","#EF4444"],["att","Facture attendue","#94A3B8"]];
  $("u-su-d").textContent="Réceptions "+perTxt().replace("sur ","des ").replace("des le","du").replace("des un an","de l'année");
  donut("c-su-d",RK.map(function(k){return k[1];}),RK.map(function(k){return RPA.filter(function(x){return x.s===k[0];}).length;}),RK.map(function(k){return k[2];}),"réception(s)","su-d-v",String(RA.length),"su-d-leg",function(x){return F(x);});
  var fs={};RA.forEach(function(r){fs[r.four]=(fs[r.four]||0)+1;});var fl=Object.keys(fs).sort(function(a,b){return fs[b]-fs[a];}).slice(0,7);
  mk("c-su-f",{type:"bar",data:{labels:fl,datasets:RK.map(function(k){return {label:k[1],data:fl.map(function(f){return RA.filter(function(r){return r.four===f&&rapp(r).s===k[0];}).length;}),backgroundColor:k[2],stack:"a",barPercentage:.7};})},
    options:{indexAxis:"y",interaction:{mode:"index",intersect:false},scales:{x:axisY({stacked:true}),y:{stacked:true,grid:{display:false},ticks:{color:"#334155",autoSkip:false,font:{size:11.5},callback:function(v){var t=this.getLabelForValue(v);return t.length>16?t.slice(0,15)+"\u2026":t;}}}},plugins:{tooltip:{filter:function(i){return i.parsed.x>0;}}}}});
  var ontime=oo.filter(function(o){return cmdRetard(o).k>=3;}).length;
  gauge("c-su-g",ontime,oo.length||1,"#10B981","su-g-v",oo.length?Math.round(ontime/oo.length*100)+"\u00a0%":"-","su-g-s",ontime+" sur "+pl(oo.length,"commande"));
  oo=oo.filter(function(o){return !q||(o.four+" "+o.no+" "+o.soc+" "+o.etape+" "+o.lines.map(function(c){return c.des;}).join(" ")).toLowerCase().indexOf(q)>=0;});
  $("su-cap").textContent=pl(oo.length,"commande")+(q?" trouvée"+(oo.length>1?"s":""):"")+", les retards d'abord";
  oo.sort(function(a,b){return cmdRetard(a).k-cmdRetard(b).k||((a.arr||"9")<(b.arr||"9")?-1:1);});
  var h='<thead><tr><th class="l">Commande</th><th class="l">Société</th><th class="l">Étape</th><th>Commandée le</th><th>Date prévue</th><th class="l">Avancement</th><th class="l">Délai</th></tr></thead><tbody>';
  var EI={"Proforma attendue":1,"Proforma à payer":2,"Payée, en préparation":3,"Expédiée":4,"Reçu":5};
  h+=oo.map(function(o){var r=cmdRetard(o),k=EI[o.etape]||1,col=r.c==="r"?"#EF4444":r.c==="a"?"#F59E0B":"#10B981";return '<tr><td><div class="art"><p class="nm">'+esc(o.four)+'</p><p class="mt">'+o.no+" · "+o.lines.map(function(c){return esc(c.des)+" ×\u00a0"+F(c.qte);}).join(", ")+'</p></div></td><td class="l" data-l="Société">'+stag(o.soc)+'</td><td class="l" data-l="Étape">'+esc(o.etape)+'</td><td class="num" data-l="Commandée le">'+dc(o.cde)+'</td><td class="num" data-l="Date prévue">'+(o.arr?dc(o.arr):'<span class="zero">à fixer</span>')+'</td><td class="l" data-l="Avancement"><span class="pbar"><span class="tr"><i style="width:'+(k/5*100)+"%;background:"+col+'"></i></span><small>'+k+"/5</small></span></td><td class=\"l\" data-l=\"Délai\"><span class=\"pill "+r.c+"\">"+r.t+"</span></td></tr>";}).join("")||'<tr><td colspan="7"><p class="empty">Aucune commande pour ces filtres.</p></td></tr>';
  $("su-tbl").innerHTML=h+"</tbody>";
  var R=RA.filter(function(r){return !VF.rp||rapp(r).s===VF.rp;}).filter(function(r){return !q||(r.four+" "+r.no+" "+r.cde+" "+(r.fac.no||"")+" "+r.l.map(function(l){return l.des;}).join(" ")).toLowerCase().indexOf(q)>=0;});
  var ordR={ec:0,rel:1,att:2,ok:3};R.sort(function(a,b){return ordR[rapp(a).s]-ordR[rapp(b).s]||(a.date<b.date?1:-1);});
  var RS=R.slice(0,MORE.rp);
  $("rp").innerHTML=RS.map(function(r){var x=rapp(r);
    var lines=r.l.map(function(l){var bon=l.rec-(l.ab||0),f=r.fac.st==="recue"?l.fac:null,okl=f!=null&&l.cde===bon&&bon===f;
      var st=f==null?'<span class="pill n">Facture attendue</span>':(okl?'<span class="pill g">'+ic("check")+"OK</span>":(f>bon?'<span class="pill r">Facturé +'+F(f-bon)+"</span>":'<span class="pill a">Reliquat '+F(l.cde-bon)+"</span>"));
      return '<div class="rp-r"><p class="nm">'+esc(l.des)+'</p><p class="rl-n" data-l="Commandé">'+F(l.cde)+'</p><p class="rl-n" data-l="Reçu bon">'+F(bon)+'</p><p class="rl-n" data-l="Facturé">'+(f==null?'<span class="zero">en attente</span>':F(f))+'</p><div class="rp-s">'+st+"</div></div>";}).join("");
    return '<article class="rp '+x.s+'"><div class="rp-hd">'+tile(r.soc)+'<div style="min-width:0"><p class="fn">'+esc(r.four)+' <span class="pr">pour '+esc(r.soc)+" · "+dc(r.date)+'</span></p><div class="docs"><span class="dk ok">'+ic("clipboard-list")+r.cde+'</span><span class="dk '+(recInfo(r).ok?"ok":"wn")+'">'+ic("package-check")+r.no+'</span><span class="dk '+(x.s==="att"?"no":x.s==="ec"?"bad":"ok")+'">'+ic("receipt")+(r.fac.no||"facture à venir")+'</span></div></div><span class="pill '+x.c+' rp-p">'+ic(x.ico)+x.t+'</span></div>'+
      '<div class="rp-t"><div class="rp-r h"><span>Article</span><span class="r">Commandé</span><span class="r">Reçu bon</span><span class="r">Facturé</span><span class="r">Contrôle</span></div>'+lines+'</div><p class="rp-a">'+ic(x.s==="ok"?"check":"arrow-right")+"<span>"+esc(x.a)+"</span></p></article>";}).join("")||'<div class="list"><p class="empty">Aucune réception à rapprocher pour ces filtres.</p></div>';
  moreBtn("rp-more","rp",RS.length,R.length,renderSuivi);
  $("rp-leg").innerHTML='<span><span class="pill g">'+ic("circle-check-big")+'Les trois concordent</span>commandé = reçu en bon état = facturé</span><span><span class="pill r">'+ic("triangle-alert")+'Écart facture</span>facturé plus que reçu en bon état</span><span><span class="pill a">'+ic("clock")+'Reliquat attendu</span>livraison partielle, facture juste</span><span><span class="pill n">'+ic("hourglass")+"Facture attendue</span>pas encore reçue</span>";
}


/* ---------- stock : KPI et graphes ---------- */
function renderStockCharts(){
  var st=stockF(),R=serie("rupt"),S=serie("sous"),V=serie("val"),nX=cnt(st,"Surstock");
  var cov=st.filter(function(x){return x.couv>=x.delai;}).length;
  $("st-kpis").innerHTML=[
    {l:"Articles suivis",ico:"boxes",ic:"s",v:st.length,s:FF?"famille « "+famL(FF).toLowerCase()+" »":"dans "+(SF?SF:"les cinq sociétés")},
    {l:"En rupture",ico:"package-x",ic:"r",v:R[N-1],h:lastP(R),d:dPair(R),gd:true,col:"#EF4444",key:R[N-1]>0},
    {l:"Sous le seuil",ico:"triangle-alert",ic:"o",v:S[N-1],h:lastP(S),d:dPair(S),gd:true,col:"#E95B0F"},
    {l:"Valeur du stock",ico:"warehouse",ic:"g",v:M(sum(st.map(function(x){return x.val;}))),u:"M\u00a0FCFA",h:lastP(V),d:dPair(V),gd:null,col:"#10B981",unit:"\u00a0M",s:nX?nX+" en surstock":""}
  ].map(kc).join("");
  var EC={"Rupture":"#EF4444","Sous le seuil":"#E95B0F","À surveiller":"#F59E0B","Surstock":"#0EA5E9","OK":"#10B981"};
  donut("c-st-et",ET.map(function(e){return e.l;}),ET.map(function(e){return cnt(st,e.k);}),ET.map(function(e){return EC[e.k];}),"article(s)","st-et-v",String(st.length),"st-et-leg",function(x){return F(x);});
  var fams=FAM.filter(function(f){return st.some(function(x){return famOf(x.fam).k===f.k;});});
  mk("c-st-fam",{type:"bar",data:{labels:fams.map(function(f){return f.l;}),datasets:ET.map(function(e){return {label:e.l,data:fams.map(function(f){return st.filter(function(x){return famOf(x.fam).k===f.k&&etat(x)===e.k;}).length;}),backgroundColor:EC[e.k],stack:"s",barPercentage:.7};})},
    options:{indexAxis:"y",interaction:{mode:"index",intersect:false},scales:{x:axisY({stacked:true}),y:{stacked:true,grid:{display:false},ticks:{color:"#334155",autoSkip:false,font:{size:11.5}}}},plugins:{tooltip:{filter:function(i){return i.parsed.x>0;},callbacks:{label:function(c){return " "+c.dataset.label+" : "+c.parsed.x;}}}}}});
  var B=buckets(),r=B.map(function(b){return R[b.b];}),u=B.map(function(b){return S[b.b];});
  $("u-st-ev").textContent="Nombre d'articles, "+perTxt();
  mk("c-st-ev",{type:"line",data:{labels:B.map(function(b){return b.l;}),datasets:[{label:"En rupture",data:r,borderColor:"#EF4444",backgroundColor:"rgba(239,68,68,.10)",fill:true,borderWidth:2,stepped:false},{label:"Sous le seuil",data:u,borderColor:"#E95B0F",backgroundColor:"rgba(233,91,15,.08)",fill:true,borderWidth:2}]},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX(),y:axisY()},plugins:{tooltip:tipCb("",0)}}});
}

/* ---------- achats à lancer : KPI et graphes ---------- */
function renderAchatsCharts(){
  var g=groups(),tot=sum(g.map(function(x){return x.mt;})),nl=sum(g.map(function(x){return x.lines.length;})),np=g.filter(function(x){return PREP[x.id];}).length,nr=sum(g.map(function(x){return x.lines.filter(function(l){return etat(l.x)==="Rupture";}).length;}));
  $("ac-kpis").innerHTML=[
    {l:"Articles à commander",ico:"shopping-cart",ic:"o",v:nl,s:"chez "+pl(g.length,"fournisseur")},
    {l:"Dont en rupture",ico:"package-x",ic:"r",v:nr,key:nr>0,s:"à lancer en premier"},
    {l:"Montant estimé",ico:"coins",ic:"g",v:M(tot),u:"M\u00a0FCFA",s:"hors taxes, avant proforma"},
    {l:"Demandes préparées",ico:"badge-check",ic:"s",v:np+"<small>/ "+g.length+"</small>",s:"en attente de validation"}
  ].map(kc).join("");
  var fs=[];g.forEach(function(x){if(fs.indexOf(x.four)<0)fs.push(x.four);});
  var socs=[];g.forEach(function(x){if(socs.indexOf(x.soc)<0)socs.push(x.soc);});
  mk("c-ac-f",{type:"bar",data:{labels:fs,datasets:socs.map(function(s){return {label:s,data:fs.map(function(f){return Math.round(sum(g.filter(function(x){return x.four===f&&x.soc===s;}).map(function(x){return x.mt;}))/1e4)/100;}),backgroundColor:SOCC[s],stack:"a",barPercentage:.6};})},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX({stacked:true,ticks:{autoSkip:false,maxRotation:0,font:{size:11}}}),y:axisY({stacked:true,ticks:{maxTicksLimit:5,callback:function(v){return fr(v)+" M";}}})},plugins:{tooltip:{filter:function(i){return i.parsed.y>0;},callbacks:{label:function(c){return " "+c.dataset.label+" : "+fr(c.parsed.y,2)+" M FCFA";}}}}}});
  $("ac-f-leg").innerHTML=socs.map(function(s){return '<span><i style="background:'+SOCC[s]+'"></i>'+esc(s)+"</span>";}).join("");
  var B=buckets(),refs=[];g.forEach(function(x){x.lines.forEach(function(l){refs.push(l.x);});});
  var top=refs.slice().sort(function(a,b){return b.conso*b.cu-a.conso*a.cu;}).slice(0,4);
  $("u-ac-s").textContent="Quantités sorties, "+perTxt()+(refs.length>4?", 4 premiers articles":"");
  mk("c-ac-s",{type:"line",data:{labels:B.map(function(b){return b.l;}),datasets:top.map(function(x,k){var m=D.mv[x.ref];return {label:x.des.length>28?x.des.slice(0,27)+"\u2026":x.des,data:B.map(function(b){var v=0;for(var t=b.a;t<=b.b;t++)v+=m?m.s[t]:0;return v;}),borderColor:PAL[k],backgroundColor:PAL[k]+"14",fill:k===0,borderWidth:2};})},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX(),y:axisY()},plugins:{tooltip:tipCb("",0)}}});
  gauge("c-ac-g",np,g.length||1,"#10B981","ac-g-v",g.length?Math.round(np/g.length*100)+"\u00a0%":"0\u00a0%","ac-g-s",np+" demande"+(np>1?"s":"")+" sur "+g.length);
}

/* ---------- commandes : KPI et graphes ---------- */
function ordersV(){return ordersF().filter(function(o){return !VF.cm||(D.four[o.four]?D.four[o.four][2]:"Local")===VF.cm||(VF.cm==="Local"&&!D.four[o.four]);});}
function renderCmdCharts(){
  var L=ordersV(),oo=L.filter(function(o){return o.etape!=="Reçu";}),blk=oo.filter(function(o){return /Proforma/.test(o.etape);}),late=oo.filter(function(o){return o.arr&&o.arr<T;});
  var rec=L.filter(function(o){return o.etape==="Reçu"&&o.arr&&inWin(o.arr);});
  var C=serie("cmd");
  $("cm-kpis").innerHTML=[
    {l:"Commandes en cours",ico:"clipboard-list",ic:"s",v:oo.length,h:lastP(C),d:VF.cm?undefined:dPair(C),gd:null,col:"#0EA5E9"},
    {l:"Montant engagé",ico:"coins",ic:"g",v:M(sum(oo.map(function(o){return o.mt;}))),u:"M\u00a0FCFA",s:"commandes non reçues"},
    {l:"Bloquées chez nous",ico:"hand-coins",ic:"o",v:blk.length,key:blk.length>0,s:"proforma à obtenir ou à payer"},
    {l:"Reçues",ico:"package-check",ic:"g",v:rec.length,s:perTxt()}
  ].map(kc).join("");
  var cnts=ETAPES.map(function(e){return L.filter(function(o){return o.etape===e[0];}).length;});
  var EC=["#64748B","#E95B0F","#F59E0B","#0EA5E9","#10B981"];
  /* entonnoir : barres horizontales centrées */
  mk("c-cm-f",{type:"bar",data:{labels:ETAPES.map(function(e){return e[0];}),datasets:[{label:"Commandes",data:cnts.map(function(c){return [-c/2,c/2];}),backgroundColor:EC,borderRadius:6,borderSkipped:false,barPercentage:.9,categoryPercentage:.95}]},
    options:{indexAxis:"y",scales:{x:{display:false,min:-Math.max.apply(null,cnts.concat([1]))/2-.3,max:Math.max.apply(null,cnts.concat([1]))/2+.3},y:{grid:{display:false},ticks:{color:"#334155",font:{size:11.5}}}},plugins:{tooltip:{callbacks:{label:function(c){return " "+pl(cnts[c.dataIndex],"commande");}}}}},
    plugins:[{id:"fv",afterDatasetsDraw:function(ch){var g=ch.ctx,m=ch.getDatasetMeta(0);g.save();g.font="600 12px Inter,system-ui";g.textAlign="center";g.textBaseline="middle";m.data.forEach(function(b,i){g.fillStyle=cnts[i]>1?"#fff":"#0F172A";g.fillText(cnts[i],cnts[i]>1?b.x-(b.width?0:0):b.x+(b.width/2)+12,b.y);});g.restore();}}]});
  var socs=SF?[SF]:SOCS;
  mk("c-cm-s",{type:"bar",data:{labels:socs,datasets:ETAPES.slice(0,4).map(function(e,k){return {label:e[0],data:socs.map(function(s){return oo.filter(function(o){return o.soc===s&&o.etape===e[0];}).length;}),backgroundColor:EC[k],stack:"a",barPercentage:.6};})},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX({stacked:true,ticks:{autoSkip:false,maxRotation:0,font:{size:11},callback:function(v){var t=this.getLabelForValue(v);return t==="Trans-Roulements"?["Trans-","Roulements"]:t;}}}),y:axisY({stacked:true})},plugins:{tooltip:{filter:function(i){return i.parsed.y>0;}}}}});
  $("cm-s-leg").innerHTML=ETAPES.slice(0,4).map(function(e,k){return '<span><i style="background:'+EC[k]+'"></i>'+e[0]+"</span>";}).join("");
  var mt=ETAPES.slice(0,4).map(function(e){return Math.round(sum(oo.filter(function(o){return o.etape===e[0];}).map(function(o){return o.mt;}))/1e4)/100;});
  donut("c-cm-d",ETAPES.slice(0,4).map(function(e){return e[0];}),mt,EC.slice(0,4),"M FCFA","cm-d-v",fr(sum(mt)),"cm-d-leg",function(x){return fr(x,2);});
}

/* ---------- réceptions : sur la période ---------- */
function recAll(){return RALL.filter(function(r){return inSF(r.soc)&&inWin(r.date);});}
function recV(){return recAll().filter(function(r){var i=recInfo(r);return !VF.rc||(VF.rc==="ok"?i.ok:!i.ok);});}
function renderRcCharts(R){
  var B=buckets(),okA=B.map(function(){return 0;}),koA=B.map(function(){return 0;});
  R.forEach(function(r){var k=bOf(B,di(r.date));if(k<0)return;if(recInfo(r).ok)okA[k]++;else koA[k]++;});
  $("u-rc-b").textContent="Nombre de réceptions, "+perTxt();
  mk("c-rc-b",{type:"bar",data:{labels:B.map(function(b){return b.l;}),datasets:[{label:"Conformes",data:okA,backgroundColor:"#10B981",stack:"a",barPercentage:.7},{label:"Avec écart",data:koA,backgroundColor:"#E95B0F",stack:"a",barPercentage:.7}]},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX({stacked:true}),y:axisY({stacked:true})},plugins:{tooltip:tipCb("",0)}}});
  var socs=SF?[SF]:SOCS,lines=socs.map(function(s){return sum(R.filter(function(r){return r.soc===s;}).map(function(r){return r.l.length;}));});
  $("u-rc-d").textContent=perTxt().replace(/^sur /,"Sur ");
  donut("c-rc-d",socs,lines,socs.map(function(s){return SOCC[s];}),"ligne(s)","rc-d-v",String(sum(lines)),"rc-d-leg",function(x){return F(x);});
  var ok=R.filter(function(r){return recInfo(r).ok;}).length,pc=R.length?Math.round(ok/R.length*100):0;
  gauge("c-rc-g",ok,R.length||1,pc>=85?"#10B981":pc>=70?"#F59E0B":"#EF4444","rc-g-v",R.length?pc+"\u00a0%":"-","rc-g-s",ok+" sur "+pl(R.length,"réception"));
}
function moreBtn(id,key,shown,total,fn){var el=$(id);if(!el)return;if(total<=shown){el.innerHTML="";return;}
  el.innerHTML='<button class="btn morebtn" data-more="'+key+'">'+ic("chevron-down")+"Voir "+Math.min(total-shown,key==="rp"?6:8)+" de plus ("+(total-shown)+" restantes)</button>";
  el.firstChild.onclick=function(){MORE[key]+=key==="rp"?6:8;fn();};}

/* ---------- importations : KPI et graphes ---------- */
function envAll(){return D.imp.concat(D.imph).filter(socsIn).filter(function(i){return !VF.im||i.mode===VF.im;});}
function renderImCharts(){
  var A=envAll(),tr=A.filter(function(i){return i.alerte!=="Livré";}),late=tr.filter(function(i){return ALR.test(i.alerte);}),liv=A.filter(function(i){return i.livre&&inWin(i.livre);}),livP=A.filter(function(i){return i.livre&&inPrev(i.livre);});
  var onT=liv.filter(function(i){return (i.retard||0)<=2;}).length,pc=liv.length?Math.round(onT/liv.length*100):0;
  var dur=liv.map(function(i){return di(i.livre)-di(i.dep);}),avg=dur.length?Math.round(sum(dur)/dur.length):0;
  var TT=serie("transit");
  $("im-kpis").innerHTML=[
    {l:"Envois en transit",ico:"ship",ic:"v",v:tr.length,h:VF.im?undefined:lastP(TT),d:VF.im?undefined:dPair(TT),gd:null,col:"#8B5CF6",s:M(sum(tr.map(function(i){return i.val;})))+"\u00a0M\u00a0FCFA"},
    {l:"En alerte",ico:"triangle-alert",ic:"r",v:late.length,key:late.length>0,s:"documents, départ ou retard"},
    {l:"Envois livrés",ico:"package-check",ic:"g",v:liv.length,d:PER<365?[livP.length,liv.length]:undefined,gd:null,s:PER<365?"":perTxt()},
    {l:"Durée moyenne",ico:"timer",ic:"s",v:avg||"-",u:avg?"jours":"",s:"du départ au dépôt"}
  ].map(kc).join("");
  var L=tr.concat(liv.slice().sort(function(a,b){return a.livre<b.livre?1:-1;}).slice(0,Math.max(0,10-tr.length)));
  $("u-im-fr").textContent=pl(tr.length,"envoi")+" en cours et "+(L.length-tr.length)+" livrés "+perTxt().replace("sur ","sur les ").replace("sur les un an","sur un an").replace("sur les le trimestre","sur le trimestre");
  friseChart("c-im-fr","im-fr-box",L);
  var B=buckets(),sea=B.map(function(){return 0;}),air=B.map(function(){return 0;});
  liv.forEach(function(i){var k=bOf(B,di(i.livre));if(k<0)return;if(i.mode==="Aérien")air[k]++;else sea[k]++;});
  $("u-im-h").textContent="Nombre d'envois arrivés au dépôt, "+perTxt();
  mk("c-im-h",{type:"bar",data:{labels:B.map(function(b){return b.l;}),datasets:[{label:"Bateau",data:sea,backgroundColor:"#0EA5E9",stack:"a",barPercentage:.7},{label:"Avion",data:air,backgroundColor:"#8B5CF6",stack:"a",barPercentage:.7}]},
    options:{interaction:{mode:"index",intersect:false},scales:{x:axisX({stacked:true}),y:axisY({stacked:true})},plugins:{tooltip:tipCb("",0)}}});
  var stl=["Livré","En route","En douane","En alerte"],sv=stl.map(function(k){return k==="Livré"?liv.length:tr.filter(function(i){return impSt(i)===k;}).length;});
  $("u-im-d").textContent="En cours, et livrés "+perTxt();
  donut("c-im-d",stl,sv,["#10B981","#0EA5E9","#F59E0B","#EF4444"],"envoi(s)","im-d-v",String(sum(sv)),"im-d-leg",function(x){return F(x);});
  gauge("c-im-g",onT,liv.length||1,pc>=80?"#10B981":pc>=60?"#F59E0B":"#EF4444","im-g-v",liv.length?pc+"\u00a0%":"-","im-g-s",onT+" sur "+pl(liv.length,"envoi")+" livré"+(liv.length>1?"s":""));
}

/* ---------- barre de filtres ---------- */
var FMET={
  ensemble:{k:"fam",ico:"layers",all:"Toutes les familles",o:function(){return FAM.map(function(f){return [f.k,f.l];});}},
  stock:{k:"fam",ico:"layers",all:"Toutes les familles",o:function(){return FAM.map(function(f){return [f.k,f.l];});}},
  achats:{k:"ac",ico:"truck",all:"Tous les transports",o:function(){return [["Maritime","Bateau"],["Aérien","Avion"]];}},
  receptions:{k:"rc",ico:"package-check",all:"Toutes les réceptions",o:function(){return [["ok","Conformes"],["ko","Avec écart"]];}},
  suivi:{k:"rp",ico:"git-compare-arrows",all:"Tous les rapprochements",o:function(){return [["ok","Les trois concordent"],["ec","Écart facture"],["rel","Reliquat attendu"],["att","Facture attendue"]];}},
  commandes:{k:"cm",ico:"truck",all:"Tous les transports",o:function(){return [["Maritime","Bateau"],["Aérien","Avion"]];}},
  imports:{k:"im",ico:"ship",all:"Bateau et avion",o:function(){return [["Maritime","Bateau"],["Aérien","Avion"]];}}
};
function fval(k){return k==="fam"?(FF||""):VF[k];}
function renderFbar(){
  $("fbar").style.display=CUR==="automatique"?"none":"";if(CUR==="automatique")return;
  [].forEach.call($("per").children,function(b){b.classList.toggle("on",+b.dataset.p===PER);});
  var f=FMET[CUR],v=fval(f.k);
  $("fmet").innerHTML='<label class="fs">'+ic(f.ico)+'<select id="fsel" class="'+(v?"on":"")+'" aria-label="Filtre"><option value="">'+f.all+"</option>"+f.o().map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===v?" selected":"")+">"+esc(o[1])+"</option>";}).join("")+"</select></label>";
  $("fsel").onchange=function(e){var x=e.target.value;if(f.k==="fam"){FF=x||null;EF=null;}else VF[f.k]=x;MORE={rc:8,rp:6,im:8};renderAll();};
  $("freset").hidden=!(SF||FF||PER!==30||VF.ac||VF.rc||VF.rp||VF.cm||VF.im);
}
[].forEach.call($("per").children,function(b){b.onclick=function(){PER=+b.dataset.p;MORE={rc:8,rp:6,im:8};renderAll();toast("Période : "+PERL[PER]);};});
$("freset").onclick=function(){SF=null;FF=null;EF=null;PER=30;VF={ac:"",rc:"",rp:"",cm:"",im:""};Q="";QS="";$("q").value="";$("q-su").value="";MORE={rc:8,rp:6,im:8};renderAll();toast("Filtres effacés");};

/* ---------- barre latérale, filtre, navigation ---------- */
function socState(s){var a=D.stock.filter(function(x){return x.soc===s;});return cnt(a,"Rupture")?["r","Rupture"]:cnt(a,"Sous le seuil")?["a","Sous le seuil"]:["g","OK"];}
function renderSide(){
  $("side-socs").innerHTML=SOCS.map(function(s){var e=socState(s);return '<button class="ni'+(SF===s?" on":"")+'" data-side="'+esc(s)+'">'+tile(s)+esc(s)+'<span class="sd '+e[0]+'" title="'+e[1]+'"></span></button>';}).join("");
  [].forEach.call(document.querySelectorAll("[data-side]"),function(b){b.onclick=function(){pick(SF===b.dataset.side?null:b.dataset.side);};});
  $("menu").innerHTML='<button class="mi'+(SF?"":" on")+'" data-pick=""><span class="ti">'+ic("building-2")+"</span><span>Toutes les sociétés<small>Groupe consolidé</small></span>"+ic("check").replace('class="i"','class="i ck"')+'</button><div class="msep"></div>'+
    SOCS.map(function(s){return '<button class="mi'+(SF===s?" on":"")+'" data-pick="'+esc(s)+'">'+tile(s)+"<span>"+esc(s)+"<small>"+esc(D.par[s][0])+"</small></span>"+ic("check").replace('class="i"','class="i ck"')+"</button>";}).join("");
  [].forEach.call(document.querySelectorAll("[data-pick]"),function(b){b.onclick=function(e){e.stopPropagation();pick(b.dataset.pick||null);};});
  $("sel-l").textContent=SF||"Toutes les sociétés";$("sel-dot").innerHTML=SF?tile(SF):"";$("sel-b").classList.toggle("on",!!SF);
}
function pick(s,quiet){SF=s||null;$("menu").classList.remove("on");renderAll();if(!quiet)toast(SF?"Filtré sur "+SF:"Toutes les sociétés");}
$("sel-b").onclick=function(e){e.stopPropagation();$("menu").classList.toggle("on");};
document.addEventListener("click",function(e){if(!e.target.closest(".sel"))$("menu").classList.remove("on");var g=e.target.closest("[data-goto]");if(g)show(g.dataset.goto);});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){closePrep();$("menu").classList.remove("on");}});
$("q").oninput=function(e){Q=e.target.value;renderStock();};
$("q-su").oninput=function(e){QS=e.target.value;renderSuivi();};

function badges(){var st=stockF(),r=cnt(st,"Rupture"),g=groups().filter(function(x){return !PREP[x.id];}).length,oo=openOrders().length,al=transit().filter(function(i){return ALR.test(i.alerte);}).length;
  $("k-st").textContent=r||"";$("k-ac").textContent=g||"";$("k-cm").textContent=oo||"";$("k-im").textContent=al||"";$("m-st").textContent=r||"";$("m-ac").textContent=g||"";$("m-im").textContent=al||"";var rc=recAll().length,su=suiviAlerts();$("k-rc").textContent=rc||"";$("k-su").textContent=su||"";$("k-au").textContent=AUTO.filter(function(a){return AON[a.k];}).length+"/4";$("m-su").textContent=su||"";}
/* ---------- automatique : ce qui part tout seul ---------- */
var AUTO=[
  {k:"relance",ico:"mail-warning",t:"Relances fournisseurs",c:"E-mail",ci:"mail",when:"Arrivée dépassée, puis J+3",who:"Fournisseur, copie aux achats",val:"le responsable des achats"},
  {k:"point",ico:"inbox",t:"Point stocks du lundi",c:"E-mail",ci:"mail",when:"Chaque lundi, 7 h",who:"DG et responsables des 5 sociétés",val:"la direction générale"},
  {k:"alerte",ico:"bell-ring",t:"Alertes rupture",c:"WhatsApp",ci:"message-circle",when:"Dès qu'un seuil est franchi",who:"Magasinier et commercial",val:"le responsable des achats"},
  {k:"recep",ico:"package-check",t:"Messages de réception",c:"WhatsApp",ci:"message-circle",when:"À chaque bon de réception",who:"Groupe WhatsApp du magasin",val:"le chef de magasin"}
];
var AON={relance:true,point:true,alerte:true,recep:true};
try{var _a=JSON.parse(localStorage.getItem("sacri-auto")||"null");if(_a)for(var _k in AON)if(typeof _a[_k]==="boolean")AON[_k]=_a[_k];}catch(e){}
function saveAon(){try{localStorage.setItem("sacri-auto",JSON.stringify(AON));}catch(e){}}
function AK(k){return AUTO.filter(function(a){return a.k===k;})[0];}
var JC=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
function dj(s){var d=dd(s);return JC[d.getDay()]+" "+d.getDate()+"\u00a0"+MC[d.getMonth()];}
function addBiz(s,n){var d=s;while(n>0){d=addd(d,1);var w=dd(d).getDay();if(w>0&&w<6)n--;}return d;}
function nextMon(s){var d=addd(s,1);while(dd(d).getDay()!==1)d=addd(d,1);return d;}
function hh(h){return h.replace(" h ",":").replace(/ h$/,":00");}
function sw(k,big){return '<button class="sw'+(AON[k]?" on":"")+(big?" big":"")+'" role="switch" aria-checked="'+AON[k]+'" data-sw="'+k+'"><span class="sw-t"><i></i></span><span class="sw-l">'+(AON[k]?"Activé":"Désactivé")+"</span></button>";}
function sref(r){return D.stock.filter(function(x){return x.ref===r;})[0];}
function openLines(ref){return D.cmd.filter(function(c){return c.ref===ref&&c.etape!=="Reçu";});}
function dl(s){var d=dd(s);return d.getDate()+"\u00a0"+MOIS[d.getMonth()];}
function lc1(s){return s.charAt(0).toUpperCase()+s.slice(1);}

/* les relances calculées depuis les commandes */
function relances(){var L=[];orders().forEach(function(o){if(o.etape==="Reçu"||!o.arr)return;var e=o.envoi?D.imp.filter(function(i){return i.no===o.envoi;})[0]:null;
  var risk=o.arr<=T||(e&&/non confirmé|manquants/.test(e.alerte));if(!risk)return;
  var j1=addBiz(o.arr,1);if(j1<=T)j1=o.arr<T?addd(o.arr,1):addBiz(T,1);L.push({o:o,j1:j1,j3:addBiz(j1,3),late:o.arr<T});});
  L.sort(function(a,b){return a.j1<b.j1?-1:1;});return L;}
/* seuils qui seront franchis bientôt, sans arrivage avant */
function projAlerts(d1,d2){var L=[];D.stock.forEach(function(x){var e=etat(x);if(e==="Rupture"||e==="Sous le seuil"||!x.conso)return;
  var n=Math.ceil((x.stock-x.seuil)/(x.conso/30));if(n<0)return;var d=addd(T,n);if(d<d1||d>d2)return;
  if(openLines(x.ref).some(function(c){return c.arr&&c.arr<=d;}))return;L.push({x:x,d:d});});return L;}

function weekEvents(){var m=nextMon(T),days=[0,1,2,3,4].map(function(i){return {d:addd(m,i),ev:[]};}),fin=addd(m,4);
  function put(d,ev){days.forEach(function(x){if(x.d===d)x.ev.push(ev);});}
  put(m,{k:"point",h:"7 h",t:"Point stocks du lundi",s:"DG et 5 responsables"});
  relances().forEach(function(r){var f=r.o.four;
    if(r.j1>=m&&r.j1<=fin)put(r.j1,{k:"relance",h:"8 h",t:"Relance "+f,s:r.o.no+", si rien au dépôt"});
    if(r.j3>=m&&r.j3<=fin)put(r.j3,{k:"relance",h:"8 h",t:"Relance J+3 "+f,s:r.o.no});});
  D.imp.forEach(function(i){if(i.alerte==="Livré"||/non confirmé/.test(i.alerte))return;var d=i.depot;if(d>=m&&d<=fin)put(d,{k:"recep",h:"à l'arrivée",t:"Réception "+i.socs.join(", "),s:i.four.replace(" · ",", ")});});
  projAlerts(m,fin).forEach(function(p){put(p.d,{k:"alerte",h:"dès le seuil",t:"Alerte "+p.x.des,s:p.x.soc+", seuil prévu ce jour"});});
  return days;}

function renderAuto(){
  var on=AUTO.filter(function(a){return AON[a.k];}).length;
  $("au-lede").innerHTML="<b>"+on+" automatisme"+(on>1?"s":"")+" sur 4 activé"+(on>1?"s":"")+".</b> Chaque message ci-dessous est le vrai message, tel qu'il arrive.";
  $("au-sw").innerHTML=AUTO.map(function(a){return '<div class="aus'+(AON[a.k]?"":" off")+'" data-k="'+a.k+'"><div class="aus-h"><span class="aus-i k-'+a.k+'">'+ic(a.ico)+"</span>"+sw(a.k)+'</div><p class="aus-t">'+a.t+'</p><p class="aus-c">'+ic(a.ci)+a.c+" · "+a.when+'</p><p class="aus-w">'+ic("users")+a.who+"</p></div>";}).join("");
  /* frise */
  var W=weekEvents();
  $("au-fr").innerHTML=W.map(function(x){var ev=x.ev.map(function(e){var a=AK(e.k);return '<div class="fe k-'+e.k+(AON[e.k]?"":" off")+'"><span class="fe-i">'+ic(a.ico)+'</span><div><p class="fe-h">'+e.h+'</p><p class="fe-t">'+esc(e.t)+'</p><p class="fe-s">'+esc(e.s)+"</p></div></div>";}).join("");
    return '<div class="fd"><p class="fd-h"><b>'+lc1(JOURS[dd(x.d).getDay()])+"</b>"+dd(x.d).getDate()+"\u00a0"+MC[dd(x.d).getMonth()]+"</p>"+(ev||'<p class="fd-0">Rien de programmé</p>')+"</div>";}).join("");
  $("au-fr-s").textContent="Semaine du "+dc(W[0].d)+" au "+dc(W[4].d);
  $("au-cont").innerHTML=["alerte","recep"].map(function(k){var a=AK(k);return '<span class="k-'+k+(AON[k]?"":" off")+'">'+ic(a.ico)+a.t+"</span>";}).join("")+'<em>en continu, toute la semaine</em>';
  /* 1. relance fournisseur */
  var R=relances(),r=R.filter(function(x){return x.late;})[0]||R[0];
  if(r){var o=r.o,ls=o.lines.map(function(c){var x=sref(c.ref);return "<li>"+esc(c.des)+" : <b>"+F(c.qte)+"\u00a0"+(x?(c.qte>1&&x.unite.slice(-1)!=="s"?x.unite+"s":x.unite):"")+"</b></li>";}).join("");
    var socs=o.lines.map(function(c){return c.soc;}).filter(function(s,i,a){return a.indexOf(s)===i;});
    $("au-m1").innerHTML=mailWin("Commande "+o.no+" : arrivée du "+dl(o.arr)+" dépassée",[
      {h:dj(r.j1)+", 8 h 00",tag:"1er e-mail",body:"<p>Bonjour,</p><p>Notre commande <b>"+o.no+"</b> du "+dl(o.cde)+" devait arriver à Abidjan le <b>"+dl(o.arr)+"</b>. Elle n'est pas encore au dépôt.</p><ul>"+ls+"</ul><p>Pouvez-vous nous confirmer sous 48 heures :</p><ul class='n'><li>la nouvelle date d'arrivée ;</li><li>le numéro de suivi de l'envoi ;</li><li>les documents d'expédition attendus par notre transitaire.</li></ul><p>Merci,<br>Service achats, groupe SACRI</p>"},
      {h:dj(r.j3)+", 8 h 00",tag:"Relance J+3",hot:true,body:"<p>Bonjour,</p><p>Sans nouvelles depuis notre message du "+dl(r.j1)+" sur la commande <b>"+o.no+"</b>, attendue le "+dl(o.arr)+".</p><p>Ces articles manquent en stock chez "+esc(socs.join(" et "))+". Merci de nous donner la date d'arrivée aujourd'hui.</p><p>Sans réponse, notre responsable des achats vous appellera.</p><p>Service achats, groupe SACRI</p>"}
    ],"À : service commandes "+esc(o.four)+" · Cc : responsable des achats");
    $("au-t1").innerHTML=trig(["Date promise : "+dc(o.arr),"Rien au dépôt","E-mail le "+dc(r.j1),"Relance le "+dc(r.j3)]);}
  /* 2. point du lundi */
  var all=SF;SF=null;var st=D.stock.slice(),G=groups(),m=nextMon(T),fin=addd(m,6);SF=all;
  var ru=st.filter(function(x){return etat(x)==="Rupture";}),ss=st.filter(function(x){return etat(x)==="Sous le seuil";});
  var arr=D.imp.filter(function(i){return i.alerte!=="Livré"&&i.depot<=fin;}).sort(function(a,b){return a.depot<b.depot?-1:1;});
  $("au-m2").innerHTML='<div class="mail"><div class="mail-bar"><span class="dots"><i></i><i></i><i></i></span><span class="mb-t">'+ic("inbox")+'Boîte de réception</span></div>'+
    '<div class="mail-h"><p class="subj">Point stocks du lundi '+dd(m).getDate()+"\u00a0"+MOIS[dd(m).getMonth()]+" : "+pl(ru.length,"rupture")+", "+pl(G.length,"achat")+' à valider</p>'+
    '<div class="from"><span class="mav"><img src="assets/logo-sacri.png" alt=""></span><div class="fw"><p><b>Stocks SACRI</b><span class="auto">'+ic("zap")+'envoi automatique</span></p><p class="to">À : direction générale, responsables SACRI, DEFI, Trans-Roulements, SAFIR, PST-CI</p></div><span class="date">'+dj(m)+", 7 h 00</span></div></div>"+
    '<div class="paper"><div class="pp-h"><img src="assets/logo-sacri.png" alt="SACRI"><div><p class="pp-t">Point stocks du lundi</p><p class="pp-s">Groupe SACRI · '+flong(m)+"</p></div></div>"+
    '<div class="pp-k"><div class="r"><b>'+ru.length+"</b><span>Ruptures</span></div><div class=\"o\"><b>"+ss.length+"</b><span>Sous le seuil</span></div><div><b>"+G.length+"</b><span>Achats à valider</span></div></div>"+
    '<p class="pp-sh">'+ic("package-x")+"Ruptures</p><ul class=\"pp-l\">"+ru.map(function(x){var c=openLines(x.ref).filter(function(c){return c.arr;})[0];return '<li><span><b>'+esc(x.des)+"</b><small>"+esc(x.soc)+"</small></span><em class=\""+(c?"g":"r")+"\">"+(c?"attendue le "+dc(c.arr):"aucune commande")+"</em></li>";}).join("")+"</ul>"+
    '<p class="pp-sh">'+ic("ship")+"Arrivages de la semaine</p><ul class=\"pp-l\">"+arr.map(function(i){var late=i.depot<m;return '<li><span><b>'+esc(i.four.replace(" · ",", "))+"</b><small>"+esc(i.socs.join(", "))+" · "+(i.mode==="Aérien"?"avion":"bateau")+"</small></span><em class=\""+(late||/non confirmé|manquants/.test(i.alerte)?"r":"g")+"\">"+(late?"en retard, prévu le "+dc(i.depot):"dépôt le "+dc(i.depot))+"</em></li>";}).join("")+"</ul>"+
    '<p class="pp-sh">'+ic("shopping-cart")+"Achats à valider</p><ul class=\"pp-l\">"+G.map(function(g){return '<li><span><b>'+esc(g.four)+"</b><small>"+esc(g.soc)+"</small></span><em>"+pl(g.lines.length,"article")+"</em></li>";}).join("")+"</ul>"+
    '<p class="pp-b"><span>'+ic("external-link")+"Ouvrir le tableau des stocks</span></p></div></div>";
  $("au-t2").innerHTML=trig(["Chaque lundi, 7 h","Chiffres du jour","DG et 5 responsables"]);
  /* 3. alerte rupture */
  var x=sref("PST-004")||ss[0],f=D.four[x.marque]||[0],p=D.prop[x.ref]||{q:0},rd=addd(T,x.couv),ad=addd(T,f[0]),u=function(n){return F(n)+"\u00a0"+(n>1&&x.unite.slice(-1)!=="s"?x.unite+"s":x.unite);};
  var mag=(RALL.filter(function(r){return r.soc===x.soc;})[0]||{par:"le magasinier"}).par;
  $("au-m3").innerHTML=phone("Magasin "+x.soc,"Magasinier, commercial, Stocks SACRI",
    '<p class="wday">Aujourd\'hui</p><div class="bub in"><p class="who">Stocks SACRI</p>🔔 <b>Alerte stock · '+esc(x.soc)+"</b><br><b>"+esc(x.des)+"</b> ("+esc(x.marque)+") est passé sous son seuil.<br><br>📦 Stock : <b>"+u(x.stock)+"</b> · seuil : "+u(x.seuil)+"<br>📉 Sorties : "+u(x.conso)+" par mois<br>⏳ Rupture vers le <b>"+dc(rd)+"</b><br>🚚 Si on commande aujourd'hui : arrivée vers le "+dc(ad)+"<br><br>Achat proposé : <b>"+u(p.q)+'</b><span class="tm">8:05</span></div>'+
    '<div class="wbt"><button data-goach="'+esc(x.marque+"|"+x.soc)+'">'+ic("shopping-cart")+"Lancer l'achat</button><button data-gost=\""+esc(x.ref)+'">'+ic("package")+"Voir l'article</button></div>"+
    '<div class="bub in"><p class="who">Stocks SACRI</p>✅ '+esc(mag)+" a préparé la demande d'achat "+esc(x.marque)+". En attente de validation du responsable des achats."+'<span class="tm">8:12</span></div>',"8:12");
  $("au-t3").innerHTML=trig(["Stock sous le seuil","Magasinier et commercial","Bouton « Lancer l'achat »"]);
  /* 4. réception */
  var rc=(D.rec||[]).filter(function(r){return !recInfo(r).ok;})[0]||(D.rec||[])[0];
  $("au-m4").innerHTML=phone("Magasin "+rc.soc,rc.par+", Stocks SACRI",'<p class="wday">'+lc1(dj(rc.date))+'</p><div class="bub in"><p class="who">Stocks SACRI</p>'+waHtml(waMsg(rc))+'<span class="tm">'+hh(rc.h)+"</span></div>",hh(rc.h));
  $("au-t4").innerHTML=trig(["Bon de réception saisi","Groupe du magasin","Manques et casse signalés"]);
  /* état visuel des cartes */
  [].forEach.call(document.querySelectorAll(".aushow"),function(c){var k=c.dataset.k,a=AK(k);c.classList.toggle("off",!AON[k]);c.querySelector(".ash-sw").innerHTML=sw(k);c.querySelector(".ash-v").innerHTML=ic("shield-check")+"1er envoi validé par "+a.val;});
  [].forEach.call(document.querySelectorAll("#v-automatique [data-sw]"),function(b){b.onclick=function(){var k=b.dataset.sw;AON[k]=!AON[k];saveAon();renderAuto();badges();toast(AK(k).t+(AON[k]?" : activé":" : désactivé, rien ne part"));};});
  [].forEach.call(document.querySelectorAll("[data-goach]"),function(b){b.onclick=function(){show("achats");openPrep(b.dataset.goach);};});
  [].forEach.call(document.querySelectorAll("[data-gost]"),function(b){b.onclick=function(){var s=sref(b.dataset.gost);Q=s.des;$("q").value=Q;FF=null;show("stock");};});
}
function trig(a){return a.map(function(t,i){return '<span>'+(i?ic("arrow-right"):"")+esc(t)+"</span>";}).join("");}
function mailWin(subj,msgs,to){return '<div class="mail"><div class="mail-bar"><span class="dots"><i></i><i></i><i></i></span><span class="mb-t">'+ic("mail")+"Messagerie du fournisseur</span></div>"+
  '<div class="mail-h"><p class="subj">'+esc(subj)+"</p></div>"+msgs.map(function(m){return '<div class="mm'+(m.hot?" hot":"")+'"><div class="from"><span class="mav"><img src="assets/logo-sacri.png" alt=""></span><div class="fw"><p><b>Achats SACRI</b><span class="tag'+(m.hot?" hot":"")+'">'+m.tag+'</span></p><p class="to">'+to+'</p></div><span class="date">'+m.h+'</span></div><div class="mail-b">'+m.body+"</div></div>";}).join("")+"</div>";}
function phone(name,sub,body,clock){return '<div class="phone"><div class="ph-in"><div class="ph-sb"><span>'+clock+'</span><span class="ph-isl"></span><span class="ph-ic"><i></i><i></i><i></i></span></div>'+
  '<div class="wa-h">'+ic("chevron-left")+'<span class="wav"><img src="assets/logo-sacri.png" alt=""></span><div class="wa-n"><p>'+esc(name)+"</p><small>"+esc(sub)+'</small></div>'+ic("video")+ic("phone")+"</div>"+
  '<div class="wa-c">'+body+'</div><div class="wa-in"><span>'+ic("smile")+'Message</span>'+ic("paperclip")+ic("camera")+'<b>'+ic("mic")+"</b></div></div></div>";}

function render(v){renderFbar();if(v==="ensemble"){renderLede();renderKpis();renderEnsCharts();renderHeat();renderTodo();renderAcMini();renderImMini();}else if(v==="stock")renderStock();else if(v==="achats")renderAchats();else if(v==="commandes")renderCommandes();else if(v==="receptions")renderReceptions();else if(v==="suivi")renderSuivi();else if(v==="automatique")renderAuto();else renderImports();}
function show(v){
  CUR=v;[].forEach.call(document.querySelectorAll(".ni[data-v],.tabbar button"),function(b){b.classList.toggle("on",b.dataset.v===v);});
  [].forEach.call(document.querySelectorAll(".view"),function(s){s.classList.toggle("on",s.id==="v-"+v);});
  $("crumb-v").textContent=VNAME[v];
  if(history.replaceState)history.replaceState(null,"","#"+v);
  render(v);window.scrollTo({top:0});
}
var lastW=innerWidth<700;window.addEventListener("resize",function(){var w=innerWidth<700;if(w!==lastW){lastW=w;render(CUR);}});
function renderAll(){renderSide();badges();render(CUR);}
[].forEach.call(document.querySelectorAll(".ni[data-v],.tabbar button"),function(b){b.onclick=function(){if(b.dataset.v==="stock"&&CUR!=="stock")FF=null;show(b.dataset.v);};});

function init(d){
  D=d;T=D.date;SOCS=Object.keys(D.par);N=D.n||365;D0=addd(T,-(N-1));chartDefaults();buildHist();RALL=(D.rech||[]).concat(D.rec||[]);
  [].forEach.call(document.querySelectorAll("i[data-i]"),function(el){var w=document.createElement("span");w.innerHTML=ic(el.dataset.i);var sv=w.firstChild;if(el.className)sv.setAttribute("class","i "+el.className);el.replaceWith(sv);});
  $("date").textContent=flong(T);
  var h=(location.hash||"").slice(1);
  renderSide();badges();
  show(VNAME[h]?h:"ensemble");
  window.addEventListener("hashchange",function(){var x=(location.hash||"").slice(1);if(VNAME[x]&&x!==CUR)show(x);});
  window.__stocks={per:function(x){PER=x;renderAll();},pick:pick,show:show,openPrep:openPrep,closePrep:closePrep,groups:groups,waMsg:waMsg,rapp:rapp};
}
fetch("data/donnees.json?v=2027e").then(function(r){return r.json();}).then(init);
})();
