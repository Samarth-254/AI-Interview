import { jsPDF } from 'jspdf';

/* Design tokens */
const C = {
  bg: '#0D0D0B',
  surface: '#151513',
  border: '#2A2A27',
  accent: '#FF5F1F',
  green: '#22C55E',
  red: '#F87171',
  white: '#F5F5F0',
  muted: '#8A8A85',
  dim: '#3D3D3A',
  textSec: '#C8C8C0',
};

/* Mirrors the app's getScoreColor thresholds exactly (lib/utils.js):
   <=4 -> fail, <7 -> accent, >=7 -> success */
const scoreColor = (score) => {
  const val = parseFloat(score);
  if (isNaN(val)) return C.muted;
  if (val <= 4.0) return C.red;
  if (val < 7.0) return C.accent;
  return C.green;
};

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const setFill = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); };
const setDraw = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); };
const setTxt = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); };

const rule = (doc, y, pageW, marginX) => {
  setDraw(doc, C.border);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
};

export const generateFeedbackPDF = (report, session, userName) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  const pageW = doc.internal.pageSize.getWidth();  // 595.28
  const pageH = doc.internal.pageSize.getHeight(); // 841.89
  const mX = 40;
  const colW = pageW - mX * 2;  // 515.28

  const fillPage = () => { setFill(doc, C.bg); doc.rect(0, 0, pageW, pageH, 'F'); };
  fillPage();

  let y = 0;

  /* ── HEADER BAND ── */
  setFill(doc, C.surface);
  doc.rect(0, 0, pageW, 72, 'F');
  setDraw(doc, C.border);
  doc.setLineWidth(0.4);
  doc.line(0, 72, pageW, 72);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setTxt(doc, C.accent);
  doc.text('INTERVIEWAI', mX, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setTxt(doc, C.muted);
  doc.text('FEEDBACK REPORT', mX, 46);

  const interviewLabel = (session?.interview_type || 'INTERVIEW').replace(/_/g, ' ').toUpperCase();
  const dateStr = session?.started_at
    ? new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  setTxt(doc, C.white);
  doc.text(interviewLabel, pageW - mX, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  setTxt(doc, C.muted);
  doc.text(dateStr, pageW - mX, 42, { align: 'right' });
  if (userName) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    setTxt(doc, C.white);
    doc.text(userName.toUpperCase(), pageW - mX, 56, { align: 'right' });
  }

  y = 100;

  /* ── OVERALL SCORE PANEL ──
     Height is computed dynamically from the actual wrapped line count of
     overall_impression — never hardcoded, never truncated to N lines. */
  const sc = report.overall_score ?? 0;
  const scoreColorHex = scoreColor(sc);

  // Measure description text BEFORE drawing the panel so we know how tall it needs to be.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const impressionText = report.detailed_feedback?.overall_impression || '';
  const descLines = impressionText ? doc.splitTextToSize(impressionText, colW - 60) : [];
  const descLineH = 12;

  const HEADER_BLOCK_H = 90; // space reserved for "OVERALL PERFORMANCE RATING" label + big score number
  const DESC_TOP_PAD = 14;
  const DESC_BOTTOM_PAD = 18;
  const descBlockH = descLines.length ? (descLines.length * descLineH + DESC_TOP_PAD + DESC_BOTTOM_PAD) : 0;
  const scorePanelH = Math.max(110, HEADER_BLOCK_H + descBlockH);

  setFill(doc, C.surface); setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(mX, y, colW, scorePanelH, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  setTxt(doc, C.muted);
  doc.text('OVERALL PERFORMANCE RATING', pageW / 2, y + 22, { align: 'center' });

  doc.setFont('helvetica', 'bold'); doc.setFontSize(52);
  const [sr, sg, sb] = hexToRgb(scoreColorHex);
  doc.setTextColor(sr, sg, sb);
  doc.text(String(sc), pageW / 2 - 14, y + 72, { align: 'center' });

  doc.setFontSize(20); setTxt(doc, C.dim);
  doc.text('/10', pageW / 2 + 22, y + 72, { align: 'left' });

  if (descLines.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    setTxt(doc, C.textSec);
    // Full text rendered, no slicing — panel above was sized to fit all of it.
    doc.text(descLines, pageW / 2, y + HEADER_BLOCK_H, { align: 'center' });
  }

  y += scorePanelH + 24;

  /* ── TWO-COLUMN: STRENGTHS + AREAS TO IMPROVE ── */
  const colPad = 10;
  const halfW = (colW - colPad) / 2;

  const renderCardList = (items, accent, label, startX, startY, cardWidth) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    setTxt(doc, accent);
    doc.text(label, startX, startY);
    setFill(doc, accent);
    doc.rect(startX, startY + 3, 28, 1.5, 'F');

    const lineH = 12;
    let cy = startY + 18;

    (items || []).forEach((item) => {
      const title = (item.area || '').toUpperCase();
      const desc = item.description || '';
      const descLines = doc.splitTextToSize(desc, cardWidth - 20);
      const cardH = 14 + descLines.length * lineH + 16;

      setFill(doc, C.surface); setDraw(doc, C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(startX, cy, cardWidth, cardH, 3, 3, 'FD');

      setFill(doc, accent);
      doc.rect(startX, cy, 3, cardH, 'F');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      setTxt(doc, accent);
      doc.text(title, startX + 11, cy + 13);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      setTxt(doc, C.textSec);
      doc.text(descLines, startX + 11, cy + 26);

      cy += cardH + 8;
    });
    return cy;
  };

  const leftX = mX;
  const rightX = mX + halfW + colPad;

  const leftEnd = renderCardList(report.strengths, C.green, 'STRENGTHS', leftX, y, halfW);
  const rightEnd = renderCardList(report.weaknesses, C.red, 'AREAS TO IMPROVE', rightX, y, halfW);

  y = Math.max(leftEnd, rightEnd) + 24;

  /* ── PAGE BREAK CHECK ── */
  const BREAKDOWN_LABELS = {
    communication: 'Communication',
    technical_depth: 'Technical Depth',
    examples_quality: 'Examples Quality',
    problem_solving: 'Problem Solving',
  };

  const breakdownEntries = Object.entries(BREAKDOWN_LABELS)
    .map(([key, label]) => ({ key, label, item: report.detailed_feedback?.[key] }))
    .filter(({ item }) => !!item);

  /* ── SCORE BREAKDOWN ─────────────────────────────────────────
     Fixed column layout (colW = 515.28pt):
       Label:  118pt wide, padded 12pt   → mX+12 to mX+130
       Notes:  from mX+164, 195pt wide   → ends at mX+359
       Gap:    14pt
       Bar:    90pt                       → mX+373 to mX+463
       Gap:    14pt (tightened — was ~70pt of dead space before)
       Score:  LEFT-aligned immediately after the bar, not pinned to
               the page's right edge — closes the old gap entirely.
  ─────────────────────────────────────────────────────────────── */
  const LABEL_W = 118;
  const NOTES_X = mX + LABEL_W + 12;     // 170
  const NOTES_W = 189;
  const BAR_X = NOTES_X + NOTES_W + 14; // 373
  const BAR_W = 90;
  const SCORE_GAP = 14;
  const SCORE_X = BAR_X + BAR_W + SCORE_GAP; // 477 — left edge for score number

  /* MEASURE FIRST — compute each row's real wrapped-line count and exact
     height up front, using the same font/size the draw loop uses, so the
     wrapping is never calculated twice. */
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  const measuredRows = breakdownEntries.map(({ label, item }) => {
    const descLines = doc.splitTextToSize(item.notes || '-', NOTES_W);
    const rowH = Math.max(38, descLines.length * 11 + 18);
    return { label, item, descLines, rowH };
  });

  const ROW_GAP = 6;
  const FOOTER_RESERVE = 60;
  const SECTION_TITLE_H = 18 + 16; // rule + spacing before "SCORE BREAKDOWN" label

  const drawSectionHeader = () => {
    rule(doc, y, pageW, mX);
    y += 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    setTxt(doc, C.muted);
    doc.text('SCORE BREAKDOWN', mX, y);
    y += 16;
  };

  // Only force a fresh page up front if there isn't even room for the
  // section title + a single row — otherwise let rows fill whatever
  // space remains on the current page and overflow row-by-row.
  if (y + SECTION_TITLE_H + measuredRows[0]?.rowH > pageH - FOOTER_RESERVE) {
    doc.addPage();
    fillPage();
    y = 50;
  }

  drawSectionHeader();

  measuredRows.forEach(({ label, item, descLines, rowH }, idx) => {
    // Per-row fit check: if this specific row won't fit in the remaining
    // space, break the page HERE instead of dragging the whole section
    // along — this is what prevents large unused gaps on the prior page.
    if (y + rowH > pageH - FOOTER_RESERVE) {
      doc.addPage();
      fillPage();
      y = 50;
      drawSectionHeader();
    }

    setFill(doc, C.surface); setDraw(doc, C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(mX, y, colW, rowH, 3, 3, 'FD');

    const midY = y + rowH / 2;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    setTxt(doc, C.white);
    doc.text(label.toUpperCase(), mX + 12, midY + 2.5);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    setTxt(doc, C.textSec);
    const notesTopY = y + (rowH - descLines.length * 11) / 2 + 7;
    doc.text(descLines, NOTES_X, notesTopY);

    const barY = midY - 2.5;
    setFill(doc, C.dim);
    doc.roundedRect(BAR_X, barY, BAR_W, 5, 2, 2, 'F');

    const pct = Math.min(1, (item.score ?? 0) / 10);
    const rowColorHex = scoreColor(item.score);
    const [fr, fg, fb] = hexToRgb(rowColorHex);
    doc.setFillColor(fr, fg, fb);
    if (pct > 0) doc.roundedRect(BAR_X, barY, BAR_W * pct, 5, 2, 2, 'F');

    // Score number — left-aligned right after the bar, "/10" follows immediately
    // after measuring the actual rendered width (no fixed offset guesswork).
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const scoreStr = String(item.score ?? 0);
    const scoreStrW = doc.getTextWidth(scoreStr);
    doc.setTextColor(fr, fg, fb);
    doc.text(scoreStr, SCORE_X, midY + 3);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    setTxt(doc, C.dim);
    doc.text('/10', SCORE_X + scoreStrW + 2, midY + 3);

    y += rowH + ROW_GAP;
  });

  /* ── FOOTER (drawn on every page, with correct page numbers) ── */
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageH - 28;
    rule(doc, footerY - 8, pageW, mX);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    setTxt(doc, C.dim);
    doc.text('Generated by InterviewAI', mX, footerY);
    doc.text(`Page ${p} of ${totalPages}`, pageW - mX, footerY, { align: 'right' });
  }

  /* ── SAVE ── */
  const dateTag = new Date().toISOString().slice(0, 10);
  const type = (session?.interview_type || 'interview').replace(/_/g, '-');
  doc.save(`interviewai-report-${type}-${dateTag}.pdf`);
};