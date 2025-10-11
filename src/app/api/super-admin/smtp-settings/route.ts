import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');

interface SMTPSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

// Get current SMTP settings from environment variables
export async function GET() {
  try {
    const smtpSettings: SMTPSettings = {
      enabled: !!process.env.SMTP_HOST,
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
      from: process.env.SMTP_FROM || '',
    };

    return NextResponse.json(smtpSettings);
  } catch (error) {
    console.error('Error loading SMTP settings:', error);
    return NextResponse.json(
      { error: 'Failed to load SMTP settings' },
      { status: 500 }
    );
  }
}

// Update SMTP settings in .env file
export async function POST(request: NextRequest) {
  try {
    const newSettings: SMTPSettings = await request.json();

    // Read current .env file
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_FILE_PATH, 'utf-8');
    } catch (error) {
      // If .env doesn't exist, create it
      console.log('.env file does not exist, creating new one');
    }

    // Parse existing env vars
    const envVars = new Map<string, string>();
    if (envContent) {
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars.set(key.trim(), valueParts.join('=').trim());
          }
        }
      }
    }

    // Update SMTP settings
    if (newSettings.enabled) {
      envVars.set('SMTP_HOST', newSettings.host);
      envVars.set('SMTP_PORT', newSettings.port.toString());
      envVars.set('SMTP_SECURE', newSettings.secure.toString());
      envVars.set('SMTP_USER', newSettings.user);
      envVars.set('SMTP_PASSWORD', newSettings.password);
      envVars.set('SMTP_FROM', newSettings.from);
    } else {
      // Remove SMTP settings if disabled
      envVars.delete('SMTP_HOST');
      envVars.delete('SMTP_PORT');
      envVars.delete('SMTP_SECURE');
      envVars.delete('SMTP_USER');
      envVars.delete('SMTP_PASSWORD');
      envVars.delete('SMTP_FROM');
    }

    // Rebuild .env content
    let newEnvContent = '';
    
    // Add comment header
    newEnvContent += '# Application Configuration\n';
    
    // Add non-SMTP variables first
    const nonSmtpVars = Array.from(envVars.entries()).filter(([key]) => 
      !key.startsWith('SMTP_')
    );
    
    for (const [key, value] of nonSmtpVars) {
      newEnvContent += `${key}=${value}\n`;
    }
    
    // Add SMTP section if enabled
    if (newSettings.enabled) {
      newEnvContent += '\n# SMTP Configuration\n';
      newEnvContent += `SMTP_HOST=${newSettings.host}\n`;
      newEnvContent += `SMTP_PORT=${newSettings.port}\n`;
      newEnvContent += `SMTP_SECURE=${newSettings.secure}\n`;
      newEnvContent += `SMTP_USER=${newSettings.user}\n`;
      newEnvContent += `SMTP_PASSWORD=${newSettings.password}\n`;
      newEnvContent += `SMTP_FROM=${newSettings.from}\n`;
    }

    // Write updated .env file
    await fs.writeFile(ENV_FILE_PATH, newEnvContent, 'utf-8');

    // Update process.env for current session
    if (newSettings.enabled) {
      process.env.SMTP_HOST = newSettings.host;
      process.env.SMTP_PORT = newSettings.port.toString();
      process.env.SMTP_SECURE = newSettings.secure.toString();
      process.env.SMTP_USER = newSettings.user;
      process.env.SMTP_PASSWORD = newSettings.password;
      process.env.SMTP_FROM = newSettings.from;
    } else {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASSWORD;
      delete process.env.SMTP_FROM;
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP settings updated successfully'
    });

  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json(
      { error: 'Failed to save SMTP settings' },
      { status: 500 }
    );
  }
}
