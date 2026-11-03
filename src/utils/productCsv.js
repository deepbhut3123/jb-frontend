export const productCsvColumns = [
  { header: 'Part Code', key: 'partCode' },
  { header: 'Description', key: 'description' },
  { header: 'Brand', key: 'brand' },
  { header: 'Category', key: 'category' },
  { header: 'Sub Category', key: 'subCategory' },
  { header: 'Sub-sub Category', key: 'subSubCategory' },
  { header: 'HSN Code', key: 'hsnCode' },
  { header: 'GST Rate', key: 'taxRate' },
  { header: 'Currency', key: 'currency' },
  { header: 'Price', key: 'price' },
  { header: 'Margin %', key: 'marginPercent' },
  { header: 'Active', key: 'isActive' },
  { header: 'Image URL', key: 'image' },
];

function csvCell(value) {
  const cell = String(value ?? '');
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

function productCurrency(product) {
  return product.currency || (Number(product.dollarAmount) > 0 ? 'USD' : 'INR');
}

export function exportProductsCsv(products = []) {
  const lines = [productCsvColumns.map(({ header }) => csvCell(header)).join(',')];
  for (const product of products) {
    lines.push(productCsvColumns.map(({ key }) => csvCell(key === 'isActive' ? product.isActive === false ? 'No' : 'Yes' : key === 'partCode' ? product.partCode || product.code : key === 'description' ? product.description || product.name : key === 'price' ? (productCurrency(product) === 'INR' ? product.finalRate ?? product.mrp ?? product.salePrice : product.dollarAmount) : key === 'currency' ? productCurrency(product) : product[key])).join(','));
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
  const aliases = { price: ['price', 'usd price', 'dollar amount (usd)', 'dollar amount', 'mrp'], currency: ['currency'], marginPercent: ['margin %', 'margin percentage'] };
  const positions = Object.fromEntries(productCsvColumns.map(({ header, key }) => [key, (aliases[key] || [header.toLowerCase()]).map((alias) => headers.indexOf(alias)).find((position) => position !== -1) ?? -1]));
  const missing = productCsvColumns.filter(({ key }) => !['subSubCategory', 'marginPercent', 'currency', 'isActive', 'image'].includes(key) && positions[key] === -1).map(({ header }) => header);
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
    const price = value('price');
    const currency = (positions.currency === -1 ? 'USD' : value('currency') || 'USD').toUpperCase();
    const marginPercent = value('marginPercent') || '0';
    const gst = value('taxRate') || '18';
    const active = value('isActive').toLowerCase();
    const rowNumber = index + 2;
    if (!partCode || !description || !category || price === '') { errors.push(`Row ${rowNumber}: Part Code, Description, Category, Currency, and Price are required.`); return; }
    if (!['USD', 'INR'].includes(currency)) { errors.push(`Row ${rowNumber}: Currency must be USD or INR.`); return; }
    if (partCode.length > 40 || description.length > 1000 || value('brand').length > 80 || value('hsnCode').length > 20) { errors.push(`Row ${rowNumber}: a field exceeds its maximum length.`); return; }
    if (!/^\d+(?:\.\d+)?$/.test(price)) { errors.push(`Row ${rowNumber}: Price must be a non-negative number.`); return; }
    if (!/^\d+(?:\.\d+)?$/.test(marginPercent)) { errors.push(`Row ${rowNumber}: Margin % must be a non-negative number.`); return; }
    if (![0, 5, 12, 18, 28].includes(Number(gst))) { errors.push(`Row ${rowNumber}: GST Rate must be 0, 5, 12, 18, or 28.`); return; }
    if (active && !['yes', 'no', 'true', 'false', '1', '0', 'active', 'inactive'].includes(active)) { errors.push(`Row ${rowNumber}: Active must be Yes or No.`); return; }
    if (seenCodes.has(partCode)) { errors.push(`Row ${rowNumber}: Part Code ${partCode} appears more than once.`); return; }
    seenCodes.add(partCode);
    products.push({ rowNumber, partCode, description, brand: value('brand'), category, subCategory: value('subCategory'), ...(positions.subSubCategory === -1 ? {} : { subSubCategory: value('subSubCategory') }), hsnCode: value('hsnCode'), taxRate: Number(gst), currency, ...(currency === 'USD' ? { dollarAmount: Number(price), marginPercent: Number(marginPercent) } : { mrp: Number(price), dollarAmount: 0, marginPercent: 0 }), isActive: !['no', 'false', '0', 'inactive'].includes(active), image: value('image') });
  });
  return { products, errors };
}
