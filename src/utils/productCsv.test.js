import assert from 'node:assert/strict';
import test from 'node:test';
import { exportProductsCsv, importProductsCsv, productCsvColumns } from './productCsv.js';

test('blank template contains only the import headers', () => {
  assert.equal(exportProductsCsv([]).replace(/^\uFEFF/, '').trim(), productCsvColumns.map(({ header }) => header).join(','));
});

test('exported CSV imports quoted descriptions and inactive products', () => {
  const csv = exportProductsCsv([{ partCode: 'JB-01', description: 'Valve, "large"\nsteel', brand: 'JB', category: 'Valves', subCategory: 'Steel', subSubCategory: 'Stainless', hsnCode: '1234', taxRate: 5, mrp: 129.5, isActive: false, image: '/public/products/valve.png' }]);
  const result = importProductsCsv(csv);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.products, [{ rowNumber: 2, partCode: 'JB-01', description: 'Valve, "large"\nsteel', brand: 'JB', category: 'Valves', subCategory: 'Steel', subSubCategory: 'Stainless', hsnCode: '1234', taxRate: 5, mrp: 129.5, isActive: false, image: '/public/products/valve.png' }]);
});

test('import rejects duplicate part codes and invalid prices without sending those rows', () => {
  const csv = `${exportProductsCsv([])}jb-01,Valve,,Valves,,,,18,100,Yes,\r\nJB-01,Other,,Valves,,,,18,50,Yes,\r\nJB-03,Other,,Valves,,,,18,-1,Yes,\r\n`;
  const result = importProductsCsv(csv);
  assert.equal(result.products.length, 1);
  assert.equal(result.errors.length, 2);
});

test('import requires the template columns', () => {
  assert.throws(() => importProductsCsv('Part Code,Description\nJB-01,Valve'), /Missing columns/);
});

test('previous templates without a sub-sub category column still import', () => {
  const csv = 'Part Code,Description,Brand,Category,Sub Category,HSN Code,GST Rate,MRP,Active,Image URL\nJB-02,Valve,,Valves,,,18,100,Yes,';
  const result = importProductsCsv(csv);
  assert.deepEqual(result.errors, []);
  assert.equal(Object.hasOwn(result.products[0], 'subSubCategory'), false);
});
