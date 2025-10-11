#!/bin/bash

# Script to create POS sync tables in all tenant databases

echo "🔧 Creating POS Sync Tables in Tenant Databases..."
echo "================================================="

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASSWORD:-}"

# Read the SQL file
SQL_FILE="./database/migrations/create_pos_sync_tables.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: SQL file not found at $SQL_FILE"
    exit 1
fi

# Get list of all tenant databases (starting with dinedesk_ except dinedesk_main)
echo "📋 Finding tenant databases..."

if [ -z "$DB_PASS" ]; then
    TENANT_DBS=$(mysql -h "$DB_HOST" -u "$DB_USER" -e "SHOW DATABASES LIKE 'dinedesk_%';" -s --skip-column-names | grep -v "dinedesk_main")
else
    TENANT_DBS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "SHOW DATABASES LIKE 'dinedesk_%';" -s --skip-column-names | grep -v "dinedesk_main")
fi

if [ -z "$TENANT_DBS" ]; then
    echo "⚠️  No tenant databases found"
    exit 0
fi

# Counter for success/failure
SUCCESS=0
FAILED=0

# Execute SQL for each tenant database
for DB_NAME in $TENANT_DBS; do
    echo ""
    echo "📦 Processing: $DB_NAME"
    
    if [ -z "$DB_PASS" ]; then
        mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$SQL_FILE" 2>/dev/null
    else
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo "   ✓ Tables created/verified in $DB_NAME"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "   ✗ Failed to create tables in $DB_NAME"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "================================================="
echo "📊 Summary:"
echo "   ✓ Success: $SUCCESS databases"
echo "   ✗ Failed: $FAILED databases"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All tenant databases updated successfully!"
    exit 0
else
    echo "⚠️  Some databases failed to update"
    exit 1
fi
