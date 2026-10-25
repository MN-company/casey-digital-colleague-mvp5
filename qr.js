/* =====================================================================
   Casey — generatore di codici QR (modalita' byte, correzione livello M).
   Serve perche' ogni sessione del totem ha un id diverso: un QR statico
   non potrebbe portarlo con se'. Versioni da 1 a 10, scelta automatica.
   ===================================================================== */
(function (root) {
  'use strict';

  // tabelle per livello M: [codeword di correzione per blocco, blocchi g1, dati g1, blocchi g2, dati g2]
  var ECC_M = {
    1:[10,1,16,0,0], 2:[16,1,28,0,0], 3:[26,1,44,0,0], 4:[18,2,32,0,0], 5:[24,2,43,0,0],
    6:[16,4,27,0,0], 7:[18,4,31,0,0], 8:[22,2,38,2,39], 9:[22,3,36,2,37], 10:[26,4,43,1,44]
  };
  var ALIGN = {
    1:[], 2:[6,18], 3:[6,22], 4:[6,26], 5:[6,30],
    6:[6,34], 7:[6,22,38], 8:[6,24,42], 9:[6,26,46], 10:[6,28,50]
  };
  var VERSION_BITS = {
    7:'000111110010010100', 8:'001000010110111100', 9:'001001101010011001', 10:'001010010011010011'
  };
  // informazioni di formato gia' calcolate, livello M, una per maschera
  var FORMAT_M = ['101010000010010','101000100100101','101111001111100','101101101001011',
                  '100010111111001','100000011001110','100111110010111','100101010100000'];

  // ---- campo di Galois 256 ----
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function generatorPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = new Array(p.length + 1).fill(0);
      for (var j = 0; j < p.length; j++) {
        q[j] ^= gmul(p[j], 1);
        q[j + 1] ^= gmul(p[j], EXP[i]);
      }
      p = q;
    }
    return p;
  }

  function rsEncode(data, ecLen) {
    var gen = generatorPoly(ecLen);
    var res = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      for (var j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
    }
    return res;
  }

  // ---- costruzione del flusso di bit ----
  function totalDataCodewords(v) { var t = ECC_M[v]; return t[1] * t[2] + t[3] * t[4]; }

  function pickVersion(byteLen) {
    for (var v = 1; v <= 10; v++) {
      var countBits = v < 10 ? 8 : 16;
      var need = 4 + countBits + byteLen * 8;
      if (need <= totalDataCodewords(v) * 8) return v;
    }
    throw new Error('Testo troppo lungo per un QR fino alla versione 10');
  }

  function utf8Bytes(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c < 0xD800 || c >= 0xE000) { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      else { i++; var cp = 0x10000 + (((c & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF));
             out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)); }
    }
    return out;
  }

  function buildCodewords(text) {
    var bytes = utf8Bytes(text);
    var v = pickVersion(bytes.length);
    var countBits = v < 10 ? 8 : 16;
    var bits = [];
    function push(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    push(4, 4);                      // modalita' byte
    push(bytes.length, countBits);
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);

    var capacity = totalDataCodewords(v) * 8;
    var term = Math.min(4, capacity - bits.length);
    push(0, term);
    while (bits.length % 8 !== 0) bits.push(0);

    var data = [];
    for (var b = 0; b < bits.length; b += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b + k];
      data.push(byte);
    }
    var pad = [0xEC, 0x11], pi = 0;
    while (data.length < totalDataCodewords(v)) { data.push(pad[pi % 2]); pi++; }

    // suddivisione in blocchi e interlacciamento
    var t = ECC_M[v], ecLen = t[0];
    var blocks = [], pos = 0, g;
    for (g = 0; g < t[1]; g++) { blocks.push(data.slice(pos, pos + t[2])); pos += t[2]; }
    for (g = 0; g < t[3]; g++) { blocks.push(data.slice(pos, pos + t[4])); pos += t[4]; }
    var ecBlocks = blocks.map(function (bl) { return rsEncode(bl, ecLen); });

    var maxData = Math.max.apply(null, blocks.map(function (b2) { return b2.length; }));
    var out = [], c, r2;
    for (c = 0; c < maxData; c++) for (r2 = 0; r2 < blocks.length; r2++) if (c < blocks[r2].length) out.push(blocks[r2][c]);
    for (c = 0; c < ecLen; c++) for (r2 = 0; r2 < ecBlocks.length; r2++) out.push(ecBlocks[r2][c]);
    return { version: v, codewords: out };
  }

  // ---- disegno della matrice ----
  function makeMatrix(version) {
    var n = 17 + 4 * version;
    var m = [], reserved = [], i, j;
    for (i = 0; i < n; i++) { m.push(new Array(n).fill(0)); reserved.push(new Array(n).fill(false)); }

    function finder(r, c) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        var on = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
                 (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
                 (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        m[rr][cc] = on ? 1 : 0; reserved[rr][cc] = true;
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    for (i = 8; i < n - 8; i++) {                       // righe di sincronismo
      var bit = (i % 2 === 0) ? 1 : 0;
      m[6][i] = bit; reserved[6][i] = true;
      m[i][6] = bit; reserved[i][6] = true;
    }

    var centers = ALIGN[version];
    for (i = 0; i < centers.length; i++) for (j = 0; j < centers.length; j++) {
      var cr = centers[i], cc2 = centers[j];
      if ((cr <= 8 && cc2 <= 8) || (cr <= 8 && cc2 >= n - 9) || (cr >= n - 9 && cc2 <= 8)) continue;
      for (var a = -2; a <= 2; a++) for (var b2 = -2; b2 <= 2; b2++) {
        var on2 = (Math.abs(a) === 2 || Math.abs(b2) === 2 || (a === 0 && b2 === 0));
        m[cr + a][cc2 + b2] = on2 ? 1 : 0; reserved[cr + a][cc2 + b2] = true;
      }
    }

    m[n - 8][8] = 1; reserved[n - 8][8] = true;          // modulo sempre scuro
    for (i = 0; i <= 8; i++) { if (!reserved[8][i]) reserved[8][i] = true; if (!reserved[i][8]) reserved[i][8] = true; }
    for (i = 0; i < 8; i++) { reserved[8][n - 1 - i] = true; reserved[n - 1 - i][8] = true; }

    if (version >= 7) {
      for (i = 0; i < 18; i++) {
        var vb = VERSION_BITS[version][17 - i] === '1' ? 1 : 0;
        var rr2 = Math.floor(i / 3), cc3 = n - 11 + (i % 3);
        m[rr2][cc3] = vb; reserved[rr2][cc3] = true;
        m[cc3][rr2] = vb; reserved[cc3][rr2] = true;
      }
    }
    return { n: n, m: m, reserved: reserved };
  }

  function placeData(grid, codewords) {
    var n = grid.n, m = grid.m, reserved = grid.reserved;
    var bitIdx = 0, total = codewords.length * 8;
    function nextBit() {
      if (bitIdx >= total) return 0;
      var byte = codewords[bitIdx >> 3], bit = (byte >> (7 - (bitIdx & 7))) & 1;
      bitIdx++; return bit;
    }
    var col = n - 1, up = true;
    while (col > 0) {
      if (col === 6) col--;
      for (var k = 0; k < n; k++) {
        var row = up ? n - 1 - k : k;
        for (var s = 0; s < 2; s++) {
          var c = col - s;
          if (!reserved[row][c]) m[row][c] = nextBit();
        }
      }
      col -= 2; up = !up;
    }
  }

  function maskFn(id, r, c) {
    switch (id) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0;
      default: return ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0;
    }
  }

  function penalty(m, n) {
    var p = 0, r, c, i, run, prev;
    for (r = 0; r < n; r++) { run = 1; prev = m[r][0];
      for (c = 1; c < n; c++) { if (m[r][c] === prev) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; prev = m[r][c]; } }
      if (run >= 5) p += 3 + (run - 5); }
    for (c = 0; c < n; c++) { run = 1; prev = m[0][c];
      for (r = 1; r < n; r++) { if (m[r][c] === prev) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; prev = m[r][c]; } }
      if (run >= 5) p += 3 + (run - 5); }
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
      var v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
    var pat1 = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    function match(arr, pat) { for (var q = 0; q < 11; q++) if (arr[q] !== pat[q]) return false; return true; }
    for (r = 0; r < n; r++) for (c = 0; c <= n - 11; c++) {
      var row = [], col2 = [];
      for (i = 0; i < 11; i++) row.push(m[r][c + i]);
      if (match(row, pat1) || match(row, pat2)) p += 40;
    }
    for (c = 0; c < n; c++) for (r = 0; r <= n - 11; r++) {
      var colArr = [];
      for (i = 0; i < 11; i++) colArr.push(m[r + i][c]);
      if (match(colArr, pat1) || match(colArr, pat2)) p += 40;
    }
    var dark = 0;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += m[r][c];
    var pct = dark * 100 / (n * n);
    p += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return p;
  }

  function applyFormat(m, n, mask) {
    /* Attenzione all'orientamento: la prima copia corre lungo la COLONNA 8
       dall'alto e poi lungo la RIGA 8 verso sinistra; la seconda fa il
       percorso opposto. Scambiare riga e colonna qui produce un codice
       della dimensione giusta ma illeggibile. */
    var f = FORMAT_M[mask], i, bit;
    for (i = 0; i < 15; i++) {
      bit = f[14 - i] === '1' ? 1 : 0;
      // prima copia, attorno al mirino in alto a sinistra
      if (i < 6) m[i][8] = bit;
      else if (i === 6) m[7][8] = bit;
      else if (i === 7) m[8][8] = bit;
      else if (i === 8) m[8][7] = bit;
      else m[8][14 - i] = bit;
      // seconda copia, in alto a destra e in basso a sinistra
      if (i < 8) m[8][n - 1 - i] = bit;
      else m[n - 15 + i][8] = bit;
    }
    m[n - 8][8] = 1;   // modulo sempre scuro
  }

  function make(text) {
    var built = buildCodewords(text);
    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var grid = makeMatrix(built.version);
      placeData(grid, built.codewords);
      var n = grid.n, m = grid.m;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
        if (!grid.reserved[r][c] && maskFn(mask, r, c)) m[r][c] ^= 1;
      applyFormat(m, n, mask);
      var p = penalty(m, n);
      if (!best || p < best.p) best = { p: p, n: n, m: m, mask: mask, version: built.version };
    }
    return best;
  }

  /* Percorso SVG compatto: una riga di moduli accesi diventa un rettangolo. */
  function svgPath(text) {
    var q = make(text), n = q.n, d = '';
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (q.m[r][c]) { var w = 1; while (c + w < n && q.m[r][c + w]) w++;
          d += 'M' + c + ' ' + r + 'h' + w + 'v1h-' + w + 'z'; c += w; }
        else c++;
      }
    }
    return { n: n, d: d, version: q.version, mask: q.mask };
  }

  /* Disegna dentro un <svg> gia' presente nella pagina. */
  function render(svgEl, text) {
    if (!svgEl) return null;
    var p = svgPath(text);
    svgEl.setAttribute('viewBox', '-2 -2 ' + (p.n + 4) + ' ' + (p.n + 4));
    svgEl.innerHTML = '<rect x="-2" y="-2" width="' + (p.n + 4) + '" height="' + (p.n + 4) + '" fill="#fff"/>' +
                      '<path d="' + p.d + '" fill="#101828" shape-rendering="crispEdges"/>';
    return p;
  }

  root.CaseyQR = { make: make, svgPath: svgPath, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
