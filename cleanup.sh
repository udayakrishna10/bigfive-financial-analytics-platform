#!/bin/bash
# Project Cleanup Script
# Run this to remove unnecessary files and clean up the project

echo "🧹 Starting project cleanup..."

# Remove debug scripts
echo "Removing debug scripts..."
rm -f backend/app/debug_*.py
echo "✅ Removed debug scripts"

# Remove duplicate env files
echo "Removing duplicate environment files..."
rm -f backend/app/.env backend/app/.env.local
echo "✅ Removed duplicate .env files"

# Remove test file
echo "Removing ad-hoc test file..."
rm -f backend/test_screener.py
echo "✅ Removed test_screener.py"

# Remove vim swap files
echo "Removing temporary files..."
find . -name "*.swp" -delete 2>/dev/null
find . -name "*.swo" -delete 2>/dev/null
find . -name "*~" -delete 2>/dev/null
echo "✅ Removed temporary files"

# Clean Python cache
echo "Cleaning Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
echo "✅ Cleaned Python cache"

# Clean .DS_Store files (macOS)
echo "Removing .DS_Store files..."
find . -name ".DS_Store" -delete 2>/dev/null
echo "✅ Removed .DS_Store files"

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "Files removed:"
echo "  - 4 debug scripts"
echo "  - 2 duplicate .env files"
echo "  - 1 test file"
echo "  - Temporary and cache files"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Add new files: git add backend/etl/bronze_crypto_etl.py backend/etl/bronze_fred_etl.py backend/FRED_SETUP.md"
echo "  3. Commit changes: git commit -m 'feat: Add crypto and FRED integration, cleanup debug files'"
