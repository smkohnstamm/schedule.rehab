#!/bin/bash

# Schedule.Rehab Deployment Script
# This script handles the complete deployment of the Schedule.Rehab website

set -e  # Exit on any error

echo "🚀 Starting Schedule.Rehab deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured or credentials are invalid"
    echo "Please run 'aws configure' to set up your credentials"
    exit 1
fi

echo "✅ AWS credentials verified"

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK is not installed"
    echo "Please install CDK globally: npm install -g aws-cdk"
    exit 1
fi

echo "✅ CDK is available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Check if CDK is bootstrapped
echo "🔍 Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1; then
    echo "🏗️  Bootstrapping CDK (first time setup)..."
    cdk bootstrap
else
    echo "✅ CDK already bootstrapped"
fi

# Deploy the stack
echo "🚀 Deploying infrastructure..."
cdk deploy --require-approval never

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the name servers from the output above"
echo "2. Update your domain registrar to use these name servers for schedule.rehab"
echo "3. Wait for DNS propagation (can take up to 48 hours)"
echo "4. Your website will be available at https://schedule.rehab"
echo ""
echo "💡 To make changes to the website:"
echo "   - Edit files in the website/ directory"
echo "   - Run 'npm run deploy' to update the live site"
echo ""
