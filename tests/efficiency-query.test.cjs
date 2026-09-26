'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../efficiency-query.js');
const data = require('../efficiency-data.js');
const original = require('./fixtures/efficiency-source.reference.cjs').queryEfficiency;

// Fingerprint of the unmodified source arrays at commit
// 9799465e8aab001662d85d0b280802220057ab2e, measured from utils/data.js.
const ORIGINAL_DATA_SHA256 = 'd040bb04d469d97a8b827c3f38aa3d648fc8153d8c16499394c705d6526c4018';
const SOURCE_FIELDS = ['efficiency', 'interpolated', 'speedLabel', 'powerLabel'];

function compareSource(speed, power) {
  const expected = original(speed, power);
  const actual = api.query(speed, power);
  const message = `speed=${speed}, power=${power}`;
  if (expected.error) assert.deepEqual(actual, expected, message);
  else {
    assert.deepEqual(Object.fromEntries(SOURCE_FIELDS.map(key => [key, actual[key]])), expected, message);
    assert.equal(actual.method, speed < 45 ? 'extrapolation' : expected.interpolated ? 'interpolation' : 'table', message);
    assert.equal(typeof actual.sourceAdjusted, 'boolean', message);
  }
  return actual;
}

test('all 392 source table cells, axes, and the author adjustment are unchanged', () => {
  assert.equal(data.POWER_ROWS.length, 28);
  assert.equal(data.SPEED_COLUMNS.length, 14);
  assert.equal(data.EFFICIENCY_TABLE.length, 28);
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify([data.SPEED_COLUMNS, data.POWER_ROWS, data.EFFICIENCY_TABLE])).digest('hex');
  assert.equal(digest, ORIGINAL_DATA_SHA256);
  let count = 0;
  data.POWER_ROWS.forEach((power, row) => {
    assert.equal(data.EFFICIENCY_TABLE[row].length, 14);
    data.SPEED_COLUMNS.forEach((column, col) => {
      const speed = column.type === 'range' ? column.high : column.value;
      const result = compareSource(speed, power);
      assert.equal(result.efficiency, data.EFFICIENCY_TABLE[row][col]);
      assert.equal(result.method, 'table');
      assert.equal(result.sourceAdjusted, row === 2 && col === 13);
      count++;
    });
  });
  assert.equal(count, 392);
  assert.equal(api.metadata.officialVerified, false);
  assert.equal(api.metadata.sourceAdjustment.adoptedValue, 59.9);
  assert.equal(api.metadata.commit, '9799465e8aab001662d85d0b280802220057ab2e');
});

test('single interpolation, bilinear interpolation, and source floating-point rounding', () => {
  const cases = [
    [450, 11, 91.8],   // speed only
    [1500, 13, 94.7],  // power only
    [450, 13, 92.1],   // speed and power
    [52.5, 0.925, 60.4],
    [75, 297.5, 93.4]  // Keep the original JS operation order: not 93.5.
  ];
  for (const [speed, power, efficiency] of cases) {
    const result = compareSource(speed, power);
    assert.equal(result.efficiency, efficiency);
    assert.equal(result.interpolated, true);
    assert.equal(result.method, 'interpolation');
  }
});

test('source boundary branch order and strict 0.001 matching tolerance stay intact', () => {
  assert.equal(compareSource(600, 11).method, 'interpolation');
  assert.equal(compareSource(600, 11).efficiency, 92.8);
  assert.equal(compareSource(600.0001, 11).method, 'table');
  assert.equal(compareSource(500.0005, 11).method, 'interpolation');
  assert.equal(compareSource(499.9995, 11).method, 'table');
  assert.equal(compareSource(75, 280.0005).method, 'interpolation');
  assert.equal(compareSource(75, 279.9995).method, 'table');
  assert.equal(compareSource(45, 314.9995).method, 'interpolation');
  assert.equal(compareSource(45, 315).method, 'table');
  assert.equal(compareSource(6000, 1250).efficiency, 96.9);
  assert.equal(compareSource(45, 0.55).efficiency, 54.6);
  const offsets = [-0.0011, -0.001, -0.0009, 0, 0.0009, 0.001, 0.0011];
  const speedAnchors = [0, 45, 60, 75, 100, 150, 200, 250, 300, 375, 500, 600, 900, 1200, 1800, 6000];
  // Exercise both sides of every source matching/range boundary together.
  for (const speed of speedAnchors.flatMap(value => offsets.map(offset => value + offset))) {
    for (const power of data.POWER_ROWS.flatMap(value => offsets.map(offset => value + offset))) {
      compareSource(speed, power);
    }
  }
});

test('below-45 source extrapolation remains available and is explicitly classified', () => {
  for (const [speed, power, expected] of [[30, 11, 73.1], [30, 1.3, 57.6], [0.000001, 0.55, 42.3]]) {
    const result = compareSource(speed, power);
    assert.equal(result.efficiency, expected);
    assert.equal(result.interpolated, true);
    assert.equal(result.method, 'extrapolation');
  }
  assert.equal(compareSource(Number.MIN_VALUE, 0.55).method, 'extrapolation');
  // The source checks <45 before its approximate exact-match loop.
  assert.equal(compareSource(44.9995, 1.1).method, 'extrapolation');
  assert.equal(compareSource(45.0005, 1.1).method, 'table');
});

test('sourceAdjusted follows the cell dependency across exact, interpolated, and extrapolated queries', () => {
  for (const [speed, power] of [[45, 1.1], [45.0005, 1.1005], [52.5, 1.1], [45, 0.925], [52.5, 0.925], [52.5, 1.3], [30, 1.1], [30, 1.3]]) {
    assert.equal(compareSource(speed, power).sourceAdjusted, true, `${speed}, ${power}`);
  }
  for (const [speed, power] of [[60, 1.1], [59.9995, 1.1], [45, 0.75], [45, 1.5], [30, 11], [500, 1.1], [1500, 1.1]]) {
    assert.equal(compareSource(speed, power).sourceAdjusted, false, `${speed}, ${power}`);
  }
});

test('invalid finite ranges retain source errors; nonfinite and nonnumeric inputs are rejected', () => {
  for (const [speed, power] of [[0, 11], [-1, 11], [6000.1, 11], [500, 0.54999], [500, 1250.1]]) {
    assert.ok(compareSource(speed, power).error);
  }
  for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '', '500', {}, [], 500n]) {
    assert.equal(typeof api.query(invalid, 11).error, 'string');
    assert.equal(typeof api.query(500, invalid).error, 'string');
  }
});

test('4096 seeded source differential samples cover both table ranges and low-speed intervals', () => {
  let state = 0x9799465e;
  function random() { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; }
  for (let i = 0; i < 4096; i++) {
    const speed = i % 2 ? 0.0001 + random() * 5999.9999 : 0.0001 + random() * 600;
    const power = i % 3 ? 0.55 + random() * 314.45 : 0.55 + random() * 1249.45;
    compareSource(speed, power);
  }
});

test('classic browser scripts expose the same dependency-free API as native require', () => {
  const browser = {};
  browser.window = browser;
  vm.createContext(browser);
  for (const file of ['efficiency-data.js', 'efficiency-query.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), browser, { filename: file });
  }
  const actual = JSON.parse(JSON.stringify(browser.window.MotorEfficiency.query(52.5, 1.3)));
  assert.deepEqual(actual, api.query(52.5, 1.3));
  assert.equal(browser.window.MotorEfficiency.metadata.officialVerified, false);
  assert.equal(Object.isFrozen(data.EFFICIENCY_TABLE[2]), true);
  assert.equal(Object.isFrozen(api), true);
});
