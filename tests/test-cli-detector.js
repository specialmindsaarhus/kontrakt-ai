/**
 * Quick test for CLI detector
 * Run with: node tests/test-cli-detector.js
 */

import { detectAvailableCLIs, isCLIAvailable, getCLIVersion } from '../src/utils/cli-detector.js';

async function testDetector() {
  console.log('Testing CLI Detector...\n');

  // Test detectAvailableCLIs
  const providers = await detectAvailableCLIs();
  console.log('Available CLI providers:');
  providers.forEach(provider => {
    const status = provider.available ? '✓' : '✗';
    const version = provider.version ? `(v${provider.version})` : '';
    console.log(`  ${status} ${provider.displayName} ${version}`);
    if (!provider.available) {
      console.log(`     Install from: ${provider.installUrl}`);
    }
  });

  console.log();

  // Test individual functions
  const isClaudeAvailable = await isCLIAvailable('claude');
  console.log(`isCLIAvailable('claude'): ${isClaudeAvailable}`);

  if (isClaudeAvailable) {
    const version = await getCLIVersion('claude');
    console.log(`getCLIVersion('claude'): ${version}`);
  }

  console.log('\n✅ CLI Detector test complete');
}

testDetector().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
