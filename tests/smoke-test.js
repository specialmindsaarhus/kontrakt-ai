#!/usr/bin/env node

/**
 * Quick Smoke Test
 * Run this after making code changes to catch basic errors
 */

import { runAnalysis } from '../src/services/analysis-runner.js';
import { existsSync } from 'fs';
import path from 'path';

console.log('🔥 Running smoke test...\n');

// Mock progress callback
const progressCallback = (progress) => {
  console.log(`Progress: ${progress.percent}% - Stage ${progress.stage} - ${progress.message}`);
};

// Test with sample file
const testFile = path.join(process.cwd(), 'tests', 'sample-contract.txt');

if (!existsSync(testFile)) {
  console.error('❌ Test file not found:', testFile);
  process.exit(1);
}

console.log('Testing with:', testFile);
console.log('Provider: Gemini (or first available)\n');

try {
  const result = await runAnalysis({
    provider: 'gemini',
    documentPath: testFile,
    promptName: 'franchise-contract-review',
    clientName: 'Smoke Test Client',
    outputFormats: ['md'],
    timeout: 180000
  }, progressCallback);

  if (result.success) {
    console.log('\n✅ SMOKE TEST PASSED');
    console.log('Execution time:', result.executionTime, 'ms');
    console.log('Reports generated:', result.reports?.length || 0);
    process.exit(0);
  } else {
    console.error('\n❌ SMOKE TEST FAILED');
    console.error('Error:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ SMOKE TEST FAILED WITH EXCEPTION');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
