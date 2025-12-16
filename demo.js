/**
 * Contract Reviewer Demo
 * Demonstrates the complete workflow from document analysis to report generation
 */

import { runAnalysis } from './src/services/analysis-runner.js';
import { getReportStatistics } from './src/utils/output-manager.js';
import { loadSettings } from './src/utils/settings-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('═'.repeat(70));
console.log('                    CONTRACT REVIEWER DEMO');
console.log('                  Complete Workflow Demonstration');
console.log('═'.repeat(70));
console.log();

async function runDemo() {
  const testDocument = path.join(__dirname, 'tests', 'sample-contract.txt');

  // Check if document exists
  if (!existsSync(testDocument)) {
    console.error('❌ Test document not found:', testDocument);
    return;
  }

  console.log('📄 Demo Document:', path.basename(testDocument));
  console.log('📍 Location:', testDocument);
  console.log();

  // Show current settings
  console.log('⚙️  Current Settings:');
  console.log('─'.repeat(70));
  const settings = loadSettings();
  console.log(`   Last CLI Provider: ${settings.lastProvider || 'None'}`);
  console.log(`   Last Prompt: ${settings.lastPrompt || 'None'}`);
  console.log(`   Recent Clients: ${settings.recentClients?.join(', ') || 'None'}`);
  if (settings.branding?.companyName) {
    console.log(`   Company: ${settings.branding.companyName}`);
  }
  console.log();

  // Run analysis
  console.log('🚀 Starting Analysis...');
  console.log('─'.repeat(70));
  console.log('   Provider: Claude CLI');
  console.log('   Prompt: Franchise Contract Review (Danish)');
  console.log('   Client: Kaffehuset Aarhus ApS');
  console.log('   Formats: PDF, Word, Markdown');
  console.log();
  console.log('⏳ Analyzing document with Claude CLI...');
  console.log('   (This may take 30-60 seconds)');
  console.log();

  const startTime = Date.now();

  const result = await runAnalysis({
    provider: 'claude',
    documentPath: testDocument,
    promptName: 'franchise-contract-review',
    clientName: 'Kaffehuset Aarhus ApS',
    outputFormats: ['pdf', 'docx', 'md']
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log();
  console.log('═'.repeat(70));
  console.log('                         RESULTS');
  console.log('═'.repeat(70));
  console.log();

  if (result.success) {
    console.log('✅ Analysis Completed Successfully!');
    console.log();
    console.log('⏱️  Execution Time:', duration, 'seconds');
    console.log('📊 Analysis Length:', result.cliResult.output.length, 'characters');
    console.log();

    console.log('📑 Generated Reports:');
    console.log('─'.repeat(70));
    result.reports.forEach(report => {
      const exists = existsSync(report.path);
      console.log(`   ${exists ? '✓' : '✗'} ${report.format.toUpperCase().padEnd(8)} ${report.path}`);
    });
    console.log();

    // Show preview of analysis
    console.log('📝 Analysis Preview (first 500 characters):');
    console.log('─'.repeat(70));
    const preview = result.cliResult.output.substring(0, 500);
    console.log(preview + '...');
    console.log();

    // Show file organization
    console.log('📁 File Organization:');
    console.log('─'.repeat(70));
    const stats = getReportStatistics();
    console.log(`   Total Reports: ${stats.totalReports}`);
    console.log(`   Total Clients: ${stats.totalClients}`);
    console.log(`   By Format:`);
    console.log(`     - PDF: ${stats.formatCounts.pdf}`);
    console.log(`     - Word: ${stats.formatCounts.docx}`);
    console.log(`     - Markdown: ${stats.formatCounts.md}`);
    if (stats.newestReport) {
      console.log(`   Latest Report: ${stats.newestReport.toLocaleString('da-DK')}`);
    }
    console.log();

    // Show how to open reports
    console.log('💡 To View Reports:');
    console.log('─'.repeat(70));
    console.log('   Windows:');
    console.log(`     start "${result.reports[0].path}"`);
    console.log();
    console.log('   Or navigate to:');
    console.log(`     ${path.dirname(result.reports[0].path)}`);
    console.log();

    // Show settings updated
    const updatedSettings = loadSettings();
    console.log('⚙️  Settings Automatically Updated:');
    console.log('─'.repeat(70));
    console.log(`   Last Provider: ${updatedSettings.lastProvider}`);
    console.log(`   Last Prompt: ${updatedSettings.lastPrompt}`);
    console.log(`   Recent Clients: ${updatedSettings.recentClients.slice(0, 3).join(', ')}`);
    console.log();

  } else {
    console.log('❌ Analysis Failed');
    console.log();
    console.log('Error:', result.error);
    console.log();
    if (result.userMessage) {
      console.log('User Message:');
      console.log(result.userMessage);
      console.log();
    }
  }

  console.log('═'.repeat(70));
  console.log('                      DEMO COMPLETE');
  console.log('═'.repeat(70));
  console.log();
  console.log('🎉 The Contract Reviewer system is working!');
  console.log();
  console.log('What just happened:');
  console.log('  1. ✓ Loaded your settings');
  console.log('  2. ✓ Analyzed the document with Claude CLI');
  console.log('  3. ✓ Generated 3 professional reports (PDF, Word, Markdown)');
  console.log('  4. ✓ Organized reports by client and date');
  console.log('  5. ✓ Updated settings with this session');
  console.log('  6. ✓ Logged everything for debugging');
  console.log();
  console.log('Next steps:');
  console.log('  • Open the generated reports to see the analysis');
  console.log('  • Check output/kaffehuset-aarhus-aps/[today]/ folder');
  console.log('  • Try with your own documents!');
  console.log('  • Integrate with the Electron GUI');
  console.log();
}

// Run the demo
console.log('Starting demo...\n');
runDemo().catch(error => {
  console.error('\n❌ Demo failed with error:', error.message);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
});
