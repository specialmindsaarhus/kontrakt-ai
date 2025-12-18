import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Output Manager
 * Handles organization of generated reports by client and date
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the base output directory
 * @returns {string} Absolute path to output directory
 */
export function getOutputDirectory() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  return path.join(projectRoot, 'output');
}

/**
 * Sanitize a name for use in file paths
 * Removes special characters and spaces
 * @param {string} name - Name to sanitize
 * @returns {string} Sanitized name
 */
function sanitizeName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\./, '') // Remove leading dot
    .replace(/\.$/, '') // Remove trailing dot
    .toLowerCase();
}

/**
 * Get date-based folder name
 * @param {Date} date - Date object
 * @returns {string} Folder name (e.g., "18-12-2025")
 */
function getDateFolderName(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

/**
 * Generate organized output path for a report
 * @param {Object} options - Options for path generation
 * @param {string} options.clientName - Client name (optional)
 * @param {string} options.documentName - Document name
 * @param {string} options.format - Report format ('pdf', 'docx', 'md')
 * @param {boolean} options.organizeByClient - Organize by client (default: true)
 * @param {boolean} options.organizeByDate - Organize by date (default: true)
 * @param {Date} options.date - Date for organization (default: now)
 * @returns {string} Full path for the report file
 */
export function generateOutputPath(options) {
  const {
    clientName,
    documentName,
    format,
    organizeByClient = true,
    organizeByDate = true,
    date = new Date()
  } = options;

  let outputPath = getOutputDirectory();

  // Add client folder if organizing by client and client name provided
  if (organizeByClient && clientName) {
    const sanitizedClient = sanitizeName(clientName);
    outputPath = path.join(outputPath, sanitizedClient);
  }

  // Add date folder if organizing by date
  if (organizeByDate) {
    const dateFolderName = getDateFolderName(date);
    outputPath = path.join(outputPath, dateFolderName);
  }

  // Ensure directory exists
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }

  // Generate filename
  const sanitizedDoc = sanitizeName(documentName);
  const timestamp = date.toISOString().replace(/:/g, '-').split('.')[0]; // 2025-12-16T14-30-00
  const filename = `${sanitizedDoc}-${timestamp}.${format}`;

  return path.join(outputPath, filename);
}

/**
 * Get all reports for a specific client
 * @param {string} clientName - Client name
 * @returns {Array<{path: string, name: string, date: Date, format: string}>} Array of report info
 */
export function getClientReports(clientName) {
  const sanitizedClient = sanitizeName(clientName);
  const clientDir = path.join(getOutputDirectory(), sanitizedClient);

  if (!existsSync(clientDir)) {
    return [];
  }

  const reports = [];

  function scanDirectory(dir) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stats.isFile()) {
        const ext = path.extname(entry).substring(1);
        if (['pdf', 'docx', 'md'].includes(ext)) {
          reports.push({
            path: fullPath,
            name: entry,
            date: stats.mtime,
            format: ext
          });
        }
      }
    }
  }

  scanDirectory(clientDir);

  // Sort by date, newest first
  reports.sort((a, b) => b.date - a.date);

  return reports;
}

/**
 * Get all reports for a specific date
 * @param {Date} date - Date to search for
 * @returns {Array<{path: string, name: string, client: string, format: string}>} Array of report info
 */
export function getReportsByDate(date) {
  const dateFolderName = getDateFolderName(date);
  const outputDir = getOutputDirectory();
  const reports = [];

  if (!existsSync(outputDir)) {
    return [];
  }

  // Scan all client folders for date-based subfolders
  const entries = readdirSync(outputDir);

  for (const entry of entries) {
    const fullPath = path.join(outputDir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      // Check if this is a client folder or date folder
      const dateFolder = path.join(fullPath, dateFolderName);

      if (existsSync(dateFolder) && statSync(dateFolder).isDirectory()) {
        // This is a client folder with a date subfolder
        const files = readdirSync(dateFolder);

        for (const file of files) {
          const ext = path.extname(file).substring(1);
          if (['pdf', 'docx', 'md'].includes(ext)) {
            reports.push({
              path: path.join(dateFolder, file),
              name: file,
              client: entry,
              format: ext
            });
          }
        }
      } else if (entry === dateFolderName) {
        // This is a top-level date folder
        const files = readdirSync(fullPath);

        for (const file of files) {
          const ext = path.extname(file).substring(1);
          if (['pdf', 'docx', 'md'].includes(ext)) {
            reports.push({
              path: path.join(fullPath, file),
              name: file,
              client: null,
              format: ext
            });
          }
        }
      }
    }
  }

  return reports;
}

/**
 * Clean up old reports
 * @param {number} daysToKeep - Number of days to keep reports (default: 90)
 * @returns {number} Number of files deleted
 */
export function cleanupOldReports(daysToKeep = 90) {
  const outputDir = getOutputDirectory();

  if (!existsSync(outputDir)) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  let deletedCount = 0;

  function scanAndDelete(dir) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        scanAndDelete(fullPath);

        // Try to remove empty directories
        try {
          const remaining = readdirSync(fullPath);
          if (remaining.length === 0) {
            unlinkSync(fullPath);
          }
        } catch {
          // Directory not empty or couldn't delete, ignore
        }
      } else if (stats.isFile()) {
        if (stats.mtime < cutoffDate) {
          const ext = path.extname(entry).substring(1);
          if (['pdf', 'docx', 'md'].includes(ext)) {
            try {
              unlinkSync(fullPath);
              deletedCount++;
            } catch (error) {
              console.error(`Failed to delete ${fullPath}:`, error.message);
            }
          }
        }
      }
    }
  }

  scanAndDelete(outputDir);

  return deletedCount;
}

/**
 * Get statistics about stored reports
 * @returns {Object} Statistics object
 */
export function getReportStatistics() {
  const outputDir = getOutputDirectory();

  if (!existsSync(outputDir)) {
    return {
      totalReports: 0,
      totalClients: 0,
      formatCounts: { pdf: 0, docx: 0, md: 0 },
      oldestReport: null,
      newestReport: null
    };
  }

  let totalReports = 0;
  const clients = new Set();
  const formatCounts = { pdf: 0, docx: 0, md: 0 };
  let oldestDate = null;
  let newestDate = null;

  function scanDirectory(dir, currentClient = null) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Track client directories
        const isClientDir = currentClient === null && dir === outputDir;
        scanDirectory(fullPath, isClientDir ? entry : currentClient);
      } else if (stats.isFile()) {
        const ext = path.extname(entry).substring(1);
        if (['pdf', 'docx', 'md'].includes(ext)) {
          totalReports++;
          formatCounts[ext]++;

          if (currentClient) {
            clients.add(currentClient);
          }

          if (!oldestDate || stats.mtime < oldestDate) {
            oldestDate = stats.mtime;
          }
          if (!newestDate || stats.mtime > newestDate) {
            newestDate = stats.mtime;
          }
        }
      }
    }
  }

  scanDirectory(outputDir);

  return {
    totalReports,
    totalClients: clients.size,
    formatCounts,
    oldestReport: oldestDate,
    newestReport: newestDate
  };
}
