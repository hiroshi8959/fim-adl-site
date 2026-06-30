const logTable = [
  [1.0, 0.000],
  [1.1, 0.095],
  [1.2, 0.182],
  [1.3, 0.262],
  [1.4, 0.336],
  [1.5, 0.405],
  [1.6, 0.470],
  [1.7, 0.531],
  [1.8, 0.588],
  [1.9, 0.642],
  [2.0, 0.693],
  [2.2, 0.788],
  [2.4, 0.875],
  [2.6, 0.956],
  [2.8, 1.030],
  [3.0, 1.099],
  [4.0, 1.386],
  [5.0, 1.609],
  [6.0, 1.792],
  [7.0, 1.946],
  [8.0, 2.079],
  [9.0, 2.197],
  [10.0, 2.303],
];

const colors = {
  1: "#f0182d",
  2: "#ff8a1c",
  3: "#ffd92f",
  4: "#fff4a3",
  5: "#ffffff",
  6: "#2447ff",
  7: "#30e0b3",
};

const levelNames = {
  1: "全介助",
  2: "最大介助",
  3: "中等度介助",
  4: "最小介助",
  5: "監視・準備",
  6: "修正自立",
  7: "完全自立",
};

const adlModels = [
  { key: "eating", label: "食事", b: -0.1423, a: [1.5608, 1.9329, 2.3684, 3.4951, 9.5006, 10.2657], r2: 0.3110 },
  { key: "grooming", label: "整容", b: -0.1414, a: [1.7574, 3.0227, 3.6183, 5.0741, 7.5682, 7.8845], r2: 0.3050 },
  { key: "bathing", label: "清拭・入浴", b: -0.1417, a: [4.1960, 5.7489, 8.9157, 10.5644, 13.2733, 14.4868], r2: 0.3112 },
  { key: "dressUp", label: "更衣 上半身", b: -0.2129, a: [6.2514, 8.9555, 11.6334, 12.6174, 13.8967, 15.8600], r2: 0.4082 },
  { key: "dressLow", label: "更衣 下半身", b: -0.2848, a: [13.2465, 15.6689, 16.3103, 17.0360, 19.2687, 21.1961], r2: 0.4831 },
  { key: "toileting", label: "トイレ動作", b: -0.2005, a: [6.4348, 10.0838, 10.5434, 11.3767, 13.5103, 15.2718], r2: 0.3976 },
  { key: "bladder", label: "排尿管理", b: -0.1517, a: [4.9386, 6.0908, 6.3853, 7.5706, 8.4040, 8.8441], r2: 0.3072 },
  { key: "bowel", label: "排便管理", b: -0.1359, a: [3.1989, 3.7347, 4.0001, 5.6046, 6.0845, 10.9284], r2: 0.2826 },
  { key: "bedTrans", label: "ベッド・椅子移乗", b: -0.2172, a: [4.5633, 6.6698, 8.4174, 10.8424, 15.0665, 18.8667], r2: 0.4363 },
  { key: "toiletTrans", label: "トイレ移乗", b: -0.2240, a: [5.2690, 6.5253, 8.6726, 10.9834, 15.3265, 19.7896], r2: 0.4506 },
  { key: "tubTrans", label: "浴槽・シャワー移乗", b: -0.1254, a: [3.8293, 4.8245, 6.5581, 9.3039], r2: 0.2761 },
  { key: "locomotion", label: "移動", b: -0.1352, a: [3.8693, 4.7731, 5.2226, 5.7291, 6.9879, 13.1551], r2: 0.2787 },
];

