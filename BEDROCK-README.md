# Bedrock Meeting Scraper Infrastructure

This infrastructure uses AWS Bedrock Agents to automatically scrape meeting data from multiple recovery support group websites and keep the Schedule.Rehab calendar updated with fresh information.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Bedrock       │    │     Lambda       │    │       S3        │
│    Agents       │───▶│   Coordinator    │───▶│   Raw Data      │
│                 │    │                  │    │                 │
│ • AA Scraper    │    │ • Invoke Agents  │    │ • aa-meetings   │
│ • NA Scraper    │    │ • Collect Data   │    │ • na-meetings   │ 
│ • CR Scraper    │    │ • Error Handle   │    │ • cr-meetings   │
│ • SMART Scraper │    │                  │    │ • smart-meetings│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EventBridge   │    │     Lambda       │    │       S3        │
│   Scheduler     │───▶│  Data Processor  │───▶│ Processed Data  │
│                 │    │                  │    │                 │
│ • Daily 6AM UTC │    │ • Collate Data   │    │ • meetings.json │
│ • Configurable  │    │ • Format JSON    │    │ • website data  │
│                 │    │ • Optimize Size  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 🤖 Bedrock Agents
- **AA Meeting Agent**: Scrapes Alcoholics Anonymous meeting websites
- **NA Meeting Agent**: Scrapes Narcotics Anonymous meeting websites  
- **Celebrate Recovery Agent**: Scrapes Celebrate Recovery meeting websites
- **SMART Recovery Agent**: Scrapes SMART Recovery meeting websites

### 📊 Data Pipeline
- **Bedrock Coordinator Lambda**: Invokes agents and collects raw data
- **Data Processor Lambda**: Collates and formats data for website consumption
- **EventBridge Schedule**: Triggers daily scraping at 6 AM UTC
- **Manual Trigger Lambda**: Allows on-demand scraping for testing

### 🗄️ Data Storage
- **Raw Data S3 Bucket**: Stores individual scraping results
- **Processed Data S3 Bucket**: Stores collated, website-ready JSON
- **Versioning**: Keeps history of scraped data
- **Lifecycle Rules**: Automatic cleanup of old data

## Data Format

### Input Sources
Each Bedrock Agent scrapes websites and extracts:
- **Meeting Name**: Title of the support group meeting
- **Meeting Location**: Physical address or "Virtual" 
- **Meeting Time**: Date and time (start/end)
- **Zoom Link**: Direct meeting join URL
- **Meeting ID**: Conference/meeting ID for manual entry
- **Associated Program**: AA, NA, Celebrate Recovery, SMART Recovery

### Output Format
Processed data is stored as JSON with this structure:
```json
{
  "generated_at": "2025-08-19T18:00:00",
  "total_meetings": 1500,
  "sources_processed": 4,
  "meetings": [
    {
      "id": "aa_meeting_123",
      "name": "Downtown AA Meeting",
      "location": "123 Main St, Anytown, USA",
      "start": "2025-08-20T19:00:00",
      "end": "2025-08-20T20:00:00",
      "zoom_link": "https://zoom.us/j/123456789",
      "meeting_id": "123456789",
      "program": "AA",
      "description": "Open AA meeting for all",
      "virtual": false,
      "contact": "organizer@email.com"
    }
  ]
}
```

## Deployment

### Prerequisites
1. **AWS CLI** configured with appropriate credentials
2. **Bedrock access** enabled in your AWS account
3. **CDK bootstrapped** in your target region
4. **Sufficient permissions** for Bedrock, Lambda, S3, EventBridge

### Deploy Infrastructure
```bash
# Deploy Bedrock infrastructure
./deploy-bedrock.sh

# Or deploy manually
cdk deploy BedrockScraperStack
```

### Manual Testing
```bash
# Trigger scraping manually
aws lambda invoke \
  --function-name [ManualTriggerFunctionName] \
  --payload '{}' \
  response.json

# Check results
cat response.json
```

## Configuration

### Meeting Sources
Currently configured to scrape:

**AA Meetings:**
- aa.org meeting guide
- AA intergroup websites
- Local AA chapter websites

