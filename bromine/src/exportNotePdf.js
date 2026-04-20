import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TITLE_SIZE = 24;
const BODY_SIZE = 11.5;
const LINE_HEIGHT = 16;

const sanitizeFileName = (value = '') =>
  String(value || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled';

const htmlToPlainText = (html = '') => {
  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  container.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, tr').forEach((node) => {
    node.append(document.createTextNode('\n'));
  });

  return container.textContent?.replace(/\n{3,}/g, '\n\n').trim() || '';
};

const wrapText = (text, font, fontSize, maxWidth) => {
  const rawLines = String(text || '').split('\n');
  const lines = [];

  rawLines.forEach((rawLine) => {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push('');
      return;
    }

    let currentLine = words[0];

    for (let index = 1; index < words.length; index += 1) {
      const nextLine = `${currentLine} ${words[index]}`;
      if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
        currentLine = nextLine;
      } else {
        lines.push(currentLine);
        currentLine = words[index];
      }
    }

    lines.push(currentLine);
  });

  return lines;
};

export const exportNoteAsPdf = async ({ title = '', content = '' }) => {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const safeTitle = sanitizeFileName(title);
  const textContent = htmlToPlainText(content) || 'No content';
  const bodyLines = wrapText(textContent, bodyFont, BODY_SIZE, PAGE_WIDTH - MARGIN * 2);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;

  page.drawText(safeTitle, {
    x: MARGIN,
    y: cursorY,
    size: TITLE_SIZE,
    font: titleFont,
    color: rgb(0.11, 0.11, 0.12),
  });

  cursorY -= 34;
  page.drawText(new Date().toLocaleString(), {
    x: MARGIN,
    y: cursorY,
    size: 9,
    font: bodyFont,
    color: rgb(0.45, 0.45, 0.48),
  });

  cursorY -= 28;

  bodyLines.forEach((line) => {
    if (cursorY <= MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - MARGIN;
    }

    page.drawText(line, {
      x: MARGIN,
      y: cursorY,
      size: BODY_SIZE,
      font: bodyFont,
      color: rgb(0.14, 0.14, 0.16),
    });

    cursorY -= LINE_HEIGHT;
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeTitle}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
};
