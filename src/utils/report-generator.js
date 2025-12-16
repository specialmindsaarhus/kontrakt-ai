import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { marked } from 'marked';
import { createWriteStream } from 'fs';

/**
 * Report Generator Utility
 * Generates professional reports in PDF, Word, and Markdown formats
 */

/**
 * Generate a markdown report from CLI analysis results
 * Saves the raw markdown output with metadata header
 *
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated markdown file
 */
export async function generateMarkdownReport(config) {
  try {
    // Validate config
    validateReportConfig(config, 'md');

    // Ensure output directory exists
    ensureDirectoryExists(path.dirname(config.outputPath));

    // Build metadata header
    const metadata = buildMetadataHeader(config);

    // Combine metadata and output
    const content = `${metadata}\n\n---\n\n${config.cliResult.output || ''}`;

    // Write to file
    writeFileSync(config.outputPath, content, 'utf8');

    return config.outputPath;
  } catch (error) {
    throw new Error(`Failed to generate markdown report: ${error.message}`);
  }
}

/**
 * Generate a PDF report from CLI analysis results
 * Creates a professional, client-ready PDF with branding
 *
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated PDF file
 */
export async function generatePDFReport(config) {
  return new Promise((resolve, reject) => {
    try {
      // Validate config
      validateReportConfig(config, 'pdf');

      // Ensure output directory exists
      ensureDirectoryExists(path.dirname(config.outputPath));

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      });

      // Pipe to file
      const stream = createWriteStream(config.outputPath);
      doc.pipe(stream);

      // Add content
      addPDFCoverPage(doc, config);
      doc.addPage();
      addPDFContent(doc, config);

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      stream.on('finish', () => {
        resolve(config.outputPath);
      });

      stream.on('error', (error) => {
        reject(new Error(`Failed to write PDF: ${error.message}`));
      });

    } catch (error) {
      reject(new Error(`Failed to generate PDF report: ${error.message}`));
    }
  });
}

/**
 * Generate a Word document report from CLI analysis results
 * Creates an editable DOCX file with professional formatting
 *
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated DOCX file
 */
export async function generateWordReport(config) {
  try {
    // Validate config
    validateReportConfig(config, 'docx');

    // Ensure output directory exists
    ensureDirectoryExists(path.dirname(config.outputPath));

    // Parse markdown to create document structure
    const sections = parseMarkdownToSections(config.cliResult.output || '');

    // Build document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'Analyse Rapport',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Metadata
          ...buildWordMetadata(config),

          // Horizontal line
          new Paragraph({
            text: '___________________________________________________________________________',
            spacing: { before: 200, after: 400 }
          }),

          // Content
          ...buildWordContent(sections)
        ]
      }]
    });

    // Write to file
    const buffer = await Packer.toBuffer(doc);
    writeFileSync(config.outputPath, buffer);

    return config.outputPath;
  } catch (error) {
    throw new Error(`Failed to generate Word report: ${error.message}`);
  }
}

/**
 * Validate report configuration
 * @private
 */
function validateReportConfig(config, expectedFormat) {
  if (!config) {
    throw new Error('Report configuration is required');
  }

  if (config.format !== expectedFormat) {
    throw new Error(`Invalid format: expected ${expectedFormat}, got ${config.format}`);
  }

  if (!config.outputPath) {
    throw new Error('Output path is required');
  }

  if (!config.cliResult) {
    throw new Error('CLI result is required');
  }

  if (!config.metadata) {
    throw new Error('Metadata is required');
  }
}

/**
 * Ensure directory exists, create if not
 * @private
 */
function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Build metadata header for markdown reports
 * @private
 */
function buildMetadataHeader(config) {
  const { metadata, cliResult, branding } = config;
  const date = new Date().toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let header = '# Analyse Rapport\n\n';
  header += '## Dokument Information\n\n';
  header += `**Dokument:** ${metadata.originalFileName}\n\n`;
  if (metadata.clientName) {
    header += `**Klient:** ${metadata.clientName}\n\n`;
  }
  header += `**Analyseret:** ${date}\n\n`;
  header += `**Analysetype:** ${getAnalysisTypeName(metadata.documentType)}\n\n`;
  header += `**Analyseret med:** ${cliResult.provider} CLI${cliResult.cliVersion ? ` v${cliResult.cliVersion}` : ''}\n\n`;

  if (branding?.companyName) {
    header += `**Generet af:** ${branding.companyName}\n\n`;
  }

  return header;
}

/**
 * Get Danish name for analysis type
 * @private
 */
function getAnalysisTypeName(documentType) {
  const types = {
    'contract': 'Kontrakt Gennemgang',
    'manual': 'Manual Gennemgang',
    'compliance': 'Compliance Check'
  };
  return types[documentType] || 'Generel Analyse';
}

/**
 * Add cover page to PDF
 * @private
 */