**NA Meetings:**
- na.org meeting search
- Virtual NA meeting sites
- Regional NA websites

**Celebrate Recovery:**
- celebraterecovery.com
- CR group directories
- Church-based CR meetings

**SMART Recovery:**
- smartrecovery.org
- SMART meeting directories
- Community SMART meetings

### Scheduling
- **Default**: Daily at 6 AM UTC
- **Configurable**: Modify EventBridge rule for different schedules
- **Manual**: Trigger anytime via Lambda function

## Monitoring

### CloudWatch Logs
- **Bedrock Coordinator**: `/aws/lambda/BedrockCoordinator`
- **Data Processor**: `/aws/lambda/MeetingDataProcessor`
- **Manual Trigger**: `/aws/lambda/ManualTrigger`

### S3 Monitoring
- **Raw Data Bucket**: Check for new scraping results
- **Processed Data Bucket**: Monitor final JSON output
- **Versioning**: Track data changes over time

### EventBridge
- **Scheduled Rules**: Monitor daily execution
- **Failed Invocations**: Check for scheduling issues
- **Success Metrics**: Track successful scraping runs

## Integration with Website

### Automatic Updates
1. **Daily Scraping**: Bedrock Agents scrape fresh meeting data
2. **Data Processing**: Lambda collates and formats data
3. **S3 Upload**: Processed data uploaded to public bucket
4. **Website Access**: Calendar loads updated data automatically

### Manual Integration
```javascript
// Update calendar to use new data source
const response = await fetch('https://schedule-rehab-processed-data.s3.amazonaws.com/meetings-simple.json');
const meetings = await response.json();
```

## Costs

### Bedrock Agents
- **Model Usage**: Claude 3 Sonnet pricing per token
- **Agent Invocations**: Per-request pricing
- **Estimated**: $10-50/month depending on scraping frequency

### Lambda Functions
- **Execution Time**: Minimal cost for data processing
- **Requests**: Daily + manual triggers
- **Estimated**: $1-5/month

### S3 Storage
- **Raw Data**: Historical scraping results
- **Processed Data**: Optimized JSON files
- **Estimated**: $1-3/month

### Total Estimated Cost: $12-58/month

## Security

### IAM Roles
- **Principle of least privilege** for all components
- **Specific S3 bucket access** only
- **Bedrock model access** restricted to required models
- **Lambda execution** with minimal permissions

### Data Privacy
- **Public meeting data only** - no personal information
- **Encrypted storage** with S3 server-side encryption
- **Access logging** for audit trails
- **Retention policies** for data lifecycle management

## Troubleshooting

### Common Issues
1. **Bedrock not available**: Ensure using supported region (us-east-1, us-west-2)
2. **Permission errors**: Check IAM roles and policies
3. **Agent failures**: Monitor CloudWatch logs for debugging
4. **Data format issues**: Validate JSON structure in S3

### Debugging Steps
1. **Check CloudWatch logs** for error messages
2. **Verify S3 bucket contents** for raw data
3. **Test manual trigger** for immediate debugging
4. **Validate JSON output** structure and format

## Future Enhancements

### Additional Sources
- **Recovery Dharma**: Already integrated via JSON
- **LifeRing Secular Recovery**: Potential future addition
- **Women for Sobriety**: Specialized meeting source
- **Local Recovery Centers**: Regional meeting sources

### Advanced Features
- **Real-time updates**: WebSocket integration for live data
- **User submissions**: Allow users to submit meeting information
- **Data validation**: Automated quality checks and verification
- **Geographic filtering**: Location-based meeting discovery

### AI Enhancements
- **Meeting categorization**: Automatic meeting type classification
- **Duplicate detection**: Identify and merge duplicate meetings
- **Quality scoring**: Rate meeting data completeness and accuracy
- **Trend analysis**: Track meeting patterns and attendance

## Support

For issues with the Bedrock infrastructure:
1. Check CloudWatch logs for detailed error information
2. Verify Bedrock service availability in your region
3. Ensure proper IAM permissions for all components
4. Test manual triggers before debugging scheduled runs

The infrastructure is designed to be resilient and self-healing, with comprehensive error handling and fallback mechanisms.
