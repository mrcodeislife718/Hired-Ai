import test from "node:test";
import assert from "node:assert/strict";
import { ReliabilityEfficiencyLedger, executeReliably, shouldReuseStableCareerState } from "../src/reliability-efficiency.js";

test("falls back safely after bounded retries", async () => {
  const ledger = new ReliabilityEfficiencyLedger();
  let attempts = 0;
  const value = await executeReliably({
    operation: "career-recommendation",
    retries: 1,
    ledger,
    primary: async () => { attempts += 1; throw new Error("provider down"); },
    fallback: async () => ({ source: "deterministic" }),
    verify: (result) => result.source === "deterministic",
  });
  assert.equal(value.source, "deterministic");
  assert.equal(attempts, 2);
  const snapshot = ledger.snapshot();
  assert.equal(snapshot.recoveries, 1);
  assert.equal(snapshot.degraded, 1);
});

test("reuses stable state only while evidence remains unchanged", () => {
  assert.equal(shouldReuseStableCareerState({ ageMs: 1_000, ttlMs: 10_000, evidenceVersionChanged: false }), true);
  assert.equal(shouldReuseStableCareerState({ ageMs: 1_000, ttlMs: 10_000, evidenceVersionChanged: true }), false);
});
