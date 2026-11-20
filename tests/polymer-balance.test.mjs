import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {polymerBalanceScenario} from '../src/polymer-report.mjs';

const report = JSON.parse(readFileSync(new URL('../public/materials/polimery-2026/digital.json', import.meta.url), 'utf8'));
const dataset = report.material.datasets.find(item => item.id === 'polymer-russia-balance');

test('polyethylene scenario moves from surplus through equilibrium to deficit', () => {
  const polyethylene = dataset.rows.find(row => row.name === 'Полиэтилен');
  const result = polymerBalanceScenario(polyethylene, 10);
  assert.equal(result.consumption.toFixed(2), '3.19');
  assert.equal(result.balance, 0.26);
  assert.equal(polymerBalanceScenario(polyethylene, result.equilibrium).balance, 0);
  assert.equal(polymerBalanceScenario(polyethylene, 20).balance, -0.03);
});

test('scenario uses published volumes and preserves the published balance separately', () => {
  const polystyrene = dataset.rows.find(row => row.name === 'Полистирол');
  assert.equal(polymerBalanceScenario(polystyrene, 0).balance, -0.09);
  assert.equal(polystyrene.balance, -0.06);
});
