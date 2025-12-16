/**
 * End-to-end test for Claude CLI integration
 * Run with: node tests/test-cli-integration.js
 */

import { runCLI } from '../src/services/cli-runner.js';
import { detectAvailableCLIs } from '../src/utils/cli-detector.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCLIIntegration() {
  console.log('🧪 Testing Claude CLI Integration...\n');

  // Step 1: Detect available CLIs
  console.log('Step 1: Detecting available CLIs...');
  const providers = await detectAvailableCLIs();

  console.log('Available CLI providers:');
  providers.forEach(provider => {
    const status = provider.available ? '✓' : '✗';
    const version = provider.version ? `(v${provider.version})` : '';
    console.log(`  ${status} ${provider.displayName} ${version}`);
  });
  console.log();

  // Check if Claude CLI is available
  const claudeProvider = providers.find(p => p.name === 'claude');
  if (!claudeProvider || !claudeProvider.available) {
    console.error('❌ Claude CLI is not available. Please install it first.');
    console.error(`   Install from: ${claudeProvider?.installUrl}`);
    process.exit(1);
  }

  // Step 2: Prepare test request
  console.log('Step 2: Preparing test request...');
  const request = {
    provider: 'claude',
    documentPath: path.join(__dirname, 'test-document.txt'),
    systemPromptPath: path.join(__dirname, 'test-prompt.md'),
    timeout: 60000 // 1 minute for test
  };

  console.log(`  Document: ${request.documentPath}`);
  console.log(`  Prompt: ${request.systemPromptPath}`);
  console.log();

  // Step 3: Execute CLI
  console.log('Step 3: Executing Claude CLI...');
  console.log('  (This may take 30-60 seconds)');

  const startTime = Date.now();
  const result = await runCLI(request);
  const duration = Date.now() - startTime;

  console.log();
  console.log('Step 4: Results');
  console.log('─'.repeat(60));

  if (result.success) {
    console.log('✓ Success!');
    console.log(`  Provider: ${result.provider}`);
    console.log(`  Execution time: ${duration}ms`);
    console.log(`  CLI version: ${result.cliVersion || 'unknown'}`);
    console.log();
    console.log('Output:');
    console.log('─'.repeat(60));
    console.log(result.output);
    console.log('─'.repeat(60));
    console.log();
    console.log('✅ Claude CLI integration test PASSED');
  } else {
    console.error('✗ Failed');
    console.error(`  Error: ${result.error}`);
    console.error(`  Error code: ${result.errorCode}`);
    console.error(`  Execution time: ${duration}ms`);
    if (result.rawStderr) {
      console.error();
      console.error('Stderr output:');
      console.error(result.rawStderr);
    }
    console.log();
    console.log('❌ Claude CLI integration test FAILED');
    process.exit(1);
  }
}

// Run test
testCLIIntegration().catch(error => {
  console.error('❌ Test failed with exception:');
  console.error(error);
  process.exit(1);
});
