import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// jsPDF's built-in Helvetica font does not include the Indian rupee glyph.
// Use an ASCII currency label so amounts remain readable in every PDF viewer.
const pdfText = (value) => String(value ?? '').replace(/₹|â‚¹/g, 'Rs. ');
const csvCell = (value) => `"${pdfText(value).replace(/"/g, '""')}"`;

const formatValue = (value, type) => {
  if (value === undefined || value === null || value === '') return '-';
  if (type === 'date') { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN'); }
  if (type === 'currency') return `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
  if (type === 'percent') return `${Number(value) || 0}%`;
  if (type === 'number') return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  return pdfText(value);
};

function drawBrandHeader(doc, report) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(41, 38, 79); doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('JB CORPORATION', 14, 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('Executive Management & Performance Report', 14, 18);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(42, 38, 69); doc.setFontSize(13); doc.text(pdfText(report.title), 14, 39);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(95, 93, 112); doc.setFontSize(8);
  const period = report.dateFrom || report.dateTo ? `${report.dateFrom || 'Beginning'} to ${report.dateTo || 'Today'}` : 'All time';
  doc.text(pdfText(`Period: ${period}   |   Scope: ${report.selectedCount || 'All Records'}   |   Sections: ${report.sections.length}   |   Generated: ${new Date(report.generatedAt).toLocaleString('en-IN')}`), 14, 46);
}

function footer(doc, report, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(125, 123, 140);
  doc.text(pdfText(`JB Corporation - ${report.title}`), 10, height - 6);
  doc.text(`Page ${pageNumber}`, pageWidth - 10, height - 6, { align: 'right' });
}

const reportDesigns = {
  standard(doc, report) {
    drawBrandHeader(doc, report);
    let cursorY = 54;
    report.sections.forEach((reportSection, sectionIndex) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (sectionIndex > 0 && cursorY > pageHeight - 45) { doc.addPage(); cursorY = 18; }
      doc.setFillColor(244, 242, 251); doc.roundedRect(10, cursorY, doc.internal.pageSize.getWidth() - 20, 9, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setTextColor(52, 48, 71); doc.setFontSize(9); doc.text(pdfText(reportSection.title), 14, cursorY + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(105, 101, 123); doc.text(`${reportSection.rows.length} rows`, doc.internal.pageSize.getWidth() - 14, cursorY + 6, { align: 'right' });
      autoTable(doc, {
        startY: cursorY + 11,
        head: [['#', ...reportSection.columns.map((column) => pdfText(column.label))]],
        body: reportSection.rows.length ? reportSection.rows.map((row, index) => [index + 1, ...reportSection.columns.map((column) => formatValue(row[column.key], column.type))]) : [['', 'No matching records', ...Array(Math.max(reportSection.columns.length - 1, 0)).fill('')]],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: reportSection.columns.length > 8 ? 5.5 : 6.8, cellPadding: 1.8, overflow: 'linebreak', textColor: [48, 46, 66], lineColor: [226, 225, 234], lineWidth: 0.15 },
        headStyles: { fillColor: [57, 44, 152], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 247, 252] },
        margin: { left: 10, right: 10, bottom: 12 },
      });
      cursorY = (doc.lastAutoTable?.finalY || cursorY + 20) + 10;
    });
    const pages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) { doc.setPage(page); footer(doc, report, page); }
  },
};

export function downloadReportPdf(report, design = 'standard') {
  if (!report?.sections?.length) throw new Error('Generate a report preview first.');
  const widest = Math.max(...report.sections.map((item) => item.columns.length), 0);
  const doc = new jsPDF({ orientation: widest > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  (reportDesigns[design] || reportDesigns.standard)(doc, report);
  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  doc.save(`${safeTitle}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function sectionReport(report, section) {
  if (!report || !section) throw new Error('Generate a report preview first.');
  return {
    ...report,
    title: `${report.title} - ${section.title}`,
    totalRows: section.rows?.length || 0,
    sections: [section],
  };
}

export function downloadReportSectionPdf(report, section) {
  downloadReportPdf(sectionReport(report, section));
}

export function downloadReportCsv(report) {
  if (!report?.sections?.length) throw new Error('Generate a report preview first.');
  const lines = [];
  lines.push(csvCell(`JB CORPORATION - ${report.title}`));
  lines.push(csvCell(`Generated: ${new Date(report.generatedAt).toLocaleString('en-IN')}`));
  lines.push(csvCell(`Period: ${report.dateFrom || report.dateTo ? `${report.dateFrom || 'Beginning'} to ${report.dateTo || 'Today'}` : 'All time'}`));
  lines.push(csvCell(`Scope: ${report.selectedCount || 'All Records'}`));
  lines.push('');

  report.sections.forEach((reportSection) => {
    lines.push(csvCell(`--- ${reportSection.title} (${reportSection.rows.length} rows) ---`));
    const headers = ['#', ...reportSection.columns.map((c) => c.label)];
    lines.push(headers.map(csvCell).join(','));
    if (reportSection.rows.length) {
      reportSection.rows.forEach((row, idx) => {
        const rowData = [
          idx + 1,
          ...reportSection.columns.map((col) => {
            const val = row[col.key];
            if (val === undefined || val === null) return '';
            return pdfText(val);
          }),
        ];
        lines.push(rowData.map(csvCell).join(','));
      });
    } else {
      lines.push('"No matching records"');
    }
    lines.push('');
  });

  const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadReportSectionCsv(report, section) {
  downloadReportCsv(sectionReport(report, section));
}
