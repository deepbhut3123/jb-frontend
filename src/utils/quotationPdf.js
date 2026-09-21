import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import QRCode from "qrcode";
import { API_URL } from "../services/api.js";
import logoUrl from "../assets/jb-corporation-icon.png";
import tlxLogoUrl from "../assets/tlx-logo.png";
import locationIconUrl from "../assets/contact-location.svg";
import phoneIconUrl from "../assets/contact-phone.svg";
import emailIconUrl from "../assets/contact-email.svg";
import webIconUrl from "../assets/contact-web.svg";

const COMPANY = {
  name: "JB CORPORATION",
  tagline: "Precision You Can Trust. Performance You Can Rely On.",
  address: "Shed No.151, Ved Industrial Park-2, Bhuvaldi Road, B/H Shreenath Estate, Near Hinglaj Mata Temple, Kathwada, Ahmedabad, Gujarat - 382430",
  phone: "+91 9265581679",
  email: "jbcorporation2023@gmail.com",
  website: "www.jbcorporation.co.in",
  bankName: "The Kalupur Commercial Co-op Bank Ltd",
  accountNumber: "03920101971",
  ifsc: "KCCB0KTW039",
  branch: "Kathwada, Ahmedabad",
  upiId: "jbcorporation2023@okaxis",
};

const BLUE = [9, 67, 135];
const ORANGE = [244, 102, 15];
const LIGHT_BLUE = [234, 242, 249];
const TEXT = [25, 39, 65];
const LIGHT_ORANGE = [255, 231, 214];

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateText(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date).replaceAll(" ", "-");
}

function quotationNumber(quotation) {
  const year = quotation.quotationYear || new Date(quotation.quotationDate || quotation.createdAt || Date.now()).getFullYear();
  const serial = quotation.serialNumber || 1;
  const initial = String(quotation.creatorInitial || quotation.createdByName || "J").trim().charAt(0).toUpperCase();
  const revision = Number(quotation.revisionNumber || 0) > 0 ? `/R${quotation.revisionNumber}` : "";
  return `JB/QTN/${year}/${serial}/${initial}${revision}`;
}

function numberToWords(value) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const belowThousand = (number) => {
    const parts = [];
    if (number >= 100) { parts.push(`${ones[Math.floor(number / 100)]} Hundred`); number %= 100; }
    if (number >= 20) { parts.push(tens[Math.floor(number / 10)]); number %= 10; }
    if (number > 0) parts.push(ones[number]);
    return parts.join(" ");
  };
  let number = Math.round(Number(value || 0));
  if (!number) return "Zero";
  const parts = [];
  [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]].forEach(([size, label]) => {
    if (number >= size) { parts.push(`${belowThousand(Math.floor(number / size))} ${label}`); number %= size; }
  });
  if (number) parts.push(belowThousand(number));
  return parts.join(" ");
}

function sectionTitle(doc, title, x, y, width, color = ORANGE) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, width, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 3, y + 4.8);
}

function card(doc, x, y, width, height) {
  doc.setFillColor(...LIGHT_BLUE);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, "F");
}

function field(doc, label, value, x, y, valueX, maxWidth, size = 7.6) {
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(":", valueX - 4, y);
  doc.text(String(value || "-"), valueX, y, { maxWidth });
}

async function imageData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Image could not be loaded.");
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function trimmedImageData(url) {
  const data = await imageData(url);
  const source = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = data;
  });
  const scale = Math.min(1, 1200 / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width;
  let top = canvas.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      const visible = pixels[offset + 3] > 20 && (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245);
      if (!visible) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return data;
  const padding = 4;
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(canvas.width - 1, right + padding); bottom = Math.min(canvas.height - 1, bottom + padding);
  const output = document.createElement("canvas");
  output.width = right - left + 1;
  output.height = bottom - top + 1;
  output.getContext("2d").drawImage(canvas, left, top, output.width, output.height, 0, 0, output.width, output.height);
  return output.toDataURL("image/png");
}

