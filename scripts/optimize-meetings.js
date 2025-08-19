#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Optimize meetings data for web loading - only include next 30 days
 */

const inputPath = path.join(__dirname, '../website/meetings-data.json');
const outputPath = path.join(__dirname, '../website/meetings-optimized.json');

try {
    console.log('Loading meetings data...');
    const allMeetings = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`Total meetings loaded: ${allMeetings.length}`);
    
    // Filter to next 30 days only
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    console.log('Date range:', today.toISOString(), 'to', thirtyDaysFromNow.toISOString());
    
    const optimizedMeetings = allMeetings
        .filter(meeting => {
            const meetingDate = new Date(meeting.start);
            return meetingDate >= today && meetingDate <= thirtyDaysFromNow;
        })
        .map(meeting => ({
            id: meeting.id,
            text: meeting.text.length > 50 ? meeting.text.substring(0, 47) + '...' : meeting.text,
            start: meeting.start,
            end: meeting.end,
            tags: {
                type: 'Recovery Dharma',
                virtual: meeting.tags.virtual,
                link: meeting.tags.link,
                meetingId: meeting.tags.meetingId,
                passcode: meeting.tags.passcode,
                location: meeting.tags.virtual ? 'Virtual Meeting' : (meeting.tags.location || 'Location TBD'),
                description: meeting.tags.description ? 
                    (meeting.tags.description.length > 100 ? 
                        meeting.tags.description.substring(0, 97) + '...' : 
                        meeting.tags.description) : null,
                contact: meeting.tags.contact
            }
        }))
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    
    console.log(`Optimized to ${optimizedMeetings.length} meetings for next 30 days`);
    
    // Write optimized file
    fs.writeFileSync(outputPath, JSON.stringify(optimizedMeetings, null, 0)); // No pretty printing for smaller size
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    
    console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Optimized size: ${(optimizedSize / 1024).toFixed(2)}KB`);
    console.log(`Size reduction: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}%`);
    
    // Show sample meetings
    console.log('\nNext 5 meetings:');
    optimizedMeetings.slice(0, 5).forEach((meeting, i) => {
        const date = new Date(meeting.start);
        console.log(`${i + 1}. ${meeting.text}`);
        console.log(`   ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        console.log(`   ${meeting.tags.virtual ? 'Virtual' : 'In-person'}`);
        if (meeting.tags.meetingId) {
            console.log(`   Meeting ID: ${meeting.tags.meetingId}`);
        }
        console.log('');
    });
    
} catch (error) {
    console.error('Error optimizing meetings:', error);
    process.exit(1);
}
