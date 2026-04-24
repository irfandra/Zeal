CREATE DATABASE IF NOT EXISTS digital_seal;
USE digital_seal;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NULL,
    password_hash VARCHAR(255) NULL,
    wallet_address VARCHAR(42) NULL,
    wallet_nonce VARCHAR(255) NULL,
    first_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NULL,
    phone_number VARCHAR(20) NULL,
    user_name VARCHAR(255) NULL,
    auth_type VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    wallet_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    last_failed_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_auth_type (auth_type),
    INDEX idx_role (role),
    INDEX idx_user_name (user_name),
    UNIQUE KEY unique_email (email),
    UNIQUE KEY unique_wallet (wallet_address),
    UNIQUE KEY unique_user_name (user_name),
    CONSTRAINT chk_auth_email CHECK (auth_type != 'EMAIL' OR (email IS NOT NULL AND password_hash IS NOT NULL)),
    CONSTRAINT chk_auth_wallet CHECK (auth_type != 'WALLET' OR wallet_address IS NOT NULL),
    CONSTRAINT chk_auth_both CHECK (auth_type != 'BOTH' OR (email IS NOT NULL AND wallet_address IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verification_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_verification_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verification_user_id (user_id),
    INDEX idx_verification_code (code),
    INDEX idx_verification_type (type),
    INDEX idx_verification_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE brands (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255) NULL,
    company_address TEXT NULL,
    company_wallet_address VARCHAR(42) NULL,
    logo VARCHAR(500) NULL,
    company_banner VARCHAR(500) NULL,
    statement_letter_url VARCHAR(500) NULL,
    person_in_charge_name VARCHAR(255) NULL,
    person_in_charge_role VARCHAR(255) NULL,
    person_in_charge_email VARCHAR(255) NULL,
    person_in_charge_phone VARCHAR(30) NULL,
    description TEXT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_brands_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_brands_user_id (user_id),
    INDEX idx_brands_brand_name (brand_name),
    UNIQUE KEY unique_brand_name (brand_name),
    UNIQUE KEY unique_company_wallet (company_wallet_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE collections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    collection_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    season VARCHAR(100),
    is_limited_edition BOOLEAN NOT NULL DEFAULT FALSE,
    release_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    tag VARCHAR(50) NULL,
    sales_end_at TIMESTAMP NULL,
    tag_color VARCHAR(20) NULL,
    tag_text_color VARCHAR(20) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_collections_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    INDEX idx_collections_brand_id (brand_id),
    INDEX idx_collections_season (season),
    INDEX idx_collections_status (status),
    INDEX idx_collections_sales_end_at (sales_end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(6) NOT NULL,
    brand_id BIGINT NOT NULL,
    collection_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL,
    image_url VARCHAR(500),
    specifications_json TEXT NULL,
    price DECIMAL(18,8) DEFAULT NULL,
    contract_address VARCHAR(42),
    metadata_base_uri VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    listed_at TIMESTAMP NULL,
    listing_deadline TIMESTAMP NULL,
    preminted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
    UNIQUE KEY uk_products_product_code (product_code),
    INDEX idx_products_brand_id (brand_id),
    INDEX idx_products_collection_id (collection_id),
    INDEX idx_products_category (category),
    INDEX idx_products_status (status),
    INDEX idx_products_price (price),
    INDEX idx_products_listed_at (listed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    item_serial VARCHAR(150) NOT NULL,
    item_index INT NOT NULL,
    token_id BIGINT,
    metadata_uri MEDIUMTEXT NULL,
    mint_tx_hash VARCHAR(66),
    claim_code VARCHAR(64),
    claim_code_hash VARCHAR(64),
    nft_qr_code VARCHAR(255) NULL,
    product_label_qr_code VARCHAR(255) NULL,
    certificate_qr_code VARCHAR(255) NULL,
    seal_status VARCHAR(20) NOT NULL DEFAULT 'PRE_MINTED',
    current_owner_wallet VARCHAR(42),
    current_owner_id BIGINT,
    transfer_tx_hash VARCHAR(66),
    minted_at TIMESTAMP NULL,
    sold_at TIMESTAMP NULL,
    claimed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_items_owner FOREIGN KEY (current_owner_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_product_items_serial (item_serial),
    UNIQUE KEY uk_product_items_claim_code (claim_code),
    UNIQUE KEY uk_product_items_product_index (product_id, item_index),
    INDEX idx_product_items_product_id (product_id),
    INDEX idx_product_items_token_id (token_id),
    INDEX idx_product_items_seal_status (seal_status),
    INDEX idx_product_items_current_owner (current_owner_id),
    INDEX idx_product_items_claim_code_hash (claim_code_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL,
    product_id BIGINT NOT NULL,
    product_item_id BIGINT,
    buyer_id BIGINT NOT NULL,
    buyer_wallet VARCHAR(42),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,8) NOT NULL,
    total_price DECIMAL(18,8) NOT NULL,
    payment_tx_hash VARCHAR(66),
    payment_confirmed_at TIMESTAMP NULL,
    shipping_address TEXT,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    seal_transfer_tx_hash VARCHAR(66),
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_orders_product_item FOREIGN KEY (product_item_id) REFERENCES product_items(id),
    CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id),
    UNIQUE KEY uk_orders_order_number (order_number),
    INDEX idx_orders_product_id (product_id),
    INDEX idx_orders_buyer_id (buyer_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_order_number (order_number),
    INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ownership_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_item_id BIGINT NOT NULL,
    from_wallet VARCHAR(42),
    to_wallet VARCHAR(42),
    transfer_type VARCHAR(20) NOT NULL,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    notes VARCHAR(500),
    transferred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ownership_history_item FOREIGN KEY (product_item_id) REFERENCES product_items(id) ON DELETE CASCADE,
    INDEX idx_ownership_history_item_id (product_item_id),
    INDEX idx_ownership_history_transfer_type (transfer_type),
    INDEX idx_ownership_history_tx_hash (tx_hash),
    INDEX idx_ownership_history_transferred_at (transferred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platform_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    level VARCHAR(10) NOT NULL,
    category VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id BIGINT NULL,
    user_email VARCHAR(100) NULL,
    entity_type VARCHAR(50) NULL,
    entity_id VARCHAR(50) NULL,
    details TEXT NULL,
    error_message TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    http_method VARCHAR(10) NULL,
    request_path VARCHAR(500) NULL,
    duration_ms BIGINT NULL,
    success TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    INDEX idx_pl_created_at (created_at),
    INDEX idx_pl_level (level),
    INDEX idx_pl_category (category),
    INDEX idx_pl_user_id (user_id),
    INDEX idx_pl_action (action),
    INDEX idx_pl_entity (entity_type, entity_id),
    INDEX idx_pl_success (success),
    CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Platform-wide activity and error log for monitoring';

CREATE TABLE transfer_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_item_id BIGINT NOT NULL,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    from_wallet VARCHAR(42) NOT NULL,
    to_wallet VARCHAR(42) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_at DATETIME NOT NULL,
    responded_at DATETIME NULL,
    transfer_tx_hash VARCHAR(66) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transfer_requests_item FOREIGN KEY (product_item_id) REFERENCES product_items(id),
    CONSTRAINT fk_transfer_requests_from_user FOREIGN KEY (from_user_id) REFERENCES users(id),
    CONSTRAINT fk_transfer_requests_to_user FOREIGN KEY (to_user_id) REFERENCES users(id),
    INDEX idx_transfer_requests_to_user_status (to_user_id, status),
    INDEX idx_transfer_requests_from_user_status (from_user_id, status),
    INDEX idx_transfer_requests_item_status (product_item_id, status)
);

DROP TRIGGER IF EXISTS trg_users_wallet_unique_global_before_insert;
DROP TRIGGER IF EXISTS trg_users_wallet_unique_global_before_update;
DROP TRIGGER IF EXISTS trg_brands_wallet_unique_global_before_insert;
DROP TRIGGER IF EXISTS trg_brands_wallet_unique_global_before_update;

DELIMITER //

CREATE TRIGGER trg_users_wallet_unique_global_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.wallet_address IS NOT NULL AND TRIM(NEW.wallet_address) <> '' THEN
        SET NEW.wallet_address = LOWER(TRIM(NEW.wallet_address));
        IF EXISTS (SELECT 1 FROM brands b WHERE b.company_wallet_address IS NOT NULL AND LOWER(TRIM(b.company_wallet_address)) = NEW.wallet_address LIMIT 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet address already used by a brand profile';
        END IF;
    END IF;
END//

CREATE TRIGGER trg_users_wallet_unique_global_before_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.wallet_address IS NOT NULL AND TRIM(NEW.wallet_address) <> '' THEN
        SET NEW.wallet_address = LOWER(TRIM(NEW.wallet_address));
        IF EXISTS (SELECT 1 FROM brands b WHERE b.company_wallet_address IS NOT NULL AND LOWER(TRIM(b.company_wallet_address)) = NEW.wallet_address LIMIT 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet address already used by a brand profile';
        END IF;
    END IF;
END//

CREATE TRIGGER trg_brands_wallet_unique_global_before_insert
BEFORE INSERT ON brands
FOR EACH ROW
BEGIN
    IF NEW.company_wallet_address IS NOT NULL AND TRIM(NEW.company_wallet_address) <> '' THEN
        SET NEW.company_wallet_address = LOWER(TRIM(NEW.company_wallet_address));
        IF EXISTS (SELECT 1 FROM users u WHERE u.wallet_address IS NOT NULL AND LOWER(TRIM(u.wallet_address)) = NEW.company_wallet_address LIMIT 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet address already used by a user account';
        END IF;
    END IF;
END//

CREATE TRIGGER trg_brands_wallet_unique_global_before_update
BEFORE UPDATE ON brands
FOR EACH ROW
BEGIN
    IF NEW.company_wallet_address IS NOT NULL AND TRIM(NEW.company_wallet_address) <> '' THEN
        SET NEW.company_wallet_address = LOWER(TRIM(NEW.company_wallet_address));
        IF EXISTS (SELECT 1 FROM users u WHERE u.wallet_address IS NOT NULL AND LOWER(TRIM(u.wallet_address)) = NEW.company_wallet_address LIMIT 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet address already used by a user account';
        END IF;
    END IF;
END//

DELIMITER ;

INSERT IGNORE INTO users (first_name, last_name, user_name, email, password_hash, wallet_address, wallet_nonce, phone_number, auth_type, role, is_active, email_verified, wallet_verified, is_locked, failed_login_attempts)
VALUES
('Gerry', 'Julian', 'gerryjulian', 'gerry.julian@zeal-demo.com', '$2a$10$3FKM2QQ2E2mvY/fakehashKxg5.0K8rEJ49m3gRcj6UpqQj1JY7Q8Aa', '0x1111111111111111111111111111111111111111', UUID(), '+6281234567890', 'EMAIL', 'BRAND', TRUE, TRUE, TRUE, FALSE, 0),
('Aurelia', 'Tan', 'aureliatan', 'aurelia.tan@zeal-demo.com', '$2a$10$3FKM2QQ2E2mvY/fakehashKxg5.0K8rEJ49m3gRcj6UpqQj1JY7Q8Aa', '0x2222222222222222222222222222222222222222', UUID(), '+6281298765432', 'EMAIL', 'BRAND', TRUE, TRUE, TRUE, FALSE, 0),
('Demo', 'Collector', 'collector_demo', 'collector.demo@zeal-demo.com', '$2a$10$3FKM2QQ2E2mvY/fakehashKxg5.0K8rEJ49m3gRcj6UpqQj1JY7Q8Aa', '0x5555555555555555555555555555555555555555', UUID(), '+6591234567', 'EMAIL', 'OWNER', TRUE, TRUE, TRUE, FALSE, 0);

INSERT IGNORE INTO brands (user_id, brand_name, company_email, company_address, company_wallet_address, logo, company_banner, statement_letter_url, person_in_charge_name, person_in_charge_role, person_in_charge_email, person_in_charge_phone, description, verified)
SELECT id, 'Hermes', 'contact@hermes-demo.com', '24 Rue du Faubourg Saint-Honore, Paris, France', '0x3333333333333333333333333333333333333333', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80', 'https://example.com/docs/hermes-statement-letter.pdf', 'Gerry Julian', 'Chief Operating Officer', 'gerry.julian@hermes-demo.com', '+6281234567890', 'French luxury house with premium handcrafted items.', TRUE FROM users WHERE user_name = 'gerryjulian';

INSERT IGNORE INTO brands (user_id, brand_name, company_email, company_address, company_wallet_address, logo, company_banner, statement_letter_url, person_in_charge_name, person_in_charge_role, person_in_charge_email, person_in_charge_phone, description, verified)
SELECT id, 'Nintendo', 'contact@nintendo-demo.com', '11-1 Kamitoba Hokodate-cho, Minami-ku, Kyoto, Japan', '0x4444444444444444444444444444444444444444', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png', 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=1400&q=80', 'https://example.com/docs/nintendo-statement-letter.pdf', 'Aurelia Tan', 'Brand Partnership Lead', 'aurelia.tan@nintendo-demo.com', '+6281298765432', 'Collectible gaming products and limited card sets.', TRUE FROM users WHERE user_name = 'aureliatan';

INSERT IGNORE INTO collections (brand_id, collection_name, description, image_url, season, is_limited_edition, release_date, status, tag, sales_end_at, tag_color, tag_text_color)
SELECT id, 'Birkin Collections', 'Luxury bags with handcrafted details.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=60', 'Luxury Bags', TRUE, '2026-01-15', 'DRAFT', 'Rare', DATE_ADD(NOW(), INTERVAL 14 DAY), '#111', '#fff' FROM brands WHERE brand_name = 'Hermes';

INSERT IGNORE INTO collections (brand_id, collection_name, description, image_url, season, is_limited_edition, release_date, status, tag, sales_end_at, tag_color, tag_text_color)
SELECT id, 'Pokemon Card', 'High-end collectible cards.', 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60', 'Collectible Cards', TRUE, '2026-02-21', 'LISTED', 'Limited', DATE_ADD(NOW(), INTERVAL 12 HOUR), '#ffb300', '#111' FROM brands WHERE brand_name = 'Nintendo';

INSERT IGNORE INTO products (product_code, brand_id, collection_id, product_name, description, category, image_url, specifications_json, price, status, listed_at, listing_deadline, preminted_at)
SELECT 'BIRK01', b.id, c.id, 'Birkin Brownies', 'Offchain demo product for marketplace and checkout flow.', 'HANDBAG', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60', '[{"aspect":"Size","details":"M"},{"aspect":"Color","details":"Brown"}]', 120100.00000000, 'LISTED', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), NOW() FROM brands b JOIN collections c ON c.brand_id = b.id WHERE b.brand_name = 'Hermes' AND c.collection_name = 'Birkin Collections';

INSERT IGNORE INTO products (product_code, brand_id, collection_id, product_name, description, category, image_url, specifications_json, price, status, listed_at, listing_deadline, preminted_at)
SELECT 'BIRK02', b.id, c.id, 'Birkin Bluestorn', 'Offchain demo product variant for marketplace and product detail flow.', 'HANDBAG', 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=60', '[{"aspect":"Size","details":"S"},{"aspect":"Color","details":"Blue"}]', 98500.00000000, 'LISTED', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY), NOW() FROM brands b JOIN collections c ON c.brand_id = b.id WHERE b.brand_name = 'Hermes' AND c.collection_name = 'Birkin Collections';

INSERT IGNORE INTO products (product_code, brand_id, collection_id, product_name, description, category, image_url, specifications_json, price, status, listed_at, listing_deadline, preminted_at)
SELECT 'POKE01', b.id, c.id, 'Pokemon Card Set', 'Offchain demo collectible product for marketplace browsing.', 'COLLECTIBLE', 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60', '[{"aspect":"Condition","details":"Mint"}]', 52100.00000000, 'LISTED', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), NOW() FROM brands b JOIN collections c ON c.brand_id = b.id WHERE b.brand_name = 'Nintendo' AND c.collection_name = 'Pokemon Card';

SET @birk01_id := (SELECT id FROM products WHERE product_code = 'BIRK01' LIMIT 1);
SET @birk02_id := (SELECT id FROM products WHERE product_code = 'BIRK02' LIMIT 1);
SET @poke01_id := (SELECT id FROM products WHERE product_code = 'POKE01' LIMIT 1);

INSERT IGNORE INTO product_items (product_id, item_serial, item_index, claim_code, seal_status, created_at, updated_at)
SELECT @birk01_id, CONCAT('BIRK01-', LPAD(n, 4, '0')), n, CONCAT('CLM-BIRK01-', LPAD(n, 4, '0')), 'PRE_MINTED', NOW(), NOW()
FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20) seq
WHERE @birk01_id IS NOT NULL;

INSERT IGNORE INTO product_items (product_id, item_serial, item_index, claim_code, seal_status, created_at, updated_at)
SELECT @birk02_id, CONCAT('BIRK02-', LPAD(n, 4, '0')), n, CONCAT('CLM-BIRK02-', LPAD(n, 4, '0')), 'PRE_MINTED', NOW(), NOW()
FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) seq
WHERE @birk02_id IS NOT NULL;

INSERT IGNORE INTO product_items (product_id, item_serial, item_index, claim_code, seal_status, created_at, updated_at)
SELECT @poke01_id, CONCAT('POKE01-', LPAD(n, 4, '0')), n, CONCAT('CLM-POKE01-', LPAD(n, 4, '0')), 'PRE_MINTED', NOW(), NOW()
FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8) seq
WHERE @poke01_id IS NOT NULL;

SET @buyer_id := (SELECT id FROM users WHERE user_name = 'collector_demo' LIMIT 1);
SET @birk01_item1 := (SELECT id FROM product_items WHERE product_id = @birk01_id AND item_index = 1 LIMIT 1);
SET @birk01_item2 := (SELECT id FROM product_items WHERE product_id = @birk01_id AND item_index = 2 LIMIT 1);
SET @birk01_item3 := (SELECT id FROM product_items WHERE product_id = @birk01_id AND item_index = 3 LIMIT 1);
SET @birk01_item4 := (SELECT id FROM product_items WHERE product_id = @birk01_id AND item_index = 4 LIMIT 1);
SET @birk02_item1 := (SELECT id FROM product_items WHERE product_id = @birk02_id AND item_index = 1 LIMIT 1);
SET @poke01_item1 := (SELECT id FROM product_items WHERE product_id = @poke01_id AND item_index = 1 LIMIT 1);

INSERT IGNORE INTO orders (order_number, product_id, product_item_id, buyer_id, buyer_wallet, quantity, unit_price, total_price, shipping_address, status, created_at, updated_at)
SELECT 'ORD-DEMO-BIRK01-PEN', @birk01_id, @birk01_item1, @buyer_id, '0x5555555555555555555555555555555555555555', 1, 120100.00000000, 120100.00000000, '221B Baker Street, London NW1, United Kingdom', 'PENDING', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)
WHERE @buyer_id IS NOT NULL AND @birk01_id IS NOT NULL;

INSERT IGNORE INTO orders (order_number, product_id, product_item_id, buyer_id, buyer_wallet, quantity, unit_price, total_price, payment_tx_hash, payment_confirmed_at, shipping_address, status, created_at, updated_at)
SELECT 'ORD-DEMO-BIRK01-PRO', @birk01_id, @birk01_item2, @buyer_id, '0x5555555555555555555555555555555555555555', 1, 120100.00000000, 120100.00000000, '0xpaydemo000000000000000000000000000000000000000000000000000000001', DATE_SUB(NOW(), INTERVAL 5 DAY), '350 Fifth Avenue, New York, NY 10118, United States', 'PROCESSING', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)
WHERE @buyer_id IS NOT NULL AND @birk01_id IS NOT NULL;

INSERT IGNORE INTO orders (order_number, product_id, product_item_id, buyer_id, buyer_wallet, quantity, unit_price, total_price, payment_tx_hash, payment_confirmed_at, shipping_address, tracking_number, shipped_at, status, created_at, updated_at)
SELECT 'ORD-DEMO-BIRK01-SHP', @birk01_id, @birk01_item3, @buyer_id, '0x5555555555555555555555555555555555555555', 1, 120100.00000000, 120100.00000000, '0xpaydemo000000000000000000000000000000000000000000000000000000002', DATE_SUB(NOW(), INTERVAL 4 DAY), '1 Raffles Place, Singapore 048616', 'TRK-DEMO-1001', DATE_SUB(NOW(), INTERVAL 2 DAY), 'SHIPPED', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)
WHERE @buyer_id IS NOT NULL AND @birk01_id IS NOT NULL;

INSERT IGNORE INTO orders (order_number, product_id, product_item_id, buyer_id, buyer_wallet, quantity, unit_price, total_price, payment_tx_hash, payment_confirmed_at, shipping_address, tracking_number, shipped_at, delivered_at, seal_transfer_tx_hash, completed_at, status, created_at, updated_at)
SELECT 'ORD-DEMO-BIRK01-CMP', @birk01_id, @birk01_item4, @buyer_id, '0x5555555555555555555555555555555555555555', 1, 120100.00000000, 120100.00000000, '0xpaydemo000000000000000000000000000000000000000000000000000000003', DATE_SUB(NOW(), INTERVAL 8 DAY), 'The Bund, Zhongshan East 1st Rd, Shanghai, China', 'TRK-DEMO-1002', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), '0xsealdemo0000000000000000000000000000000000000000000000000000001', DATE_SUB(NOW(), INTERVAL 6 DAY), 'COMPLETED', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)
WHERE @buyer_id IS NOT NULL AND @birk01_id IS NOT NULL;

INSERT IGNORE INTO orders (order_number, product_id, product_item_id, buyer_id, buyer_wallet, quantity, unit_price, total_price, shipping_address, status, cancelled_at, cancellation_reason, created_at, updated_at)
SELECT 'ORD-DEMO-BIRK02-CNL', @birk02_id, @birk02_item1, @buyer_id, '0x5555555555555555555555555555555555555555', 1, 98500.00000000, 98500.00000000, 'Shibuya Crossing, Tokyo, Japan', 'CANCELLED', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Buyer changed shipping destination before payment.', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE @buyer_id IS NOT NULL AND @birk02_id IS NOT NULL;

INSERT IGNORE INTO orders (order_number, product_id, product_item_id, buyer_id, buyer_wallet, quantity, unit_price, total_price, payment_tx_hash, payment_confirmed_at, shipping_address, status, created_at, updated_at)
SELECT 'ORD-DEMO-POKE01-PAY', @poke01_id, @poke01_item1, @buyer_id, '0x5555555555555555555555555555555555555555', 1, 52100.00000000, 52100.00000000, '0xpaydemo000000000000000000000000000000000000000000000000000000004', DATE_SUB(NOW(), INTERVAL 10 HOUR), 'Alexanderplatz, Berlin, Germany', 'PAYMENT_RECEIVED', DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 10 HOUR)
WHERE @buyer_id IS NOT NULL AND @poke01_id IS NOT NULL;

UPDATE product_items SET seal_status = 'RESERVED' WHERE id IN (@birk01_item1, @birk01_item2, @birk01_item3);
UPDATE product_items SET seal_status = 'REALIZED', current_owner_id = @buyer_id, current_owner_wallet = '0x5555555555555555555555555555555555555555', sold_at = COALESCE(sold_at, DATE_SUB(NOW(), INTERVAL 6 DAY)) WHERE id = @birk01_item4;
UPDATE product_items SET seal_status = 'PRE_MINTED' WHERE id = @birk02_item1;
UPDATE product_items SET seal_status = 'RESERVED' WHERE id = @poke01_item1;
