'use server';

import db from './db';
import type { Customer, Address } from './types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function getTenantCustomers(tenantId: string): Promise<Customer[]> {
    const [rows] = await db.query(
        'SELECT * FROM customers WHERE tenant_id = ?',
        [tenantId]
    );
    return rows as Customer[];
}

export async function getTenantCustomerById(tenantId: string, customerId: string): Promise<Customer | null> {
    const [rows] = await db.query(
        'SELECT * FROM customers WHERE tenant_id = ? AND id = ?',
        [tenantId, customerId]
    );
    const customers = rows as Customer[];
    return customers.length > 0 ? customers[0] : null;
}

export async function getTenantCustomerByEmail(tenantId: string, email: string): Promise<Customer | null> {
    const [rows] = await db.query(
        'SELECT * FROM customers WHERE tenant_id = ? AND email = ?',
        [tenantId, email]
    );
    const customers = rows as Customer[];
    return customers.length > 0 ? customers[0] : null;
}

export async function createTenantCustomer(tenantId: string, customerData: Omit<Customer, 'id'>): Promise<Customer> {
    const hashedPassword = await bcrypt.hash(customerData.password!, 12);
    
    const customerId = uuidv4();
    await db.execute(
        'INSERT INTO customers (id, tenant_id, name, email, phone, password) VALUES (?, ?, ?, ?, ?, ?)',
        [customerId, tenantId, customerData.name, customerData.email, customerData.phone, hashedPassword]
    );
    
    return {
        id: customerId,
        tenant_id: tenantId,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        password: hashedPassword
    };
}

export async function authenticateTenantCustomer(tenantId: string, email: string, password: string): Promise<Customer | null> {
    const customer = await getTenantCustomerByEmail(tenantId, email);
    if (!customer || !customer.password) return null;
    
    const isValid = await bcrypt.compare(password, customer.password);
    return isValid ? customer : null;
}

export async function getTenantCustomerAddresses(tenantId: string, customerId: string): Promise<Address[]> {
    const [rows] = await db.query(
        `SELECT a.* FROM addresses a 
         JOIN customers c ON a.customerId = c.id 
         WHERE c.tenant_id = ? AND a.customerId = ?`,
        [tenantId, customerId]
    );
    return rows as Address[];
}

export async function addTenantCustomerAddress(tenantId: string, customerId: string, address: Omit<Address, 'id'>): Promise<void> {
    const id = uuidv4();
    
    // Verify customer belongs to tenant
    const customer = await getTenantCustomerById(tenantId, customerId);
    if (!customer) {
        throw new Error('Customer not found for this tenant');
    }
    
    await db.execute(
        'INSERT INTO addresses (id, street, city, postcode, isDefault, customerId) VALUES (?, ?, ?, ?, ?, ?)',
        [id, address.street, address.city, address.postcode, address.isDefault, customerId]
    );
}

export async function deleteTenantCustomerAddress(tenantId: string, addressId: string): Promise<void> {
    // Verify address belongs to customer of this tenant
    await db.execute(
        `DELETE a FROM addresses a 
         JOIN customers c ON a.customerId = c.id 
         WHERE c.tenant_id = ? AND a.id = ?`,
        [tenantId, addressId]
    );
}
