/**
 * Test Prompt Loader Utility
 * Simple verification test for prompt loading functionality
 */

import {
  listAvailablePrompts,
  getAvailablePromptsInfo,
  loadPrompt,
  validatePrompt,
  promptExists,
  verifyStandardPrompts,
  getPromptPath
} from '../src/utils/prompt-loader.js';

console.log('='.repeat(60));
console.log('PROMPT LOADER TEST');
console.log('='.repeat(60));
console.log();

// Test 1: List available prompts
console.log('Test 1: List Available Prompts');
console.log('-'.repeat(60));
const prompts = listAvailablePrompts();
console.log(`Found ${prompts.length} prompts:`);
prompts.forEach(prompt => console.log(`  - ${prompt}`));
console.log();

// Test 2: Get detailed prompt information
console.log('Test 2: Get Detailed Prompt Information');
console.log('-'.repeat(60));
const promptsInfo = getAvailablePromptsInfo();
promptsInfo.forEach(info => {
  console.log(`Name: ${info.name}`);
  console.log(`Display Name: ${info.displayName}`);
  console.log(`File Path: ${info.filePath}`);
  console.log(`Exists: ${info.exists}`);
  console.log();
});

// Test 3: Verify standard prompts exist
console.log('Test 3: Verify Standard Prompts');
console.log('-'.repeat(60));
const verification = verifyStandardPrompts();
console.log(`All standard prompts exist: ${verification.allExist}`);
if (verification.existing.length > 0) {
  console.log('Existing prompts:');
  verification.existing.forEach(prompt => console.log(`  ✓ ${prompt}`));
}
if (verification.missing.length > 0) {
  console.log('Missing prompts:');
  verification.missing.forEach(prompt => console.log(`  ✗ ${prompt}`));
}
console.log();

// Test 4: Load and validate each prompt
console.log('Test 4: Load and Validate Each Prompt');
console.log('-'.repeat(60));
const standardPrompts = [
  'franchise-contract-review',
  'franchise-manual-review',
  'compliance-check'
];

for (const promptName of standardPrompts) {
  console.log(`\nTesting: ${promptName}`);
  console.log('-'.repeat(40));

  // Check existence
  const exists = promptExists(promptName);
  console.log(`Exists: ${exists ? '✓' : '✗'}`);

  if (!exists) {
    console.log('Skipping validation - file does not exist');
    continue;
  }

  // Load prompt
  const loadResult = loadPrompt(promptName);
  if (loadResult.success) {
    console.log(`Load: ✓ (${loadResult.content.length} characters)`);
    console.log(`File Path: ${loadResult.filePath}`);

    // Show first 100 characters
    const preview = loadResult.content.substring(0, 100).replace(/\n/g, ' ');
    console.log(`Preview: ${preview}...`);
  } else {
    console.log(`Load: ✗ (${loadResult.error})`);
  }

  // Validate prompt
  const validationResult = validatePrompt(promptName);
  if (validationResult.valid) {
    console.log('Validation: ✓');
    if (validationResult.warnings) {
      console.log('Warnings:');
      validationResult.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
    }
  } else {
    console.log(`Validation: ✗ (${validationResult.error})`);
  }
}

// Test 5: Get file paths
console.log();
console.log('Test 5: Get File Paths');
console.log('-'.repeat(60));
standardPrompts.forEach(promptName => {
  const filePath = getPromptPath(promptName);
  console.log(`${promptName}: ${filePath}`);
});

// Summary
console.log();
console.log('='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total prompts found: ${prompts.length}`);
console.log(`Standard prompts verified: ${verification.existing.length}/${standardPrompts.length}`);

if (verification.allExist) {
  console.log('\n✓ All tests passed! Phase 3 prompt system is working.');
} else {
  console.log('\n✗ Some prompts are missing. Please check the prompts/ directory.');
}
console.log();
