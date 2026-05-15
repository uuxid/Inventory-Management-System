-- Add Nepali-local staple products across existing grocery categories.
-- Idempotent: inserts only when SKU does not already exist.

WITH seed_data(name, sku, barcode, category_name, supplier_id, description, unit_price, cost_price, quantity_on_hand, reorder_level, reorder_quantity, location, image_url) AS (
    VALUES
    ('Masala Chiya Mix 500g', 'GOD-NP-BEV-001', '3234567891001', 'Beverages', 1, 'Spiced Nepali tea premix with cardamom and ginger notes', 290.00, 220.00, 60, 20, 75, 'Cooler B5', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=600&q=80'),
    ('Lemon Soda 250ml', 'GOD-NP-BEV-002', '3234567891002', 'Beverages', 1, 'Refreshing lemon soda bottle', 65.00, 42.00, 140, 45, 150, 'Cooler B6', 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80'),

    ('Chiura (Beaten Rice) 1kg', 'GOD-NP-GRO-001', '3234567892001', 'Grocery Items', 2, 'Traditional flattened rice for snacks and meals', 210.00, 160.00, 95, 30, 120, 'Pantry Rack G6', 'https://images.unsplash.com/photo-1615485737651-2e9f4f8f6f65?auto=format&fit=crop&w=600&q=80'),
    ('Toor Dal 1kg', 'GOD-NP-GRO-002', '3234567892002', 'Grocery Items', 2, 'Split pigeon peas for daily dal', 235.00, 185.00, 110, 40, 130, 'Pantry Rack G7', 'https://images.unsplash.com/photo-1586201375791-7f8b4f36d95f?auto=format&fit=crop&w=600&q=80'),
    ('Himalayan Ghee 1L', 'GOD-NP-GRO-003', '3234567892003', 'Grocery Items', 2, 'Pure clarified butter from mountain dairy', 980.00, 790.00, 38, 14, 60, 'Pantry Rack G8', 'https://images.unsplash.com/photo-1621863444551-15ad06d2d5f8?auto=format&fit=crop&w=600&q=80'),
    ('Roasted Chana 500g', 'GOD-NP-GRO-004', '3234567892004', 'Grocery Items', 1, 'Roasted gram snack and protein staple', 180.00, 135.00, 88, 28, 100, 'Pantry Rack G9', 'https://images.unsplash.com/photo-1515548217836-84f8f7f5d889?auto=format&fit=crop&w=600&q=80'),
    ('Momo Masala 100g', 'GOD-NP-GRO-005', '3234567892005', 'Grocery Items', 1, 'Special spice blend for momo filling and achar', 95.00, 64.00, 120, 35, 140, 'Pantry Rack G10', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'),

    ('Neem Soap 125g', 'GOD-NP-COS-001', '3234567893001', 'Cosmetics', 2, 'Herbal neem bathing soap', 75.00, 48.00, 160, 50, 180, 'Aisle C5', 'https://images.unsplash.com/photo-1607006483224-15af8a1f7c9a?auto=format&fit=crop&w=600&q=80'),
    ('Aloe Face Gel 150ml', 'GOD-NP-COS-002', '3234567893002', 'Cosmetics', 2, 'Cooling aloe vera skin gel', 265.00, 190.00, 70, 24, 90, 'Aisle C6', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80'),

    ('Cauliflower 1kg', 'GOD-NP-VEG-001', '3234567894001', 'Veg Items', 1, 'Fresh cauliflower from local farms', 140.00, 104.00, 58, 22, 80, 'Fresh Veg V4', 'https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?auto=format&fit=crop&w=600&q=80'),
    ('Green Peas 1kg', 'GOD-NP-VEG-002', '3234567894002', 'Veg Items', 1, 'Seasonal green peas', 180.00, 132.00, 52, 20, 76, 'Fresh Veg V5', 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80'),
    ('Coriander Leaves 250g', 'GOD-NP-VEG-003', '3234567894003', 'Veg Items', 2, 'Fresh dhaniya for garnish and chutney', 45.00, 28.00, 95, 35, 110, 'Fresh Veg V6', 'https://images.unsplash.com/photo-1628773822503-930a7eaecf3f?auto=format&fit=crop&w=600&q=80'),

    ('Buff Sukuti 500g', 'GOD-NP-NVG-001', '3234567895001', 'Non Veg Items', 1, 'Traditional dried buff strips', 720.00, 560.00, 26, 12, 40, 'Cold Storage N5', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'),
    ('Paneer 500g', 'GOD-NP-NVG-002', '3234567895002', 'Non Veg Items', 2, 'Fresh cottage cheese block', 360.00, 280.00, 44, 16, 65, 'Cold Storage N6', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'),
    ('Momo Chicken Mince 1kg', 'GOD-NP-NVG-003', '3234567895003', 'Non Veg Items', 1, 'Prepared chicken mince for momo filling', 590.00, 455.00, 30, 14, 48, 'Cold Storage N7', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'),

    ('Pistachio 250g', 'GOD-NP-DRY-001', '3234567896001', 'Dry Fruits', 2, 'Premium pistachio kernels', 760.00, 610.00, 32, 12, 50, 'Dry Rack D5', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80'),
    ('Dates (Khajur) 500g', 'GOD-NP-DRY-002', '3234567896002', 'Dry Fruits', 1, 'Soft premium dates', 430.00, 320.00, 58, 20, 85, 'Dry Rack D6', 'https://images.unsplash.com/photo-1612550761236-e813928f7271?auto=format&fit=crop&w=600&q=80'),
    ('Mixed Nuts 400g', 'GOD-NP-DRY-003', '3234567896003', 'Dry Fruits', 2, 'Blend of almonds, cashews, raisins and walnuts', 890.00, 710.00, 36, 14, 60, 'Dry Rack D7', 'https://images.unsplash.com/photo-1615937722923-67f6deaf2cc9?auto=format&fit=crop&w=600&q=80')
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
