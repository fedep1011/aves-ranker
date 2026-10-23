#!/usr/bin/env node
/**
 * Rankea2 Opaque-Box E2E Master Test Suite
 * Executes Tiers 1-4 across all 10 project features and arenas.
 * Zero external browser dependencies — runs natively in Node.js ESM.
 */
import { harness } from './harness.mjs';
import { runTier1 } from './tier1_feature_coverage.mjs';
import { runTier2 } from './tier2_boundary_corner.mjs';
import { runTier3 } from './tier3_cross_feature.mjs';
import { runTier4 } from './tier4_real_world.mjs';

async function main() {
  console.log('\n🚀 Initializing Rankea2 E2E Master Test Suite...\n');

  try {
    // 1. Register test definitions across all 4 tiers
    await runTier1();
    await runTier2();
    await runTier3();
    await runTier4();

    // 2. Execute all registered tests sequentially
    console.log(`📋 Executing ${harness.queuedTests.length} tests sequentially across 4 tiers...\n`);
    await harness.executeAll();
  } catch (err) {
    console.error('Fatal runner error:', err);
    process.exitCode = 1;
    return;
  }

  // 3. Print structured tier-by-tier metrics and summary
  harness.printReport();

  if (harness.totalFailed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main();
