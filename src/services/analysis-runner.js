import path from 'path';
import { createClaudeAdapter } from '../adapters/claude-adapter.js';
import { createGeminiAdapter } from '../adapters/gemini-adapter.js';
import { getPromptPath, promptExists } from '../utils/prompt-loader.js';
import { generateReport } from '../utils/report-generator.js';
import { generateOutputPath } from '../utils/output-manager.js';
import { loadSettings, updateLastProvider, updateLastPrompt, addRecentClient, getBranding } from '../utils/settings-manager.js';
import { info, warn, error as logError, ErrorFactory, EnhancedError } from '../utils/logger.js';

/**
 * Analysis Runner
 * Orchestrates the complete document analysis workflow:
 * 1. Validate inputs
 * 2. Execute CLI analysis
 * 3. Generate professional reports
 * 4. Update settings and track usage
 */

// Cancellation state
let isCancelled = false;
let currentAnalysisId = null;
let currentAdapter = null; // Store current adapter to kill its process

/**
 * Cancel the currently running analysis
 */
export function cancelAnalysis() {
  if (currentAnalysisId) {
    info('Analysis cancellation requested', { analysisId: currentAnalysisId });
    isCancelled = true;

    // Kill the running CLI process
    if (currentAdapter && typeof currentAdapter.cancel === 'function') {
      currentAdapter.cancel();
    }

    return true;
  }
  return false;
}

/**
 * Run complete document analysis
 * @param {Object} options - Analysis options
 * @param {string} options.provider - CLI provider ('claude', 'gemini', 'openai')
 * @param {string} options.documentPath - Path to document to analyze
 * @param {string} options.promptName - Name of system prompt to use
 * @param {string} options.clientName - Client name (optional)
 * @param {string[]} options.outputFormats - Formats to generate (default: ['pdf'])
 * @param {string} options.referencePath - Path to reference materials (optional)
 * @param {Object} options.customBranding - Custom branding override (optional)
 * @param {number} options.timeout - CLI timeout in ms (default: 300000)
 * @returns {Promise<AnalysisResult>} Analysis result with report paths
 */
