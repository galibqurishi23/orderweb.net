'use server';

import pool from './db';
import type { Voucher } from './types';
import { v4 as uuidv4 } from 'uuid';

export async function getTenantVouchers(tenantId: string): Promise<Voucher[]> {
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE tenant_id = ?', [tenantId]);
    return (rows as any[]).map(v => ({
        ...v,
        value: parseFloat(v.value),
        minOrder: parseFloat(v.minOrder),
        maxDiscount: v.maxDiscount ? parseFloat(v.maxDiscount) : undefined,
        expiryDate: new Date(v.expiryDate),
        active: Boolean(v.active),
        usageLimit: v.usageLimit ? Number(v.usageLimit) : undefined,
        usedCount: Number(v.usedCount),
        type: v.type // Keep type as-is since database has correct enum values
    }));
}

export async function validateTenantVoucher(tenantId: string, code: string, orderTotal: number): Promise<{ valid: boolean; voucher?: Voucher; error?: string }> {
    const [rows] = await pool.query(
        'SELECT * FROM vouchers WHERE tenant_id = ? AND code = ? AND active = 1',
        [tenantId, code]
    );
    
    const vouchers = rows as any[];
    if (vouchers.length === 0) {
        return { valid: false, error: 'Invalid voucher code' };
    }
    
    const voucher = vouchers[0];
    const voucherData: Voucher = {
        ...voucher,
        value: parseFloat(voucher.value),
        minOrder: parseFloat(voucher.minOrder),
        maxDiscount: voucher.maxDiscount ? parseFloat(voucher.maxDiscount) : undefined,
        expiryDate: new Date(voucher.expiryDate),
        active: Boolean(voucher.active),
        usageLimit: voucher.usageLimit ? Number(voucher.usageLimit) : undefined,
        usedCount: Number(voucher.usedCount),
        type: voucher.type // Keep type as-is since database has correct enum values
    };
    
    // Check if voucher has expired - compare with end of expiry day to allow usage throughout the expiry date
    const currentDate = new Date();
    const expiryEndOfDay = new Date(voucherData.expiryDate);
    expiryEndOfDay.setHours(23, 59, 59, 999); // Set to end of expiry day
    
    if (currentDate > expiryEndOfDay) {
        return { valid: false, error: 'Voucher has expired' };
    }
    
    // Check usage limit
    if (voucherData.usageLimit && voucherData.usedCount >= voucherData.usageLimit) {
        return { valid: false, error: 'Voucher usage limit reached' };
    }
    
    // Check minimum order value
    if (orderTotal < voucherData.minOrder) {
        return { valid: false, error: `Minimum order value is ${voucherData.minOrder}` };
    }
    
    return { valid: true, voucher: voucherData };
}

export async function calculateVoucherDiscount(voucher: Voucher, orderTotal: number): Promise<number> {
    let discount = 0;
    
    if (voucher.type === 'percentage') {
        discount = (orderTotal * voucher.value) / 100;
        // Apply maximum discount limit if specified
        if (voucher.maxDiscount && discount > voucher.maxDiscount) {
            discount = voucher.maxDiscount;
        }
    } else if (voucher.type === 'amount') {
        discount = voucher.value;
        // Don't let discount exceed order total
        if (discount > orderTotal) {
            discount = orderTotal;
        }
    }
    
    return Math.round(discount * 100) / 100; // Round to 2 decimal places
}

