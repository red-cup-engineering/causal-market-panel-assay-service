import assert from "node:assert/strict";
import test from "node:test";
import { assayCausalPanel } from "@red-cup-engineering/causal-market-panel-assay-service";

const day = dayNumber => `2026-01-0${dayNumber}T00:00:00Z`;
const observation = (dayNumber, value) => ({ at: day(dayNumber), value });
const seriesByEntity = {
  b: [observation(3, 6), observation(1, 2), observation(2, 4)],
  a: [observation(2, "2"), observation(4, 4), observation(1, 1), observation(3, 3)],
};

test("sorts entities and aligns only shared observation times", () => {
  const report = assayCausalPanel({ seriesByEntity, asOf: day(4) });
  assert.deepEqual(report.entities, ["a", "b"]);
  assert.deepEqual(report.panel.map(({ values }) => [values.a.value, values.b.value]), [[1, 2], [2, 4], [3, 6]]);
  assert.equal(report.panel[2].at, "2026-01-03T00:00:00.000Z");
  assert.equal(report.leakageDetected, false);
});

test("refuses future or duplicate observations even outside the shared times", () => {
  assert.throws(() => assayCausalPanel({ seriesByEntity, asOf: day(3) }), /future-observation-refused/u);
  const duplicate = { ...seriesByEntity, b: [...seriesByEntity.b, observation(3, 0)] };
  assert.throws(() => assayCausalPanel({ seriesByEntity: duplicate, asOf: day(4) }), /causal-coordinate-invalid/u);
});

test("refuses missing values and invalid minimum sizes", () => {
  const missing = { ...seriesByEntity, b: [...seriesByEntity.b, observation(4, null)] };
  assert.throws(() => assayCausalPanel({ seriesByEntity: missing, asOf: day(4) }), /observation-value-invalid/u);
  assert.throws(() => assayCausalPanel({ seriesByEntity: {}, asOf: day(4), minimumEntities: 0 }), /causal-panel-input-invalid/u);
  assert.throws(() => assayCausalPanel({ seriesByEntity, asOf: day(4), minimumObservations: NaN }), /causal-panel-input-invalid/u);
  assert.throws(() => assayCausalPanel({ seriesByEntity, asOf: day(4), minimumObservations: 4 }), /observations-insufficient/u);
});
