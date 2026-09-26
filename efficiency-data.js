/**
 * Source: https://github.com/ka33u/motor-efficiency-
 * Commit: 9799465e8aab001662d85d0b280802220057ab2e
 * The source author reports replacing 69.9 with 59.9 at 1.1 kW / 45 r/min
 * as a suspected printing error. This port preserves that author adjustment;
 * neither the reported original cell nor the standard table is independently verified.
 */
(function (root, factory) {
  'use strict';
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else root.MotorEfficiencyData = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

// GB/T 30253-2024 变频控制同步电机 一级能效效率数据
// 数据来源：GB/T 30253-2024 标准表格

// 转速列定义（14列）
// 前4列为范围列，后10列为具体转速值
const SPEED_COLUMNS = [
  { label: '>1800~6000', type: 'range', low: 1800, high: 6000 },
  { label: '>1200~1800', type: 'range', low: 1200, high: 1800 },
  { label: '>900~1200',  type: 'range', low: 900,  high: 1200 },
  { label: '>600~900',   type: 'range', low: 600,  high: 900  },
  { label: '500',  type: 'exact', value: 500 },
  { label: '375',  type: 'exact', value: 375 },
  { label: '300',  type: 'exact', value: 300 },
  { label: '250',  type: 'exact', value: 250 },
  { label: '200',  type: 'exact', value: 200 },
  { label: '150',  type: 'exact', value: 150 },
  { label: '100',  type: 'exact', value: 100 },
  { label: '75',   type: 'exact', value: 75  },
  { label: '60',   type: 'exact', value: 60  },
  { label: '45',   type: 'exact', value: 45  },
]

// 功率行定义（28行）
// 最后一行为范围行 315~1250
const POWER_ROWS = [
  0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11,
  15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110,
  132, 160, 185, 200, 220, 250, 280, 315
]

// 效率数据表 28行 × 14列（单位：%）
// 行对应 POWER_ROWS，列对应 SPEED_COLUMNS
const EFFICIENCY_TABLE = [
  // 0.55 kW
  [84.1, 86.3, 84.5, 81.9, 81.0, 80.1, 78.8, 75.9, 72.8, 69.3, 65.6, 62.0, 58.7, 54.6],
  // 0.75 kW
  [85.9, 87.8, 86.0, 83.2, 82.4, 81.5, 80.2, 77.5, 74.4, 71.4, 67.9, 64.3, 61.1, 56.9],
  // 1.1 kW — 注：45 r/min 列原表显示 69.9，疑为印刷错误，按趋势修正为 59.9
  [87.4, 89.2, 87.5, 85.1, 84.2, 83.3, 82.0, 79.3, 76.3, 73.5, 70.3, 66.6, 63.5, 59.9],
  // 1.5 kW
  [88.6, 90.1, 88.6, 86.5, 85.7, 84.8, 83.5, 80.8, 78.0, 75.5, 72.6, 68.9, 65.9, 62.4],
  // 2.2 kW
  [89.9, 91.1, 89.9, 88.1, 87.3, 86.2, 85.0, 82.6, 80.0, 77.6, 74.9, 71.2, 68.6, 65.0],
  // 3 kW
  [90.8, 91.8, 90.8, 89.2, 88.4, 87.2, 86.2, 84.0, 81.2, 78.9, 76.4, 72.8, 70.1, 66.7],
  // 4 kW
  [91.5, 92.6, 91.6, 90.2, 89.3, 88.2, 87.4, 85.4, 82.6, 80.4, 78.2, 74.9, 72.1, 69.0],
  // 5.5 kW
  [92.4, 93.2, 92.4, 91.1, 90.3, 89.6, 88.8, 87.0, 84.8, 82.8, 81.0, 77.8, 75.0, 71.9],
  // 7.5 kW
  [93.1, 93.8, 93.0, 91.9, 91.2, 90.3, 89.6, 87.9, 85.9, 84.2, 82.6, 79.5, 76.8, 73.7],
  // 11 kW
  [93.8, 94.4, 93.8, 92.8, 92.1, 91.4, 90.7, 89.1, 87.3, 85.9, 84.5, 81.6, 79.3, 76.2],
  // 15 kW
  [94.3, 94.9, 94.4, 93.4, 92.7, 92.1, 91.8, 90.3, 88.6, 87.4, 86.2, 83.5, 81.5, 79.0],
  // 18.5 kW
  [94.7, 95.1, 94.7, 93.8, 93.2, 92.7, 92.1, 91.0, 89.3, 88.3, 87.2, 84.8, 83.0, 80.7],
  // 22 kW
  [94.9, 95.3, 95.0, 94.1, 93.5, 93.0, 92.6, 91.6, 90.1, 89.2, 88.3, 86.1, 84.5, 82.1],
  // 30 kW
  [95.3, 95.8, 95.4, 94.5, 94.0, 93.4, 93.0, 92.0, 90.8, 90.0, 89.3, 87.3, 86.0, 83.7],
  // 37 kW
  [95.7, 96.0, 95.7, 94.8, 94.3, 93.7, 93.4, 92.4, 91.5, 90.9, 90.3, 88.3, 87.2, 85.0],
  // 45 kW
  [95.9, 96.2, 95.9, 95.1, 94.5, 94.0, 93.6, 92.8, 91.9, 91.4, 90.8, 88.9, 87.8, 85.9],
  // 55 kW
  [96.1, 96.4, 96.1, 95.3, 94.7, 94.2, 93.8, 93.3, 92.5, 91.8, 91.2, 89.7, 88.7, 87.1],
  // 75 kW
  [96.4, 96.6, 96.4, 95.7, 95.2, 94.5, 94.2, 93.6, 92.6, 92.1, 91.6, 90.5, 89.5, 88.1],
  // 90 kW
  [96.5, 96.8, 96.6, 95.8, 95.5, 95.0, 94.6, 94.0, 93.2, 92.5, 91.9, 91.1, 90.1, 88.8],
  // 110 kW
  [96.4, 96.6, 96.4, 95.7, 95.3, 94.8, 94.4, 93.8, 92.9, 92.2, 91.8, 91.0, 90.1, 88.8],
  // 132 kW
  [96.5, 96.7, 96.6, 95.9, 95.5, 95.2, 94.8, 94.2, 93.2, 92.6, 92.1, 91.4, 90.6, 89.6],
  // 160 kW
  [96.6, 96.9, 96.7, 96.1, 95.7, 95.4, 95.2, 94.4, 93.5, 93.0, 92.5, 91.9, 91.3, 90.6],
  // 185 kW
  [96.9, 97.1, 96.8, 96.3, 95.9, 95.7, 95.4, 94.7, 93.9, 93.5, 92.9, 92.2, 91.8, 91.2],
  // 200 kW
  [96.9, 97.1, 96.8, 96.3, 96.0, 95.8, 95.5, 94.8, 94.2, 93.7, 93.1, 92.5, 92.0, 91.5],
  // 220 kW
  [96.9, 97.1, 96.8, 96.3, 96.0, 95.9, 95.7, 95.0, 94.4, 93.9, 93.3, 92.7, 92.2, 91.6],
  // 250 kW
  [96.9, 97.1, 96.8, 96.3, 96.2, 95.9, 95.8, 95.3, 94.7, 94.2, 93.6, 93.0, 92.5, 92.0],
  // 280 kW
  [96.9, 97.1, 96.8, 96.3, 96.2, 96.0, 95.9, 95.4, 94.9, 94.4, 93.8, 93.3, 93.0, 92.5],
  // 315~1250 kW
  [96.9, 97.1, 96.8, 96.3, 96.2, 96.0, 95.9, 95.5, 95.0, 94.6, 94.1, 93.6, 93.2, 92.7],
]


  const METADATA = Object.freeze({
    repository: 'https://github.com/ka33u/motor-efficiency-',
    commit: '9799465e8aab001662d85d0b280802220057ab2e',
    sourceFiles: Object.freeze(['utils/data.js', 'utils/interpolation.js']),
    sourceStandardClaim: 'GB/T 30253-2024',
    sourceScopeClaim: '变频控制同步电机 · 一级能效',
    officialVerified: false,
    notice: '查询数据来自用户指定开源项目，并非已独立核验的官方标准表。标准号与适用范围为源项目声明。',
    rows: 28,
    columns: 14,
    efficiencyUnit: '%',
    speedUnit: 'r/min',
    powerUnit: 'kW',
    limits: Object.freeze({ speedMinExclusive: 0, speedMax: 6000, powerMin: 0.55, powerMax: 1250, tableSpeedMin: 45 }),
    sourceAdjustment: Object.freeze({
      power: 1.1,
      speed: 45,
      rowIndex: 2,
      columnIndex: 13,
      authorReportedOriginal: 69.9,
      adoptedValue: 59.9,
      note: '源作者注释称 1.1 kW / 45 r/min 原表为 69.9，疑为印刷错误而按趋势改为 59.9；本模块保留该人为修改，未确认原表或印刷错误。'
    }),
    matchingTolerance: 0.001,
    rounding: 'Math.round(efficiency * 10) / 10',
    extrapolationNotice: '低于 45 r/min 时，沿用源项目以 45 与 60 r/min 数据线性外推；结果不是表内查询值。'
  });
  SPEED_COLUMNS.forEach(Object.freeze);
  EFFICIENCY_TABLE.forEach(Object.freeze);
  return Object.freeze({
    SPEED_COLUMNS: Object.freeze(SPEED_COLUMNS),
    POWER_ROWS: Object.freeze(POWER_ROWS),
    EFFICIENCY_TABLE: Object.freeze(EFFICIENCY_TABLE),
    METADATA: METADATA
  });
});