export async function runAnalysis(options, progressCallback = null) {
  const startTime = Date.now();
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Reset cancellation state for this analysis
  isCancelled = false;
  currentAnalysisId = analysisId;

  // Helper to check if cancelled
  const checkCancellation = () => {
    if (isCancelled) {
      currentAnalysisId = null;
      const error = new Error('Analysen blev afbrudt');
      error.errorCode = 'ANALYSIS_CANCELLED';
      error.code = 'ANALYSIS_CANCELLED';
      error.userMessage = 'Analysen blev afbrudt';
      error.recoverySuggestions = ['Analysen blev stoppet af brugeren'];
      throw error;
    }
  };

  // Helper to send progress updates
  const sendProgress = (percent, stage, message) => {
    checkCancellation(); // Check before sending progress
    if (progressCallback && typeof progressCallback === 'function') {
      progressCallback({ percent, stage, message });
    }
  };

  try {
    // Load settings
    const settings = loadSettings();

    // Normalize options with defaults
    const {
      provider = settings.lastProvider || 'claude',
      documentPath,
      promptName = settings.lastPrompt || 'franchise-contract-review',
      clientName,
      outputFormats = [settings.output?.defaultFormat || 'pdf'],
      referencePath,
      customBranding,
      timeout = 300000  // 5 minutes - Gemini CLI can take 2-3 minutes for analysis
    } = options;

    // Log analysis start
    info('Starting document analysis', {
      provider,
      documentPath,
      promptName,
      clientName: clientName || 'N/A'
    });

    // Send initial progress
    sendProgress(0, 0, 'Starting analysis');

    // Step 1: Validate inputs
    info('Validating inputs');
    sendProgress(5, 0, 'Validating inputs');
    await validateInputs({ provider, documentPath, promptName });

    // Step 2: Get prompt path
    const promptPath = getPromptPath(promptName);
    if (!promptExists(promptName)) {
      throw ErrorFactory.generic(
        `Prompt '${promptName}' findes ikke`,
        ['Tjek at prompt navnet er korrekt', 'Se tilgængelige prompts i prompts/ mappen']
      );
    }

    // Step 3: Create adapter
    info('Creating CLI adapter', { provider });
    console.log('[DEBUG] Creating adapter for provider:', provider);
    sendProgress(15, 0, 'Preparing CLI');
    const adapter = getAdapter(provider);
    currentAdapter = adapter; // Store for cancellation
    console.log('[DEBUG] Adapter created:', adapter.providerName);

    // Check if CLI is available
    console.log('[DEBUG] Checking if CLI is available...');
    const isAvailable = await adapter.isAvailable();
    console.log('[DEBUG] CLI available:', isAvailable);
    if (!isAvailable) {
      throw ErrorFactory.cliNotFound(provider);
    }

    // Step 4: Execute CLI analysis
    info('Executing CLI analysis');
    console.log('[DEBUG] Calling adapter.execute() with timeout:', timeout);
    sendProgress(20, 1, 'Analyzing content');

    // Start simulated progress updates during long CLI execution
    // Mapped to Stage 1 range: 20-80% (most of the time is here)
    let currentProgress = 20;
    const progressInterval = setInterval(() => {
      // Check cancellation before sending progress (don't throw, just stop)
      if (isCancelled) {
        clearInterval(progressInterval);
        return;
      }

      if (currentProgress < 70) {
        currentProgress += 2;  // Increment by 2% every 3 seconds
        try {
          sendProgress(currentProgress, 1, 'Analyzing content');
        } catch {
          // If error during progress (e.g., cancellation), stop interval
          clearInterval(progressInterval);
        }
      }
    }, 3000);  // Update every 3 seconds

    let cliResult;
    try {
      cliResult = await adapter.execute({
        documentPath,
        systemPromptPath: promptPath,
        referencePath,
        timeout
      });
      console.log('[DEBUG] adapter.execute() returned. Success:', cliResult.success);

      // Clear interval and jump to 75%
      clearInterval(progressInterval);
      sendProgress(75, 1, 'Analysis complete');

      if (!cliResult.success) {
        // Handle specific error codes
        if (cliResult.errorCode === 'AUTH_REQUIRED') {
          throw ErrorFactory.authRequired(provider);
        } else if (cliResult.errorCode === 'TIMEOUT') {
          throw ErrorFactory.timeout(timeout);
        } else if (cliResult.errorCode === 'FILE_NOT_FOUND') {
          throw ErrorFactory.fileNotFound(documentPath);
        }

        throw ErrorFactory.generic(
          cliResult.error || 'CLI analyse fejlede',
          ['Tjek log filen for flere detaljer', 'Prøv med en anden CLI provider']
        );
      }

      info('CLI analysis completed successfully', {
        executionTime: cliResult.executionTime,
        outputLength: cliResult.output?.length || 0
      });
    } catch (err) {
      clearInterval(progressInterval);
      throw err;
    }

    // Step 5: Generate reports
    info('Generating reports', { formats: outputFormats });
    sendProgress(80, 2, 'Generating reports');
    const reports = await generateReports({
      cliResult,
      documentPath,
      clientName,
      promptName,
      outputFormats,
      customBranding: customBranding || getBranding()
    });
    sendProgress(95, 2, 'Finalizing');

    // Step 6: Update settings
    updateLastProvider(provider);
    updateLastPrompt(promptName);
    if (clientName) {
      addRecentClient(clientName);
    }

    const totalTime = Date.now() - startTime;
    info('Analysis completed successfully', {
      totalTime,
      reportsGenerated: reports.length
    });

    // Send final progress
    sendProgress(100, 2, 'Complete');

    // Get output directory path (directory containing the reports)
    const outputPath = reports.length > 0
      ? path.dirname(reports[0].path)
      : '';

    // Return result
    return {
      success: true,
      cliResult,
      reports,
      executionTime: totalTime,
      metadata: {
        provider,
        promptName,
        clientName,
        documentPath,
        outputPath
      }
    };

  } catch (err) {
    const totalTime = Date.now() - startTime;

    // Log error
    if (err instanceof EnhancedError) {
      err.log();
    } else {
      logError('Analysis failed', err);
    }

    // Return error result
    return {
      success: false,
      error: err.message,
      userMessage: err.getUserMessage ? err.getUserMessage() : err.message,
      executionTime: totalTime
    };
  } finally {
    // Clean up cancellation state
    currentAnalysisId = null;
    currentAdapter = null;
    isCancelled = false;
  }
}

