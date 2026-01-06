#!/bin/bash

# Script to add all environment variables to Vercel
# Using vercel env add with correct syntax

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

# Function to add a single environment variable
add_env_var() {
    local key="$1"
    local value="$2"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Adding: $key"
    echo ""
    
    # Add to production
    echo "$value" | vercel env add "$key" production
    
    # Add to preview
    echo "$value" | vercel env add "$key" preview
    
    # Add to development
    echo "$value" | vercel env add "$key" development
    
    echo "✅ Added $key to all environments"
    echo ""
}

# Read .env file and process each variable
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    if [[ "$key" =~ ^#.*$ ]] || [[ -z "$key" ]]; then
        continue
    fi
    
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # Remove quotes if present
    value="${value%\"}"
    value="${value#\"}"
    
    add_env_var "$key" "$value"
    
done < .env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All environment variables have been added!"
echo ""
echo "⏭️  Next steps:"
echo "   1. Redeploy your project: vercel --prod"
echo "   2. Variables will be available in your deployment"
echo ""

