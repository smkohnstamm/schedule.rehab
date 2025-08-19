#!/bin/bash

# Deploy Bedrock Meeting Scraper Infrastructure
# This script deploys the Bedrock Agents and data processing pipeline

set -e  # Exit on any error

echo "🤖 Starting Bedrock Meeting Scraper deployment..."

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

# Check if Bedrock is available in the region
echo "🧠 Checking Bedrock availability..."
REGION=$(aws configure get region || echo "us-east-1")
echo "Using region: $REGION"

if [ "$REGION" != "us-east-1" ] && [ "$REGION" != "us-west-2" ]; then
    echo "⚠️  Warning: Bedrock may not be available in $REGION"
    echo "Consider using us-east-1 or us-west-2 for Bedrock services"
fi

# Deploy the Bedrock scraper stack
echo "🚀 Deploying Bedrock scraper infrastructure..."
cdk deploy BedrockScraperStack --require-approval never

echo ""
echo "🎉 Bedrock deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Bedrock Agents have been created for:"
echo "   - AA Meetings scraper"
echo "   - NA Meetings scraper" 
echo "   - Celebrate Recovery scraper"
echo "   - SMART Recovery scraper"
echo ""
echo "2. Data processing pipeline configured:"
echo "   - S3 buckets for raw and processed data"
echo "   - Lambda functions for data collation"
echo "   - Daily EventBridge schedule (6 AM UTC)"
echo ""
echo "3. Manual testing:"
echo "   - Use the ManualTrigger Lambda to test scraping"
echo "   - Check S3 buckets for scraped data"
echo "   - Monitor CloudWatch logs for debugging"
echo ""
echo "4. Integration with website:"
echo "   - Update calendar to use processed data URL"
echo "   - Configure automatic data refresh"
echo ""
echo "💡 To manually trigger scraping:"
echo "   aws lambda invoke --function-name [ManualTriggerFunctionName] response.json"
echo ""
echo "📊 Monitor progress:"
echo "   - CloudWatch logs for each Lambda function"
echo "   - S3 buckets for scraped data files"
echo "   - EventBridge rules for scheduled execution"
echo ""
