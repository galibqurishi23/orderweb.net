import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get tenant from URL search params
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant parameter is required" }, { status: 400 });
    }

    // Get email templates directly using tenant_slug
    const [rows] = await pool.execute(
      `SELECT 
        id, tenant_slug, template_type, template_name, subject, html_content,
        logo_url, primary_color, secondary_color, background_color, text_color,
        facebook_url, instagram_url, tiktok_url, website_url,
        from_name, from_email, reply_to_email, is_active, created_at, updated_at
      FROM email_templates 
      WHERE tenant_slug = ? 
      ORDER BY template_type, template_name`,
      [tenantSlug]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
