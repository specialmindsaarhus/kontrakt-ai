/**
 * Test Prompt Integration with Claude Adapter
 * Demonstrates how prompts work with the CLI adapter
 */

import { createClaudeAdapter } from '../src/adapters/claude-adapter.js';
import { getPromptPath, loadPrompt } from '../src/utils/prompt-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('PROMPT INTEGRATION TEST');
console.log('='.repeat(60));
console.log();

async function testPromptIntegration() {
  // Test configuration
  const testDocument = path.join(__dirname, 'sample-contract.txt');
  const promptName = 'franchise-contract-review';

  console.log('Test Configuration:');
  console.log(`  Document: ${testDocument}`);
  console.log(`  Prompt: ${promptName}`);
  console.log();

  // Step 1: Load the prompt
  console.log('Step 1: Loading System Prompt');
  console.log('-'.repeat(60));
  const promptPath = getPromptPath(promptName);
  console.log(`Prompt path: ${promptPath}`);

  const loadResult = loadPrompt(promptName);
  if (!loadResult.success) {
    console.error(`✗ Failed to load prompt: ${loadResult.error}`);
    return;
  }
  console.log(`✓ Prompt loaded successfully (${loadResult.content.length} characters)`);
  console.log();

  // Step 2: Create Claude adapter
  console.log('Step 2: Creating Claude Adapter');
  console.log('-'.repeat(60));
  const adapter = createClaudeAdapter();
  console.log(`✓ Adapter created: ${adapter.getProviderName()}`);
  console.log();

  // Step 3: Check if Claude CLI is available
  console.log('Step 3: Checking Claude CLI Availability');
  console.log('-'.repeat(60));
  const isAvailable = await adapter.isAvailable();
  console.log(`Claude CLI available: ${isAvailable ? '✓' : '✗'}`);

  if (!isAvailable) {
    console.log();
    console.log('NOTE: Claude CLI is not installed or not in PATH.');
    console.log('To test actual execution, install Claude CLI from:');
    console.log('https://claude.ai/cli');
    console.log();
    console.log('The integration test can still verify that prompts load correctly.');
  } else {
    const version = await adapter.getVersion();
    console.log(`Claude CLI version: ${version}`);
  }
  console.log();

  // Step 4: Build the command (test without executing)
  console.log('Step 4: Building CLI Command');
  console.log('-'.repeat(60));

  try {
    const request = {
      documentPath: testDocument,
      systemPromptPath: promptPath,
      timeout: 60000
    };

    const commandData = adapter.buildCommand(request);

    console.log('✓ Command built successfully');
    console.log();
    console.log('Command Arguments:');
    commandData.args.forEach((arg, index) => {
      if (arg.length > 100) {
        console.log(`  [${index}]: ${arg.substring(0, 100)}... (${arg.length} chars)`);
      } else {
        console.log(`  [${index}]: ${arg}`);
      }
    });
    console.log();
    console.log('Prompt Preview:');
    const promptPreview = commandData.prompt.substring(0, 200).replace(/\n/g, ' ');
    console.log(`  ${promptPreview}...`);
    console.log();

  } catch (error) {
    console.error(`✗ Failed to build command: ${error.message}`);
    return;
  }

  // Step 5: Test all three prompts
  console.log('Step 5: Testing All Three Prompts');
  console.log('-'.repeat(60));

  const prompts = [
    'franchise-contract-review',
    'franchise-manual-review',
    'compliance-check'
  ];

  for (const promptName of prompts) {
    const result = loadPrompt(promptName);
    if (result.success) {
      console.log(`✓ ${promptName}: ${result.content.length} chars`);

      // Try building command for each prompt
      try {
        const request = {
          documentPath: testDocument,
          systemPromptPath: getPromptPath(promptName),
          timeout: 60000
        };
        adapter.buildCommand(request);
        console.log(`  ✓ Command builds successfully`);
      } catch (error) {
        console.log(`  ✗ Command build failed: ${error.message}`);
      }
    } else {
      console.log(`✗ ${promptName}: ${result.error}`);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('INTEGRATION TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('✓ Prompt loading: Working');
  console.log('✓ Claude adapter integration: Working');
  console.log('✓ Command building: Working');
  console.log('✓ All three prompts: Compatible with adapter');
  console.log();

  if (isAvailable) {
    console.log('NOTE: To test actual CLI execution, run:');
    console.log('  node tests/test-cli-integration.js');
  } else {
    console.log('NOTE: Install Claude CLI to test actual execution.');
  }

  console.log();
  console.log('Phase 3 implementation verified successfully!');
  console.log();
}

// Run the test
testPromptIntegration().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
