export const productCsvColumns = [
  { header: 'Part Code', key: 'partCode' },
  { header: 'Description', key: 'description' },
  { header: 'Brand', key: 'brand' },
  { header: 'Category', key: 'category' },
  { header: 'Sub Category', key: 'subCategory' },
  { header: 'Sub-sub Category', key: 'subSubCategory' },
  { header: 'HSN Code', key: 'hsnCode' },
  { header: 'GST Rate', key: 'taxRate' },
  { header: 'MRP', key: 'mrp' },
  { header: 'Active', key: 'isActive' },
  { header: 'Image URL', key: 'image' },
];

function csvCell(value) {
  const cell = String(value ?? '');
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

export function exportProductsCsv(products = []) {
  const lines = [productCsvColumns.map(({ header }) => csvCell(header)).join(',')];
  for (const product of products) {
    lines.push(productCsvColumns.map(({ key }) => csvCell(key === 'isActive' ? product.isActive === false ? 'No' : 'Yes' : key === 'partCode' ? product.partCode || product.code : key === 'description' ? product.description || product.name : product[key])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else cell += char;
    } else if (char === '"' && !cell && !closedQuote) {
      quoted = true;
    } else if (char === ',') {
      row.push(cell); cell = ''; closedQuote = false;
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); cell = ''; closedQuote = false;
      rows.push(row); row = [];
    } else {
      if (closedQuote) throw new Error(`Unexpected text after a quoted value on CSV row ${rows.length + 1}.`);
      if (char === '"') throw new Error(`Unexpected quote on CSV row ${rows.length + 1}.`);
      cell += char;
    }
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted value.');
  if (row.length || cell || closedQuote) { row.push(cell); rows.push(row); }
  return rows;
}

export function importProductsCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!rows.length) throw new Error('The CSV file is empty. Download the blank template first.');
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const positions = Object.fromEntries(productCsvColumns.map(({ header, key }) => [key, headers.indexOf(header.toLowerCase())]));
  const missing = productCsvColumns.filter(({ key }) => key !== 'subSubCategory' && positions[key] === -1).map(({ header }) => header);
  if (missing.length) throw new Error(`Missing column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`);
  const products = [];
  const errors = [];
  const seenCodes = new Set();
  rows.slice(1).forEach((row, index) => {
    if (row.every((value) => !value.trim())) return;
    const value = (key) => (row[positions[key]] || '').trim();
    const partCode = value('partCode').toUpperCase();
    const description = value('description');
    const category = value('category');
    const mrp = value('mrp');
    const gst = value('taxRate') || '18';
    const active = value('isActive').toLowerCase();
    const rowNumber = index + 2;
    if (!partCode || !description || !category || !mrp) { errors.push(`Row ${rowNumber}: Part Code, Description, Category, and MRP are required.`); return; }
    if (partCode.length > 40 || description.length > 1000 || value('brand').length > 80 || value('hsnCode').length > 20) { errors.push(`Row ${rowNumber}: a field exceeds its maximum length.`); return; }
    if (!/^\d+(?:\.\d+)?$/.test(mrp)) { errors.push(`Row ${rowNumber}: MRP must be a non-negative number.`); return; }
    if (![0, 5, 12, 18, 28].includes(Number(gst))) { errors.push(`Row ${rowNumber}: GST Rate must be 0, 5, 12, 18, or 28.`); return; }
    if (active && !['yes', 'no', 'true', 'false', '1', '0', 'active', 'inactive'].includes(active)) { errors.push(`Row ${rowNumber}: Active must be Yes or No.`); return; }
    if (seenCodes.has(partCode)) { errors.push(`Row ${rowNumber}: Part Code ${partCode} appears more than once.`); return; }
    seenCodes.add(partCode);
    products.push({ rowNumber, partCode, description, brand: value('brand'), category, subCategory: value('subCategory'), ...(positions.subSubCategory === -1 ? {} : { subSubCategory: value('subSubCategory') }), hsnCode: value('hsnCode'), taxRate: Number(gst), mrp: Number(mrp), isActive: !['no', 'false', '0', 'inactive'].includes(active), image: value('image') });
  });
  return { products, errors };
}
