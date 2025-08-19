#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ScheduleRehabStack } from '../lib/schedule-rehab-stack';

const app = new cdk.App();
new ScheduleRehabStack(app, 'ScheduleRehabStack', {
  env: {
    // Replace with your AWS account ID and preferred region
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1', // us-east-1 required for CloudFront
  },
});
