/**
 * Test Report Generator
 * Comprehensive test suite for report generation in all formats
 */

import {
  generateMarkdownReport,
  generatePDFReport,
  generateWordReport,
  generateReport
} from '../src/utils/report-generator.js';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample CLI result for testing
const sampleCLIResult = {
  success: true,
  provider: 'claude',
  output: `## Kort vurdering

Denne franchisekontrakt er på flere områder problematisk og skaber betydelig risiko for franchisetageren. Kontrakten er ensidigt favorabel for franchisegiver og mangler væsentlige beskyttelsesmekanismer for franchisetageren.

## Juridiske risici

### Høj risiko: Ensidig opsigelsesret (Klausul 4)
Franchisegiver kan opsige med kun 3 måneders varsel uden angivelse af årsag, mens franchisetageren har bundet kapital og investering i forretningen. Dette skaber ekstrem ubalance.

### Høj risiko: Manglende territorialbeskyttelse (Klausul 2)
Der er ingen eksklusivitet angivet. Franchisegiver kan åbne konkurrerende enheder i samme område.

### Middel risiko: Urimelig konkurrenceklausul (Klausul 6)
2 års konkurrenceforbud efter ophør kan være i strid med rimelighedsvurdering, særligt når det kombineres med manglende opsigelsesvarsel.

## Uklare eller svage formuleringer

**Klausul 5: "Franchisetageren skal følge Franchisegivers drifts- og brandretningslinjer"**

Problematisk fordi:
- Ingen reference til en manual eller specifikke retningslinjer
- Ingen begrænsning for hvor omfattende ændringer franchisegiver kan kræve
- Ingen tidsfrist for implementering af nye krav

Forslag: "Franchisetageren skal følge de drifts- og brandretningslinjer der er angivet i den til enhver tid gældende franchisemanual. Væsentlige ændringer skal varsles minimum 6 måneder i fornyelse og må ikke medføre urimelige omkostninger for franchisetageren."

## Forslag til forbedringer

1. **Gensidig opsigelsesret**: Ændr til minimum 12 måneders varsel for begge parter, eller gradvist stigende varsel (år 1-2: 6 mdr, år 3-5: 12 mdr)

2. **Territorialbeskyttelse**: Tilføj eksklusivitetsklausul for Aarhus kommune med minimum 5 km beskyttelseszone

3. **Præcisering af fees**: Angiv konkrete eksempler på hvordan royalty beregnes og hvornår betaling forfalder

## Manglende klausuler

- **Fornyelsesret**: Ingen mulighed for at forny kontrakten efter 5 år
- **Trænings- og supportforpligtelser**: Ingen specifikation af franchisegivers supportydelser
- **Force majeure**: Ingen klausul om uforudsete hændelser (pandemi, naturkatastrofer)
- **Tvistløsning**: Ingen angivelse af voldgift eller mæglingsproces
- **Overdragelsesret**: Ingen mulighed for franchisetageren at sælge forretningen
- **Goodwill-kompensation**: Ved ikke-fornyelse eller franchisegivers opsigelse

## Anbefalinger til klient

### Prioriteret handlingsplan:

1. **Forhandle opsigelsesvilkår** (kritisk)
   - Kræv minimum 12 måneders varsel
   - Tilføj kompensation ved franchisegivers opsigelse uden væsentlig misligholdelse

2. **Sikre territorial beskyttelse** (kritisk)
   - Kræv skriftlig eksklusivitet for Aarhus kommune

3. **Fornyelsesret** (høj prioritet)
   - Tilføj automatisk fornyelsesret ved opfyldelse af performance-kriterier

4. **Få juridisk gennemgang** (anbefalet)
   - Kontakt advokat specialiseret i franchiseaftaler inden underskrift

**Deal-breakers:**
- Hvis franchisegiver ikke vil forhandle opsigelsesvilkår og territorial beskyttelse, frarådes det kraftigt at indgå aftalen.

**Acceptable elementer:**
- Royalty på 8% er markedskonform for kaffebranche
- 5 års kontraktperiode er acceptabel hvis fornyelsesret tilføjes`,
  executionTime: 45230,
  cliVersion: '2.0.70'
};

const testMetadata = {
  originalFileName: 'kaffehuset-franchiseaftale-2025.txt',
  originalFormat: 'txt',
  clientName: 'Jan Jensen / Kaffehuset Aarhus',
  documentType: 'contract',
  processedDate: new Date()
};

const testBranding = {
  companyName: 'Special Minds ApS',
  footerText: 'Fortroligt - Kun til intern brug',
  primaryColor: '#1a73e8',
  contactEmail: 'info@specialminds.com',
  contactPhone: '+45 12345678'
};

console.log('='.repeat(70));
console.log('REPORT GENERATOR TEST SUITE');
console.log('='.repeat(70));
console.log();

