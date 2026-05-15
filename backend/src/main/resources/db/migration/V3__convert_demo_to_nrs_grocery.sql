-- Convert demo data from electronics/office to grocery domain and NRS pricing.

-- Update existing base categories.
UPDATE categories
SET name = 'Beverages', description = 'Tea, coffee, juices and drink products'
WHERE id = 1;

UPDATE categories
SET name = 'Grocery Items', description = 'Daily grocery and pantry staples'
WHERE id = 2;

UPDATE categories
SET name = 'Cosmetics', description = 'Personal care and beauty products'
WHERE id = 3;

UPDATE categories
SET name = 'Veg Items', description = 'Fresh vegetables and produce'
WHERE id = 4;

-- Add additional grocery-focused categories if they do not exist.
INSERT INTO categories (name, description)
SELECT 'Non Veg Items', 'Meat, poultry and seafood'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Non Veg Items');

INSERT INTO categories (name, description)
SELECT 'Dry Fruits', 'Nuts, seeds and dried fruits'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Dry Fruits');

-- Rename sample suppliers to match grocery domain.
UPDATE suppliers
SET name = 'Kathmandu Fresh Distributors',
    contact_person = 'Nisha Gurung',
    email = 'nisha@kathmandufresh.com',
    phone = '+977-9800001001'
WHERE id = 1;

UPDATE suppliers
SET name = 'Himal Agro Trading',
    contact_person = 'Rajan Shrestha',
    email = 'rajan@himalagro.com',
    phone = '+977-9800001002'
WHERE id = 2;

-- Convert seeded products to grocery-style catalog with NRS prices.
UPDATE products
SET name = 'Basmati Rice 5kg',
    description = 'Premium long-grain basmati rice pack',
    category_id = (SELECT id FROM categories WHERE name = 'Grocery Items' LIMIT 1),
    supplier_id = 2,
    unit_price = 980.00,
    cost_price = 840.00,
    quantity_on_hand = 150,
    reorder_level = 40,
    reorder_quantity = 120,
    image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    location = 'Pantry Rack G1'
WHERE sku = 'SKU-001';

UPDATE products
SET name = 'Orange Juice 1L',
    description = 'Ready-to-serve fruit beverage',
    category_id = (SELECT id FROM categories WHERE name = 'Beverages' LIMIT 1),
    supplier_id = 1,
    unit_price = 220.00,
    cost_price = 170.00,
    quantity_on_hand = 35,
    reorder_level = 20,
    reorder_quantity = 80,
    image_url = 'https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=600&q=80',
    location = 'Cooler B2'
WHERE sku = 'SKU-002';

UPDATE products
SET name = 'Chicken Breast 1kg',
    description = 'Fresh packed chicken breast',
    category_id = (SELECT id FROM categories WHERE name = 'Non Veg Items' LIMIT 1),
    supplier_id = 1,
    unit_price = 640.00,
    cost_price = 520.00,
    quantity_on_hand = 28,
    reorder_level = 12,
    reorder_quantity = 40,
    image_url = 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80',
    location = 'Cold Storage N1'
WHERE sku = 'SKU-003';

UPDATE products
SET name = 'Shampoo 650ml',
    description = 'Herbal daily-use shampoo bottle',
    category_id = (SELECT id FROM categories WHERE name = 'Cosmetics' LIMIT 1),
    supplier_id = 2,
    unit_price = 480.00,
    cost_price = 360.00,
    quantity_on_hand = 80,
    reorder_level = 25,
    reorder_quantity = 100,
    image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    location = 'Aisle C3'
WHERE sku = 'SKU-004';

UPDATE products
SET name = 'Almonds 500g',
    description = 'Premium dry roasted almonds',
    category_id = (SELECT id FROM categories WHERE name = 'Dry Fruits' LIMIT 1),
    supplier_id = 2,
    unit_price = 950.00,
    cost_price = 760.00,
    quantity_on_hand = 22,
    reorder_level = 30,
    reorder_quantity = 90,
    image_url = 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?auto=format&fit=crop&w=600&q=80',
    location = 'Dry Rack D1'
WHERE sku = 'SKU-005';

-- Keep user-added item but ensure category and NRS-oriented pricing values are sensible.
UPDATE products
SET category_id = (SELECT id FROM categories WHERE name = 'Grocery Items' LIMIT 1),
    unit_price = CASE WHEN unit_price < 50 THEN 160.00 ELSE unit_price END,
    cost_price = CASE WHEN cost_price < 30 THEN 120.00 ELSE cost_price END,
    image_url = COALESCE(NULLIF(image_url, ''), 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'),
    location = COALESCE(NULLIF(location, ''), 'Pantry Rack G2')
WHERE sku = 'MADAL-5';
