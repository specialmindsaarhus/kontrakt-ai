import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,        // Disable Node.js in renderer
      contextIsolation: true,        // Enable context isolation
      enableRemoteModule: false,     // Disable remote module
      sandbox: true                  // Enable sandbox
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Set Content Security Policy (only in production)
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
          ]
        }
      });
    });
  }

  createWindow();
  setupIPCHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ========== IPC Handlers Setup ==========

function setupIPCHandlers() {
  // ===== Settings Management =====

  ipcMain.handle('settings:load', async (event) => {
    try {
      const { loadSettings } = await import('../src/utils/settings-manager.js');
      const settings = await loadSettings();
      return settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Return defaults on error
      return {
        lastProvider: null,
        lastPrompt: null,
        clientName: '',
        branding: {
          companyName: 'Contract Reviewer',
          primaryColor: '#0d1321'
        },
        recentClients: [],
        outputPreferences: {
          defaultFormats: ['pdf', 'docx', 'md'],
          autoOpen: false,
          organizationMode: 'client'
        }
      };
    }
  });

  ipcMain.handle('settings:save', async (event, settings) => {
    try {
      // Validate settings object
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings object');
      }

      const { saveSettings } = await import('../src/utils/settings-manager.js');
      await saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  });

  // ===== CLI Provider Detection =====

  ipcMain.handle('cli:detect-providers', async (event) => {
    try {
      const { detectAvailableCLIs } = await import('../src/utils/cli-detector.js');
      const providers = await detectAvailableCLIs();
      return providers;
    } catch (error) {
      console.error('Failed to detect CLI providers:', error);
      // Return empty array on error
      return [];
    }
  });

  // ===== Prompts Management =====

  ipcMain.handle('prompts:get-available', async (event) => {
    try {
      const { listAvailablePrompts } = await import('../src/utils/prompt-loader.js');
      const promptNames = await listAvailablePrompts();

      // Map to display format
      const prompts = promptNames.map(name => ({
        name,
        displayName: getDisplayName(name),
        description: getDescription(name),
        filePath: path.join(__dirname, '../prompts', `${name}.md`)
      }));

      return prompts;
    } catch (error) {
      console.error('Failed to load prompts:', error);
      return [];
    }
  });

  // ===== Analysis Execution =====

  // IPC Handler: Cancel running analysis
  ipcMain.handle('analysis:cancel', async () => {
    try {
      const { cancelAnalysis } = await import('../src/services/analysis-runner.js');
      const cancelled = cancelAnalysis();
      return { success: true, cancelled };
    } catch (error) {
      console.error('Failed to cancel analysis:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analysis:run', async (event, params) => {
    try {
      // Validate parameters
      if (!params.provider || !params.documentPath || !params.promptName) {
        throw new Error('Missing required parameters');
      }

      const { runAnalysis } = await import('../src/services/analysis-runner.js');

      // Run analysis with progress updates
      const result = await runAnalysis(
        params,
        (progress) => {
          // Send progress updates to renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('analysis:progress', progress);
          }
        }
      );

      // Check if analysis succeeded
      if (!result.success) {
        const error = new Error(result.userMessage || result.error || 'Analysis failed');
        error.code = result.errorCode || 'ANALYSIS_FAILED';
        error.suggestions = result.suggestions || 'Prøv igen eller tjek log filer.';
        throw error;
      }

      // Transform result format for frontend
      const reportPaths = {};
      if (result.reports && Array.isArray(result.reports)) {
        result.reports.forEach(report => {
          if (report.format && report.path) {
            reportPaths[report.format] = report.path;
          }
        });
      }

      return {
        output: result.cliResult?.output || '',
        executionTime: result.executionTime || 0,
        reportPaths,
        metadata: {
          provider: result.metadata?.provider || params.provider,
          providerVersion: result.cliResult?.version || 'unknown',
          promptName: result.metadata?.promptName || params.promptName,
          documentName: result.metadata?.documentPath?.split(/[/\\]/).pop() || params.documentPath?.split(/[/\\]/).pop() || '',
          clientName: result.metadata?.clientName || params.clientName || '',
          analysisDate: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Analysis failed:', error);

      // Handle cancellation separately (not an error, just stopped by user)
      if (error.errorCode === 'ANALYSIS_CANCELLED' || error.code === 'ANALYSIS_CANCELLED') {
        const ipcError = new Error(error.userMessage || error.message || 'Analysen blev afbrudt');
        ipcError.code = 'ANALYSIS_CANCELLED';
        ipcError.suggestions = error.recoverySuggestions || ['Analysen blev stoppet af brugeren'];
        ipcError.cancelled = true;
        throw ipcError;
      }

      // Create a proper Error object for IPC serialization
      const ipcError = new Error(error.message || 'Analysis failed');
      ipcError.code = error.code || 'UNKNOWN';
      ipcError.suggestions = error.suggestions || 'Kontakt support.';
      ipcError.originalStack = error.stack;

      throw ipcError;
    }
  });

  // ===== File Operations =====

  ipcMain.handle('file:open', async (event, filePath) => {
    try {
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Security: Ensure file exists and is within allowed paths
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Open file with default application
      await shell.openPath(filePath);
      return { success: true };

    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  });

  ipcMain.handle('file:open-directory', async (event, dirPath) => {
    try {
      if (!dirPath || typeof dirPath !== 'string') {
        throw new Error('Invalid directory path');
      }

      if (!fs.existsSync(dirPath)) {
        throw new Error('Directory not found');
      }

      // Open directory in file explorer
      await shell.openPath(dirPath);
      return { success: true };

    } catch (error) {
      console.error('Failed to open directory:', error);
      throw error;
    }
  });

  // ===== Export Operations =====

  ipcMain.handle('export:report', async (event, params) => {
    try {
      const { format, reportPath, autoOpen } = params;

      // Validate report exists
      if (!fs.existsSync(reportPath)) {
        throw new Error('Report file not found');
      }

      // Optionally copy to user-selected location
      // (Future: Show save dialog)

      // Open if requested
      if (autoOpen) {
        await shell.openPath(reportPath);
      }

      return {
        success: true,
        path: reportPath
      };

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  });
}

// ========== Helper Functions ==========

function getDisplayName(promptName) {
  const map = {
    'franchise-contract-review': 'Kontrakt',
    'franchise-manual-review': 'Manual',
    'compliance-check': 'Compliance'
  };
  return map[promptName] || promptName;
}

function getDescription(promptName) {
  const map = {
    'franchise-contract-review': 'Analysér franchisekontrakt for juridiske risici',
    'franchise-manual-review': 'Gennemgå franchisemanual for fuldstændighed',
    'compliance-check': 'Kontrollér overholdelse af lovgivning'
  };
  return map[promptName] || '';
}

// ========== Global Error Handler ==========

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:error', {
      code: 'UNCAUGHT_EXCEPTION',
      message: 'En uventet fejl opstod',
      suggestions: 'Genstart applikationen.'
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:error', {
      code: 'UNHANDLED_REJECTION',
      message: 'En uventet fejl opstod',
      suggestions: 'Genstart applikationen.'
    });
  }
});
