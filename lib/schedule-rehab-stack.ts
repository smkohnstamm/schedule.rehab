import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export class ScheduleRehabStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for website hosting
    const websiteBucket = new s3.Bucket(this, 'ScheduleRehabWebsiteBucket', {
      bucketName: 'schedule-rehab-website', // Make this unique if needed
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Be careful with this in production
      autoDeleteObjects: true, // Be careful with this in production
    });

    // Use existing Route53 hosted zone for the domain
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ScheduleRehabHostedZone', {
      hostedZoneId: 'Z01532691E5S2MW9BWCI4',
      zoneName: 'schedule.rehab',
    });

    // Create SSL certificate for HTTPS
    const certificate = new acm.Certificate(this, 'ScheduleRehabCertificate', {
      domainName: 'schedule.rehab',
      subjectAlternativeNames: ['www.schedule.rehab'],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Create CloudFront distribution for global CDN and HTTPS
    const distribution = new cloudfront.Distribution(this, 'ScheduleRehabDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: ['schedule.rehab', 'www.schedule.rehab'],
      certificate: certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
        },
      ],
    });

    // Create Route53 A record pointing to CloudFront (alias records don't support custom TTL)
    new route53.ARecord(this, 'ScheduleRehabARecord', {
      zone: hostedZone,
      recordName: 'schedule.rehab',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // Create Route53 A record for www subdomain (alias records don't support custom TTL)
    new route53.ARecord(this, 'ScheduleRehabWWWARecord', {
      zone: hostedZone,
      recordName: 'www.schedule.rehab',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // Add CNAME record with short TTL for faster propagation testing
    new route53.CnameRecord(this, 'ScheduleRehabTestCNAME', {
      zone: hostedZone,
      recordName: 'test.schedule.rehab',
      domainName: distribution.distributionDomainName,
      ttl: cdk.Duration.minutes(1), // Very short TTL for testing
    });

    // Deploy website files to S3
    new s3deploy.BucketDeployment(this, 'ScheduleRehabWebsiteDeployment', {
      sources: [s3deploy.Source.asset('./website')],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    // Output important values
    new cdk.CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucketName,
      description: 'Name of the S3 bucket',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: hostedZone.hostedZoneId,
      description: 'Route53 Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: 'ns-1308.awsdns-35.org, ns-1619.awsdns-10.co.uk, ns-310.awsdns-38.com, ns-556.awsdns-05.net',
      description: 'Name servers for the domain (already configured)',
    });
  }
}
