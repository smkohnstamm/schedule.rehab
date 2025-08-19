#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Parse ICS file and convert to JSON format for the calendar
 */
class ICSParser {
    constructor() {
        this.events = [];
    }

    parseICS(filePath) {
        const icsContent = fs.readFileSync(filePath, 'utf8');
        const lines = icsContent.split('\n').map(line => line.trim());
        
        let currentEvent = null;
        let currentProperty = null;
        
        for (let line of lines) {
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
            } else if (line === 'END:VEVENT') {
                if (currentEvent) {
                    this.processEvent(currentEvent);
                    currentEvent = null;
                }
            } else if (currentEvent && line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const property = line.substring(0, colonIndex);
                const value = line.substring(colonIndex + 1);
                
                // Handle multiline properties
                if (property.includes(';')) {
                    const [propName] = property.split(';');
                    currentEvent[propName] = value;
                    currentProperty = propName;
                } else {
                    currentEvent[property] = value;
                    currentProperty = property;
                }
            } else if (currentEvent && currentProperty && line.startsWith(' ')) {
                // Continuation of previous property
                currentEvent[currentProperty] += line.substring(1);
            }
        }
        
        return this.events;
    }
    
    processEvent(event) {
        try {
            // Parse the event data
            const summary = event.SUMMARY || 'Recovery Meeting';
            const description = this.cleanDescription(event.DESCRIPTION || '');
            const location = event.LOCATION || '';
            const uid = event.UID || '';
            
            // Parse date/time
            const dtstart = this.parseDatetime(event.DTSTART);
            const dtend = this.parseDatetime(event.DTEND);
            const rrule = event.RRULE || '';
            
            if (!dtstart) return; // Skip events without valid start time
            
            // Extract meeting info
            const meetingInfo = this.extractMeetingInfo(description, location);
            
            // Generate recurring events for the next 90 days
            const recurringEvents = this.generateRecurringEvents(
                dtstart, dtend, rrule, summary, description, location, meetingInfo, uid
            );
            
            this.events.push(...recurringEvents);
            
        } catch (error) {
            console.warn('Error processing event:', error.message);
        }
    }
    
    parseDatetime(dateString) {
        if (!dateString) return null;
        
        // Handle timezone format: DTSTART;TZID=America/Panama:20250803T090000
        let cleanDate = dateString;
        if (dateString.includes(':')) {
            cleanDate = dateString.split(':')[1];
        }
        
        // Parse YYYYMMDDTHHMMSS format
        const match = cleanDate.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
        if (match) {
            const [, year, month, day, hour, minute, second] = match;
            return new Date(year, month - 1, day, hour, minute, second);
        }
        
        return null;
    }
    
    generateRecurringEvents(startDate, endDate, rrule, summary, description, location, meetingInfo, uid) {
        const events = [];
        const today = new Date();
        const endGeneration = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
        
        if (!rrule || !rrule.includes('WEEKLY')) {
            // Single event
            if (startDate >= today && startDate <= endGeneration) {
                events.push(this.createEventObject(startDate, endDate, summary, description, location, meetingInfo, uid));
            }
            return events;
        }
        
        // Parse BYDAY from RRULE
        const dayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
        if (!dayMatch) return events;
        
        const days = dayMatch[1].split(',');
        const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
        
        // Generate weekly recurring events
        let currentDate = new Date(startDate);
        let eventCount = 0;
        const maxEvents = 200; // Prevent infinite loops
        
        while (currentDate <= endGeneration && eventCount < maxEvents) {
            const dayOfWeek = currentDate.getDay();
            const dayCode = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
            
            if (days.includes(dayCode) && currentDate >= today) {
                const eventEnd = new Date(currentDate);
                if (endDate) {
                    const duration = endDate.getTime() - startDate.getTime();
                    eventEnd.setTime(currentDate.getTime() + duration);
                } else {
                    eventEnd.setTime(currentDate.getTime() + 60 * 60 * 1000); // 1 hour default
                }
                
                events.push(this.createEventObject(currentDate, eventEnd, summary, description, location, meetingInfo, uid + '_' + currentDate.getTime()));
                eventCount++;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return events;
    }
    
    createEventObject(startDate, endDate, summary, description, location, meetingInfo, uid) {
        return {
            id: uid,
            text: summary,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            tags: {
                type: 'Recovery Dharma',
                location: meetingInfo.physicalLocation || 'Virtual Meeting',
                virtual: location.includes('zoom.us') || location.includes('meet.google') || location.includes('teams.microsoft'),
                link: meetingInfo.zoomLink,
                description: description,
                contact: meetingInfo.contact,
                meetingId: meetingInfo.meetingId,
                passcode: meetingInfo.passcode,
                originalLocation: location
            }
        };
    }
    
    extractMeetingInfo(description, location) {
        const info = {
            zoomLink: null,
            meetingId: null,
            passcode: null,
            contact: null,
            physicalLocation: null
        };
        
        // Extract Zoom link
        if (location && (location.includes('zoom.us') || location.includes('meet.google'))) {
            info.zoomLink = location;
        }
        
        // Extract meeting ID and passcode from description
        const meetingIdMatch = description.match(/(?:ID|Meeting ID|Conf ID)[:\s]*(\d[\d\s]{8,15})/i);
        if (meetingIdMatch) {
            info.meetingId = meetingIdMatch[1].replace(/\s/g, '');
        }
        
        const passcodeMatch = description.match(/(?:Password|Passcode|Code)[:\s]*([^\s\n,]+)/i);
        if (passcodeMatch) {
            info.passcode = passcodeMatch[1];
        }
        
        // Extract email contact
        const emailMatch = description.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            info.contact = emailMatch[1];
        }
        
        // Extract physical location (if mentioned)
        const locationMatch = description.match(/(?:@|at)\s*([^\\n]+?)(?:\\n|$)/);
        if (locationMatch && !locationMatch[1].includes('zoom') && !locationMatch[1].includes('ID')) {
            info.physicalLocation = locationMatch[1].trim();
        }
        
        return info;
    }
    
    cleanDescription(description) {
        return description
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Main execution
if (require.main === module) {
    const parser = new ICSParser();
    const icsPath = path.join(__dirname, '../resources/dharma_meetings_with_zoom_links.ics');
    const outputPath = path.join(__dirname, '../website/meetings-data.json');
    
    try {
        console.log('Parsing ICS file...');
        const events = parser.parseICS(icsPath);
        
        console.log(`Parsed ${events.length} events`);
        
        // Sort events by start time
        events.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        // Write to JSON file
        fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
        console.log(`Events written to ${outputPath}`);
        
        // Print some statistics
        const virtualCount = events.filter(e => e.tags.virtual).length;
        const inPersonCount = events.length - virtualCount;
        
        console.log(`\nStatistics:`);
        console.log(`- Total events: ${events.length}`);
        console.log(`- Virtual meetings: ${virtualCount}`);
        console.log(`- In-person meetings: ${inPersonCount}`);
        
        // Show first few events as examples
        console.log(`\nFirst 3 events:`);
        events.slice(0, 3).forEach((event, i) => {
            console.log(`${i + 1}. ${event.text}`);
            console.log(`   ${new Date(event.start).toLocaleString()}`);
            console.log(`   ${event.tags.virtual ? 'Virtual' : 'In-person'}: ${event.tags.location}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('Error parsing ICS file:', error);
        process.exit(1);
    }
}

module.exports = ICSParser;
