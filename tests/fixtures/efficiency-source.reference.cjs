/**
 * Source: https://github.com/ka33u/motor-efficiency-
 * Commit: 9799465e8aab001662d85d0b280802220057ab2e
 * The source author reports replacing 69.9 with 59.9 at 1.1 kW / 45 r/min
 * as a suspected printing error. This port preserves that author adjustment;
 * neither the reported original cell nor the standard table is independently verified.
 */
// Regression oracle: original source algorithm; only the data import path is changed.
var data = require('../../efficiency-data.js')
var SPEED_COLUMNS = data.SPEED_COLUMNS
var POWER_ROWS = data.POWER_ROWS
var TABLE = data.EFFICIENCY_TABLE

// 具体转速值列表（从高到低），对应列索引 4~13
var SPECIFIC_SPEEDS = [500, 375, 300, 250, 200, 150, 100, 75, 60, 45]
var SPECIFIC_SPEED_COLS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

/**
 * 查找转速对应的列信息
 * 返回 { type: 'exact', colIndex } 或 { type: 'interpolate', col1, col2, speed1, speed2 } 或 { error }
 */
function findSpeedInfo(speed) {
  if (speed > 6000) {
    return { error: '转速超出标准范围（>6000 r/min）' }
  }
  if (speed <= 0) {
    return { error: '请输入大于 0 的转速值' }
  }

  // 低于最低标准转速 45 r/min：基于 45 和 60 列线性外推
  if (speed < 45) {
    return {
      type: 'interpolate',
      col1: 13, col2: 12,
      speed1: 45, speed2: 60,
      label: '< 45 r/min（基于 45 与 60 r/min 外推）'
    }
  }

  // 范围列：直接取值
  if (speed > 1800) return { type: 'exact', colIndex: 0, label: '>1800~6000 r/min' }
  if (speed > 1200) return { type: 'exact', colIndex: 1, label: '>1200~1800 r/min' }
  if (speed > 900)  return { type: 'exact', colIndex: 2, label: '>900~1200 r/min' }
  if (speed > 600)  return { type: 'exact', colIndex: 3, label: '>600~900 r/min' }

  // 500 < speed ≤ 600：在 500 列和 >600~900 范围列之间插值
  if (speed > 500) {
    return {
      type: 'interpolate',
      col1: 4, col2: 3,
      speed1: 500, speed2: 600,
      label: '500 与 600 r/min 之间插值'
    }
  }

  // 精确匹配具体转速
  for (var i = 0; i < SPECIFIC_SPEEDS.length; i++) {
    if (Math.abs(speed - SPECIFIC_SPEEDS[i]) < 0.001) {
      return { type: 'exact', colIndex: SPECIFIC_SPEED_COLS[i], label: SPECIFIC_SPEEDS[i] + ' r/min' }
    }
  }

  // 在两个具体转速之间插值
  for (var i = 0; i < SPECIFIC_SPEEDS.length - 1; i++) {
    if (speed < SPECIFIC_SPEEDS[i] && speed > SPECIFIC_SPEEDS[i + 1]) {
      return {
        type: 'interpolate',
        col1: SPECIFIC_SPEED_COLS[i + 1], col2: SPECIFIC_SPEED_COLS[i],
        speed1: SPECIFIC_SPEEDS[i + 1], speed2: SPECIFIC_SPEEDS[i],
        label: SPECIFIC_SPEEDS[i + 1] + ' 与 ' + SPECIFIC_SPEEDS[i] + ' r/min 之间插值'
      }
    }
  }

  return { error: '无法匹配转速' }
}

/**
 * 查找功率对应的行信息
 * 返回 { type: 'exact', rowIndex } 或 { type: 'interpolate', row1, row2, power1, power2 } 或 { error }
 */
