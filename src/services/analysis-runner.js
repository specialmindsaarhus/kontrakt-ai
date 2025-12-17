import { createClaudeAdapter } from '../adapters/claude-adapter.js';
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

  // Helper to send progress updates
  const sendProgress = (percent, stage, message) => {
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
      timeout = 300000
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
    sendProgress(10, 0, 'Preparing CLI');
    const adapter = getAdapter(provider);

    // Check if CLI is available
    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      throw ErrorFactory.cliNotFound(provider);
    }

    // Step 4: Execute CLI analysis
    info('Executing CLI analysis');
    sendProgress(15, 0, 'Analyzing content');
    const cliResult = await adapter.execute({
      documentPath,
      systemPromptPath: promptPath,
      referencePath,
      timeout
    });
    sendProgress(60, 1, 'Analysis complete');

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

    // Step 5: Generate reports
    info('Generating reports', { formats: outputFormats });
    sendProgress(65, 1, 'Generating reports');
    const reports = await generateReports({
      cliResult,
      documentPath,
      clientName,
      promptName,
      outputFormats,
      customBranding: customBranding || getBranding()
    });
    sendProgress(90, 2, 'Finalizing');

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
        documentPath
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
      // TODO: Implement Gemini adapter
      throw ErrorFactory.generic(
        'Gemini CLI adapter er ikke implementeret endnu',
        ['Brug Claude CLI i stedet', 'Gemini support kommer i fremtidige versioner']
      );
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
  const documentName = require('path').basename(documentPath, require('path').extname(documentPath));

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
          originalFileName: require('path').basename(documentPath),
          originalFormat: require('path').extname(documentPath).substring(1),
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
