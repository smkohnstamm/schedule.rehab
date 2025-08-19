import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';

export class BedrockScraperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for storing scraped meeting data
    const meetingDataBucket = new s3.Bucket(this, 'MeetingDataBucket', {
      bucketName: 'schedule-rehab-meeting-data',
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          expiration: cdk.Duration.days(90),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep data safe
    });

    // S3 bucket for processed/collated meeting data
    const processedDataBucket = new s3.Bucket(this, 'ProcessedMeetingDataBucket', {
      bucketName: 'schedule-rehab-processed-data',
      publicReadAccess: true, // For website access
      websiteCorsRules: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.GET],
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // IAM role for Bedrock Agents
    const bedrockAgentRole = new iam.Role(this, 'BedrockAgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
              ],
              resources: [
                meetingDataBucket.bucketArn,
                `${meetingDataBucket.bucketArn}/*`,
                processedDataBucket.bucketArn,
                `${processedDataBucket.bucketArn}/*`,
              ],
            }),
          ],
        }),
        LambdaInvoke: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Lambda function for data processing and collation
    const dataProcessorFunction = new lambda.Function(this, 'MeetingDataProcessor', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import urllib.parse
from datetime import datetime, timedelta
import re

s3 = boto3.client('s3')

def handler(event, context):
    """
    Process and collate meeting data from multiple sources
    """
    try:
        # Define meeting sources and their S3 keys
        sources = [
            {'name': 'recovery-dharma', 'key': 'raw/recovery-dharma.json'},
            {'name': 'aa-meetings', 'key': 'raw/aa-meetings.json'},
            {'name': 'na-meetings', 'key': 'raw/na-meetings.json'},
            {'name': 'celebrate-recovery', 'key': 'raw/celebrate-recovery.json'},
            {'name': 'smart-recovery', 'key': 'raw/smart-recovery.json'},
        ]
        
        all_meetings = []
        
        # Process each source
        for source in sources:
            try:
                # Get data from S3
                response = s3.get_object(
                    Bucket='${meetingDataBucket.bucketName}',
                    Key=source['key']
                )
                
                source_data = json.loads(response['Body'].read())
                
                # Process meetings from this source
                processed_meetings = process_source_data(source_data, source['name'])
                all_meetings.extend(processed_meetings)
                
                print(f"Processed {len(processed_meetings)} meetings from {source['name']}")
                
            except Exception as e:
                print(f"Error processing {source['name']}: {str(e)}")
                continue
        
        # Sort meetings by date/time
        all_meetings.sort(key=lambda x: x['start'])
        
        # Filter to next 30 days
        today = datetime.now()
        thirty_days = today + timedelta(days=30)
        
        filtered_meetings = [
            meeting for meeting in all_meetings
            if today <= datetime.fromisoformat(meeting['start'].replace('Z', '+00:00')) <= thirty_days
        ]
        
        # Save collated data
        collated_data = {
            'generated_at': datetime.now().isoformat(),
            'total_meetings': len(filtered_meetings),
            'sources_processed': len(sources),
            'meetings': filtered_meetings
        }
        
        # Upload to processed data bucket
        s3.put_object(
            Bucket='${processedDataBucket.bucketName}',
            Key='meetings-collated.json',
            Body=json.dumps(collated_data, indent=2),
            ContentType='application/json',
            CacheControl='max-age=3600'  # 1 hour cache
        )
        
        # Also create a simplified version for the website
        simplified_meetings = [
            {
                'id': meeting['id'],
                'title': meeting['name'],
                'start': meeting['start'],
                'end': meeting['end'],
                'type': meeting['program'],
                'virtual': meeting.get('virtual', True),
                'location': meeting['location'],
                'zoomLink': meeting.get('zoom_link'),
                'meetingId': meeting.get('meeting_id'),
                'description': meeting.get('description', '')
            }
            for meeting in filtered_meetings
        ]
        
        s3.put_object(
            Bucket='${processedDataBucket.bucketName}',
            Key='meetings-simple.json',
            Body=json.dumps(simplified_meetings, separators=(',', ':')),  # Compact JSON
            ContentType='application/json',
            CacheControl='max-age=3600'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully processed {len(filtered_meetings)} meetings from {len(sources)} sources',
                'meetings_count': len(filtered_meetings),
                'sources': [s['name'] for s in sources]
            })
        }
        
    except Exception as e:
        print(f"Error in data processor: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def process_source_data(data, source_name):
    """
    Process meeting data from a specific source
    """
    meetings = []
    
    for item in data:
        try:
            # Extract common meeting information
            meeting = {
                'id': f"{source_name}_{item.get('uid', item.get('id', len(meetings)))}",
                'name': item.get('summary', item.get('name', item.get('title', 'Support Meeting'))),
                'location': extract_location(item),
                'start': format_datetime(item.get('start')),
                'end': format_datetime(item.get('end')),
                'zoom_link': extract_zoom_link(item),
                'meeting_id': extract_meeting_id(item),
                'program': map_program_type(source_name),
                'description': item.get('description', ''),
                'virtual': is_virtual_meeting(item),
                'contact': extract_contact(item)
            }
            
            meetings.append(meeting)
            
        except Exception as e:
            print(f"Error processing individual meeting: {str(e)}")
            continue
    
    return meetings

def extract_location(item):
    """Extract meeting location"""
    location = item.get('location', '')
    description = item.get('description', '')
    
    # If location is a Zoom link, it's virtual
    if 'zoom.us' in location or 'meet.google' in location:
        return 'Virtual Meeting'
    
    # Try to extract physical location from description
    if 'hybrid' in description.lower() or '@' in description:
        # Extract location after @ symbol
        location_match = re.search(r'@\\s*([^\\\\n]+)', description)
        if location_match:
            return location_match.group(1).strip().replace('\\\\,', ',')
    
    return location or 'Virtual Meeting'

def extract_zoom_link(item):
    """Extract Zoom meeting link"""
    location = item.get('location', '')
    description = item.get('description', '')
    
    # Check location first
    if 'zoom.us' in location:
        return location
    
    # Check description for zoom links
    zoom_match = re.search(r'(https?://[^\\s]*zoom\\.us/j/[^\\s]+)', description)
    if zoom_match:
        return zoom_match.group(1)
    
    return None

def extract_meeting_id(item):
    """Extract meeting ID from description or location"""
    text = f"{item.get('description', '')} {item.get('location', '')}"
    
    # Look for various meeting ID patterns
    patterns = [
        r'(?:ID|Meeting ID|Conf ID)[:\\s]*(\\d[\\d\\s]{8,15})',
        r'zoom\\.us/j/(\\d+)',
        r'Meeting\\s+ID[:\\s]*(\\d+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).replace(' ', '')
    
    return None

def map_program_type(source_name):
    """Map source name to program type"""
    mapping = {
        'recovery-dharma': 'Recovery Dharma',
        'aa-meetings': 'AA',
        'na-meetings': 'NA', 
        'celebrate-recovery': 'Celebrate Recovery',
        'smart-recovery': 'SMART Recovery'
    }
    return mapping.get(source_name, 'Support Group')

def is_virtual_meeting(item):
    """Determine if meeting is virtual"""
    location = item.get('location', '').lower()
    description = item.get('description', '').lower()
    
    virtual_indicators = ['zoom.us', 'meet.google', 'teams.microsoft', 'virtual', 'online']
    
    return any(indicator in location or indicator in description for indicator in virtual_indicators)

def extract_contact(item):
    """Extract contact email from description"""
    description = item.get('description', '')
    email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})', description)
    return email_match.group(1) if email_match else None