function findPowerInfo(power) {
  if (power < 0.55 || power > 1250) {
    return { error: '功率超出标准范围（0.55~1250 kW）' }
  }

  // 315~1250 范围行：直接取值
  if (power >= 315) {
    return { type: 'exact', rowIndex: 27, label: '315~1250 kW' }
  }

  // 280 < power < 315：在 280 行和 315~1250 行之间插值
  if (power > 280) {
    return {
      type: 'interpolate',
      row1: 26, row2: 27,
      power1: 280, power2: 315,
      label: '280 与 315 kW 之间插值'
    }
  }

  // 精确匹配具体功率（不含最后的 315）
  for (var i = 0; i < POWER_ROWS.length - 1; i++) {
    if (Math.abs(power - POWER_ROWS[i]) < 0.001) {
      return { type: 'exact', rowIndex: i, label: POWER_ROWS[i] + ' kW' }
    }
  }
  // 检查 280
  if (Math.abs(power - 280) < 0.001) {
    return { type: 'exact', rowIndex: 26, label: '280 kW' }
  }

  // 在两个具体功率之间插值
  for (var i = 0; i < POWER_ROWS.length - 2; i++) {
    if (power > POWER_ROWS[i] && power < POWER_ROWS[i + 1]) {
      return {
        type: 'interpolate',
        row1: i, row2: i + 1,
        power1: POWER_ROWS[i], power2: POWER_ROWS[i + 1],
        label: POWER_ROWS[i] + ' 与 ' + POWER_ROWS[i + 1] + ' kW 之间插值'
      }
    }
  }
  // 在 250 和 280 之间
  if (power > 250 && power < 280) {
    return {
      type: 'interpolate',
      row1: 25, row2: 26,
      power1: 250, power2: 280,
      label: '250 与 280 kW 之间插值'
    }
  }

  return { error: '无法匹配功率' }
}

/**
 * 线性插值
 */
function lerp(v1, v2, t) {
  return v1 + (v2 - v1) * t
}

/**
 * 查询效率值
 * @param {number} speed 转速 r/min
 * @param {number} power 功率 kW
 * @returns {object} { efficiency, interpolated, speedInfo, powerInfo } 或 { error }
 */
function queryEfficiency(speed, power) {
  var speedInfo = findSpeedInfo(speed)
  if (speedInfo.error) return { error: speedInfo.error }

  var powerInfo = findPowerInfo(power)
  if (powerInfo.error) return { error: powerInfo.error }

  var interpolated = speedInfo.type === 'interpolate' || powerInfo.type === 'interpolate'
  var efficiency

  if (speedInfo.type === 'exact' && powerInfo.type === 'exact') {
    // 双精确
    efficiency = TABLE[powerInfo.rowIndex][speedInfo.colIndex]
  } else if (speedInfo.type === 'exact' && powerInfo.type === 'interpolate') {
    // 转速精确，功率插值
    var v1 = TABLE[powerInfo.row1][speedInfo.colIndex]
    var v2 = TABLE[powerInfo.row2][speedInfo.colIndex]
    var t = (power - powerInfo.power1) / (powerInfo.power2 - powerInfo.power1)
    efficiency = lerp(v1, v2, t)
  } else if (speedInfo.type === 'interpolate' && powerInfo.type === 'exact') {
    // 功率精确，转速插值
    var v1 = TABLE[powerInfo.rowIndex][speedInfo.col1]
    var v2 = TABLE[powerInfo.rowIndex][speedInfo.col2]
    var t = (speed - speedInfo.speed1) / (speedInfo.speed2 - speedInfo.speed1)
    efficiency = lerp(v1, v2, t)
  } else {
    // 双线性插值
    var ts = (speed - speedInfo.speed1) / (speedInfo.speed2 - speedInfo.speed1)
    var tp = (power - powerInfo.power1) / (powerInfo.power2 - powerInfo.power1)

    var v11 = TABLE[powerInfo.row1][speedInfo.col1]
    var v12 = TABLE[powerInfo.row1][speedInfo.col2]
    var v21 = TABLE[powerInfo.row2][speedInfo.col1]
    var v22 = TABLE[powerInfo.row2][speedInfo.col2]

    var vp1 = lerp(v11, v12, ts)
    var vp2 = lerp(v21, v22, ts)
    efficiency = lerp(vp1, vp2, tp)
  }

  // 保留一位小数
  efficiency = Math.round(efficiency * 10) / 10

  return {
    efficiency: efficiency,
    interpolated: interpolated,
    speedLabel: speedInfo.label,
    powerLabel: powerInfo.label,
  }
}

module.exports = {
  queryEfficiency: queryEfficiency,
}
