/**
 * Motocore trending / analytics algorithms (deterministic, no LLM).
 * Used by AI tools for forecasts, ABC inventory, and trend labels.
 */

function round(n, digits = 2) {
  const p = 10 ** digits;
  return Math.round((Number(n) || 0) * p) / p;
}

/**
 * Ordinary least squares linear regression: y = slope * x + intercept
 * @param {number[]} values series in time order
 */
function linearRegression(values = []) {
  const ys = values.map((v) => Number(v) || 0);
  const n = ys.length;
  if (n < 2) {
    return {
      slope: 0,
      intercept: ys[0] || 0,
      r2: 0,
      n,
      algorithm: 'OLS_LINEAR_REGRESSION'
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += ys[i];
    sumXY += i * ys[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i += 1) {
    const pred = slope * i + intercept;
    ssTot += (ys[i] - meanY) ** 2;
    ssRes += (ys[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope: round(slope, 4),
    intercept: round(intercept, 4),
    r2: round(r2, 4),
    n,
    algorithm: 'OLS_LINEAR_REGRESSION'
  };
}

/** Simple moving average of last `window` points. */
function movingAverage(values = [], window = 7) {
  const ys = values.map((v) => Number(v) || 0);
  const w = Math.max(1, Math.min(window, ys.length || 1));
  if (!ys.length) return { value: 0, window: w, algorithm: 'SMA' };
  const slice = ys.slice(-w);
  const value = slice.reduce((a, b) => a + b, 0) / slice.length;
  return { value: round(value, 2), window: slice.length, algorithm: 'SMA' };
}

/** Exponential moving average. */
function ema(values = [], alpha = 0.3) {
  const ys = values.map((v) => Number(v) || 0);
  if (!ys.length) return { value: 0, alpha, algorithm: 'EMA' };
  const a = Math.min(1, Math.max(0.05, Number(alpha) || 0.3));
  let prev = ys[0];
  for (let i = 1; i < ys.length; i += 1) {
    prev = a * ys[i] + (1 - a) * prev;
  }
  return { value: round(prev, 2), alpha: a, algorithm: 'EMA' };
}

/**
 * Classify trend from regression slope vs mean level.
 */
function classifyTrend(values = []) {
  const ys = values.map((v) => Number(v) || 0);
  const reg = linearRegression(ys);
  const mean = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
  const relative = mean === 0 ? reg.slope : reg.slope / Math.max(mean, 0.1);

  let direction = 'FLAT';
  if (relative > 0.03) direction = 'UP';
  else if (relative < -0.03) direction = 'DOWN';

  const strength = Math.min(1, Math.abs(relative) * 8);
  return {
    direction,
    strength: round(strength, 3),
    relative_slope: round(relative, 4),
    regression: reg,
    mean: round(mean, 2),
    algorithm: 'SLOPE_VS_MEAN'
  };
}

/**
 * Forecast next `horizon` points with linear regression (+ optional EMA blend).
 */
function forecastSeries(values = [], horizon = 7) {
  const ys = values.map((v) => Number(v) || 0);
  const h = Math.min(30, Math.max(1, Number(horizon) || 7));
  const reg = linearRegression(ys);
  const smooth = ema(ys, 0.35);
  const trend = classifyTrend(ys);

  const points = [];
  for (let i = 1; i <= h; i += 1) {
    const x = ys.length - 1 + i;
    const linear = reg.slope * x + reg.intercept;
    // Blend: trust regression more when R² cao
    const weight = Math.max(0.35, Math.min(0.85, reg.r2));
    const blended = weight * linear + (1 - weight) * smooth.value;
    points.push(round(Math.max(0, blended), 2));
  }

  const nextTotal = round(points.reduce((a, b) => a + b, 0), 2);
  const lastWindow = movingAverage(ys, Math.min(7, ys.length || 1)).value;
  const changePct = lastWindow === 0
    ? null
    : round(((movingAverage(points, points.length).value - lastWindow) / lastWindow) * 100, 1);

  return {
    algorithm: 'OLS_PLUS_EMA_BLEND',
    horizon: h,
    trend,
    sma_recent: movingAverage(ys, 7),
    ema_recent: smooth,
    forecast_daily: points,
    forecast_total: nextTotal,
    expected_change_vs_recent_pct: changePct
  };
}

/**
 * ABC inventory analysis by stock value (cost * qty).
 * A ≈ top 80% value, B next 15%, C remaining 5%.
 */
function abcAnalysis(items = []) {
  const rows = items
    .map((item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.cost_price ?? item.unit_price) || 0;
      return {
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        quantity: qty,
        stock_value: round(qty * unit, 0)
      };
    })
    .filter((r) => r.stock_value > 0)
    .sort((a, b) => b.stock_value - a.stock_value);

  const total = rows.reduce((s, r) => s + r.stock_value, 0) || 1;
  let cum = 0;
  const classified = rows.map((r) => {
    const prev = cum;
    cum += r.stock_value;
    const share = cum / total;
    // Item belongs to A if it starts before the 80% cutoff (classic Pareto)
    let abc = 'C';
    if (prev / total < 0.8) abc = 'A';
    else if (prev / total < 0.95) abc = 'B';
    return {
      ...r,
      value_share_pct: round((r.stock_value / total) * 100, 2),
      cumulative_share_pct: round(share * 100, 2),
      abc_class: abc
    };
  });

  const counts = { A: 0, B: 0, C: 0 };
  classified.forEach((r) => {
    counts[r.abc_class] += 1;
  });

  return {
    algorithm: 'ABC_PARETO_80_15_5',
    total_stock_value: round(total, 0),
    class_counts: counts,
    items: classified.slice(0, 40)
  };
}

/**
 * Days of supply ≈ quantity / avg daily usage.
 * Avg usage from STOCK_OUT absolute quantity over period.
 */
function daysOfSupply(quantity, totalStockOutAbs, periodDays) {
  const qty = Number(quantity) || 0;
  const days = Math.max(1, Number(periodDays) || 30);
  const usage = Math.abs(Number(totalStockOutAbs) || 0);
  const avgDaily = usage / days;
  if (avgDaily <= 0) {
    return {
      avg_daily_usage: 0,
      days_of_supply: null,
      status: 'NO_USAGE',
      algorithm: 'DAYS_OF_SUPPLY'
    };
  }
  const dos = qty / avgDaily;
  let status = 'HEALTHY';
  if (dos < 7) status = 'CRITICAL';
  else if (dos < 14) status = 'LOW';
  else if (dos > 90) status = 'OVERSTOCK_RISK';
  return {
    avg_daily_usage: round(avgDaily, 3),
    days_of_supply: round(dos, 1),
    status,
    algorithm: 'DAYS_OF_SUPPLY'
  };
}

/**
 * Classic reorder suggestion:
 * Q = max(0, reorder_point + safety - on_hand)
 * safety ≈ 0.5 * reorder_point (simple)
 */
function suggestReorderQty(item = {}) {
  const onHand = Number(item.quantity) || 0;
  const reorder = Number(item.reorder_point) || 0;
  const safety = Math.ceil(reorder * 0.5);
  const target = reorder + safety;
  const qty = Math.max(0, target - onHand);
  return {
    on_hand: onHand,
    reorder_point: reorder,
    safety_stock: safety,
    target_level: target,
    suggest_qty: qty,
    algorithm: 'REORDER_POINT_PLUS_SAFETY'
  };
}

/**
 * Week-over-week growth from two totals.
 */
function periodGrowth(currentTotal, previousTotal) {
  const cur = Number(currentTotal) || 0;
  const prev = Number(previousTotal) || 0;
  if (prev === 0) {
    return {
      current: cur,
      previous: prev,
      growth_pct: cur > 0 ? 100 : 0,
      algorithm: 'PERIOD_OVER_PERIOD'
    };
  }
  return {
    current: cur,
    previous: prev,
    growth_pct: round(((cur - prev) / prev) * 100, 1),
    algorithm: 'PERIOD_OVER_PERIOD'
  };
}

/**
 * Build daily series map from [{date, count}] covering all days in range.
 */
function fillDailySeries(rows = [], dateFrom, dateTo) {
  const map = new Map(rows.map((r) => [r.date, Number(r.count) || 0]));
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  const series = [];
  const labels = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    labels.push(key);
    series.push(map.get(key) || 0);
  }
  return { labels, series };
}

module.exports = {
  linearRegression,
  movingAverage,
  ema,
  classifyTrend,
  forecastSeries,
  abcAnalysis,
  daysOfSupply,
  suggestReorderQty,
  periodGrowth,
  fillDailySeries,
  round
};
