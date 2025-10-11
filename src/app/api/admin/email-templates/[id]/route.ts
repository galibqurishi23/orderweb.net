import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const templateId = params.id;
    const body = await request.json();

    const {
      template_name,
      subject,
      html_content,
      logo_url,
      primary_color,
      secondary_color,
      background_color,
      text_color,
      facebook_url,
      instagram_url,
      tiktok_url,
      website_url,
      // New social media fields
      icon_color,
      enable_social_icons,
      from_name,
      from_email,
      reply_to_email,
      is_active
    } = body;

    await pool.execute(
      `UPDATE email_templates SET 
        template_name = ?,
        subject = ?,
        html_content = ?,
        logo_url = ?,
        primary_color = ?,
        secondary_color = ?,
        background_color = ?,
        text_color = ?,
        facebook_url = ?,
        instagram_url = ?,
        tiktok_url = ?,
        website_url = ?,
        icon_color = ?,
        enable_social_icons = ?,
        from_name = ?,
        from_email = ?,
        reply_to_email = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        template_name,
        subject,
        html_content,
        logo_url,
        primary_color,
        secondary_color,
        background_color,
        text_color,
        facebook_url,
        instagram_url,
        tiktok_url,
        website_url,
        icon_color,
        enable_social_icons,
        from_name,
        from_email,
        reply_to_email,
        is_active,
        templateId
      ]
    );

    return NextResponse.json({ success: true, message: "Template updated successfully" });
  } catch (error) {
    console.error("Error updating email template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
