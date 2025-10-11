import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '@/lib/db';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Create backup table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        backup_name VARCHAR(255),
        file_path VARCHAR(500),
        file_size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending'
      )
    `);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupPath = `./backups/${backupName}.sql`;

    // Insert backup record
    const [result] = await db.execute(`
      INSERT INTO system_backups (backup_name, file_path, status)
      VALUES (?, ?, 'pending')
    `, [backupName, backupPath]);

    const backupId = (result as any).insertId;

    try {
      // Create backup using mysqldump
      const command = `mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${backupPath}`;
      
      await execAsync(command);

      // Update backup status to completed
      await db.execute(`
        UPDATE system_backups 
        SET status = 'completed'
        WHERE id = ?
      `, [backupId]);

      return NextResponse.json({
        success: true,
        message: 'Database backup created successfully',
        backupName
      });

    } catch (backupError) {
      // Update backup status to failed
      await db.execute(`
        UPDATE system_backups 
        SET status = 'failed'
        WHERE id = ?
      `, [backupId]);

      throw backupError;
    }

  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create backup'
    }, { status: 500 });
  }
}
