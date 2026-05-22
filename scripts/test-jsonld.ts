import { buildProductJsonLd, buildBreadcrumbJsonLd } from '../lib/json-ld';
const p = buildProductJsonLd({
  sku: 'KKHE0009-BMWG2',
  name: 'Electric Bain Marie with Glass - 2 Compartments',
  description: 'Commercial bain marie for hot food display.',
  category: 'HOT EQUIPMENT',
  subcategory: 'BAIN MARIE',
  hsnCode: '84198190',
  price: 16014.96,
  mrp: 32030,
  imageUrl: '/images/KKHE0009-BMWG2/1.jpg',
  images: ['/images/KKHE0009-BMWG2/2.jpg'],
  stock: 5,
  reviewCount: 3,
  reviewAverage: 4.7,
});
const b = buildBreadcrumbJsonLd({ category: 'HOT EQUIPMENT', productName: 'Electric Bain Marie with Glass - 2 Compartments', productSku: 'KKHE0009-BMWG2' });
console.log('=== PRODUCT ===');
console.log(JSON.stringify(p, null, 2));
console.log('=== BREADCRUMB ===');
console.log(JSON.stringify(b, null, 2));