const ids = [
  "onsetDate",
  "admissionDate",
  "admissionFim",
  "conferenceDate",
  "conferenceFim",
  "targetDate",
  "useTable",
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const out = {
  heroScore: document.getElementById("heroScore"),
  heroMeta: document.getElementById("heroMeta"),
  statusText: document.getElementById("statusText"),
  betaValue: document.getElementById("betaValue"),
  predictedFim: document.getElementById("predictedFim"),
  deltaValue: document.getElementById("deltaValue"),
  ratioAB: document.getElementById("ratioAB"),
  lnAB: document.getElementById("lnAB"),
  ratioAX: document.getElementById("ratioAX"),
  lnAX: document.getElementById("lnAX"),
  dateNote: document.getElementById("dateNote"),
  adlGrid: document.getElementById("adlGrid"),
  legend: document.getElementById("legend"),
  curveCanvas: document.getElementById("curveCanvas"),
};

function isoDate(date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

function setInitialDates() {
  const today = new Date();
  const admission = new Date(today);
  const conf = new Date(today);
  const target = new Date(today);
  admission.setDate(today.getDate() - 30);
  conf.setDate(today.getDate() - 2);
  target.setDate(today.getDate() + 90);
  el.admissionDate.value = isoDate(admission);
  el.conferenceDate.value = isoDate(conf);
  el.targetDate.value = isoDate(target);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from, to) {
  return Math.round((to - from) / 86400000);
}

function clampFim(value) {
  return Math.min(91, Math.max(13, value));
}

function nearestLog(ratio, useTable) {
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  if (!useTable) {
    return { ratio, x: ratio, ln: Math.log(ratio), exact: true };
  }
  let best = logTable[0];
  for (const row of logTable) {
    if (Math.abs(row[0] - ratio) < Math.abs(best[0] - ratio)) best = row;
  }
  return { ratio, x: best[0], ln: best[1], exact: false };
}

function fmt(value, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

function logistic(x) {
  if (x > 40) return 1;
  if (x < -40) return 0;
  return 1 / (1 + Math.exp(-x));
}

function probabilities(model, score) {
  const cumulative = model.a.map((a) => logistic(a + model.b * score));
  const levels = model.a.length + 1;
  const probs = [];
  probs.push(cumulative[0]);
  for (let i = 1; i < cumulative.length; i += 1) {
    probs.push(Math.max(0, cumulative[i] - cumulative[i - 1]));
  }
  probs.push(Math.max(0, 1 - cumulative[cumulative.length - 1]));
  const total = probs.reduce((sum, p) => sum + p, 0) || 1;
  return probs.slice(0, levels).map((p, index) => ({
    level: index + 1,
    probability: p / total,
  }));
}

function expectedLevel(probs) {
  return probs.reduce((sum, item) => sum + item.level * item.probability, 0);
}

function probabilityAtLeast(probs, level) {
  return probs.filter((item) => item.level >= level).reduce((sum, item) => sum + item.probability, 0);
}

function calculate() {
  const onset = parseDate(el.onsetDate.value);
  const admission = parseDate(el.admissionDate.value);
  const conference = parseDate(el.conferenceDate.value);
  const target = parseDate(el.targetDate.value);
  const fimA = Number(el.admissionFim.value);
  const fimB = Number(el.conferenceFim.value);
  const useTable = el.useTable.checked;

  if (!admission || !conference || !target || !Number.isFinite(fimA) || !Number.isFinite(fimB)) {
    return invalid("日付と運動FIMを入力してください。");
  }
  if (fimA < 13 || fimA > 91 || fimB < 13 || fimB > 91) {
    return invalid("運動FIMは13-91点で入力してください。");
  }
  if (conference <= admission) {
    return invalid("2回目カンファレンス日は入院日より後にしてください。");
  }
  if (target < admission) {
    return invalid("退院予定日は入院日以降にしてください。");
  }

  const origin = onset || admission;
  const dayA = onset ? Math.max(1, daysBetween(origin, admission)) : 1;
  const dayB = onset ? Math.max(1, daysBetween(origin, conference)) : Math.max(2, daysBetween(admission, conference) + 1);
  const dayX = onset ? Math.max(1, daysBetween(origin, target)) : Math.max(1, daysBetween(admission, target) + 1);

  if (dayB <= dayA) {
    return invalid("発症日を使う場合、2回目カンファレンスの日数が入院日の日数より大きくなる必要があります。");
  }
  if (dayX < dayA) {
    return invalid("退院予定日は入院日以降にしてください。");
  }

  const logAB = nearestLog(dayB / dayA, useTable);
  const logAX = nearestLog(dayX / dayA, useTable);
  if (!logAB || !logAX || logAB.ln <= 0) return invalid("日数比から対数を計算できません。");

  const beta = (fimB - fimA) / logAB.ln;
  const rawPrediction = fimA + beta * logAX.ln;
  const prediction = clampFim(rawPrediction);
  const delta = prediction - fimA;

  const warning = [];
  if (!onset) warning.push("発症日未入力のため、入院日をDay 1として計算しています。");
  if (useTable && (logAB.ratio > 10 || logAX.ratio > 10)) warning.push("日数比が対数早見表の範囲を超えたため、最も近い表値で近似しています。");
  if (rawPrediction !== prediction) warning.push("予測値が運動FIM範囲外のため13-91点に丸めています。");

  out.statusText.textContent = warning.length ? warning.join(" ") : "計算できました。";
  out.dateNote.textContent = onset
    ? `発症日をDay 0として、入院日 Day ${dayA}、2回目 Day ${dayB}、退院予定日 Day ${dayX}で計算しています。`
    : `発症日未入力: 入院日 Day ${dayA}、2回目 Day ${dayB}、退院予定日 Day ${dayX}で計算しています。`;

  out.heroScore.textContent = fmt(prediction, 1);
  out.heroMeta.textContent = `運動FIM ${fmt(fimA, 0)} → ${fmt(fimB, 0)} から推定`;
  out.betaValue.textContent = fmt(beta, 2);
  out.predictedFim.textContent = fmt(prediction, 1);
  out.deltaValue.textContent = `${delta >= 0 ? "+" : ""}${fmt(delta, 1)}`;
  renderLog(out.ratioAB, out.lnAB, logAB);
  renderLog(out.ratioAX, out.lnAX, logAX);
  renderCurve({ dayA, dayB, dayX, fimA, fimB, prediction, beta, logMode: useTable });
  renderAdl(prediction);
}

function renderLog(ratioEl, lnEl, log) {
  ratioEl.textContent = `実比 ${fmt(log.ratio, 2)} / 採用 ${fmt(log.x, 1)}`;
  lnEl.textContent = log.exact ? `ln=${fmt(log.ln, 3)}（厳密計算）` : `ln=${fmt(log.ln, 3)}（早見表近似）`;
}

function invalid(message) {
  out.statusText.textContent = message;
  out.heroScore.textContent = "--";
  out.heroMeta.textContent = "入力内容を確認してください";
  out.betaValue.textContent = "--";
  out.predictedFim.textContent = "--";
  out.deltaValue.textContent = "--";
  out.ratioAB.textContent = "--";
  out.ratioAX.textContent = "--";
  out.lnAB.textContent = "--";
  out.lnAX.textContent = "--";
  renderAdl(50);
}

function renderCurve(data) {
  const canvas = out.curveCanvas;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pad = { l: 54, r: 22, t: 22, b: 42 };
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const maxDay = Math.max(data.dayX, data.dayB, data.dayA + 1);
  const minDay = Math.max(1, Math.min(data.dayA, data.dayB, data.dayX));
  const xFor = (day) => pad.l + ((day - minDay) / (maxDay - minDay || 1)) * (w - pad.l - pad.r);
  const yFor = (fim) => pad.t + ((91 - fim) / (91 - 13)) * (h - pad.t - pad.b);

  ctx.strokeStyle = "#d9e0ea";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#637083";
  ctx.font = "12px sans-serif";
  for (let fim = 20; fim <= 90; fim += 10) {
    const y = yFor(fim);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillText(String(fim), 18, y + 4);
  }

  ctx.strokeStyle = "#0f7b8f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const day = minDay + ((maxDay - minDay) * i) / 120;
    const fim = clampFim(data.fimA + data.beta * Math.log(day / data.dayA));
    const x = xFor(day);
    const y = yFor(fim);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  [
    { day: data.dayA, fim: data.fimA, label: "入院" },
    { day: data.dayB, fim: data.fimB, label: "2回目" },
    { day: data.dayX, fim: data.prediction, label: "予測" },
  ].forEach((point, index) => {
    const x = xFor(point.day);
    const y = yFor(point.fim);
    ctx.fillStyle = index === 2 ? "#075766" : "#ffffff";
    ctx.strokeStyle = "#075766";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#172033";
    ctx.fillText(`${point.label} ${fmt(point.fim, 0)}`, Math.min(x + 9, w - 92), Math.max(y - 10, 16));
  });

  ctx.fillStyle = "#637083";
  ctx.fillText("運動FIM", 10, 16);
  ctx.fillText("日数", w - 52, h - 14);
}

function renderLegend() {
  out.legend.innerHTML = "";
  Object.entries(levelNames).forEach(([level, name]) => {
    const item = document.createElement("span");
    item.className = "legendItem";
    item.innerHTML = `<span class="swatch" style="background:${colors[level]}"></span>FIM ${level} ${name}`;
    out.legend.appendChild(item);
  });
}

function renderAdl(score) {
  out.adlGrid.innerHTML = "";
  adlModels.forEach((model) => {
    const probs = probabilities(model, score);
    const expected = expectedLevel(probs);
    const atLeast5 = probabilityAtLeast(probs, 5);
    const card = document.createElement("article");
    card.className = "adlCard";
    const rows = probs
      .slice()
      .reverse()
      .map(
        (item) => `
          <div class="levelRow">
            <span>FIM ${item.level}</span>
            <span class="miniTrack"><span class="miniFill" style="width:${item.probability * 100}%; background:${colors[item.level]}"></span></span>
            <b>${fmt(item.probability * 100, 0)}%</b>
          </div>`
      )
      .join("");

    card.innerHTML = `
      <div class="adlHead">
        <h3>${model.label}</h3>
        <strong>予測FIM ${fmt(score, 1)}</strong>
      </div>
      <div class="adlGraphRow">
        <div class="adlCanvasWrap">
          <canvas class="adlGraph" width="420" height="270" aria-label="${model.label}のFIM到達確率グラフ"></canvas>
        </div>
        <div class="levelList">${rows}</div>
      </div>
      <div class="adlFoot">
        <span>期待FIM: ${fmt(expected, 1)}</span>
        <span>FIM 5以上: ${fmt(atLeast5 * 100, 1)}%</span>
        <span>R2=${model.r2.toFixed(3)}</span>
      </div>
    `;
    out.adlGrid.appendChild(card);
    drawAdlGraph(card.querySelector("canvas"), model, score);
  });
}

function drawAdlGraph(canvas, model, score) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pad = { l: 38, r: 12, t: 22, b: 36 };
  const xMin = 10;
  const xMax = 90;
  const graphW = w - pad.l - pad.r;
  const graphH = h - pad.t - pad.b;
  const xFor = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * graphW;
  const yFor = (p) => pad.t + (1 - p) * graphH;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  for (let px = 0; px <= graphW; px += 1) {
    const fim = xMin + (px / graphW) * (xMax - xMin);
    const probs = probabilities(model, fim);
    let cumulative = 0;
    probs.forEach((item) => {
      const next = cumulative + item.probability;
      ctx.fillStyle = colors[item.level];
      ctx.fillRect(pad.l + px, yFor(next), 1.25, Math.max(1, yFor(cumulative) - yFor(next)));
      cumulative = next;
    });
  }

  ctx.strokeStyle = "rgba(23, 32, 51, 0.88)";
  ctx.lineWidth = 1.4;
  for (let boundary = 1; boundary <= model.a.length; boundary += 1) {
    ctx.beginPath();
    for (let i = 0; i <= graphW; i += 1) {
      const fim = xMin + (i / graphW) * (xMax - xMin);
      const probs = probabilities(model, fim);
      const cumulative = probs.slice(0, boundary).reduce((sum, item) => sum + item.probability, 0);
      const x = pad.l + i;
      const y = yFor(cumulative);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(23, 32, 51, 0.22)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#637083";
  ctx.font = "11px sans-serif";
  [0, 0.5, 1].forEach((p) => {
    const y = yFor(p);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(p * 100)}%`, 5, y + 4);
  });

  [10, 30, 50, 70, 90].forEach((tick) => {
    const x = xFor(tick);
    ctx.strokeStyle = "rgba(23, 32, 51, 0.18)";
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, h - pad.b);
    ctx.stroke();
    ctx.fillStyle = "#637083";
    ctx.fillText(String(tick), x - 7, h - 12);
  });

  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 2.5;
  const lineX = xFor(Math.max(xMin, Math.min(xMax, score)));
  ctx.beginPath();
  ctx.moveTo(lineX, pad.t - 6);
  ctx.lineTo(lineX, h - pad.b + 4);
  ctx.stroke();

  ctx.fillStyle = "#172033";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(`運動FIM ${fmt(score, 1)}`, Math.min(lineX + 6, w - 94), pad.t + 12);

  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(pad.l, pad.t, graphW, graphH);
  ctx.fillStyle = "#637083";
  ctx.font = "11px sans-serif";
  ctx.fillText("確率", 5, 13);
  ctx.fillText("運動FIM", w - 68, h - 12);
}

ids.forEach((id) => el[id].addEventListener("input", calculate));
renderLegend();
setInitialDates();
calculate();
