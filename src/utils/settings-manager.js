import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';

/**
 * Settings Manager
 * Handles persistent user settings for the application
 */

const SETTINGS_DIR = path.join(homedir(), '.contract-reviewer');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  // Last used CLI provider
  lastProvider: 'claude',

  // Last used prompt
  lastPrompt: 'franchise-contract-review',

  // Default branding configuration
  branding: {
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    footerText: 'Fortroligt dokument',
    primaryColor: '#1a73e8'
  },

  // Output preferences
  output: {
    defaultFormat: 'pdf',
    organizeByClient: true,
    organizeByDate: true
  },

  // Application preferences
  preferences: {
    autoOpenReports: false,
    confirmBeforeAnalysis: true,
    saveRawOutput: true
  },

  // Recent clients (for quick selection)
  recentClients: []
};

/**
 * Ensure settings directory exists
 * @private
 */
function ensureSettingsDirectory() {
  if (!existsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true });
  }
}

/**
 * Load settings from disk
 * @returns {Object} Settings object
 */
export function loadSettings() {
  try {
    ensureSettingsDirectory();

    if (existsSync(SETTINGS_FILE)) {
      const data = readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);

      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_SETTINGS, ...settings };
    }

    // No settings file exists, return defaults
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error('Failed to load settings:', error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to disk
 * @param {Object} settings - Settings object to save
 * @returns {boolean} Success status
 */
export function saveSettings(settings) {
  try {
    ensureSettingsDirectory();

    const data = JSON.stringify(settings, null, 2);
    writeFileSync(SETTINGS_FILE, data, 'utf8');

    return true;
  } catch (error) {
    console.error('Failed to save settings:', error.message);
    return false;
  }
}

/**
 * Get a specific setting value
 * @param {string} key - Dot-notation key (e.g., 'branding.companyName')
 * @returns {*} Setting value
 */
export function getSetting(key) {
  const settings = loadSettings();
  const keys = key.split('.');

  let value = settings;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Set a specific setting value
 * @param {string} key - Dot-notation key (e.g., 'branding.companyName')
 * @param {*} value - Value to set
 * @returns {boolean} Success status
 */
export function setSetting(key, value) {
  try {
    const settings = loadSettings();
    const keys = key.split('.');
    const lastKey = keys.pop();

    let obj = settings;
    for (const k of keys) {
      if (!(k in obj)) {
        obj[k] = {};
      }
      obj = obj[k];
    }

    obj[lastKey] = value;

    return saveSettings(settings);
  } catch (error) {
    console.error('Failed to set setting:', error.message);
    return false;
  }
}

/**
 * Update last used provider
 * @param {string} provider - Provider name
 * @returns {boolean} Success status
 */
export function updateLastProvider(provider) {
  return setSetting('lastProvider', provider);
}

/**
 * Update last used prompt
 * @param {string} prompt - Prompt name
 * @returns {boolean} Success status
 */
export function updateLastPrompt(prompt) {
  return setSetting('lastPrompt', prompt);
}

/**
 * Add client to recent clients list
 * @param {string} clientName - Client name
 * @returns {boolean} Success status
 */
export function addRecentClient(clientName) {
  try {
    const settings = loadSettings();
    let recent = settings.recentClients || [];

    // Remove if already exists (to move to front)
    recent = recent.filter(name => name !== clientName);

    // Add to front
    recent.unshift(clientName);

    // Keep only last 10
    recent = recent.slice(0, 10);

    settings.recentClients = recent;
    return saveSettings(settings);
  } catch (error) {
    console.error('Failed to add recent client:', error.message);
    return false;
  }
}

/**
 * Get recent clients list
 * @returns {string[]} Array of recent client names
 */
export function getRecentClients() {
  const settings = loadSettings();
  return settings.recentClients || [];
}

/**
 * Update branding settings
 * @param {Object} branding - Branding configuration
 * @returns {boolean} Success status
 */
export function updateBranding(branding) {
  try {
    const settings = loadSettings();
    settings.branding = { ...settings.branding, ...branding };
    return saveSettings(settings);
  } catch (error) {
    console.error('Failed to update branding:', error.message);
    return false;
  }
}

/**
 * Get branding settings
 * @returns {Object} Branding configuration
 */
export function getBranding() {
  const settings = loadSettings();
  return settings.branding || DEFAULT_SETTINGS.branding;
}

/**
 * Reset settings to defaults
 * @returns {boolean} Success status
 */
export function resetSettings() {
  return saveSettings({ ...DEFAULT_SETTINGS });
}

/**
 * Get settings file path
 * @returns {string} Path to settings file
 */
export function getSettingsPath() {
  return SETTINGS_FILE;
}

/**
 * Get settings directory path
 * @returns {string} Path to settings directory
 */
export function getSettingsDirectory() {
  return SETTINGS_DIR;
}
