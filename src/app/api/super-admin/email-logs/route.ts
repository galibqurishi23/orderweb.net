import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface EmailLog {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  status: 'success' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
}

export async function GET() {
  try {
    // For now, we'll read from the email-debug.log file to show recent email activity
    const logFilePath = path.join(process.cwd(), 'email-debug.log');
    
    let emailLogs: EmailLog[] = [];
    
    try {
      if (fs.existsSync(logFilePath)) {
        const logContent = fs.readFileSync(logFilePath, 'utf-8');
        const logLines = logContent.trim().split('\n').filter(line => line.trim());
        
        // Parse the last 20 log entries
        emailLogs = logLines.slice(-20).reverse().map((line, index) => {
          const parts = line.split(' - ');
          if (parts.length >= 2) {
            const timestamp = parts[0];
            const message = parts[1];
            
            // Parse different types of log entries
            let status: 'success' | 'failed' | 'pending' = 'pending';
            let to = 'Unknown';
            let subject = 'Email';
            let messageId: string | null = null;
            
            if (message.includes('SUCCESS:')) {
              status = 'success';
              const emailMatch = message.match(/to ([^,]+)/);
              const messageIdMatch = message.match(/MessageID: ([^,\s]+)/);
              if (emailMatch) to = emailMatch[1];
              if (messageIdMatch) messageId = messageIdMatch[1];
              subject = 'Welcome Email (Auto)';
            } else if (message.includes('ERROR:')) {
              status = 'failed';
              const emailMatch = message.match(/to ([^:]+)/);
              if (emailMatch) to = emailMatch[1];
              subject = 'Email (Failed)';
            } else {
              const emailMatch = message.match(/to ([^,\s]+)/);
              if (emailMatch) to = emailMatch[1];
              subject = 'Manual Email';
            }
            
            return {
              id: `log-${Date.now()}-${index}`,
              timestamp: new Date(timestamp).toLocaleString(),
              to: to.trim(),
              subject,
              status,
              messageId: messageId || undefined,
              error: status === 'failed' ? message : undefined
            };
          }
          return null;
        }).filter((item) => item !== null) as EmailLog[];
      }
    } catch (error) {
      console.error('Error reading email log file:', error);
    }
    
    // If no logs from file, return some sample data to show the structure
    if (emailLogs.length === 0) {
      emailLogs = [
        {
          id: 'sample-1',
          timestamp: new Date().toLocaleString(),
          to: 'No emails sent yet',
          subject: 'Welcome to Email Management',
          status: 'pending',
          messageId: undefined
        }
      ];
    }

    return NextResponse.json({
      success: true,
      data: emailLogs
    });

  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}
