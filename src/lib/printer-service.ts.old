'use server';

import pool from './db';
import type { Printer } from './types';

export async function getPrinters(): Promise<Printer[]> {
    const [rows] = await pool.query('SELECT * FROM printers');
    return rows as Printer[];
}

export async function savePrinter(printer: Printer): Promise<void> {
    const { id, name, ipAddress, port, type, active } = printer;
    const sql = `
        INSERT INTO printers (id, name, ipAddress, port, type, active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        ipAddress = VALUES(ipAddress),
        port = VALUES(port),
        type = VALUES(type),
        active = VALUES(active)
    `;
    await pool.query(sql, [id, name, ipAddress, port, type, active]);
}

export async function deletePrinter(printerId: string): Promise<void> {
    await pool.query('DELETE FROM printers WHERE id = ?', [printerId]);
}