function productImageUrl(value) {
  if (!value) return "";
  if (/^(data:|blob:|https?:)/i.test(value)) return value;
  return new URL(String(value).replace(/^\/+/, ""), API_URL).toString();
}

async function productImage(value) {
  const data = await imageData(productImageUrl(value));
  const source = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = data;
  });
  const width = source.naturalWidth || 1;
  const height = source.naturalHeight || 1;
  const scale = Math.min(1, 600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL("image/png"), width, height };
}

async function svgPngData(url, width = 480, height = 160, tint = "") {
  const response = await fetch(url);
  if (!response.ok) throw new Error("SVG asset could not be loaded.");
  let source = await response.text();
  if (tint) source = source.replaceAll("#094787", tint).replaceAll("#f4660f", tint);
  const objectUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    context.drawImage(image, (width - renderedWidth) / 2, (height - renderedHeight) / 2, renderedWidth, renderedHeight);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function addPageFooter(doc, contactIcons) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFillColor(...BLUE);
    doc.roundedRect(10, 284.5, 190, 9.5, 1.2, 1.2, "F");
    const footerContacts = [[contactIcons.location, COMPANY.address], [contactIcons.phone, COMPANY.phone], [contactIcons.email, COMPANY.email], [contactIcons.web, COMPANY.website]];
    const footerX = [13, 94, 128, 165];
    footerContacts.forEach(([icon, value], index) => {
      if (icon) doc.addImage(icon, "PNG", footerX[index] - 2, 287.1, 3.8, 3.8, undefined, "FAST");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(index === 0 ? 4.6 : 5.8);
      doc.text(value, footerX[index] + 4.3, index === 0 ? 288.4 : 289.9, { maxWidth: index === 0 ? 72 : 30, lineHeightFactor: 1.08 });
    });
  }
}