async function runTests() {
  const outputDir = path.join(__dirname, '..', 'output');
  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Generate Markdown Report
  console.log('Test 1: Generate Markdown Report');
  console.log('-'.repeat(70));
  try {
    const mdPath = path.join(outputDir, 'test-report.md');

    // Clean up if exists
    if (existsSync(mdPath)) {
      unlinkSync(mdPath);
    }

    const config = {
      format: 'md',
      outputPath: mdPath,
      cliResult: sampleCLIResult,
      metadata: testMetadata,
      branding: testBranding
    };

    const result = await generateMarkdownReport(config);

    testsRun++;
    if (existsSync(result)) {
      console.log(`✓ Markdown report generated: ${result}`);
      testsPassed++;
    } else {
      console.log(`✗ Markdown file not found: ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
    testsRun++;
    testsFailed++;
  }
  console.log();

  // Test 2: Generate PDF Report
  console.log('Test 2: Generate PDF Report');
  console.log('-'.repeat(70));
  try {
    const pdfPath = path.join(outputDir, 'test-report.pdf');

    // Clean up if exists
    if (existsSync(pdfPath)) {
      unlinkSync(pdfPath);
    }

    const config = {
      format: 'pdf',
      outputPath: pdfPath,
      cliResult: sampleCLIResult,
      metadata: testMetadata,
      branding: testBranding
    };

    const result = await generatePDFReport(config);

    testsRun++;
    if (existsSync(result)) {
      console.log(`✓ PDF report generated: ${result}`);
      testsPassed++;
    } else {
      console.log(`✗ PDF file not found: ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
    testsRun++;
    testsFailed++;
  }
  console.log();

  // Test 3: Generate Word Report
  console.log('Test 3: Generate Word Report');
  console.log('-'.repeat(70));
  try {
    const docxPath = path.join(outputDir, 'test-report.docx');

    // Clean up if exists
    if (existsSync(docxPath)) {
      unlinkSync(docxPath);
    }

    const config = {
      format: 'docx',
      outputPath: docxPath,
      cliResult: sampleCLIResult,
      metadata: testMetadata,
      branding: testBranding
    };

    const result = await generateWordReport(config);

    testsRun++;
    if (existsSync(result)) {
      console.log(`✓ Word report generated: ${result}`);
      testsPassed++;
    } else {
      console.log(`✗ Word file not found: ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
    testsRun++;
    testsFailed++;
  }
  console.log();

  // Test 4: Generate Report (convenience function)
  console.log('Test 4: Generate Report (Convenience Function)');
  console.log('-'.repeat(70));
  try {
    const conveniencePath = path.join(outputDir, 'test-report-convenience.pdf');

    // Clean up if exists
    if (existsSync(conveniencePath)) {
      unlinkSync(conveniencePath);
    }

    const config = {
      format: 'pdf',
      outputPath: conveniencePath,
      cliResult: sampleCLIResult,
      metadata: testMetadata,
      branding: testBranding
    };

    const result = await generateReport(config);

    testsRun++;
    if (existsSync(result)) {
      console.log(`✓ Report generated via convenience function: ${result}`);
      testsPassed++;
    } else {
      console.log(`✗ File not found: ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
    testsRun++;
    testsFailed++;
  }
  console.log();

  // Test 5: Report without branding (optional branding)
  console.log('Test 5: Report Without Branding');
  console.log('-'.repeat(70));
  try {
    const noBrandPath = path.join(outputDir, 'test-report-no-brand.md');

    // Clean up if exists
    if (existsSync(noBrandPath)) {
      unlinkSync(noBrandPath);
    }

    const config = {
      format: 'md',
      outputPath: noBrandPath,
      cliResult: sampleCLIResult,
      metadata: testMetadata
      // No branding
    };

    const result = await generateMarkdownReport(config);

    testsRun++;
    if (existsSync(result)) {
      console.log(`✓ Report generated without branding: ${result}`);
      testsPassed++;
    } else {
      console.log(`✗ File not found: ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
    testsRun++;
    testsFailed++;
  }
  console.log();

  // Test 6: Error handling - invalid config
  console.log('Test 6: Error Handling - Invalid Config');
  console.log('-'.repeat(70));
  try {
    const invalidConfig = {
      format: 'pdf',
      // Missing outputPath
      cliResult: sampleCLIResult,
      metadata: testMetadata
    };

    await generatePDFReport(invalidConfig);

    testsRun++;
    console.log(`✗ Should have thrown error for invalid config`);
    testsFailed++;
  } catch (error) {
    testsRun++;
    console.log(`✓ Correctly threw error: ${error.message}`);
    testsPassed++;
  }
  console.log();

  // Summary
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total tests run: ${testsRun}`);
  console.log(`Tests passed: ${testsPassed} (${Math.round(testsPassed / testsRun * 100)}%)`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log();

  if (testsFailed === 0) {
    console.log('✓ All tests passed! Phase 4 report generation is working.');
    console.log();
    console.log('Generated test files in output/:');
    console.log('  - test-report.md (Markdown)');
    console.log('  - test-report.pdf (PDF)');
    console.log('  - test-report.docx (Word)');
    console.log('  - test-report-convenience.pdf (via convenience function)');
    console.log('  - test-report-no-brand.md (without branding)');
    console.log();
    console.log('You can open these files to verify formatting and content.');
  } else {
    console.log(`✗ ${testsFailed} test(s) failed. Please review errors above.`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed with error:', error);
  process.exit(1);
});
