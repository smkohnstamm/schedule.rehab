# Schedule.Rehab - Support Group Calendar

A website hosted at schedule.rehab that provides a calendar of publicly available drug and alcohol support groups.

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript website
- **Hosting**: AWS S3 bucket with static website hosting
- **CDN**: AWS CloudFront for global distribution and HTTPS
- **DNS**: AWS Route53 for domain management
- **Infrastructure**: AWS CDK for infrastructure as code

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js** (version 16 or later)
3. **AWS CDK** installed globally: `npm install -g aws-cdk`
4. **Domain ownership**: You must own the `schedule.rehab` domain

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First time only)

```bash
cdk bootstrap
```

### 3. Deploy Infrastructure

```bash
npm run deploy
```

This will:
- Create an S3 bucket for website hosting
- Set up CloudFront distribution for HTTPS and global CDN
- Create Route53 hosted zone and DNS records
- Deploy the website files to S3

### 4. Configure Domain Name Servers

After deployment, you'll see output with name servers. Update your domain registrar to use these name servers:

```
ScheduleRehabStack.NameServers = ns-xxx.awsdns-xx.com, ns-xxx.awsdns-xx.co.uk, ns-xxx.awsdns-xx.net, ns-xxx.awsdns-xx.org
```

## Project Structure

```
├── bin/
│   └── schedule-rehab.ts          # CDK app entry point
├── lib/
│   └── schedule-rehab-stack.ts    # Main CDK stack
├── website/
│   ├── index.html                 # Main website page
│   ├── styles.css                 # Website styles
│   ├── calendar.js                # Calendar functionality
│   └── error.html                 # 404 error page
├── package.json
├── tsconfig.json
├── cdk.json
└── README.md
```

## Features

### Current Features
- Responsive calendar interface
- Sample support group meetings
- Mobile-friendly design
- HTTPS enabled
- Global CDN distribution

### Planned Features
- Integration with real support group APIs
- Location-based filtering
- Meeting search functionality
- User-submitted meeting information
- Meeting reminders and notifications

## Development

### Local Development
Since this is a static website, you can open `website/index.html` directly in a browser for local testing.

### Making Changes
1. Edit files in the `website/` directory
2. Run `npm run deploy` to update the live site

### Destroying Infrastructure
To remove all AWS resources:

```bash
npm run destroy
```

## Costs

This setup uses AWS services that may incur costs:
- S3 storage and requests
- CloudFront data transfer
- Route53 hosted zone ($0.50/month)
- SSL certificate (free with AWS Certificate Manager)

Most usage should fall within AWS free tier limits for small websites.

## Support

This website provides information about publicly available support groups. Always verify meeting details before attending.

## Security Considerations

- All resources follow AWS security best practices
- HTTPS enforced via CloudFront
- S3 bucket configured for website hosting only
- No sensitive data stored or transmitted

## Contributing

To add more support group meetings or improve the calendar functionality, edit the files in the `website/` directory and redeploy.