/**
 * Validate analysis inputs
 * @private
 */
async function validateInputs({ provider, documentPath, promptName }) {
  // Validate provider
  const validProviders = ['claude', 'gemini', 'openai'];
  if (!validProviders.includes(provider)) {
    throw ErrorFactory.generic(
      `Ugyldig provider: ${provider}`,
      [`Brug en af: ${validProviders.join(', ')}`]
    );
  }

  // Validate document path
  if (!documentPath) {
    throw ErrorFactory.generic('Dokumentsti er påkrævet');
  }

  // File existence is checked by adapter, so we don't need to check here

  // Validate prompt name
  if (!promptName) {
    throw ErrorFactory.generic('Prompt navn er påkrævet');
  }
}

/**
 * Get CLI adapter for provider
 * @private
 */
function getAdapter(provider) {
  switch (provider) {
    case 'claude':
      return createClaudeAdapter();
    case 'gemini':
      return createGeminiAdapter();
    case 'openai':
      // TODO: Implement OpenAI adapter
      throw ErrorFactory.generic(
        'OpenAI CLI adapter er ikke implementeret endnu',
        ['Brug Claude CLI i stedet', 'OpenAI support kommer i fremtidige versioner']
      );
    default:
      throw ErrorFactory.generic(`Ukendt provider: ${provider}`);
  }
}

/**
 * Generate reports in multiple formats
 * @private
 */
async function generateReports({ cliResult, documentPath, clientName, promptName, outputFormats, customBranding }) {
  const reports = [];
  const documentName = path.basename(documentPath, path.extname(documentPath));

  for (const format of outputFormats) {
    try {
      const outputPath = generateOutputPath({
        clientName,
        documentName,
        format,
        organizeByClient: true,
        organizeByDate: true
      });

      const reportPath = await generateReport({
        format,
        outputPath,
        cliResult,
        metadata: {
          originalFileName: path.basename(documentPath),
          originalFormat: path.extname(documentPath).substring(1),
          clientName,
          documentType: getDocumentType(promptName)
        },
        branding: customBranding
      });

      info(`Report generated: ${format}`, { path: reportPath });

      reports.push({
        format,
        path: reportPath
      });

    } catch (err) {
      warn(`Failed to generate ${format} report`, { error: err.message });
      // Continue with other formats
    }
  }

  if (reports.length === 0) {
    throw ErrorFactory.generic(
      'Ingen rapporter kunne genereres',
      ['Tjek log filen for fejl', 'Prøv med et andet format']
    );
  }

  return reports;
}

/**
 * Get document type from prompt name
 * @private
 */
function getDocumentType(promptName) {
  if (promptName.includes('contract')) {
    return 'contract';
  } else if (promptName.includes('manual')) {
    return 'manual';
  } else if (promptName.includes('compliance')) {
    return 'compliance';
  }
  return 'general';
}

/**
 * Analysis result type definition
 * @typedef {Object} AnalysisResult
 * @property {boolean} success - Whether analysis succeeded
 * @property {CLIResult} cliResult - CLI execution result (if success)
 * @property {Array<{format: string, path: string}>} reports - Generated reports (if success)
 * @property {number} executionTime - Total execution time in ms
 * @property {Object} metadata - Analysis metadata (if success)
 * @property {string} error - Error message (if failure)
 * @property {string} userMessage - User-friendly error message (if failure)
 */