function addPDFCoverPage(doc, config) {
  const { metadata, branding } = config;
  const primaryColor = branding?.primaryColor || '#1a73e8';

  // Title
  doc.fontSize(28)
     .fillColor(primaryColor)
     .text('ANALYSE RAPPORT', { align: 'center' });

  doc.moveDown(2);

  // Company name if provided
  if (branding?.companyName) {
    doc.fontSize(14)
       .fillColor('#333333')
       .text(branding.companyName, { align: 'center' });
    doc.moveDown(3);
  } else {
    doc.moveDown(2);
  }

  // Document info box
  doc.fontSize(12)
     .fillColor('#666666');

  const date = new Date().toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  doc.text(`Dokument: ${metadata.originalFileName}`, { align: 'left' });
  if (metadata.clientName) {
    doc.text(`Klient: ${metadata.clientName}`, { align: 'left' });
  }
  doc.text(`Dato: ${date}`, { align: 'left' });
  doc.text(`Type: ${getAnalysisTypeName(metadata.documentType)}`, { align: 'left' });

  // Footer text on cover page
  doc.moveDown(10);
  doc.fontSize(10)
     .fillColor('#999999')
     .text(branding?.footerText || 'Fortroligt dokument', { align: 'center' });
}

/**
 * Add main content to PDF
 * @private
 */
function addPDFContent(doc, config) {
  const content = config.cliResult.output || 'Ingen analyse tilgængelig.';
  const sections = parseMarkdownToSections(content);

  sections.forEach(section => {
    if (section.type === 'heading1') {
      doc.fontSize(18)
         .fillColor('#1a73e8')
         .text(section.content, { continued: false });
      doc.moveDown(0.5);
    } else if (section.type === 'heading2') {
      doc.fontSize(14)
         .fillColor('#333333')
         .text(section.content, { continued: false });
      doc.moveDown(0.3);
    } else if (section.type === 'heading3') {
      doc.fontSize(12)
         .fillColor('#333333')
         .text(section.content, { continued: false });
      doc.moveDown(0.2);
    } else if (section.type === 'paragraph') {
      doc.fontSize(10)
         .fillColor('#333333')
         .text(section.content, {
           align: 'left',
           continued: false
         });
      doc.moveDown(0.5);
    } else if (section.type === 'list-item') {
      doc.fontSize(10)
         .fillColor('#333333')
         .text(`• ${section.content}`, {
           indent: 20,
           continued: false
         });
    }
  });
}

/**
 * Add footer to all PDF pages
 * @private
 */
function addPDFFooter(doc, config) {
  const { branding } = config;
  const pageCount = doc.bufferedPageRange().count;

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    doc.fontSize(8)
       .fillColor('#999999')
       .text(
         `Side ${i + 1} af ${pageCount}`,
         72,
         doc.page.height - 50,
         { align: 'center' }
       );

    if (branding?.companyName) {
      doc.text(
        branding.companyName,
        72,
        doc.page.height - 35,
        { align: 'center' }
      );
    }
  }
}

/**
 * Parse markdown content into structured sections
 * @private
 */
function parseMarkdownToSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];

  lines.forEach(line => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      sections.push({ type: 'heading1', content: trimmed.substring(2) });
    } else if (trimmed.startsWith('## ')) {
      sections.push({ type: 'heading2', content: trimmed.substring(3) });
    } else if (trimmed.startsWith('### ')) {
      sections.push({ type: 'heading3', content: trimmed.substring(4) });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      sections.push({ type: 'list-item', content: trimmed.substring(2) });
    } else if (trimmed.length > 0 && !trimmed.startsWith('```')) {
      sections.push({ type: 'paragraph', content: trimmed });
    }
  });

  return sections;
}

/**
 * Build metadata paragraphs for Word document
 * @private
 */
function buildWordMetadata(config) {
  const { metadata, cliResult, branding } = config;
  const date = new Date().toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const paragraphs = [];

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({ text: 'Dokument: ', bold: true }),
      new TextRun({ text: metadata.originalFileName })
    ],
    spacing: { after: 100 }
  }));

  if (metadata.clientName) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Klient: ', bold: true }),
        new TextRun({ text: metadata.clientName })
      ],
      spacing: { after: 100 }
    }));
  }

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({ text: 'Dato: ', bold: true }),
      new TextRun({ text: date })
    ],
    spacing: { after: 100 }
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({ text: 'Analysetype: ', bold: true }),
      new TextRun({ text: getAnalysisTypeName(metadata.documentType) })
    ],
    spacing: { after: 100 }
  }));

  if (branding?.companyName) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Generet af: ', bold: true }),
        new TextRun({ text: branding.companyName })
      ],
      spacing: { after: 100 }
    }));
  }

  return paragraphs;
}

/**
 * Build Word document content from parsed sections
 * @private
 */
function buildWordContent(sections) {
  const paragraphs = [];

  sections.forEach(section => {
    if (section.type === 'heading1') {
      paragraphs.push(new Paragraph({
        text: section.content,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
    } else if (section.type === 'heading2') {
      paragraphs.push(new Paragraph({
        text: section.content,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }));
    } else if (section.type === 'heading3') {
      paragraphs.push(new Paragraph({
        text: section.content,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }));
    } else if (section.type === 'paragraph') {
      paragraphs.push(new Paragraph({
        text: section.content,
        spacing: { after: 150 }
      }));
    } else if (section.type === 'list-item') {
      paragraphs.push(new Paragraph({
        text: section.content,
        bullet: { level: 0 },
        spacing: { after: 100 }
      }));
    }
  });

  return paragraphs;
}

/**
 * Generate a report in the specified format
 * Convenience function that routes to the appropriate generator
 *
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated report file
 */
export async function generateReport(config) {
  switch (config.format) {
    case 'md':
      return generateMarkdownReport(config);
    case 'pdf':
      return generatePDFReport(config);
    case 'docx':
      return generateWordReport(config);
    default:
      throw new Error(`Unsupported report format: ${config.format}`);
  }
}