def format_datetime(dt_string):
    """Format datetime string to ISO format"""
    if not dt_string:
        return None
    
    try:
        # Handle format: 20250803T090000
        if 'T' in dt_string and len(dt_string) == 15:
            dt = datetime.strptime(dt_string, '%Y%m%dT%H%M%S')
            return dt.isoformat()
        
        # Handle other formats as needed
        return dt_string
        
    except Exception:
        return None
      `),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        MEETING_DATA_BUCKET: meetingDataBucket.bucketName,
        PROCESSED_DATA_BUCKET: processedDataBucket.bucketName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant S3 permissions to Lambda
    meetingDataBucket.grantReadWrite(dataProcessorFunction);
    processedDataBucket.grantReadWrite(dataProcessorFunction);

    // Lambda function for Bedrock Agent coordination
    const bedrockCoordinatorFunction = new lambda.Function(this, 'BedrockCoordinator', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
from datetime import datetime

bedrock = boto3.client('bedrock-agent-runtime')
s3 = boto3.client('s3')

def handler(event, context):
    """
    Coordinate Bedrock Agents to scrape meeting data
    """
    
    # Define meeting sources to scrape
    sources = [
        {
            'name': 'AA Meetings',
            'agent_id': '${cdk.Fn.ref('AAMeetingAgent')}',
            'websites': [
                'https://www.aa.org/meeting-guide',
                'https://aa-intergroup.org/oiaa/meetings/',
                'https://aasf.org/meetings'
            ],
            'output_key': 'raw/aa-meetings.json'
        },
        {
            'name': 'NA Meetings', 
            'agent_id': '${cdk.Fn.ref('NAMeetingAgent')}',
            'websites': [
                'https://www.na.org/meetingsearch/',
                'https://virtual-na.org/meetings/',
                'https://www.naworks.org/webmeetings'
            ],
            'output_key': 'raw/na-meetings.json'
        },
        {
            'name': 'Celebrate Recovery',
            'agent_id': '${cdk.Fn.ref('CelebrateRecoveryAgent')}', 
            'websites': [
                'https://www.celebraterecovery.com/meetings',
                'https://crgroups.info/',
                'https://www.celebraterecovery.com/resources/meeting-locator'
            ],
            'output_key': 'raw/celebrate-recovery.json'
        },
        {
            'name': 'SMART Recovery',
            'agent_id': '${cdk.Fn.ref('SmartRecoveryAgent')}',
            'websites': [
                'https://www.smartrecovery.org/meetings/',
                'https://meetings.smartrecovery.org/',
                'https://www.smartrecovery.org/community/calendar.php'
            ],
            'output_key': 'raw/smart-recovery.json'
        }
    ]
    
    results = []
    
    for source in sources:
        try:
            print(f"Processing {source['name']}...")
            
            # Invoke Bedrock Agent for this source
            agent_result = invoke_bedrock_agent(source)
            
            if agent_result and agent_result.get('meetings'):
                # Save raw data to S3
                s3.put_object(
                    Bucket='${meetingDataBucket.bucketName}',
                    Key=source['output_key'],
                    Body=json.dumps(agent_result['meetings'], indent=2),
                    ContentType='application/json'
                )
                
                results.append({
                    'source': source['name'],
                    'meetings_found': len(agent_result['meetings']),
                    'status': 'success'
                })
            else:
                results.append({
                    'source': source['name'], 
                    'meetings_found': 0,
                    'status': 'no_data'
                })
                
        except Exception as e:
            print(f"Error processing {source['name']}: {str(e)}")
            results.append({
                'source': source['name'],
                'error': str(e),
                'status': 'error'
            })
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Meeting scraping completed',
            'timestamp': datetime.now().isoformat(),
            'results': results
        })
    }

def invoke_bedrock_agent(source):
    """
    Invoke Bedrock Agent to scrape meeting data
    """
    try:
        prompt = f'''
        Please scrape meeting information from these {source['name']} websites:
        {', '.join(source['websites'])}
        
        For each meeting found, extract:
        - Meeting Name
        - Meeting Location (physical address or "Virtual")
        - Meeting Time (date and time)
        - Zoom Link (if virtual)
        - Meeting ID (if available)
        - Program Type ({source['name']})
        
        Return the data as a JSON array with this structure:
        {{
          "meetings": [
            {{
              "name": "Meeting Name",
              "location": "Address or Virtual",
              "start": "2025-08-20T19:00:00",
              "end": "2025-08-20T20:00:00", 
              "zoom_link": "https://zoom.us/j/123456789",
              "meeting_id": "123456789",
              "program": "{source['name']}",
              "description": "Meeting description"
            }}
          ]
        }}
        
        Focus on meetings in the next 30 days. If a meeting recurs weekly, include multiple instances.
        '''
        
        response = bedrock.invoke_agent(
            agentId=source['agent_id'],
            agentAliasId='TSTALIASID',  # Test alias
            sessionId=f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            inputText=prompt
        )
        
        # Parse response
        response_text = ''
        for event in response.get('completion', []):
            if 'chunk' in event:
                response_text += event['chunk'].get('bytes', b'').decode('utf-8')
        
        # Extract JSON from response
        try:
            # Look for JSON in the response
            json_match = re.search(r'\\{.*\\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
            
        return None
        
    except Exception as e:
        print(f"Error invoking Bedrock Agent: {str(e)}")
        return None
      `),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        MEETING_DATA_BUCKET: meetingDataBucket.bucketName,
        PROCESSED_DATA_BUCKET: processedDataBucket.bucketName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions to coordinator function
    meetingDataBucket.grantReadWrite(bedrockCoordinatorFunction);
    processedDataBucket.grantReadWrite(bedrockCoordinatorFunction);
    
    bedrockCoordinatorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeAgent',
          'bedrock:InvokeModel',
        ],
        resources: ['*'],
      })
    );

    // EventBridge rule to trigger scraping daily
    const dailyScrapingRule = new events.Rule(this, 'DailyMeetingScraping', {
      schedule: events.Schedule.cron({
        hour: '6', // 6 AM UTC
        minute: '0',
      }),
      description: 'Trigger daily meeting data scraping',
    });

    // Add targets to the rule
    dailyScrapingRule.addTarget(new targets.LambdaFunction(bedrockCoordinatorFunction));
    
    // After scraping, trigger data processing
    dailyScrapingRule.addTarget(new targets.LambdaFunction(dataProcessorFunction, {
      event: events.RuleTargetInput.fromObject({
        source: 'daily-scraping',
        timestamp: events.EventField.fromPath('$.time'),
      }),
    }));

    // Manual trigger Lambda for testing
    const manualTriggerFunction = new lambda.Function(this, 'ManualTrigger', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3

lambda_client = boto3.client('lambda')

def handler(event, context):
    """
    Manually trigger the meeting scraping process
    """
    
    try:
        # Invoke the coordinator function
        response = lambda_client.invoke(
            FunctionName='${bedrockCoordinatorFunction.functionName}',
            InvocationType='Event'  # Async
        )
        
        # Invoke the data processor
        processor_response = lambda_client.invoke(
            FunctionName='${dataProcessorFunction.functionName}',
            InvocationType='Event'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Meeting scraping triggered successfully',
                'coordinator_status': response['StatusCode'],
                'processor_status': processor_response['StatusCode']
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
      `),
      timeout: cdk.Duration.minutes(1),
    });

    manualTriggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [
          bedrockCoordinatorFunction.functionArn,
          dataProcessorFunction.functionArn,
        ],
      })
    );

    // Create Bedrock Agents for different meeting sources
    const aaAgent = this.createMeetingScrapingAgent('AAMeetingAgent', 'AA Meetings', [
      'https://www.aa.org/meeting-guide',
      'https://aa-intergroup.org/oiaa/meetings/',
      'https://aasf.org/meetings'
    ]);

    const naAgent = this.createMeetingScrapingAgent('NAMeetingAgent', 'NA Meetings', [
      'https://www.na.org/meetingsearch/',
      'https://virtual-na.org/meetings/',
      'https://www.naworks.org/webmeetings'
    ]);

    const celebrateRecoveryAgent = this.createMeetingScrapingAgent('CelebrateRecoveryAgent', 'Celebrate Recovery', [
      'https://www.celebraterecovery.com/meetings',
      'https://crgroups.info/',
      'https://www.celebraterecovery.com/resources/meeting-locator'
    ]);

    const smartRecoveryAgent = this.createMeetingScrapingAgent('SmartRecoveryAgent', 'SMART Recovery', [
      'https://www.smartrecovery.org/meetings/',
      'https://meetings.smartrecovery.org/',
      'https://www.smartrecovery.org/community/calendar.php'
    ]);

    // Outputs
    new cdk.CfnOutput(this, 'MeetingDataBucketName', {
      value: meetingDataBucket.bucketName,
      description: 'S3 bucket for raw meeting data',
    });

    new cdk.CfnOutput(this, 'ProcessedDataBucketName', {
      value: processedDataBucket.bucketName,
      description: 'S3 bucket for processed meeting data',
    });

    new cdk.CfnOutput(this, 'DataProcessorFunctionName', {
      value: dataProcessorFunction.functionName,
      description: 'Lambda function for data processing',
    });

    new cdk.CfnOutput(this, 'ManualTriggerFunctionName', {
      value: manualTriggerFunction.functionName,
      description: 'Lambda function for manual scraping trigger',
    });

    new cdk.CfnOutput(this, 'ProcessedDataUrl', {
      value: `https://${processedDataBucket.bucketDomainName}/meetings-simple.json`,
      description: 'URL for accessing processed meeting data',
    });
  }

  private createMeetingScrapingAgent(id: string, name: string, websites: string[]) {
    // Create Bedrock Agent for meeting scraping
    const agent = new bedrock.CfnAgent(this, id, {
      agentName: id.toLowerCase().replace(/([A-Z])/g, '-$1').substring(1),
      description: `Bedrock Agent for scraping ${name} meeting data`,
      foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      instruction: `
        You are a specialized web scraping agent for ${name} meeting data.
        
        Your primary task is to extract meeting information from recovery support group websites.
        
        For each meeting you find, extract:
        1. Meeting Name - The title or name of the meeting
        2. Meeting Location - Physical address or "Virtual" for online meetings
        3. Meeting Time - Date and time when the meeting occurs
        4. Zoom Link - Direct link to join virtual meetings (if available)
        5. Meeting ID - Zoom meeting ID or conference ID
        6. Associated Program - Always "${name}"
        
        Return data in this exact JSON format:
        {
          "meetings": [
            {
              "name": "Meeting Name",
              "location": "Address or Virtual", 
              "start": "2025-08-20T19:00:00",
              "end": "2025-08-20T20:00:00",
              "zoom_link": "https://zoom.us/j/123456789",
              "meeting_id": "123456789",
              "program": "${name}",
              "description": "Meeting description",
              "virtual": true
            }
          ]
        }
        
        Focus on:
        - Meetings in the next 30 days
        - Regular recurring meetings (include multiple instances if weekly)
        - Virtual meetings with Zoom access information
        - In-person meetings with clear location details
        - Contact information when available
        
        Be thorough but accurate. If you cannot find certain information, use null or appropriate defaults.
      `,
      idleSessionTtlInSeconds: 1800, // 30 minutes
      agentResourceRoleArn: bedrockAgentRole.roleArn,
    });

    // Create agent alias for testing
    const agentAlias = new bedrock.CfnAgentAlias(this, `${id}Alias`, {
      agentAliasName: 'test-alias',
      agentId: agent.attrAgentId,
      description: `Test alias for ${name} scraping agent`,
    });

    return {
      agent,
      agentAlias,
      agentId: agent.attrAgentId,
    };
  }
}
