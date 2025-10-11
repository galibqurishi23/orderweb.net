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

    // Get tenant SMTP settings
    const [rows] = await pool.execute(
      "SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_from FROM tenants WHERE slug = ?",
      [tenantSlug]
    );

    const tenants = rows as any[];
    if (tenants.length === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenant = tenants[0];
    
    return NextResponse.json({
      smtpSettings: {
        host: tenant.smtp_host || "",
        port: tenant.smtp_port || 587,
        secure: Boolean(tenant.smtp_secure),
        username: tenant.smtp_user || "",
        password: "", // Never return password
        fromEmail: tenant.smtp_from || "",
        fromName: "" // This could be stored separately if needed
      }
    });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("🚀 [API] POST /api/admin/email-settings - Request received");
  
  try {
    const body = await request.json();
    const { smtpSettings, tenant: tenantSlug } = body;

    console.log("📝 [API] Request body parsed:", { 
      tenantSlug, 
      smtpSettings: smtpSettings ? { ...smtpSettings, password: "***" } : null,
      bodyKeys: Object.keys(body)
    });

    if (!tenantSlug) {
      console.error("❌ [API] Missing tenant slug");
      return NextResponse.json({ error: "Tenant is required" }, { status: 400 });
    }

    if (!smtpSettings) {
      console.error("❌ [API] Missing SMTP settings");
      return NextResponse.json({ error: "SMTP settings are required" }, { status: 400 });
    }

    console.log("🔍 [DB] Checking if tenant exists:", tenantSlug);
    
    // First check if tenant exists
    const [checkRows] = await pool.execute(
      "SELECT id, name, slug FROM tenants WHERE slug = ?",
      [tenantSlug]
    );

    const tenants = checkRows as any[];
    console.log("🔍 [DB] Tenant query result:", { 
      foundCount: tenants.length,
      tenants: tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug }))
    });

    if (tenants.length === 0) {
      console.error("❌ [DB] Tenant not found in database:", tenantSlug);
      
      // Let's also check what tenants DO exist
      const [allTenants] = await pool.execute("SELECT slug FROM tenants LIMIT 10");
      console.log("🔍 [DB] Available tenants:", (allTenants as any[]).map(t => t.slug));
      
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenant = tenants[0];
    console.log("✅ [DB] Found tenant:", { id: tenant.id, name: tenant.name });

    // Auto-correct secure setting based on port (backend safety check)
    const autoCorrectSecureSettings = (settings: any) => {
      const corrected = { ...settings };
      if (settings.port === 465) {
        corrected.secure = true; // Port 465 requires SSL/TLS
        console.log("🔧 [AUTO-CORRECT] Port 465 detected, setting secure = true");
      } else if (settings.port === 587 || settings.port === 25) {
        corrected.secure = false; // Port 587/25 uses STARTTLS
        console.log("🔧 [AUTO-CORRECT] Port 587/25 detected, setting secure = false");
      }
      return corrected;
    };

    const correctedSettings = autoCorrectSecureSettings(smtpSettings);
    console.log("🔧 [AUTO-CORRECT] Settings after correction:", {
      ...correctedSettings,
      password: "***"
    });

    console.log("💾 [DB] Updating tenant SMTP settings...");
    
    // Update tenant SMTP settings
    const updateResult = await pool.execute(
      `UPDATE tenants SET 
        smtp_host = ?, 
        smtp_port = ?, 
        smtp_secure = ?, 
        smtp_user = ?, 
        smtp_password = ?, 
        smtp_from = ?
      WHERE slug = ?`,
      [
        correctedSettings.host,
        correctedSettings.port,
        correctedSettings.secure ? 1 : 0,
        correctedSettings.username,
        correctedSettings.password,
        correctedSettings.fromEmail,
        tenantSlug
      ]
    );

    console.log("💾 [DB] Update result:", {
      affectedRows: (updateResult as any).affectedRows,
      changedRows: (updateResult as any).changedRows
    });

    console.log("✅ [API] SMTP settings saved successfully");
    return NextResponse.json({ 
      success: true, 
      message: "SMTP settings saved successfully",
      debug: {
        tenantFound: true,
        updateAffectedRows: (updateResult as any).affectedRows,
        autoCorrection: correctedSettings.secure !== smtpSettings.secure ? 
          `Port ${correctedSettings.port} -> secure: ${correctedSettings.secure}` : "none"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    console.error("💥 [API] Error saving email settings:", {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    return NextResponse.json({ 
      error: `Internal server error: ${errorMessage}` 
    }, { status: 500 });
  }
}
