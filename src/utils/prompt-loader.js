import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Prompt Loader Utility
 * Handles loading and validation of system prompts from the prompts/ directory
 */

/**
 * Get the absolute path to the prompts directory
 * @returns {string} Absolute path to prompts directory
 */
export function getPromptsDirectory() {
  // Convert import.meta.url to file path (works cross-platform)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Navigate from src/utils/ to project root, then to prompts/
  const projectRoot = path.resolve(__dirname, '..', '..');
  return path.join(projectRoot, 'prompts');
}

/**
 * List all available prompt files in the prompts directory
 * @returns {string[]} Array of prompt file names (without .md extension)
 */
export function listAvailablePrompts() {
  const promptsDir = getPromptsDirectory();

  if (!existsSync(promptsDir)) {
    return [];
  }

  try {
    const files = readdirSync(promptsDir);

    // Filter for .md files and remove extension
    const promptFiles = files
      .filter(file => {
        const filePath = path.join(promptsDir, file);
        const isFile = statSync(filePath).isFile();
        const isMdFile = file.endsWith('.md');
        return isFile && isMdFile;
      })
      .map(file => file.replace('.md', ''));

    return promptFiles;
  } catch (error) {
    console.error('Error listing prompts:', error);
    return [];
  }
}

/**
 * Get detailed information about all available prompts
 * @returns {Array<{name: string, displayName: string, filePath: string, exists: boolean}>}
 */
export function getAvailablePromptsInfo() {
  const promptsDir = getPromptsDirectory();
  const promptNames = listAvailablePrompts();

  return promptNames.map(name => {
    const filePath = path.join(promptsDir, `${name}.md`);
    return {
      name,
      displayName: formatPromptDisplayName(name),
      filePath,
      exists: existsSync(filePath)
    };
  });
}

/**
 * Format a prompt name for display
 * Converts kebab-case to Title Case
 * @param {string} name - The prompt name (e.g., "franchise-contract-review")
 * @returns {string} Display name (e.g., "Franchise Contract Review")
 */
function formatPromptDisplayName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get the file path for a specific prompt
 * @param {string} promptName - The prompt name (with or without .md extension)
 * @returns {string} Absolute path to the prompt file
 */
export function getPromptPath(promptName) {
  const promptsDir = getPromptsDirectory();

  // Remove .md extension if present
  const baseName = promptName.endsWith('.md') ? promptName.slice(0, -3) : promptName;

  return path.join(promptsDir, `${baseName}.md`);
}

/**
 * Load a prompt file by name
 * @param {string} promptName - The prompt name (with or without .md extension)
 * @returns {{success: boolean, content?: string, error?: string, filePath?: string}} Load result
 */
export function loadPrompt(promptName) {
  const filePath = getPromptPath(promptName);

  // Check if file exists
  if (!existsSync(filePath)) {
    return {
      success: false,
      error: `Prompt file not found: ${promptName}`,
      filePath
    };
  }

  try {
    const content = readFileSync(filePath, 'utf8');

    // Basic validation - check if content is not empty
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: `Prompt file is empty: ${promptName}`,
        filePath
      };
    }

    return {
      success: true,
      content,
      filePath
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load prompt: ${error.message}`,
      filePath
    };
  }
}

/**
 * Validate a prompt file
 * Checks if the file exists and has valid content
 * @param {string} promptName - The prompt name
 * @returns {{valid: boolean, error?: string, warnings?: string[]}} Validation result
 */
export function validatePrompt(promptName) {
  const loadResult = loadPrompt(promptName);

  if (!loadResult.success) {
    return {
      valid: false,
      error: loadResult.error
    };
  }

  const warnings = [];
  const content = loadResult.content;

  // Check for markdown headers (should have at least one # header)
  if (!content.includes('#')) {
    warnings.push('Prompt file does not contain any markdown headers');
  }

  // Check minimum length (prompts should be substantial)
  if (content.length < 100) {
    warnings.push('Prompt file seems very short (less than 100 characters)');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Check if a specific prompt exists
 * @param {string} promptName - The prompt name
 * @returns {boolean} True if prompt exists, false otherwise
 */
export function promptExists(promptName) {
  const filePath = getPromptPath(promptName);
  return existsSync(filePath);
}

/**
 * Get predefined prompt names (standard prompts that should exist)
 * @returns {string[]} Array of standard prompt names
 */
export function getStandardPromptNames() {
  return [
    'franchise-contract-review',
    'franchise-manual-review',
    'compliance-check'
  ];
}

/**
 * Verify that all standard prompts exist
 * @returns {{allExist: boolean, missing: string[], existing: string[]}} Verification result
 */
export function verifyStandardPrompts() {
  const standardPrompts = getStandardPromptNames();
  const missing = [];
  const existing = [];

  for (const promptName of standardPrompts) {
    if (promptExists(promptName)) {
      existing.push(promptName);
    } else {
      missing.push(promptName);
    }
  }

  return {
    allExist: missing.length === 0,
    missing,
    existing
  };
}