export async function downloadQuotationPdf({ quotation, lead, products = [] }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({ title: `Quotation ${quotationNumber(quotation)}`, subject: `Quotation for ${quotation.company || "company"}`, author: COMPANY.name });
  const svgAssets = await Promise.all([
    ...[locationIconUrl, phoneIconUrl, emailIconUrl, webIconUrl].map((url) => svgPngData(url, 128, 128, "#f4660f").catch(() => null)),
  ]);
  const [locationIcon, phoneIcon, emailIcon, webIcon] = svgAssets;
  const [brandLogo, tlxLogo] = await Promise.all([trimmedImageData(logoUrl).catch(() => null), trimmedImageData(tlxLogoUrl).catch(() => null)]);

  if (brandLogo) doc.addImage(brandLogo, "PNG", 20, 3, 14, 14, undefined, "FAST");
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(COMPANY.name, 10, 21.5);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  doc.text(["Precision You Can Trust.", "Performance You Can Rely On."], 33.5, 24, { align: "center", lineHeightFactor: 1.08 });
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.45);
  doc.line(57, 3, 57, 27);
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(["Your Partner", "in Motion"], 63, 8, { lineHeightFactor: 1.08 });
  doc.text("for a", 63, 17);
  doc.setTextColor(...ORANGE);
  doc.setFont("helvetica", "bold");
  doc.text("Better", 73, 17);
  doc.text("Tomorrow", 63, 21.5);
  if (tlxLogo) doc.addImage(tlxLogo, "PNG", 148, 2.5, 47, 23, undefined, "FAST"); else {
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("TL", 150, 21);
    doc.setTextColor(...ORANGE);
    doc.text("X", 174, 21);
  }

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(10, 29, 200, 29);

  const address = [lead?.address1, lead?.address2, [lead?.area, lead?.city, lead?.state].filter(Boolean).join(", ")].filter(Boolean);
  card(doc, 6, 32, 106, 59);
  card(doc, 116, 43, 84, 16);
  card(doc, 116, 60, 84, 31);
  doc.setFillColor(...BLUE);
  doc.roundedRect(116, 32, 84, 9, 1.4, 1.4, "F");
  doc.setFillColor(...ORANGE);
  doc.triangle(119, 41, 126, 41, 133, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("QUOTATION", 195, 38.3, { align: "right" });
  doc.setTextColor(...TEXT);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("To,", 10, 39);
  doc.setFontSize(11.5);
  doc.text(`M/s. ${quotation.company || ""}`, 10, 45, { maxWidth: 97 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  let companyY = 51;
  address.slice(0, 3).forEach((line) => { doc.text(String(line), 10, companyY, { maxWidth: 97 }); companyY += 4.4; });
  field(doc, "Contact Person", [quotation.contactName, quotation.contactRole].filter(Boolean).join(" - "), 10, 69, 47, 60, 8);
  field(doc, "Contact No.", quotation.phone, 10, 75, 47, 60, 8);
  field(doc, "Email", quotation.email, 10, 81, 47, 60, 8);

  const validUntil = new Date(quotation.quotationDate || quotation.createdAt || Date.now());
  validUntil.setDate(validUntil.getDate() + 15);
  field(doc, "Quotation No.", quotationNumber(quotation), 120, 47.8, 152, 43, 8);
  field(doc, "Date", dateText(quotation.quotationDate || quotation.createdAt), 120, 52.4, 152, 43, 8);
  field(doc, "Valid Until", dateText(validUntil), 120, 57, 152, 43, 8);
  field(doc, "Kind Attn.", [quotation.contactName, quotation.contactRole].filter(Boolean).join(" - "), 120, 66, 152, 43, 8);
  field(doc, "Subject", "Quotation for Linear Motion Products", 120, 71, 152, 43, 8);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Dear Sir/Madam,", 120, 79);
  doc.text("Thank you for your enquiry. We are pleased to submit our best offer for the following items.", 120, 83, { maxWidth: 75, lineHeightFactor: 1.12 });

  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const quotationItems = quotation.items || [];
  const productImages = await Promise.all(quotationItems.map((item) => {
    const image = productMap.get(String(item.productId))?.image;
    return image ? productImage(image).catch(() => null) : null;
  }));
  const freightPacking = Math.max(Number(quotation.freightPacking || 0), 0);
  const productsAmount = quotationItems.reduce((total, item) => total + Number(item.lineTotal ?? (Number(item.quantity || 0) * Number(item.unitPrice || 0))), 0);
  const generalDiscountAmount = Math.min(Math.max(Number(quotation.generalDiscountAmount || 0), 0), productsAmount);
  const generalDiscountFactor = productsAmount > 0 ? (productsAmount - generalDiscountAmount) / productsAmount : 1;
  const productTaxAmount = quotationItems.reduce((total, item) => {
    const lineAmount = Number(item.lineTotal ?? (Number(item.quantity || 0) * Number(item.unitPrice || 0)));
    const taxableLineAmount = lineAmount * generalDiscountFactor;
    return total + taxableLineAmount * Number(item.taxRate || 0) / 100;
  }, 0);
  const taxAmount = Number((productTaxAmount + freightPacking * 0.18).toFixed(2));
  const taxableAmount = Number(quotation.amount || 0);
  const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));
  const rows = quotationItems.map((item, index) => {
    const product = productMap.get(String(item.productId)) || {};
    const description = item.description || item.productName || "Product";
    const quantity = Number(item.quantity || 0);
    const lineAmount = Number(item.lineTotal ?? (quantity * Number(item.unitPrice || 0)));
    const effectiveRate = quantity > 0 ? lineAmount / quantity : Number(item.unitPrice || 0);
    return [
      index + 1,
      description,
      product.brand || "-",
      item.productCode || product.partCode || product.code || "-",
      money(quantity).replace(/\.00$/, ""),
      item.unit || product.unit || "Nos.",
      money(effectiveRate),
      money(lineAmount),
    ];
  });
  autoTable(doc, {
    startY: 94,
    head: [["Sr.", "Product Description", "Brand", "Model / Code", "Qty.", "Unit", "Rate (Rs.)", "Amount (Rs.)"]],
    body: rows,
    margin: { left: 10, right: 10, bottom: 14 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7, textColor: TEXT, lineColor: [204, 216, 227], lineWidth: 0.2, cellPadding: 1.5, valign: "middle" },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: 9, halign: "center" }, 1: { cellWidth: 52 }, 2: { cellWidth: 20 }, 3: { cellWidth: 25 }, 4: { cellWidth: 11, halign: "center" }, 5: { cellWidth: 14, halign: "center" }, 6: { cellWidth: 27, halign: "right" }, 7: { cellWidth: 32, halign: "right" } },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1 && productImages[data.row.index]) {
        data.cell.styles.cellPadding = { top: 1.5, right: 1.5, bottom: 1.5, left: 13 };
        data.cell.styles.minCellHeight = 12;
      }
    },
    didDrawCell(data) {
      const image = data.section === "body" && data.column.index === 1 ? productImages[data.row.index] : null;
      if (!image) return;
      const maxWidth = 8.5;
      const maxHeight = 8.5;
      const ratio = image.width / image.height;
      const width = ratio >= 1 ? maxWidth : maxHeight * ratio;
      const height = ratio >= 1 ? maxWidth / ratio : maxHeight;
      const x = data.cell.x + 1.5 + (maxWidth - width) / 2;
      const imageY = data.cell.y + (data.cell.height - height) / 2;
      doc.addImage(image.data, "PNG", x, imageY, width, height, undefined, "FAST");
    },
    showHead: "everyPage",
  });

  let y = doc.lastAutoTable.finalY + 6;
  if (y > 215) { doc.addPage(); y = 14; }
  sectionTitle(doc, "Terms & Conditions", 10, y, 108);
  sectionTitle(doc, "Commercial Summary", 122, y, 78);
  const terms = [
    ["Prices", "INR, exclusive of GST (unless otherwise mentioned)"],
    ["GST", "Extra as applicable (currently 18%)"],
    ["Payment Terms", "Advance / As mutually agreed"],
    ["Delivery", "Ex-stock / Within 3-5 working days after confirmation"],
    ["Freight", "Extra at actual / To Pay"],
    ["Packing & Forwarding", "Extra if applicable"],
    ["Quotation Validity", "15 days from date of quotation"],
    ["Warranty", "As per manufacturer standard policy"],
    ["Availability", "Subject to stock availability at the time of order"],
    ["Jurisdiction", "Ahmedabad, Gujarat"],
  ];
  autoTable(doc, {
    startY: y + 7,
    body: terms.map(([label, value], index) => [index + 1, label, ":", value]),
    margin: { left: 10 },
    tableWidth: 108,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 6.7, cellPadding: 0.75, textColor: TEXT, fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 29, fontStyle: "bold" }, 2: { cellWidth: 5, halign: "center" }, 3: { cellWidth: 66 } },
    alternateRowStyles: { fillColor: [238, 243, 248] },
  });
  const termsBottom = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: y + 7,
    body: [
      ["Basic Amount", "Rs.", money(productsAmount)],
      ["Freight / Packing", "Rs.", money(freightPacking)],
      ["Discount", "Rs.", `- ${money(generalDiscountAmount)}`],
      ["Taxable Amount", "Rs.", money(taxableAmount)],
      ["GST", "Rs.", money(taxAmount)],
      ["Grand Total", "Rs.", money(grandTotal)],
    ],
    margin: { left: 122 },
    tableWidth: 78,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.4, cellPadding: 1.3, textColor: TEXT, lineColor: [215, 222, 230], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 43 }, 1: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 27, halign: "right" } },
    didParseCell(data) {
      if (data.row.index === 5) { data.cell.styles.fontStyle = "bold"; data.cell.styles.fillColor = LIGHT_ORANGE; data.cell.styles.textColor = BLUE; }
    },
  });
  const wordsBoxY = doc.lastAutoTable.finalY;
  const wordsBoxHeight = Math.max(17, termsBottom - wordsBoxY);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 222, 230);
  doc.setLineWidth(0.2);
  doc.rect(122, wordsBoxY, 78, wordsBoxHeight, "FD");
  const wordsY = wordsBoxY + 5;
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Amount in Words:", 125, wordsY);
  doc.text(`Rupees ${numberToWords(grandTotal)} Only.`, 125, wordsY + 5, { maxWidth: 71, lineHeightFactor: 1.15 });

  const lowerY = Math.max(termsBottom, wordsBoxY + wordsBoxHeight) + 6;
  if (lowerY > 226) { doc.addPage(); y = 14; } else y = lowerY;
  doc.setDrawColor(195, 213, 228);
  doc.setLineWidth(0.25);
  doc.roundedRect(10, y, 108, 38, 1.2, 1.2, "S");
  doc.roundedRect(122, y, 78, 38, 1.2, 1.2, "S");
  sectionTitle(doc, "Bank Details", 10, y, 108, BLUE);
  sectionTitle(doc, "Scan to Pay", 122, y, 78, BLUE);
  doc.setTextColor(...TEXT);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const bankRows = [["Account Name", COMPANY.name], ["Bank Name", COMPANY.bankName], ["Account Number", COMPANY.accountNumber], ["IFSC Code", COMPANY.ifsc], ["Branch", COMPANY.branch], ["UPI ID", COMPANY.upiId]];
  bankRows.forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold"); doc.text(label, 14, y + 11.5 + index * 4.4);
    doc.setFont("helvetica", "normal"); doc.text(`:   ${value}`, 48, y + 11.5 + index * 4.4);
  });
  try {
    const upi = `upi://pay?pa=${encodeURIComponent(COMPANY.upiId)}&pn=${encodeURIComponent(COMPANY.name)}&am=${grandTotal.toFixed(2)}&cu=INR`;
    doc.addImage(await QRCode.toDataURL(upi, { width: 280, margin: 1, errorCorrectionLevel: "M" }), "PNG", 127, y + 8.5, 26, 26, undefined, "FAST");
  } catch { /* Payment information remains available even if QR rendering is unavailable. */ }
  doc.setDrawColor(184, 196, 208);
  doc.setLineWidth(0.35);
  doc.line(157, y + 8, 157, y + 35);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text("Scan the QR code to", 161, y + 13);
  doc.text("make payment via UPI", 161, y + 17.5);
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`UPI ID: ${COMPANY.upiId}`, 178.5, y + 27, { align: "center", maxWidth: 39 });

  const signatureY = y + 42;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE);
  doc.setFontSize(7.5);
  doc.text(`For ${COMPANY.name}`, 10, signatureY + 2.5);
  doc.setTextColor(...TEXT);
  // Temporarily hidden as requested. Restore these two lines when the signatory block is required.
  // doc.text(String(quotation.createdByName || COMPANY.name), 10, signatureY + 11);
  // doc.setFont("helvetica", "normal");
  // doc.text("Authorized Signatory", 10, signatureY + 14.5);
  doc.setTextColor(95, 105, 120);
  doc.setFontSize(7.1);
  doc.text(["Thank you for your business.", "We look forward to a long and mutually beneficial association."], 122, signatureY + 8, { maxWidth: 78, lineHeightFactor: 1.25 });

  addPageFooter(doc, { location: locationIcon, phone: phoneIcon, email: emailIcon, web: webIcon });
  const safeName = String(quotation.company || "company").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
  doc.save(`${quotationNumber(quotation).replaceAll("/", "-")}-${safeName || "company"}.pdf`);
}
