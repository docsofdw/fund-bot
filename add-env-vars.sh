#!/bin/bash

# Script to add all environment variables to Vercel
# This reads from .env file and adds each variable to all Vercel environments

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║           🚀 Adding Environment Variables to Vercel                        ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Read .env file and process each variable
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    if [[ "$key" =~ ^#.*$ ]] || [[ -z "$key" ]]; then
        continue
    fi
    
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Adding: $key"
    echo ""
    
    # Add to production, preview, and development
    echo "$value" | vercel env add "$key" production preview development
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added $key"
    else
        echo "⚠️  Warning: Issue adding $key (may already exist)"
    fi
    echo ""
    
done < .env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Environment variables have been added!"
echo ""
echo "⏭️  Next steps:"
echo "   1. Redeploy your project: vercel --prod"
echo "   2. Or trigger redeploy in Vercel dashboard"
echo ""

