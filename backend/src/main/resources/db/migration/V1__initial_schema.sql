-- V1__initial_schema.sql

-- Users
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ROLE_ADMIN','ROLE_MANAGER','ROLE_EMPLOYEE')),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(30),
    address TEXT,
    lead_time_days INT DEFAULT 7,
    rating DECIMAL(3,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    description TEXT,
    category_id BIGINT REFERENCES categories(id),
    supplier_id BIGINT REFERENCES suppliers(id),
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    reorder_quantity INT NOT NULL DEFAULT 50,
    valuation_method VARCHAR(10) DEFAULT 'FIFO' CHECK (valuation_method IN ('FIFO','LIFO','EOQ')),
    location VARCHAR(100),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUSTMENT','RETURN','TRANSFER')),
    quantity INT NOT NULL,
    unit_cost DECIMAL(12,2),
    reference_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    created_by BIGINT NOT NULL REFERENCES users(id),
    approved_by BIGINT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','APPROVED','ORDERED','RECEIVED','CANCELLED')),
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    expected_date DATE,
    received_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_cost DECIMAL(12,2) NOT NULL
);

-- AI Alerts
CREATE TABLE ai_alerts (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id),
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('LOW_STOCK','OVERSTOCK','DEMAND_SPIKE','REORDER_SUGGESTION','FORECAST')),
    severity VARCHAR(10) DEFAULT 'INFO' CHECK (severity IN ('INFO','WARNING','CRITICAL')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_for BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_ai_alerts_unread ON ai_alerts(is_read, created_for);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Seed default admin user (password: Admin@123)
INSERT INTO users (username, email, password_hash, role, full_name, is_active)
VALUES ('admin', 'admin@inventory.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NHKKGb4TC',
        'ROLE_ADMIN', 'System Admin', true);

-- Seed categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Furniture', 'Office and warehouse furniture'),
('Stationery', 'Office supplies and stationery'),
('Accessories', 'Various accessories');

-- Seed a manager and employee
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('manager1', 'manager@inventory.com',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NHKKGb4TC',
 'ROLE_MANAGER', 'John Manager', true),
('employee1', 'employee@inventory.com',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NHKKGb4TC',
 'ROLE_EMPLOYEE', 'Jane Employee', true);

-- Seed sample supplier
INSERT INTO suppliers (name, contact_person, email, phone, lead_time_days, rating) VALUES
('TechSupplies Co.', 'Alice Smith', 'alice@techsupplies.com', '+1-555-0101', 5, 4.50),
('OfficeWorld Ltd.', 'Bob Jones', 'bob@officeworld.com', '+1-555-0102', 7, 4.20);

-- Seed sample products
INSERT INTO products (name, sku, barcode, category_id, supplier_id, unit_price, cost_price, quantity_on_hand, reorder_level, reorder_quantity, valuation_method, location) VALUES
('Wireless Keyboard', 'SKU-001', '1234567890001', 1, 1, 49.99, 25.00, 150, 20, 100, 'FIFO', 'Shelf A1'),
('USB-C Hub 7-Port', 'SKU-002', '1234567890002', 1, 1, 39.99, 18.00, 8, 15, 50, 'FIFO', 'Shelf A2'),
('Ergonomic Chair', 'SKU-003', '1234567890003', 2, 2, 299.99, 150.00, 25, 5, 20, 'FIFO', 'Warehouse B1'),
('A4 Paper Ream', 'SKU-004', '1234567890004', 3, 2, 8.99, 4.00, 500, 100, 500, 'LIFO', 'Shelf C3'),
('Wireless Mouse', 'SKU-005', '1234567890005', 1, 1, 29.99, 12.00, 6, 20, 80, 'FIFO', 'Shelf A1');
