import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database?: string;
}

class CompleteDatabaseSetup {
    private connection: mysql.Connection | null = null;
    private config: DatabaseConfig;

    constructor(config?: DatabaseConfig) {
        this.config = config || {
            host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
            port: Number(process.env.DB_PORT || process.env.DATABASE_PORT) || 3306,
            user: process.env.DB_USER || process.env.DATABASE_USER || 'root',
            password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
        };
    }

    async connect(useDatabase: boolean = false): Promise<boolean> {
        try {
            const connectionConfig: any = {
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                multipleStatements: true,
                charset: 'utf8mb4'
            };

            if (useDatabase && this.config.database) {
                connectionConfig.database = this.config.database;
            }

            this.connection = await mysql.createConnection(connectionConfig);
            console.log('✅ Database connection established');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async createDatabase(): Promise<boolean> {
        const dbName = process.env.DB_NAME || process.env.DATABASE_NAME || 'orderweb_db';
        
        try {
            if (!this.connection) {
                throw new Error('No database connection');
            }

            // Create database if it doesn't exist
            await this.connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            
            // Use the database
            await this.connection.execute(`USE \`${dbName}\``);
            
            // Update config to include database
            this.config.database = dbName;
            
            console.log(`✅ Database '${dbName}' created/selected`);
            return true;
        } catch (error) {
            console.error('❌ Database creation failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async createAllTables(): Promise<boolean> {
        const tables = this.getAllTableDefinitions();

        try {
            if (!this.connection) {
                throw new Error('No database connection');
            }

            console.log('🗄️ Creating database tables...');
            
            for (let i = 0; i < tables.length; i++) {
                const { name, sql } = tables[i];
                console.log(`Creating table: ${name}...`);
                await this.connection.execute(sql);
                console.log(`✅ Table '${name}' created successfully`);
            }
            
            console.log('✅ All database tables created successfully');
            return true;
        } catch (error) {
            console.error('❌ Table creation failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    private getAllTableDefinitions() {
        return [
            {
                name: 'super_admin_users',
                sql: `CREATE TABLE IF NOT EXISTS super_admin_users (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'tenants',
                sql: `CREATE TABLE IF NOT EXISTS tenants (
                    id VARCHAR(255) PRIMARY KEY,
                    slug VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    phone VARCHAR(20),
                    address TEXT,
                    logo_url VARCHAR(500),
                    status ENUM('active', 'inactive', 'suspended', 'trial') DEFAULT 'trial',
                    subscription_plan VARCHAR(50) DEFAULT 'starter',
                    subscription_status ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid') DEFAULT 'trialing',
                    trial_ends_at TIMESTAMP NULL,
                    smtp_host VARCHAR(255),
                    smtp_port INT DEFAULT 587,
                    smtp_secure TINYINT(1) DEFAULT 0,
                    smtp_user VARCHAR(255),
                    smtp_password VARCHAR(255),
                    smtp_from VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'tenant_users',
                sql: `CREATE TABLE IF NOT EXISTS tenant_users (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'manager', 'staff') DEFAULT 'admin',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_tenant_email (tenant_id, email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'categories',
                sql: `CREATE TABLE IF NOT EXISTS categories (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    image LONGTEXT,
                    icon VARCHAR(50),
                    color VARCHAR(7),
                    active TINYINT(1) DEFAULT 1,
                    display_order INT DEFAULT 0,
                    parentId VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL,
                    INDEX idx_tenant_categories (tenant_id),
                    INDEX idx_category_parent (parentId)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'menu_items',
                sql: `CREATE TABLE IF NOT EXISTS menu_items (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    category_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    image LONGTEXT,
                    image_hint VARCHAR(255),
                    available TINYINT(1) DEFAULT 1,
                    is_featured TINYINT(1) DEFAULT 0,
                    preparation_time INT DEFAULT 15,
                    calories INT,
                    ingredients TEXT,
                    allergens JSON,
                    nutritional_info JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                    INDEX idx_tenant_menu_items (tenant_id),
                    INDEX idx_menu_item_category (category_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'menu_item_variants',
                sql: `CREATE TABLE IF NOT EXISTS menu_item_variants (
                    id VARCHAR(255) PRIMARY KEY,
                    menu_item_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    available TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                    INDEX idx_variant_menu_item (menu_item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'customers',
                sql: `CREATE TABLE IF NOT EXISTS customers (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    date_of_birth DATE,
                    password VARCHAR(255),
                    email_verified TINYINT(1) DEFAULT 0,
                    phone_verified TINYINT(1) DEFAULT 0,
                    marketing_consent TINYINT(1) DEFAULT 0,
                    loyalty_points INT DEFAULT 0,
                    total_orders INT DEFAULT 0,
                    total_spent DECIMAL(10, 2) DEFAULT 0,
                    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_tenant_customer_email (tenant_id, email),
                    UNIQUE KEY unique_tenant_customer_phone (tenant_id, phone),
                    INDEX idx_tenant_customers (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'customer_addresses',
                sql: `CREATE TABLE IF NOT EXISTS customer_addresses (
                    id VARCHAR(255) PRIMARY KEY,
                    customer_id VARCHAR(255) NOT NULL,
                    tenant_id VARCHAR(255) NOT NULL,
                    type ENUM('home', 'work', 'other') DEFAULT 'home',
                    label VARCHAR(100),
                    address_line_1 VARCHAR(255) NOT NULL,
                    address_line_2 VARCHAR(255),
                    city VARCHAR(100) NOT NULL,
                    postcode VARCHAR(20) NOT NULL,
                    country VARCHAR(100) DEFAULT 'UK',
                    phone VARCHAR(20),
                    delivery_instructions TEXT,
                    is_default TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_customer_addresses (customer_id),
                    INDEX idx_tenant_addresses (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'orders',
                sql: `CREATE TABLE IF NOT EXISTS orders (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    customer_id VARCHAR(255),
                    order_number VARCHAR(50) NOT NULL,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_email VARCHAR(255),
                    customer_phone VARCHAR(20),
                    total_amount DECIMAL(10, 2) NOT NULL,
                    subtotal DECIMAL(10, 2) NOT NULL,
                    tax_amount DECIMAL(10, 2) DEFAULT 0,
                    discount_amount DECIMAL(10, 2) DEFAULT 0,
                    delivery_fee DECIMAL(10, 2) DEFAULT 0,
                    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
                    order_type ENUM('delivery', 'pickup', 'dine_in') DEFAULT 'delivery',
                    payment_method ENUM('cash', 'card', 'online', 'gift_card') DEFAULT 'cash',
                    payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending',
                    payment_reference VARCHAR(255),
                    notes TEXT,
                    special_instructions TEXT,
                    delivery_address JSON,
                    pickup_time TIMESTAMP NULL,
                    delivery_time TIMESTAMP NULL,
                    estimated_preparation_time INT DEFAULT 30,
                    voucher_code VARCHAR(50),
                    loyalty_points_used INT DEFAULT 0,
                    loyalty_points_earned INT DEFAULT 0,
                    feedback_requested TINYINT(1) DEFAULT 0,
                    feedback_token VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                    INDEX idx_tenant_orders (tenant_id),
                    INDEX idx_customer_orders (customer_id),
                    INDEX idx_order_status (status),
                    INDEX idx_order_number (order_number),
                    INDEX idx_feedback_token (feedback_token)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'order_items',
                sql: `CREATE TABLE IF NOT EXISTS order_items (
                    id VARCHAR(255) PRIMARY KEY,
                    order_id VARCHAR(255) NOT NULL,
                    menu_item_id VARCHAR(255) NOT NULL,
                    variant_id VARCHAR(255) NULL,
                    quantity INT NOT NULL DEFAULT 1,
                    unit_price DECIMAL(10, 2) NOT NULL,
                    total_price DECIMAL(10, 2) NOT NULL,
                    special_instructions TEXT,
                    addons JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                    FOREIGN KEY (variant_id) REFERENCES menu_item_variants(id) ON DELETE SET NULL,
                    INDEX idx_order_items (order_id),
                    INDEX idx_order_menu_item (menu_item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'restaurant_settings',
                sql: `CREATE TABLE IF NOT EXISTS restaurant_settings (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    settings JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_tenant_settings (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'delivery_zones',
                sql: `CREATE TABLE IF NOT EXISTS delivery_zones (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    postcodes TEXT NOT NULL,
                    delivery_fee DECIMAL(10, 2) DEFAULT 0,
                    minimum_order DECIMAL(10, 2) DEFAULT 0,
                    maximum_distance INT DEFAULT 5,
                    estimated_delivery_time INT DEFAULT 45,
                    active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_tenant_zones (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'vouchers',
                sql: `CREATE TABLE IF NOT EXISTS vouchers (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    code VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    discount_type ENUM('percentage', 'fixed') NOT NULL,
                    discount_value DECIMAL(10, 2) NOT NULL,
                    minimum_order DECIMAL(10, 2) DEFAULT 0,
                    maximum_discount DECIMAL(10, 2),
                    usage_limit INT DEFAULT NULL,
                    usage_limit_per_customer INT DEFAULT 1,
                    used_count INT DEFAULT 0,
                    first_order_only TINYINT(1) DEFAULT 0,
                    active TINYINT(1) DEFAULT 1,
                    valid_from TIMESTAMP NULL,
                    valid_to TIMESTAMP NULL,
                    applicable_to ENUM('all', 'delivery', 'pickup') DEFAULT 'all',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_tenant_voucher_code (tenant_id, code),
                    INDEX idx_tenant_vouchers (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'gift_cards',
                sql: `CREATE TABLE IF NOT EXISTS gift_cards (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    card_number VARCHAR(20) UNIQUE NOT NULL,
                    card_type ENUM('digital', 'physical') NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    remaining_balance DECIMAL(10, 2) NOT NULL,
                    status ENUM('active', 'redeemed', 'expired', 'cancelled') DEFAULT 'active',
                    expiry_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_tenant_gift_cards (tenant_id),
                    INDEX idx_gift_card_number (card_number),
                    INDEX idx_gift_card_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'gift_card_orders',
                sql: `CREATE TABLE IF NOT EXISTS gift_card_orders (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    gift_card_id VARCHAR(255) NOT NULL,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_email VARCHAR(255) NOT NULL,
                    customer_phone VARCHAR(20),
                    recipient_name VARCHAR(255),
                    recipient_email VARCHAR(255),
                    recipient_address TEXT,
                    personal_message TEXT,
                    order_amount DECIMAL(10, 2) NOT NULL,
                    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                    payment_method VARCHAR(50),
                    payment_transaction_id VARCHAR(255),
                    delivery_status ENUM('pending', 'sent', 'delivered') DEFAULT 'pending',
                    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sent_date TIMESTAMP NULL,
                    delivered_date TIMESTAMP NULL,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
                    INDEX idx_tenant_gift_card_orders (tenant_id),
                    INDEX idx_gift_card_orders (gift_card_id),
                    INDEX idx_payment_status (payment_status),
                    INDEX idx_delivery_status (delivery_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'gift_card_transactions',
                sql: `CREATE TABLE IF NOT EXISTS gift_card_transactions (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    gift_card_id VARCHAR(255) NOT NULL,
                    transaction_type ENUM('purchase', 'redemption', 'refund', 'adjustment') NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    remaining_balance DECIMAL(10, 2) NOT NULL,
                    description TEXT,
                    reference_order_id VARCHAR(255),
                    created_by VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
                    FOREIGN KEY (reference_order_id) REFERENCES orders(id) ON DELETE SET NULL,
                    INDEX idx_tenant_gift_card_transactions (tenant_id),
                    INDEX idx_gift_card_transactions (gift_card_id),
                    INDEX idx_transaction_type (transaction_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'gift_card_settings',
                sql: `CREATE TABLE IF NOT EXISTS gift_card_settings (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) UNIQUE NOT NULL,
                    fixed_amounts JSON,
                    allow_custom_amount BOOLEAN DEFAULT TRUE,
                    min_custom_amount DECIMAL(10,2) DEFAULT 10.00,
                    max_custom_amount DECIMAL(10,2) DEFAULT 500.00,
                    default_expiry_months INT DEFAULT 12,
                    auto_cleanup_expired BOOLEAN DEFAULT TRUE,
                    auto_cleanup_zero_balance BOOLEAN DEFAULT TRUE,
                    digital_card_template TEXT,
                    physical_card_instructions TEXT,
                    terms_and_conditions TEXT,
                    display_name VARCHAR(255),
                    cover_image_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_tenant_gift_card_settings (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'loyalty_transactions',
                sql: `CREATE TABLE IF NOT EXISTS loyalty_transactions (
                    id VARCHAR(255) PRIMARY KEY,
                    customer_id VARCHAR(255) NOT NULL,
                    tenant_id VARCHAR(255) NOT NULL,
                    order_id VARCHAR(255),
                    transaction_type ENUM('earned', 'redeemed', 'expired', 'bonus', 'adjustment') NOT NULL,
                    points INT NOT NULL,
                    balance_before INT NOT NULL,
                    balance_after INT NOT NULL,
                    description TEXT,
                    expires_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                    INDEX idx_customer_loyalty_transactions (customer_id),
                    INDEX idx_tenant_loyalty_transactions (tenant_id),
                    INDEX idx_loyalty_order_transactions (order_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'email_templates',
                sql: `CREATE TABLE IF NOT EXISTS email_templates (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    template_type ENUM('order_confirmation', 'order_complete', 'restaurant_notification', 'welcome', 'password_reset', 'order_cancelled') NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    html_content TEXT NOT NULL,
                    text_content TEXT,
                    variables JSON,
                    active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_tenant_template (tenant_id, template_type),
                    INDEX idx_tenant_templates (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'order_feedback',
                sql: `CREATE TABLE IF NOT EXISTS order_feedback (
                    id VARCHAR(255) PRIMARY KEY,
                    order_id VARCHAR(255) NOT NULL,
                    tenant_id VARCHAR(255) NOT NULL,
                    customer_id VARCHAR(255),
                    customer_email VARCHAR(255) NOT NULL,
                    customer_name VARCHAR(255),
                    overall_rating INT(1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
                    food_rating INT(1) CHECK (food_rating >= 1 AND food_rating <= 5),
                    service_rating INT(1) CHECK (service_rating >= 1 AND service_rating <= 5),
                    delivery_rating INT(1) CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
                    review TEXT,
                    feedback_token VARCHAR(255) UNIQUE NOT NULL,
                    would_recommend TINYINT(1),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                    INDEX idx_tenant_feedback (tenant_id),
                    INDEX idx_order_feedback (order_id),
                    INDEX idx_customer_feedback (customer_id),
                    INDEX idx_feedback_token (feedback_token)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'email_logs',
                sql: `CREATE TABLE IF NOT EXISTS email_logs (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    order_id VARCHAR(255),
                    customer_id VARCHAR(255),
                    email_type ENUM('order_confirmation', 'order_complete', 'restaurant_notification', 'welcome', 'password_reset', 'marketing') NOT NULL,
                    recipient_email VARCHAR(255) NOT NULL,
                    recipient_name VARCHAR(255),
                    subject VARCHAR(255) NOT NULL,
                    status ENUM('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened') DEFAULT 'pending',
                    sent_at TIMESTAMP NULL,
                    delivered_at TIMESTAMP NULL,
                    opened_at TIMESTAMP NULL,
                    error_message TEXT,
                    email_provider VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                    INDEX idx_tenant_email_logs (tenant_id),
                    INDEX idx_order_email_logs (order_id),
                    INDEX idx_customer_email_logs (customer_id),
                    INDEX idx_email_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'addons',
                sql: `CREATE TABLE IF NOT EXISTS addons (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    type ENUM('single', 'multiple') DEFAULT 'single',
                    required TINYINT(1) DEFAULT 0,
                    max_selections INT DEFAULT 1,
                    display_order INT DEFAULT 0,
                    active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_tenant_addons (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'addon_options',
                sql: `CREATE TABLE IF NOT EXISTS addon_options (
                    id VARCHAR(255) PRIMARY KEY,
                    addon_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10, 2) DEFAULT 0,
                    available TINYINT(1) DEFAULT 1,
                    display_order INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
                    INDEX idx_addon_options (addon_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'menu_item_addons',
                sql: `CREATE TABLE IF NOT EXISTS menu_item_addons (
                    id VARCHAR(255) PRIMARY KEY,
                    menu_item_id VARCHAR(255) NOT NULL,
                    addon_id VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                    FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_menu_item_addon (menu_item_id, addon_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'kitchen_displays',
                sql: `CREATE TABLE IF NOT EXISTS kitchen_displays (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    location VARCHAR(255),
                    display_categories JSON,
                    auto_accept_orders TINYINT(1) DEFAULT 0,
                    sound_enabled TINYINT(1) DEFAULT 1,
                    active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_tenant_kitchen_displays (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'printers',
                sql: `CREATE TABLE IF NOT EXISTS printers (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    type ENUM('thermal', 'inkjet', 'network') DEFAULT 'thermal',
                    connection_type ENUM('usb', 'ethernet', 'bluetooth', 'wifi') DEFAULT 'usb',
                    ip_address VARCHAR(45),
                    port INT,
                    print_orders TINYINT(1) DEFAULT 1,
                    print_receipts TINYINT(1) DEFAULT 1,
                    print_kitchen_tickets TINYINT(1) DEFAULT 0,
                    paper_width INT DEFAULT 80,
                    active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    INDEX idx_tenant_printers (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            }
        ];
    }

    async createDefaultSuperAdmin(): Promise<boolean> {
        try {
            if (!this.connection) {
                throw new Error('No database connection');
            }

            // Check if super admin already exists
            const [existing] = await this.connection.execute(
                'SELECT id FROM super_admin_users LIMIT 1'
            ) as [any[], any];

            if (existing.length > 0) {
                console.log('✅ Super admin already exists');
                return true;
            }

            // Create default super admin
            const adminId = uuidv4();
            const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@orderweb.com';
            const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123456';
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            await this.connection.execute(
                'INSERT INTO super_admin_users (id, name, email, password) VALUES (?, ?, ?, ?)',
                [adminId, 'Super Admin', adminEmail, hashedPassword]
            );

            console.log('✅ Default super admin created');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
            console.log('⚠️  Please change the default password after first login!');
            return true;
        } catch (error) {
            console.error('❌ Super admin creation failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async createDefaultEmailTemplates(): Promise<boolean> {
        // This will be called when tenants are created, not during initial setup
        console.log('✅ Email templates will be created when tenants are added');
        return true;
    }

    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            console.log('✅ Database connection closed');
        }
    }

    async setupCompleteDatabase(): Promise<boolean> {
        console.log('🚀 Starting complete database setup...');
        console.log('=====================================');
        
        try {
            // Step 1: Connect to database server (without specific database)
            console.log('🔗 Connecting to database server...');
            const connected = await this.connect(false);
            if (!connected) return false;

            // Step 2: Create database
            console.log('🗄️ Creating database...');
            const dbCreated = await this.createDatabase();
            if (!dbCreated) return false;

            // Step 3: Create all tables
            console.log('📋 Creating all database tables...');
            const tablesCreated = await this.createAllTables();
            if (!tablesCreated) return false;

            // Step 4: Create default super admin
            console.log('👤 Creating default super admin...');
            const adminCreated = await this.createDefaultSuperAdmin();
            if (!adminCreated) return false;

            // Step 5: Set up default email templates placeholder
            console.log('📧 Setting up email templates...');
            const templatesCreated = await this.createDefaultEmailTemplates();
            if (!templatesCreated) return false;

            console.log('');
            console.log('🎉 Complete database setup finished successfully!');
            console.log('================================================');
            console.log('');
            console.log('✅ Database created and configured');
            console.log('✅ All tables created (25+ tables)');
            console.log('✅ Super admin account created');
            console.log('✅ System ready for restaurant management');
            console.log('');
            console.log('🌟 Your OrderWeb Restaurant System is ready!');
            console.log('📍 Super Admin Panel: /super-admin');
            console.log('📍 Health Check: /api/health');
            console.log('📍 Database Status: /api/db-status');
            console.log('');
            
            return true;
        } catch (error) {
            console.error('❌ Complete database setup failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        } finally {
            await this.close();
        }
    }
}

export default CompleteDatabaseSetup;
