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

var SOCS,SF=null,CUR="ensemble",FF=null,EF=null,Q="",SORT={k:"etat",up:true};
var VNAME={ensemble:"Vue d'ensemble",stock:"Stock",achats:"Achats à lancer",commandes:"Commandes",imports:"Importations"};
function inSF(s){return !SF||s===SF;}
function socsIn(i){return !SF||i.socs.indexOf(SF)>=0;}
function tile(s){var p=D.par[s];return '<span class="ti">'+ic(p?p[1]:"building-2")+"</span>";}
function stag(s){return '<span class="stag">'+ic(D.par[s]?D.par[s][1]:"building-2")+esc(s)+"</span>";}

/* préparations gardées sur l'appareil */
var PREP={};try{PREP=JSON.parse(localStorage.getItem("sacri-stocks-prep")||"{}");}catch(e){}
function savePrep(){try{localStorage.setItem("sacri-stocks-prep",JSON.stringify(PREP));}catch(e){}}
var tt;function toast(m){var t=$("toast");t.innerHTML=ic("circle-check-big")+"<span>"+esc(m)+"</span>";t.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on");},2600);}

/* ---------- calculs ---------- */
function stockF(){return D.stock.filter(function(x){return inSF(x.soc);});}
function orders(){var o={},L=[];D.cmd.forEach(function(c){if(!o[c.no]){o[c.no]={no:c.no,soc:c.soc,four:c.four,cde:c.cde,etape:c.etape,arr:c.arr,envoi:c.envoi,lines:[],mt:0,alertes:[]};L.push(o[c.no]);}
  var r=o[c.no];r.lines.push(c);r.mt+=c.mt;if(c.alerte&&r.alertes.indexOf(c.alerte)<0)r.alertes.push(c.alerte);});return L;}
function ordersF(){return orders().filter(function(o){return inSF(o.soc);});}
function openOrders(){return ordersF().filter(function(o){return o.etape!=="Reçu";});}
function envF(){return D.imp.filter(socsIn);}
function transit(){return envF().filter(function(i){return i.alerte!=="Livré";});}
function groups(){var g={},L=[];D.stock.forEach(function(x){var p=D.prop[x.ref];if(!p||!inSF(x.soc))return;var k=x.marque+"|"+x.soc;
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

function renderKpis(){
  var st=stockF(),nR=cnt(st,"Rupture"),nS=cnt(st,"Sous le seuil"),oo=openOrders(),tr=transit(),val=sum(st.map(function(x){return x.val;}));
  var H=D.hist,n=H.sem.length-1,G=!SF;
  var K=[
    {l:"Articles en rupture",ico:"package-x",v:nR,h:H.rupt,gd:true,col:"#C8352B",key:nR>0,s:"sur "+st.length+" suivis"},
    {l:"Sous le seuil",ico:"triangle-alert",v:nS,h:H.sous,gd:true,col:"#E95B0F",s:"à commander ou commandés"},
    {l:"Commandes en cours",ico:"clipboard-list",v:oo.length,h:H.cmd,gd:null,col:"#3D3D3D",s:M(sum(oo.map(function(o){return o.mt;})))+"\u00a0M\u00a0FCFA engagés"},
    {l:"Envois en transit",ico:"ship",v:tr.length,h:H.transit,gd:null,col:"#3D3D3D",s:pl(tr.filter(function(i){return ALR.test(i.alerte);}).length,"envoi")+" en alerte"},
    {l:"Valeur du stock",ico:"warehouse",v:M(val),u:"M\u00a0FCFA",h:H.val,gd:null,col:"#3D3D3D",unit:"\u00a0M",s:"au coût d'achat"}
  ];
  $("kpis").innerHTML=K.map(function(k){
    var sub=G?delta(k.h[n-1],k.h[n],k.gd,k.unit)+"<span>en une semaine</span>":"<span>"+k.s+"</span>";
    return '<div class="kc'+(k.key?" key":"")+'"><p class="l">'+ic(k.ico)+k.l+'</p><div class="vr"><p class="v">'+k.v+(k.u?"<small>"+k.u+"</small>":"")+"</p>"+(G?spark(k.h,k.col):"")+'</div><p class="s">'+sub+"</p></div>";
  }).join("");
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
      if(!a.length){h+='<td class="na" title="'+esc(r.s)+' ne vend pas cette famille"><span class="cl">—</span></td>';return;}
      var w=Math.min.apply(null,a.map(function(x){return ETK[etat(x)].i;})),e=ET[w],nw=a.filter(function(x){return ETK[etat(x)].i===w;}).length;
      var det=ET.map(function(z){var c=a.filter(function(x){return etat(x)===z.k;}).length;return c?c+" "+z.pl:"";}).filter(Boolean).join(", ");
      var LB={"Rupture":["rupture","ruptures"],"Sous le seuil":["sous seuil","sous seuil"],"À surveiller":["à surveiller","à surveiller"],"Surstock":["surstock","surstocks"]};var lab=e.k==="OK"?(a.length>1?"tous OK":"OK"):LB[e.k][nw>1?1:0];
      h+='<td class="c '+e.c+'" data-soc="'+esc(r.s)+'" data-fam="'+f.k+'" title="'+esc(r.s+" · "+f.l+" : "+a.length+" article"+(a.length>1?"s":"")+" ("+det+")")+'"><span class="cv">'+(e.k==="OK"?a.length:nw)+'</span><span class="cl">'+lab+'</span><span class="sq">'+a.slice().sort(function(p,q){return ETK[etat(p)].i-ETK[etat(q)].i;}).map(function(x){return '<i class="'+ETK[etat(x)].c+'"></i>';}).join("")+"</span></td>";
    });
    var v=sum(r.st.map(function(x){return x.val;})),nr=cnt(r.st,"Rupture"),ac=sum(r.st.map(function(x){return D.prop[x.ref]?D.prop[x.ref].m:0;}));
    h+='<td class="num xn"><b>'+M(v)+' M</b><small>'+pl(r.st.length,"article")+'</small></td><td class="num xn"><b>'+(ac?M(ac)+" M":"—")+"</b><small>"+(ac?pl(r.st.filter(function(x){return D.prop[x.ref];}).length,"article"):"rien à lancer")+"</small></td></tr>";
  });
  var all=D.stock;
  h+='</tbody><tfoot><tr><td class="rh">Groupe<small class="gs">articles en alerte</small></td>'+FAM.map(function(f){var a=all.filter(function(x){return famOf(x.fam).k===f.k;}),r=a.filter(function(x){var k=etat(x);return k==="Rupture"||k==="Sous le seuil";}).length;
    return '<td class="num" style="text-align:center"><b>'+r+'</b><small>sur '+a.length+"</small></td>";}).join("")+
    '<td class="num xn"><b>'+M(sum(all.map(function(x){return x.val;})))+' M</b></td><td class="num xn"><b>'+M(sum(Object.keys(D.prop).map(function(k){return D.prop[k].m;})))+" M</b></td></tr></tfoot>";
  $("hm").innerHTML=h;
  var SW={"s-r":"#C8352B","s-s":"#F6C9B0","s-a":"#FCEFD6","s-x":"#E4ECF5","s-o":"#E6F2EA"};
  var FL='<div class="famleg">'+FAM.map(function(f){return "<span>"+ic(f.ico)+f.l+"</span>";}).join("")+"</div>";
  $("hm-leg").innerHTML=FL+ET.map(function(e){return '<span><i style="background:'+SW[e.c]+'"></i>'+e.l+"</span>";}).join("")+'<span><i style="background:repeating-linear-gradient(135deg,#F7F7F5 0 3px,#E4E4E0 3px 4px)"></i>Non vendu</span><span class="sep"></span><span>Couleur de la case : l\'état le plus grave. Petits carrés : un par article.</span>';
  [].forEach.call($("hm").querySelectorAll("td.c"),function(td){td.onclick=function(){SF=td.dataset.soc;FF=td.dataset.fam;EF=null;Q="";$("q").value="";renderSide();badges();show("stock");};});
  [].forEach.call($("hm").querySelectorAll("tbody td.rh"),function(td){td.onclick=function(){pick(SF===td.dataset.soc?null:td.dataset.soc);};});
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
  var cs=D.cmd.filter(function(c){return c.envoi===i.no;}),cde=cs.map(function(c){return c.cde;}).sort()[0];
  var air=i.mode==="Aérien",arrived=!!(i.dep&&i.arr&&i.arr<=T),livre=!!i.livre;
  var s=[
    {n:"Commandé",d:dc(cde),ok:true},
    {n:air?"Envolé":"Embarqué",d:i.dep?dc(i.dep):"prévu "+dc(i.depp),ok:!!i.dep,late:!i.dep&&i.depp<T},
    {n:air?"Aéroport":"Port",d:arrived?dc(i.arr):"prévu "+dc(i.arr),ok:arrived,late:!arrived&&i.retard>3},
    {n:"Dédouané",d:livre?"fait":(arrived?(i.alerte==="Documents manquants"?"docs "+i.docs.replace(" / ","/"):"en cours"):"—"),ok:livre,late:arrived&&i.alerte==="Documents manquants"},
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
  var env=envF(),tr=env.filter(function(i){return i.alerte!=="Livré";}),late=tr.filter(function(i){return ALR.test(i.alerte);});
  $("im-lede").innerHTML="<b>"+pl(tr.length,"envoi")+" en route ou en douane</b> pour "+M(sum(tr.map(function(i){return i.val;})))+"\u00a0M\u00a0FCFA"+(late.length?", dont "+late.length+" en alerte.":".");
  env=env.slice().sort(function(a,b){return impOrder(a)-impOrder(b)||(a.depot<b.depot?-1:1);});
  $("frise").innerHTML=env.map(function(i){return '<div class="imp">'+impHead(i)+friseHtml(i)+"</div>";}).join("")||'<p class="empty">Aucun envoi pour cette société.</p>';
}
function renderImMini(){
  var tr=transit().sort(function(a,b){return impOrder(a)-impOrder(b);});
  $("im-mini").innerHTML=tr.map(function(i){return '<div class="imp imp-mini" data-goto="imports" style="cursor:pointer">'+impHead(i)+friseHtml(i)+"</div>";}).join("")||'<p class="empty">Aucun envoi en route pour cette société.</p>';
}

/* ---------- stock ---------- */
var COLS=[["des","Article","l"],["soc","Société","l"],["stock","Stock"],["seuil","Seuil"],["encde","En commande"],["couv","Couverture"],["val","Valeur"],["etat","État","l"]];
function famL(k){return FAM.filter(function(f){return f.k===k;})[0].l;}
function renderStock(){
  var st=stockF().filter(function(x){return !FF||famOf(x.fam).k===FF;});
  $("st-seg").innerHTML=[["","Tous",st.length]].concat(ET.map(function(e){return [e.k,e.l,cnt(st,e.k)];})).map(function(o){return '<button data-e="'+esc(o[0])+'" class="'+((EF||"")===o[0]?"on":"")+'">'+esc(o[1])+' <span class="c">'+o[2]+"</span></button>";}).join("");
  [].forEach.call($("st-seg").children,function(b){b.onclick=function(){EF=b.dataset.e||null;renderStock();};});
  var ch=[];if(SF)ch.push(["soc",SF]);if(FF)ch.push(["fam",famL(FF)]);
  $("fchip").innerHTML=ch.map(function(c){return '<button data-x="'+c[0]+'">'+esc(c[1])+ic("x")+"</button>";}).join("");
  [].forEach.call($("fchip").children,function(b){b.onclick=function(){if(b.dataset.x==="soc")pick(null,true);else{FF=null;renderStock();}};});
  var q=Q.toLowerCase(),r=st.filter(function(x){return (!EF||etat(x)===EF)&&(!q||(x.des+" "+x.marque+" "+x.ref+" "+x.fam+" "+x.soc).toLowerCase().indexOf(q)>=0);});
  r.sort(function(a,b){var k=SORT.k,va,vb;if(k==="etat"){va=ETK[etat(a)].i;vb=ETK[etat(b)].i;if(va===vb){va=a.couv;vb=b.couv;}}else{va=a[k];vb=b[k];}
    return (va<vb?-1:va>vb?1:0)*(SORT.up?1:-1);});
  var nR=cnt(st,"Rupture"),nS=cnt(st,"Sous le seuil"),nX=cnt(st,"Surstock");
  $("st-lede").innerHTML=pl(st.length,"article")+" suivi"+(st.length>1?"s":"")+(SF?" chez "+SF:" dans le groupe")+(FF?", famille « "+famL(FF).toLowerCase()+" »":"")+" : <b>"+nR+" en rupture</b>, "+nS+" sous le seuil"+(nX?", "+nX+" en surstock":"")+". Valeur : "+M(sum(st.map(function(x){return x.val;})))+"\u00a0M\u00a0FCFA.";
  var h="<thead><tr>"+COLS.map(function(c){return '<th class="sortable'+(c[2]?" l":"")+(SORT.k===c[0]?" on":"")+'" data-k="'+c[0]+'">'+c[1]+(SORT.k===c[0]?(SORT.up?" ↑":" ↓"):"")+"</th>";}).join("")+"</tr></thead><tbody>";
  h+=r.map(function(x){var e=ETK[etat(x)],cap=x.delai+90,w=Math.min(x.couv/cap,1)*100,mk=x.delai/cap*100;
    return '<tr><td><div class="art"><p class="nm">'+esc(x.des)+'</p><p class="mt">'+esc(x.ref)+" · "+esc(x.marque)+" · "+esc(x.fam)+" · "+F(x.conso)+" "+esc(x.unite)+(x.conso>1?"s":"")+' par mois</p></div></td>'+
      '<td class="l" data-l="Société">'+stag(x.soc)+'</td>'+
      '<td class="num'+(x.stock===0?" bad":"")+'" data-l="Stock">'+F(x.stock)+'</td><td class="num" data-l="Seuil">'+F(x.seuil)+'</td><td class="num" data-l="En commande">'+(x.encde?F(x.encde):'<span class="zero">—</span>')+"</td>"+
      '<td class="num" data-l="Couverture"><span class="cov"><span class="tr"><i style="width:'+w+"%;background:"+e.col+'"></i><b style="left:'+mk+'%"></b></span>'+x.couv+"\u00a0j</span></td>"+
      '<td class="num hm-f" data-l="Valeur">'+(x.val?M(x.val,2)+"\u00a0M":'<span class="zero">0</span>')+'</td><td class="l" data-l="État"><span class="pill '+e.p+'">'+e.l+"</span></td></tr>";}).join("")||'<tr><td colspan="8"><p class="empty">Aucun article pour ces filtres.</p></td></tr>';
  $("st-tbl").innerHTML=h+"</tbody>";
  [].forEach.call($("st-tbl").querySelectorAll("th[data-k]"),function(th){th.onclick=function(){var k=th.dataset.k;SORT=SORT.k===k?{k:k,up:!SORT.up}:{k:k,up:k==="etat"||k==="couv"};renderStock();};});
}

/* ---------- achats à lancer ---------- */
function renderAchats(){
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
  var L=ordersF(),oo=L.filter(function(o){return o.etape!=="Reçu";}),blk=oo.filter(function(o){return /Proforma/.test(o.etape);});
  $("cm-lede").innerHTML="<b>"+pl(oo.length,"commande")+" en cours</b> pour "+M(sum(oo.map(function(o){return o.mt;})))+"\u00a0M\u00a0FCFA"+(blk.length?", dont "+blk.length+" bloquée"+(blk.length>1?"s":"")+" chez nous (proforma à obtenir ou à payer).":".");
  $("pipe").innerHTML=ETAPES.map(function(e){var a=L.filter(function(o){return o.etape===e[0];});
    return '<div class="col"><div class="col-h">'+ic(e[1])+"<span>"+e[0]+"<small>"+e[2]+'</small></span><span class="c">'+a.length+"</span></div>"+(a.map(function(o){
      var late=o.arr&&o.arr<T&&o.etape!=="Reçu";
      return '<div class="oc"><p class="t"><span>'+esc(o.four)+"</span>"+stag(o.soc)+'</p><p class="no">'+o.no+" · commandée le "+dc(o.cde)+'</p><p class="ls">'+o.lines.map(function(c){var x=D.stock.filter(function(s){return s.ref===c.ref;})[0];return esc(x?x.des:c.ref)+" ×\u00a0"+F(c.qte);}).join("<br>")+'</p><div class="f"><span class="m">'+M(o.mt,2)+"\u00a0M\u00a0FCFA</span>"+
        '<span class="d'+(late?" late":"")+'">'+ic(o.etape==="Reçu"?"check":"calendar-clock")+(o.etape==="Reçu"?"reçue le "+dc(o.arr):(o.arr?(late?"attendue le "+dc(o.arr):"dépôt le "+dc(o.arr)):"date à fixer"))+"</span></div>"+
        (o.alertes.length?'<p class="al">'+o.alertes.map(function(a){return '<span class="pill '+(/dépassée/.test(a)?"r":"a")+'">'+esc(a==="Manque 4"?"Réception : 4 manquants":a)+"</span>";}).join(" ")+"</p>":"")+"</div>";}).join("")||'<p class="empty">Aucune commande</p>')+"</div>";}).join("");
}

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

function badges(){var st=stockF(),r=cnt(st,"Rupture"),g=groups().filter(function(x){return !PREP[x.id];}).length,oo=openOrders().length,al=transit().filter(function(i){return ALR.test(i.alerte);}).length;
  $("k-st").textContent=r||"";$("k-ac").textContent=g||"";$("k-cm").textContent=oo||"";$("k-im").textContent=al||"";$("m-st").textContent=r||"";$("m-ac").textContent=g||"";$("m-im").textContent=al||"";}
function render(v){if(v==="ensemble"){renderLede();renderHeat();renderKpis();renderTodo();renderAcMini();renderImMini();}else if(v==="stock")renderStock();else if(v==="achats")renderAchats();else if(v==="commandes")renderCommandes();else renderImports();}
function show(v){
  CUR=v;[].forEach.call(document.querySelectorAll(".ni[data-v],.tabbar button"),function(b){b.classList.toggle("on",b.dataset.v===v);});
  [].forEach.call(document.querySelectorAll(".view"),function(s){s.classList.toggle("on",s.id==="v-"+v);});
  $("crumb-v").textContent=VNAME[v];
  if(history.replaceState)history.replaceState(null,"","#"+v);
  render(v);window.scrollTo({top:0});
}
function renderAll(){renderSide();badges();render(CUR);}
[].forEach.call(document.querySelectorAll(".ni[data-v],.tabbar button"),function(b){b.onclick=function(){if(b.dataset.v==="stock"&&CUR!=="stock")FF=null;show(b.dataset.v);};});

function init(d){
  D=d;T=D.date;SOCS=Object.keys(D.par);
  [].forEach.call(document.querySelectorAll("i[data-i]"),function(el){var w=document.createElement("span");w.innerHTML=ic(el.dataset.i);var sv=w.firstChild;if(el.className)sv.setAttribute("class","i "+el.className);el.replaceWith(sv);});
  $("date").textContent=flong(T);
  var h=(location.hash||"").slice(1);
  renderSide();badges();
  show(VNAME[h]?h:"ensemble");
  window.__stocks={pick:pick,show:show,openPrep:openPrep,closePrep:closePrep,groups:groups};
}
fetch("data/donnees.json?v=20261124s").then(function(r){return r.json();}).then(init);
})();
