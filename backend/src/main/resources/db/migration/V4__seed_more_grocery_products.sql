-- Add more grocery products across approved categories.
-- Safe to run multiple times; rows are inserted only when SKU is missing.

WITH seed_data(name, sku, barcode, category_name, supplier_id, description, unit_price, cost_price, quantity_on_hand, reorder_level, reorder_quantity, location, image_url) AS (
    VALUES
    ('Green Tea 100 Bags', 'GOD-BEV-001', '2234567891001', 'Beverages', 1, 'Refreshing green tea bags for daily use', 360.00, 270.00, 70, 20, 80, 'Cooler B1', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80'),
    ('Instant Coffee 200g', 'GOD-BEV-002', '2234567891002', 'Beverages', 2, 'Premium instant coffee granules', 420.00, 320.00, 45, 18, 60, 'Cooler B3', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'),
    ('Cola Drink 2L', 'GOD-BEV-003', '2234567891003', 'Beverages', 1, 'Family-size carbonated soft drink', 185.00, 130.00, 90, 30, 120, 'Cooler B4', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'),

    ('Sunflower Oil 1L', 'GOD-GRO-001', '2234567892001', 'Grocery Items', 2, 'Refined sunflower cooking oil', 340.00, 270.00, 120, 35, 100, 'Pantry Rack G3', 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80'),
    ('Sugar 5kg', 'GOD-GRO-002', '2234567892002', 'Grocery Items', 2, 'Fine white crystal sugar pack', 490.00, 390.00, 95, 30, 90, 'Pantry Rack G4', 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80'),
    ('Turmeric Powder 200g', 'GOD-GRO-003', '2234567892003', 'Grocery Items', 1, 'Pure turmeric masala powder', 120.00, 85.00, 140, 45, 120, 'Pantry Rack G5', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'),

    ('Face Wash 100ml', 'GOD-COS-001', '2234567893001', 'Cosmetics', 2, 'Gentle daily skin cleanser', 280.00, 210.00, 65, 20, 70, 'Aisle C1', 'https://images.unsplash.com/photo-1556228724-4f74f66fe6a3?auto=format&fit=crop&w=600&q=80'),
    ('Body Lotion 400ml', 'GOD-COS-002', '2234567893002', 'Cosmetics', 2, 'Moisturizing body lotion for all skin types', 520.00, 390.00, 50, 18, 65, 'Aisle C2', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80'),
    ('Herbal Toothpaste 200g', 'GOD-COS-003', '2234567893003', 'Cosmetics', 1, 'Fluoride herbal toothpaste', 190.00, 130.00, 85, 25, 100, 'Aisle C4', 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=600&q=80'),

    ('Fresh Tomato 1kg', 'GOD-VEG-001', '2234567894001', 'Veg Items', 1, 'Fresh red tomatoes', 110.00, 80.00, 60, 25, 80, 'Fresh Veg V1', 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=600&q=80'),
    ('Potato 5kg', 'GOD-VEG-002', '2234567894002', 'Veg Items', 1, 'Farm fresh potatoes bag', 260.00, 190.00, 75, 30, 95, 'Fresh Veg V2', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80'),
    ('Spinach Bunch 500g', 'GOD-VEG-003', '2234567894003', 'Veg Items', 2, 'Fresh leafy spinach bunch', 95.00, 60.00, 55, 20, 70, 'Fresh Veg V3', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80'),

    ('Mutton Curry Cut 1kg', 'GOD-NVG-001', '2234567895001', 'Non Veg Items', 1, 'Fresh mutton curry pieces', 1280.00, 1040.00, 18, 10, 35, 'Cold Storage N2', 'https://images.unsplash.com/photo-1600891963935-c8c2b27f0f5b?auto=format&fit=crop&w=600&q=80'),
    ('Eggs Tray 30', 'GOD-NVG-002', '2234567895002', 'Non Veg Items', 1, 'Farm eggs tray of thirty', 540.00, 430.00, 40, 15, 60, 'Cold Storage N3', 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=600&q=80'),
    ('Fresh Rohu Fish 1kg', 'GOD-NVG-003', '2234567895003', 'Non Veg Items', 2, 'Cleaned rohu fish cuts', 760.00, 610.00, 22, 12, 40, 'Cold Storage N4', 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=600&q=80'),

    ('Cashew 500g', 'GOD-DRY-001', '2234567896001', 'Dry Fruits', 2, 'Premium whole cashews', 980.00, 780.00, 42, 16, 70, 'Dry Rack D2', 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=600&q=80'),
    ('Raisins 500g', 'GOD-DRY-002', '2234567896002', 'Dry Fruits', 1, 'Seedless golden raisins', 460.00, 340.00, 48, 18, 80, 'Dry Rack D3', 'https://images.unsplash.com/photo-1590080877777-95f2f95d92f4?auto=format&fit=crop&w=600&q=80'),
    ('Walnuts 500g', 'GOD-DRY-003', '2234567896003', 'Dry Fruits', 2, 'Premium walnut kernels', 1220.00, 980.00, 26, 12, 45, 'Dry Rack D4', 'https://images.unsplash.com/photo-1615485291234-6a2f7b4f2a5f?auto=format&fit=crop&w=600&q=80')
)
INSERT INTO products (
    name, sku, barcode, description, category_id, supplier_id,
    unit_price, cost_price, quantity_on_hand, reorder_level, reorder_quantity,
    valuation_method, location, image_url, is_active
)
SELECT
    s.name,
    s.sku,
    s.barcode,
    s.description,
    c.id,
    s.supplier_id,
    s.unit_price,
    s.cost_price,
    s.quantity_on_hand,
    s.reorder_level,
    s.reorder_quantity,
    'FIFO',
    s.location,
    s.image_url,
    true
FROM seed_data s
JOIN categories c ON c.name = s.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.sku = s.sku
);
