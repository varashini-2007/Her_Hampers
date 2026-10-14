const fs = require('fs');
const path = require('path');

// 1. Verify data/products.json has "Brides mehandhi designs" with empty colors and sizes
const prods = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf8'));
const brides = prods.find(p => p.name.includes('Brides mehandhi'));

if (!brides) {
  console.error('FAIL: Brides mehandhi product not found');
  process.exit(1);
}

console.log('Product Found:', brides.name, brides.id);
console.log('Colors:', brides.colors);
console.log('Sizes:', brides.sizes);

if (Array.isArray(brides.colors) && brides.colors.length === 0) {
  console.log('✅ PASS: Brides mehandhi designs has empty colors array []');
} else {
  console.error('❌ FAIL: Brides mehandhi colors is not empty:', brides.colors);
  process.exit(1);
}

if (Array.isArray(brides.sizes) && brides.sizes.length === 0) {
  console.log('✅ PASS: Brides mehandhi designs has empty sizes array []');
} else {
  console.error('❌ FAIL: Brides mehandhi sizes is not empty:', brides.sizes);
  process.exit(1);
}

// 2. Check admin.js code does not fall back to defVariants.colors or defVariants.sizes
const adminJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'admin.js'), 'utf8');
const directAddFallback = adminJs.includes('(defVariants.colors ? [...defVariants.colors] : [])');
const saveProdFallback = adminJs.includes('(defVariants.sizes ? [...defVariants.sizes] : [])');

if (!directAddFallback && !saveProdFallback) {
  console.log('✅ PASS: admin.js no longer falls back to category default variants');
} else {
  console.error('❌ FAIL: admin.js still has default variant fallback');
  process.exit(1);
}

// 3. Check data.js code does not auto-enrich empty colors array with def.colors
const dataJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'data.js'), 'utf8');
const dataJsDefFallback = dataJs.includes('item.colors = [...def.colors]');

if (!dataJsDefFallback) {
  console.log('✅ PASS: data.js no longer auto-populates def.colors onto empty variants');
} else {
  console.error('❌ FAIL: data.js still has def.colors auto-enrichment');
  process.exit(1);
}

console.log('\n🎉 ALL BLANK VARIANT VERIFICATION CHECKS PASSED!');
