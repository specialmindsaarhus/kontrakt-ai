import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execPromise = promisify(exec);

/**
 * CLI provider definitions
 * NOTE: Users can now manually select their preferred provider via ProviderSelector UI
 * First available provider is auto-selected on initial load
 */
const CLI_PROVIDERS = {
  gemini: {
    name: 'gemini',
    displayName: 'Gemini CLI',
    command: 'gemini',
    versionFlag: '--version',
    installUrl: 'https://ai.google.dev/gemini-api/docs/cli'
  },
  claude: {
    name: 'claude',
    displayName: 'Claude CLI',
    command: 'claude',
    versionFlag: '--version',
    installUrl: 'https://claude.ai/cli'
  },
  openai: {
    name: 'openai',
    displayName: 'OpenAI CLI',
    command: 'openai',
    versionFlag: '--version',
    installUrl: 'https://platform.openai.com/docs/api-reference/cli'
  }
};

/**
 * Check if a command exists on the system
 * @param {string} command - The command to check
 * @returns {Promise<boolean>} True if command exists, false otherwise
 */
async function commandExists(command) {
  const checkCommand = platform() === 'win32' ? 'where' : 'which';

  try {
    await execPromise(`${checkCommand} ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the version of a CLI command
 * @param {string} command - The command to check
 * @param {string} versionFlag - The flag to get version (default: --version)
 * @returns {Promise<string|null>} Version string or null if not available
 */
async function getCommandVersion(command, versionFlag = '--version') {
  try {
    const { stdout, stderr } = await execPromise(`${command} ${versionFlag}`);
    const output = (stdout || stderr).trim();

    // Try to extract version number (e.g., "1.2.3" or "v1.2.3")
    const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // If no version number found, return the first line
    return output.split('\n')[0];
  } catch {
    return null;
  }
}

/**
 * Check if a specific CLI provider is available
 * @param {string} providerName - The provider name ('claude', 'gemini', 'openai')
 * @returns {Promise<boolean>} True if available, false otherwise
 */
export async function isCLIAvailable(providerName) {
  const provider = CLI_PROVIDERS[providerName];
  if (!provider) {
    return false;
  }

  return await commandExists(provider.command);
}

/**
 * Get the version of an installed CLI
 * @param {string} providerName - The provider name
 * @returns {Promise<string|null>} Version string or null if not available
 */
export async function getCLIVersion(providerName) {
  const provider = CLI_PROVIDERS[providerName];
  if (!provider) {
    return null;
  }

  const isAvailable = await commandExists(provider.command);
  if (!isAvailable) {
    return null;
  }

  return await getCommandVersion(provider.command, provider.versionFlag);
}

/**
 * Detect all available CLI providers on the system
 * @returns {Promise<CLIProvider[]>} Array of CLI provider information
 */
export async function detectAvailableCLIs() {
  const providers = Object.values(CLI_PROVIDERS);

  const results = await Promise.all(
    providers.map(async (provider) => {
      const available = await commandExists(provider.command);
      const version = available ? await getCommandVersion(provider.command, provider.versionFlag) : null;

      return {
        name: provider.name,
        displayName: provider.displayName,
        available,
        version,
        installUrl: provider.installUrl
      };
    })
  );

  return results;
}

/**
 * Get information about a specific CLI provider
 * @param {string} providerName - The provider name
 * @returns {Promise<CLIProvider|null>} Provider information or null if not found
 */
export async function getCLIProvider(providerName) {
  const provider = CLI_PROVIDERS[providerName];
  if (!provider) {
    return null;
  }

  const available = await commandExists(provider.command);
  const version = available ? await getCommandVersion(provider.command, provider.versionFlag) : null;

  return {
    name: provider.name,
    displayName: provider.displayName,
    available,
    version,
    installUrl: provider.installUrl
  };
}

/**
 * Get list of available (installed) CLI providers
 * @returns {Promise<CLIProvider[]>} Array of available CLI providers
 */
export async function getAvailableCLIs() {
  const allProviders = await detectAvailableCLIs();
  return allProviders.filter(provider => provider.available);
}

/**
 * Get list of unavailable (not installed) CLI providers
 * @returns {Promise<CLIProvider[]>} Array of unavailable CLI providers
 */
export async function getUnavailableCLIs() {
  const allProviders = await detectAvailableCLIs();
  return allProviders.filter(provider => !provider.available);
}
