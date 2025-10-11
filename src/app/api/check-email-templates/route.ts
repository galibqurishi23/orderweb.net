import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        // Get gift card email templates
        const [templates] = await db.query(`
            SELECT template_name, subject, html_content 
            FROM email_templates 
            WHERE template_name LIKE '%gift%' OR template_type = 'gift_card'
            LIMIT 5
        `) as any[];

        return NextResponse.json({
            success: true,
            templates: templates.map((t: any) => ({
                name: t.template_name,
                subject: t.subject,
                hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu.test(t.subject || ''),
                contentLength: t.html_content?.length || 0
            }))
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