export async function saveTenantVoucher(tenantId: string, voucher: Voucher): Promise<void> {
    try {
        console.log('=== SAVING VOUCHER ===');
        console.log('Tenant ID:', tenantId);
        console.log('Voucher:', voucher);
        
        // Generate new ID if needed
        const voucherId = (voucher.id && !voucher.id.startsWith('voucher-')) ? voucher.id : uuidv4();
        
        // Check if voucher exists in database to determine if it's new or update
        let isNewVoucher = true;
        if (voucher.id && !voucher.id.startsWith('voucher-')) {
            const [existingRows] = await pool.query(
                'SELECT id FROM vouchers WHERE id = ? AND tenant_id = ?',
                [voucher.id, tenantId]
            );
            isNewVoucher = (existingRows as any[]).length === 0;
        }
        
        // Prepare the data
        const code = voucher.code?.trim();
        const type = voucher.type;
        const value = Number(voucher.value);
        const minOrder = Number(voucher.minOrder || 0);
        const maxDiscount = voucher.maxDiscount ? Number(voucher.maxDiscount) : null;
        const expiryDate = voucher.expiryDate instanceof Date ? 
            voucher.expiryDate.toISOString().split('T')[0] : 
            new Date(voucher.expiryDate).toISOString().split('T')[0];
        const active = voucher.active ? 1 : 0;
        const usageLimit = voucher.usageLimit ? Number(voucher.usageLimit) : null;
        const usedCount = Number(voucher.usedCount || 0);
        
        console.log('Prepared data:', {
            voucherId, isNewVoucher, code, type, value, minOrder, maxDiscount, 
            expiryDate, active, usageLimit, usedCount
        });
        
        if (isNewVoucher) {
            // Create new voucher
            const sql = `
                INSERT INTO vouchers (id, tenant_id, code, type, value, minOrder, maxDiscount, expiryDate, active, usageLimit, usedCount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [voucherId, tenantId, code, type, value, minOrder, maxDiscount, expiryDate, active, usageLimit, usedCount];
            
            console.log('INSERT SQL:', sql);
            console.log('INSERT params:', params);
            
            await pool.execute(sql, params);
            console.log('New voucher created successfully');
            
        } else {
            // Update existing voucher
            const sql = `
                UPDATE vouchers 
                SET code = ?, type = ?, value = ?, minOrder = ?, maxDiscount = ?, expiryDate = ?, active = ?, usageLimit = ?, usedCount = ?
                WHERE id = ? AND tenant_id = ?
            `;
            
            const params = [code, type, value, minOrder, maxDiscount, expiryDate, active, usageLimit, usedCount, voucherId, tenantId];
            
            console.log('UPDATE SQL:', sql);
            console.log('UPDATE params:', params);
            
            await pool.execute(sql, params);
            console.log('Existing voucher updated successfully');
        }
        
        console.log('=== VOUCHER SAVED SUCCESSFULLY ===');
        
    } catch (error) {
        console.error('=== VOUCHER SAVE ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        throw error;
    }
}

export async function updateTenantVoucher(tenantId: string, voucher: Voucher): Promise<void> {
    const { id, code, value, minOrder, maxDiscount, expiryDate, active, usageLimit, usedCount } = voucher;
    const voucherType = voucher.type; // Use type as-is since database expects 'amount' not 'fixed'
    
    const sql = `
        UPDATE vouchers 
        SET code = ?, type = ?, value = ?, minOrder = ?, maxDiscount = ?, 
            expiryDate = ?, active = ?, usageLimit = ?, usedCount = ?
        WHERE id = ? AND tenant_id = ?
    `;
    
    await pool.execute(sql, [
        code, voucherType, value, minOrder, maxDiscount || null, 
        expiryDate, active, usageLimit || null, usedCount, id, tenantId
    ]);
}

export async function deleteTenantVoucher(tenantId: string, voucherId: string): Promise<void> {
    await pool.execute('DELETE FROM vouchers WHERE id = ? AND tenant_id = ?', [voucherId, tenantId]);
}

export async function deleteAllTenantVouchers(tenantId: string): Promise<void> {
    await pool.execute('DELETE FROM vouchers WHERE tenant_id = ?', [tenantId]);
}

export async function incrementVoucherUsage(tenantId: string, voucherId: string): Promise<void> {
    await pool.execute(
        'UPDATE vouchers SET usedCount = usedCount + 1 WHERE id = ? AND tenant_id = ?',
        [voucherId, tenantId]
    );
}

export async function toggleTenantVoucherStatus(tenantId: string, voucherId: string): Promise<void> {
    await pool.execute(
        'UPDATE vouchers SET active = NOT active WHERE id = ? AND tenant_id = ?',
        [voucherId, tenantId]
    );
}
