#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Process dharma_meetings.json and convert to optimized calendar format
 */
class DharmaMeetingProcessor {
    constructor() {
        this.meetings = [];
    }

    processJsonFile(inputPath, outputPath) {
        try {
            console.log('Loading dharma meetings JSON...');
            const rawData = fs.readFileSync(inputPath, 'utf8');
            const meetingsData = JSON.parse(rawData);
            
            console.log(`Loaded ${meetingsData.length} meetings from JSON`);
            
            // Process each meeting
            meetingsData.forEach((meeting, index) => {
                try {
                    const processedMeeting = this.processMeeting(meeting, index);
                    if (processedMeeting) {
                        // Generate recurring events for the next 60 days
                        const recurringEvents = this.generateRecurringEvents(processedMeeting);
                        this.meetings.push(...recurringEvents);
                    }
                } catch (error) {
                    console.warn(`Error processing meeting ${index}:`, error.message);
                }
            });
            
            // Filter to next 30 days and sort
            const today = new Date();
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            const filteredMeetings = this.meetings
                .filter(meeting => {
                    const meetingDate = new Date(meeting.start);
                    return meetingDate >= today && meetingDate <= thirtyDaysFromNow;
                })
                .sort((a, b) => new Date(a.start) - new Date(b.start));
            
            console.log(`Generated ${this.meetings.length} total recurring events`);
            console.log(`Filtered to ${filteredMeetings.length} meetings for next 30 days`);
            
            // Write optimized file
            fs.writeFileSync(outputPath, JSON.stringify(filteredMeetings, null, 0));
            
            const fileSize = fs.statSync(outputPath).size;
            console.log(`Output file size: ${(fileSize / 1024).toFixed(2)}KB`);
            
            // Show sample meetings
            console.log('\nNext 5 meetings:');
            filteredMeetings.slice(0, 5).forEach((meeting, i) => {
                const date = new Date(meeting.start);
                console.log(`${i + 1}. ${meeting.title}`);
                console.log(`   ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
                console.log(`   ${meeting.virtual ? 'Virtual' : 'In-person'}`);
                if (meeting.meetingId) {
                    console.log(`   Meeting ID: ${meeting.meetingId}`);
                }
                console.log('');
            });
            
            return filteredMeetings;
            
        } catch (error) {
            console.error('Error processing dharma meetings:', error);
            throw error;
        }
    }
    
    processMeeting(meeting, index) {
        const summary = meeting.summary || 'Recovery Dharma Meeting';
        const description = this.cleanDescription(meeting.description || '');
        const location = meeting.location || '';
        const uid = meeting.uid || `meeting_${index}`;
        
        // Parse date/time (format: 20250803T090000)
        const startDate = this.parseDateTime(meeting.start);
        const endDate = this.parseDateTime(meeting.end);
        
        if (!startDate) {
            console.warn(`Invalid start date for meeting: ${summary}`);
            return null;
        }
        
        // Extract meeting information
        const meetingInfo = this.extractMeetingInfo(description, location);
        
        return {
            id: uid,
            title: summary,
            description: description,
            start: startDate,
            end: endDate || new Date(startDate.getTime() + 60 * 60 * 1000), // Default 1 hour
            virtual: this.isVirtualMeeting(location),
            meetingId: meetingInfo.meetingId,
            passcode: meetingInfo.passcode,
            zoomLink: meetingInfo.zoomLink,
            contact: meetingInfo.contact,
            location: meetingInfo.location,
            originalLocation: location
        };
    }
    
    parseDateTime(dateTimeString) {
        if (!dateTimeString) return null;
        
        // Parse format: 20250803T090000
        const match = dateTimeString.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
        if (match) {
            const [, year, month, day, hour, minute, second] = match;
            return new Date(year, month - 1, day, hour, minute, second);
        }
        
        return null;
    }
    
    generateRecurringEvents(baseMeeting) {
        const events = [];
        const today = new Date();
        const endGeneration = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
        
        // Get the day of week from the original meeting
        const originalDay = baseMeeting.start.getDay();
        const meetingHour = baseMeeting.start.getHours();
        const meetingMinute = baseMeeting.start.getMinutes();
        const duration = baseMeeting.end.getTime() - baseMeeting.start.getTime();
        
        // Generate weekly recurring events
        let currentDate = new Date(today);
        
        // Find the next occurrence of this day of week
        while (currentDate.getDay() !== originalDay) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        let eventCount = 0;
        while (currentDate <= endGeneration && eventCount < 20) { // Limit to 20 occurrences
            if (currentDate >= today) {
                const eventStart = new Date(currentDate);
                eventStart.setHours(meetingHour, meetingMinute, 0, 0);
                
                const eventEnd = new Date(eventStart.getTime() + duration);
                
                events.push({
                    id: `${baseMeeting.id}_${eventStart.getTime()}`,
                    title: baseMeeting.title,
                    description: baseMeeting.description,
                    start: eventStart.toISOString(),
                    end: eventEnd.toISOString(),
                    type: 'recovery-dharma',
                    virtual: baseMeeting.virtual,
                    meetingId: baseMeeting.meetingId,
                    passcode: baseMeeting.passcode,
                    zoomLink: baseMeeting.zoomLink,
                    contact: baseMeeting.contact,
                    location: baseMeeting.location || 'Virtual Meeting'
                });
                
                eventCount++;
            }
            
            currentDate.setDate(currentDate.getDate() + 7); // Next week
        }
        
        return events;
    }
    
    isVirtualMeeting(location) {
        return location && (
            location.includes('zoom.us') ||
            location.includes('meet.google') ||
            location.includes('teams.microsoft') ||
            location.includes('webex.com')
        );
    }
    
    extractMeetingInfo(description, location) {
        const info = {
            meetingId: null,
            passcode: null,
            zoomLink: null,
            contact: null,
            location: 'Virtual Meeting'
        };
        
        // Extract Zoom link
        if (location && this.isVirtualMeeting(location)) {
            info.zoomLink = location;
        }
        
        // Extract meeting ID from description
        const meetingIdPatterns = [
            /(?:ID|Meeting ID|Conf ID)[:\s]*(\d[\d\s]{8,15})/i,
            /zoom\.us\/j\/(\d+)/i
        ];
        
        for (const pattern of meetingIdPatterns) {
            const match = description.match(pattern) || location.match(pattern);
            if (match) {
                info.meetingId = match[1].replace(/\s/g, '');
                break;
            }
        }
        
        // Extract passcode
        const passcodePatterns = [
            /(?:Password|Passcode|Code)[:\s]*([^\s\n,\\]+)/i,
            /pwd=([^&\s]+)/i
        ];
        
        for (const pattern of passcodePatterns) {
            const match = description.match(pattern) || location.match(pattern);
            if (match) {
                info.passcode = match[1];
                break;
            }
        }
        
        // Extract email contact
        const emailMatch = description.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            info.contact = emailMatch[1];
        }
        
        // Extract physical location if it's a hybrid meeting
        if (description.includes('Hybrid') || description.includes('@')) {
            const locationMatch = description.match(/(?:@|at)\s*([^\\n]+?)(?:\\n|$)/);
            if (locationMatch && !locationMatch[1].includes('zoom') && !locationMatch[1].includes('ID')) {
                info.location = locationMatch[1].trim().replace(/\\,/g, ',');
            }
        }
        
        return info;
    }
    
    cleanDescription(description) {
        return description
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\u2014/g, '—') // em dash
            .replace(/\u2756/g, '❖') // diamond
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Main execution
if (require.main === module) {
    const processor = new DharmaMeetingProcessor();
    const inputPath = path.join(__dirname, '../resources/dharma_meetings.json');
    const outputPath = path.join(__dirname, '../website/dharma-meetings-calendar.json');
    
    try {
        const meetings = processor.processJsonFile(inputPath, outputPath);
        console.log('\n✅ Processing complete!');
        console.log(`📊 Generated ${meetings.length} calendar events for the next 30 days`);
        console.log(`📁 Output saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Processing failed:', error);
        process.exit(1);
    }
}

module.exports = DharmaMeetingProcessor;
