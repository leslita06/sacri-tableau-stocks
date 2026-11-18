(function () {
  'use strict';
  var SOCS = ['SACRI', 'DEFI', 'Trans-Roulements', 'SAFIR', 'PST-CI'];
  var NOMS = {
    SACRI: 'SACRI, outillage et motoculture STIHL',
    DEFI: 'DEFI, outillage et fournitures industrielles',
    'Trans-Roulements': 'Trans-Roulements, roulements et transmission',
    SAFIR: 'SAFIR, scierie et affûtage',
    'PST-CI': 'PST-CI, hydraulique et compresseurs'
  };
  var O = '#E95B0F', O2 = '#F7A574', G = '#878480', G2 = '#B9B6B2', G3 = '#EEEDEB', RED = '#B42318', AMB = '#E0A33A', GRN = '#2E7D4F';
  var ETATS = [
    ['Rupture', RED], ['Sous le seuil', O], ['À surveiller', AMB], ['OK', '#D7D4D0']
  ];
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var D, soc = '', etat = '', q = '', tri = { k: 'etat', up: true }, charts = {};

  function nf(n, dec) {
    return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }).replace(/\u202f/g, '\u00a0');
  }
  function mf(n) { return nf(n / 1e6, 1); }
  function dd(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + ' ' + MOIS[+p[1] - 1]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function inSoc(x) { return !soc || x.soc === soc; }

  var ICON = {
    bateau: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l2 4h14l2-4H3z"/><path d="M6 17V9h12v8"/><path d="M12 9V3"/><path d="M9 6h6"/></svg>',
    avion: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 20.5L12 15l-7-1.5V11l7 .5V5a1.5 1.5 0 013 0v6.5l7-.5v2.5L15 15l1.5 5.5L13.5 21 12 18l-1.5 3z"/></svg>'
  };

  function envoisDe(s) {
    return D.imp.filter(function (i) { return !s || i.socs.indexOf(s) >= 0; });
  }

  function render() {
    var st = D.stock.filter(inSoc);
    var cmd = D.cmd.filter(inSoc);
    var cnt = function (a) { return st.filter(function (x) { return x.alerte === a; }).length; };
    var nCmd = {}; cmd.forEach(function (c) { if (c.etape !== 'Reçu') nCmd[c.no] = 1; });
    var nC = Object.keys(nCmd).length;
    var env = envoisDe(soc), transit = env.filter(function (i) { return i.alerte !== 'Livré'; });
    var val = st.reduce(function (a, x) { return a + x.val; }, 0);
    var nR = cnt('Rupture'), nS = cnt('Sous le seuil');

    $('titre').textContent = soc ? NOMS[soc] : 'SACRI et filiales';
    var ph = '<b>' + nR + ' article' + (nR > 1 ? 's' : '') + ' en rupture</b> et ' + nS + ' sous le seuil, sur ' + st.length + ' suivis. ';
    ph += transit.length ? transit.length + ' envoi' + (transit.length > 1 ? 's' : '') + ' en route ou en douane pour ' + mf(transit.reduce(function (a, i) { return a + i.val; }, 0)) + ' M FCFA.' : 'Aucun envoi en route.';
    $('phrase').innerHTML = ph;

    var k = [
      [nR, '', 'articles en rupture', nR ? 'warn' : ''],
      [nS, '', 'articles sous le seuil', nS ? 'mid' : ''],
      [nC, '', 'commandes fournisseurs en cours', ''],
      [transit.length, '', 'envois en transit ou en douane', ''],
      [mf(val), 'M FCFA', 'de stock', '']
    ];
    $('kpis').innerHTML = k.map(function (x) {
      return '<div class="kpi ' + x[3] + '"><p class="v">' + x[0] + (x[1] ? '<small>' + x[1] + '</small>' : '') + '</p><p class="l">' + x[2] + '</p></div>';
    }).join('');

    chartSoc(); chartEtat(st); ruptures(st); frise(env); chartCmd(cmd); todo(st, cmd, env); chips(st); table();
  }

  function chartSoc() {
    var v = SOCS.map(function (s) { return D.stock.filter(function (x) { return x.soc === s; }).reduce(function (a, x) { return a + x.val; }, 0) / 1e6; });
    var col = SOCS.map(function (s) { return !soc || s === soc ? O : G3; });
    if (charts.soc) { charts.soc.data.datasets[0].backgroundColor = col; charts.soc.update(); return; }
    charts.soc = new Chart($('c-soc'), {
      type: 'bar',
      data: { labels: SOCS.map(function (s) { return s === 'Trans-Roulements' ? ['Trans-', 'Roulements'] : s; }), datasets: [{ data: v, backgroundColor: col, borderRadius: 6, maxBarThickness: 46 }] },
      options: {
        maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return nf(c.raw, 1) + ' M FCFA'; } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#55534F', font: { size: 12 }, maxRotation: 0, autoSkip: false } },
          y: { beginAtZero: true, grid: { color: G3 }, border: { display: false }, ticks: { color: G, callback: function (x) { return nf(x); } } }
        },
        onClick: function (e, el) { if (el.length) setSoc(SOCS[el[0].index] === soc ? '' : SOCS[el[0].index]); }
      },
      plugins: [{
        id: 'lab', afterDatasetsDraw: function (c) {
          var ctx = c.ctx; ctx.save(); ctx.font = '600 12px Inter, sans-serif'; ctx.fillStyle = '#222'; ctx.textAlign = 'center';
          c.getDatasetMeta(0).data.forEach(function (b, i) { ctx.fillText(nf(v[i], 1), b.x, b.y - 6); }); ctx.restore();
        }
      }]
    });
  }

  function chartEtat(st) {
    var v = ETATS.map(function (e) { return st.filter(function (x) { return x.alerte === e[0]; }).length; });
    $('n-art').textContent = st.length + ' articles';
    $('leg-etat').innerHTML = ETATS.map(function (e, i) {
      return '<span><i class="sw" style="background:' + e[1] + '"></i>' + e[0] + '<b>' + v[i] + '</b></span>';
    }).join('');
    if (charts.etat) { charts.etat.data.datasets[0].data = v; charts.etat.update(); return; }
    charts.etat = new Chart($('c-etat'), {
      type: 'doughnut',
      data: { labels: ETATS.map(function (e) { return e[0]; }), datasets: [{ data: v, backgroundColor: ETATS.map(function (e) { return e[1]; }), borderColor: '#fff', borderWidth: 2 }] },
      options: { maintainAspectRatio: false, animation: false, cutout: '66%', plugins: { legend: { display: false } } }
    });
  }

  function reappro(x) {
    var c = D.cmd.filter(function (c) { return c.ref === x.ref && c.etape !== 'Reçu'; })[0];
    var p = D.prop[x.ref];
    if (c && c.arr) {
      var i = D.imp.filter(function (i) { return i.no === c.envoi; })[0];
      var t = 'Réappro prévue le <b>' + dd(c.arr) + '</b>';
      if (i && i.alerte === 'Départ non confirmé') t += ' (départ non confirmé)';
      if (p) t += '. Encore ' + nf(p.q) + ' à commander';
      return t;
    }
    if (c) return 'Commandé le ' + dd(c.cde) + ', ' + c.etape.toLowerCase() + ' : <b>date à fixer</b>';
    if (p) return '<b>Pas de commande.</b> À commander : ' + nf(p.q) + ' ' + x.unite + (p.q > 1 ? 's' : '') + ', ' + nf(p.m) + ' FCFA';
    return '<b>Pas de commande</b>';
  }

  function ruptures(st) {
    var r = st.filter(function (x) { return x.alerte === 'Rupture'; });
    $('n-rupt').textContent = r.length ? r.length + ' article' + (r.length > 1 ? 's' : '') : '';
    $('rupts').innerHTML = r.length ? r.map(function (x) {
      return '<div class="rp"><span class="soc">' + esc(x.soc) + '</span><span class="des">' + esc(x.des) + '</span><span class="ref">' + esc(x.ref) + ' · ' + esc(x.marque) + ' · ' + nf(x.conso) + ' ' + esc(x.unite) + (x.conso > 1 ? 's' : '') + ' vendus par mois</span><span class="st">' + reappro(x) + '</span></div>';
    }).join('') : '<p class="empty">Aucun article en rupture pour cette société.</p>';
  }

  function frise(env) {
    var T = D.date;
    $('n-imp').textContent = env.filter(function (i) { return i.alerte !== 'Livré'; }).length + ' en route ou en douane';
    $('frise').innerHTML = env.map(function (i) {
      var cs = D.cmd.filter(function (c) { return c.envoi === i.no; });
      var cde = cs.map(function (c) { return c.cde; }).sort()[0];
      var arrive = i.arr && i.arr <= T && i.dep;
      var steps = [
        ['Commandé', cde, true],
        [i.mode === 'Aérien' ? 'Envolé' : 'Embarqué', i.dep || i.depp, !!i.dep],
        ['Arrivé', i.arr, !!arrive],
        ['Dédouané', i.livre || i.depot, !!i.livre]
      ];
      var last = -1; steps.forEach(function (s, n) { if (s[2]) last = n; });
      var h = steps.map(function (s, n) {
        var cl = s[2] ? 'done' : (n === last + 1 ? 'now' : 'todo');
        return '<div class="stp ' + cl + '"><span class="pt"></span><span class="n">' + s[0] + '</span><span class="dt' + (s[2] ? '' : ' pv') + '">' + dd(s[1]) + '</span></div>';
      }).join('');
      var a = i.alerte, pc = a === 'Livré' ? 'v' : (/Retard|manquants|non confirmé/.test(a) ? 'r' : 'a');
      var md = i.mode === 'Aérien' ? 'avion' : 'bateau';
      return '<div class="env"><div class="id"><span class="md">' + ICON[md] + '</span>' + esc(i.four) +
        '<small>' + (i.mode === 'Aérien' ? 'Avion, aéroport' : 'Bateau, port') + ' d\'Abidjan · ' + esc(i.tr) + '<br>' + esc(i.socs.join(', ')) + '</small></div>' +
        '<div class="steps">' + h + '</div>' +
        '<div class="al"><span class="pill ' + pc + '">' + esc(a) + '</span><span class="val">' + mf(i.val) + ' M FCFA · documents ' + esc(i.docs.replace(' / ', '\u00a0sur\u00a0')) + '</span></div></div>';
    }).join('') || '<p class="empty">Aucun envoi pour cette société.</p>';
  }

  var ETAPES = ['Proforma attendue', 'Proforma à payer', 'Payée, en préparation', 'Expédiée'];
  function chartCmd(cmd) {
    var v = ETAPES.map(function (e) { return cmd.filter(function (c) { return c.etape === e; }).reduce(function (a, c) { return a + c.mt; }, 0) / 1e6; });
    if (charts.cmd) { charts.cmd.data.datasets[0].data = v; charts.cmd.update(); return; }
    charts.cmd = new Chart($('c-cmd'), {
      type: 'bar',
      data: { labels: ['Proforma attendue', 'Proforma à payer', 'Payée', 'Expédiée'], datasets: [{ data: v, backgroundColor: [G2, O2, O2, O], borderRadius: 5, maxBarThickness: 26 }] },
      options: {
        indexAxis: 'y', maintainAspectRatio: false, animation: false, layout: { padding: { right: 44 } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return nf(c.raw, 1) + ' M FCFA'; } } } },
        scales: {
          x: { beginAtZero: true, grid: { color: G3 }, border: { display: false }, ticks: { color: G, callback: function (x) { return nf(x); } } },
          y: { grid: { display: false }, ticks: { color: '#55534F', font: { size: 12 } } }
        }
      },
      plugins: [{
        id: 'lab', afterDatasetsDraw: function (c) {
          var ctx = c.ctx; ctx.save(); ctx.font = '600 12px Inter, sans-serif'; ctx.fillStyle = '#222'; ctx.textBaseline = 'middle';
          c.getDatasetMeta(0).data.forEach(function (b, i) { ctx.fillText(nf(c.data.datasets[0].data[i], 1), b.x + 6, b.y); }); ctx.restore();
        }
      }]
    });
  }

  function todo(st, cmd, env) {
    var L = [];
    env.forEach(function (i) {
      if (i.alerte === 'Documents manquants') L.push(['r', 'Documents manquants : ' + i.four + ' (' + i.tr + ')', 'Colisage, certificat d\'origine et BSC à obtenir. Envoi arrivé le ' + dd(i.arr) + '.']);
      if (i.alerte === 'Départ non confirmé') L.push(['r', 'Départ non confirmé : ' + i.four, 'Vol prévu le ' + dd(i.depp) + '. Relancer le transitaire.']);
    });
    var seen = {};
    cmd.forEach(function (c) {
      if (c.alerte === 'Arrivée dépassée' && !seen[c.no]) { seen[c.no] = 1; L.push(['r', 'Arrivée dépassée : ' + c.four + ' (' + c.no + ')', 'Prévue au dépôt le ' + dd(c.arr) + '.']); }
      if (c.alerte === 'Manque 4') L.push(['', 'Réception incomplète : ' + c.des, 'Reçu ' + nf(c.qrec) + ' sur ' + nf(c.qte) + ' le ' + dd(c.recu) + '. Réserve à faire au fournisseur.']);
      if (c.etape === 'Proforma à payer') L.push(['', 'Proforma à payer : ' + c.four, nf(c.mt) + ' FCFA, ' + c.des.toLowerCase() + '.']);
      if (c.etape === 'Proforma attendue') L.push(['', 'Proforma attendue : ' + c.four, 'Commande du ' + dd(c.cde) + '.']);
    });
    var pr = st.filter(function (x) { return D.prop[x.ref]; });
    if (pr.length) L.push(['', nf(pr.length) + ' article' + (pr.length > 1 ? 's' : '') + ' à commander', nf(pr.reduce(function (a, x) { return a + D.prop[x.ref].m; }, 0)) + ' FCFA au total.']);
    $('todo').innerHTML = L.length ? L.map(function (l) { return '<li><i class="' + l[0] + '"></i><span>' + esc(l[1]) + '</span><small>' + esc(l[2]) + '</small></li>'; }).join('') : '<li><span class="gg">Rien à traiter.</span></li>';
  }

  function chips(st) {
    var opts = [['', 'Tous']].concat(ETATS.map(function (e) { return [e[0], e[0]]; }));
    $('etats').innerHTML = opts.map(function (o) {
      var n = o[0] ? st.filter(function (x) { return x.alerte === o[0]; }).length : st.length;
      return '<button type="button" data-e="' + o[0] + '" class="' + (etat === o[0] ? 'on' : '') + '">' + o[1] + ' ' + n + '</button>';
    }).join('');
  }

  var COLS = [
    ['des', 'Article', ''], ['soc', 'Société', ''], ['stock', 'Stock', 'r'], ['seuil', 'Seuil', 'r'],
    ['encde', 'En commande', 'r'], ['couv', 'Couverture', 'r'], ['val', 'Valeur (FCFA)', 'r'], ['etat', 'État', '']
  ];
  var RANG = { 'Rupture': 0, 'Sous le seuil': 1, 'À surveiller': 2, 'OK': 3 };
  function table() {
    var s = q.toLowerCase();
    var r = D.stock.filter(function (x) {
      return inSoc(x) && (!etat || x.alerte === etat) &&
        (!s || (x.des + ' ' + x.ref + ' ' + x.marque + ' ' + x.fam).toLowerCase().indexOf(s) >= 0);
    });
    r.sort(function (a, b) {
      var A, B;
      if (tri.k === 'etat') { A = RANG[a.alerte]; B = RANG[b.alerte]; if (A === B) { A = a.couv; B = b.couv; } }
      else { A = a[tri.k]; B = b[tri.k]; }
      if (typeof A === 'string') return tri.up ? A.localeCompare(B, 'fr') : B.localeCompare(A, 'fr');
      return tri.up ? A - B : B - A;
    });
    var pc = { 'Rupture': 'r', 'Sous le seuil': 'a', 'À surveiller': '', 'OK': 'v' };
    $('n-tbl').textContent = r.length + ' sur ' + D.stock.filter(inSoc).length;
    $('tbl').innerHTML = '<thead><tr>' + COLS.map(function (c) {
      return '<th data-k="' + c[0] + '" class="' + c[2] + (tri.k === c[0] ? ' s' + (tri.up ? ' up' : '') : '') + '">' + c[1] + '</th>';
    }).join('') + '</tr></thead><tbody>' + (r.length ? r.map(function (x) {
      return '<tr><td>' + esc(x.des) + '<span class="ref">' + esc(x.ref) + ' · ' + esc(x.marque) + '</span></td>' +
        '<td data-l="Société">' + esc(x.soc) + '</td>' +
        '<td class="r" data-l="Stock">' + nf(x.stock) + ' <span class="gg">' + esc(x.unite) + (x.stock > 1 ? 's' : '') + '</span></td>' +
        '<td class="r" data-l="Seuil">' + nf(x.seuil) + '</td>' +
        '<td class="r" data-l="En commande">' + (x.encde ? nf(x.encde) : '<span class="gg">0</span>') + '</td>' +
        '<td class="r" data-l="Couverture">' + nf(x.couv) + ' j</td>' +
        '<td class="r" data-l="Valeur">' + nf(x.val) + '</td>' +
        '<td><span class="pill ' + pc[x.alerte] + '">' + esc(x.alerte) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="8" class="gg">Aucun article ne correspond.</td></tr>') + '</tbody>';
  }

  function setSoc(s) {
    soc = s;
    Array.prototype.forEach.call($('socs').children, function (b) { b.classList.toggle('on', b.getAttribute('data-k') === s); });
    render();
  }

  function init() {
    var p = D.date.split('-');
    $('arrete').textContent = +p[2] + ' ' + ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][+p[1] - 1] + ' ' + p[0];
    $('socs').innerHTML = [['', 'Toutes']].concat(SOCS.map(function (s) { return [s, s]; })).map(function (s) {
      return '<button type="button" role="tab" data-k="' + s[0] + '" class="' + (s[0] === soc ? 'on' : '') + '">' + s[1] + '</button>';
    }).join('');
    $('socs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setSoc(b.getAttribute('data-k')); });
    $('etats').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; etat = b.getAttribute('data-e'); chips(D.stock.filter(inSoc)); table();
    });
    $('q').addEventListener('input', function (e) { q = e.target.value; table(); });
    $('tbl').addEventListener('click', function (e) {
      var th = e.target.closest('th'); if (!th) return; var k = th.getAttribute('data-k');
      if (tri.k === k) tri.up = !tri.up; else { tri.k = k; tri.up = !(k === 'val' || k === 'stock' || k === 'encde'); }
      table();
    });
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.color = '#55534F';
    render();
  }

  fetch('data/donnees.json?v=20261118b').then(function (r) { return r.json(); }).then(function (d) { D = d; init(); });
})();
