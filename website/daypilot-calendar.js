// DayPilot Calendar for Schedule.Rehab
class ScheduleRehabCalendar {
    constructor() {
        // Check if DayPilot is available
        if (typeof DayPilot === 'undefined') {
            console.error('DayPilot library is not loaded');
            this.showFallbackCalendar();
            return;
        }
        
        this.calendar = null;
        this.meetings = [];
        
        // Start with simple test data for fast loading
        console.log('Starting with simple test meetings...');
        this.meetings = this.generateSimpleTestMeetings();
        this.init();
        
        // Then try to load real data in background
        this.loadRealMeetingDataInBackground();
    }

    generateSimpleTestMeetings() {
        const meetings = [];
        const today = new DayPilot.Date();
        
        // Create just 10 simple test meetings over the next week
        const testData = [
            { name: "Recovery Dharma Morning", hours: 9, day: 0 },
            { name: "Evening Support Group", hours: 19, day: 0 },
            { name: "Sunday Awakening", hours: 10, day: 1 },
            { name: "Mindfulness Practice", hours: 18, day: 2 },
            { name: "Weekly Check-in", hours: 20, day: 3 },
            { name: "Silent Meditation", hours: 7, day: 4 },
            { name: "Community Circle", hours: 15, day: 5 },
            { name: "Newcomer Welcome", hours: 17, day: 6 },
            { name: "Book Study", hours: 19, day: 1 },
            { name: "Sharing Circle", hours: 21, day: 2 }
        ];
        
        testData.forEach((meeting, index) => {
            const start = today.addDays(meeting.day).addHours(meeting.hours);
            const end = start.addHours(1);
            
            meetings.push({
                id: `test_${index}`,
                text: meeting.name,
                start: start,
                end: end,
                tags: {
                    type: 'Recovery Dharma',
                    virtual: true,
                    location: 'Virtual Meeting',
                    meetingId: `${123456789 + index}`,
                    link: `https://zoom.us/j/${123456789 + index}`,
                    description: `${meeting.name} - Recovery Dharma support group meeting`
                }
            });
        });
        
        console.log(`Generated ${meetings.length} simple test meetings`);
        return meetings;
    }

    async loadRealMeetingDataInBackground() {
        // Wait a bit to let the simple calendar load first
        setTimeout(async () => {
            try {
                console.log('Loading real Recovery Dharma meetings in background...');
                const response = await fetch('meetings-optimized.json');
                if (!response.ok) {
                    console.warn(`Failed to load real meetings: ${response.status}, keeping test data`);
                    return;
                }
                
                const meetingsData = await response.json();
                console.log(`Loaded ${meetingsData.length} real meetings, updating calendar...`);
                
                // Convert to DayPilot format
                this.meetings = meetingsData.map(meeting => ({
                    id: meeting.id,
                    text: meeting.text,
                    start: new DayPilot.Date(meeting.start),
                    end: new DayPilot.Date(meeting.end),
                    tags: meeting.tags
                }));
                
                // Update the calendar with real data
                this.loadEvents();
                console.log(`Calendar updated with ${this.meetings.length} real meetings`);
                
            } catch (error) {
                console.warn('Failed to load real meeting data, keeping test data:', error);
            }
        }, 2000); // Wait 2 seconds before loading real data
    }

    async loadRealMeetingData() {
        try {
            console.log('Loading Recovery Dharma meetings...');
            const response = await fetch('meetings-optimized.json');
            if (!response.ok) {
                throw new Error(`Failed to load meetings: ${response.status}`);
            }
            
            const meetingsData = await response.json();
            console.log(`Loaded ${meetingsData.length} Recovery Dharma meetings from optimized JSON`);
            
            // Convert to DayPilot format (data is already filtered for next 30 days)
            this.meetings = meetingsData.map(meeting => ({
                id: meeting.id,
                text: meeting.text,
                start: new DayPilot.Date(meeting.start),
                end: new DayPilot.Date(meeting.end),
                tags: meeting.tags
            }));
            
            console.log(`Converted ${this.meetings.length} meetings to DayPilot format`);
            console.log('Sample meeting:', this.meetings[0]);
            
            this.init();
            
        } catch (error) {
            console.error('Error loading meeting data:', error);
            console.log('Falling back to sample data...');
            this.meetings = this.generateSampleMeetings();
            this.init();
        }
    }

    showFallbackCalendar() {
        const container = document.getElementById('daypilot-calendar');
        if (container) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; border: 2px solid #e2e8f0; border-radius: 12px; background: white;">
                    <h4 style="color: #2d3748; margin-bottom: 1rem;">📅 Calendar Loading...</h4>
                    <p style="color: #718096; margin-bottom: 1.5rem;">
                        The professional calendar component is loading. If this persists, please refresh the page.
                    </p>
                    <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }

    init() {
        this.initializeCalendar();
        this.loadEvents();
    }

    initializeCalendar() {
        // Initialize DayPilot Month calendar
        this.calendar = new DayPilot.Month("daypilot-calendar", {
            // Calendar configuration
            startDate: new DayPilot.Date().firstDayOfMonth(),
            showWeekend: true,
            weekStarts: 0, // Sunday = 0, Monday = 1
            
            // Event handling
            onEventClick: (args) => this.onEventClick(args),
            onTimeRangeSelected: (args) => this.onDateClick(args),
            
            // Appearance
            theme: "calendar_default",
            headerHeight: 40,
            cellHeight: 120,
            
            // Navigation
            navigationButtons: true,
            
            // Event rendering
            onBeforeEventRender: (args) => this.onBeforeEventRender(args),
            
            // Context menu and selection
            contextMenu: new DayPilot.Menu([
                {text: "View Details", onClick: (args) => this.showEventDetails(args.source)},
                {text: "Get Directions", onClick: (args) => this.getDirections(args.source)},
                {text: "-"},
                {text: "Copy Meeting Info", onClick: (args) => this.copyMeetingInfo(args.source)}
            ]),
            
            // Allow selection of time ranges (dates)
            timeRangeSelectedHandling: "Enabled"
        });

        this.calendar.init();
        
        // Add navigation buttons
        this.addNavigationButtons();
    }

    addNavigationButtons() {
        const calendarContainer = document.getElementById('daypilot-calendar');
        const navDiv = document.createElement('div');
        navDiv.className = 'calendar-navigation';
        navDiv.innerHTML = `
            <div class="nav-controls">
                <button id="nav-prev" class="btn btn-secondary">← Previous</button>
                <h4 id="nav-current-month">${this.calendar.startDate.toString("MMMM yyyy")}</h4>
                <button id="nav-next" class="btn btn-secondary">Next →</button>
            </div>
        `;
        
        calendarContainer.parentNode.insertBefore(navDiv, calendarContainer);
        
        // Add event listeners
        document.getElementById('nav-prev').addEventListener('click', () => {
            this.calendar.startDate = this.calendar.startDate.addMonths(-1);
            this.calendar.update();
            this.updateMonthDisplay();
        });
        
        document.getElementById('nav-next').addEventListener('click', () => {
            this.calendar.startDate = this.calendar.startDate.addMonths(1);
            this.calendar.update();
            this.updateMonthDisplay();
        });
    }
    
    updateMonthDisplay() {
        document.getElementById('nav-current-month').textContent = 
            this.calendar.startDate.toString("MMMM yyyy");
    }

    onBeforeEventRender(args) {
        const event = args.data;
        
        // Add CSS classes based on meeting type
        if (event.tags && event.tags.virtual) {
            args.data.cssClass = "virtual";
        } else if (event.tags && event.tags.type === 'Recovery Dharma') {
            args.data.cssClass = "recovery-dharma";
        } else if (event.tags && event.tags.type === 'AA') {
            args.data.cssClass = "aa";
        } else if (event.tags && event.tags.type === 'NA') {
            args.data.cssClass = "na";
        }
        
        // Customize event text
        const startTime = new DayPilot.Date(event.start).toString("h:mm tt");
        const endTime = new DayPilot.Date(event.end).toString("h:mm tt");
        args.data.html = `
            <div class="event-content">
                <div class="event-time">${startTime}</div>
                <div class="event-title">${event.text}</div>
                <div class="event-location">${event.tags?.virtual ? '🌐 Virtual' : '📍 ' + (event.tags?.location || '')}</div>
            </div>
        `;
    }

    onEventClick(args) {
        this.showEventDetails(args.e.data);
    }
    
    onDateClick(args) {
        const selectedDate = args.start;
        this.showMeetingsForDate(selectedDate);
        this.calendar.clearSelection();
    }

    showEventDetails(eventData) {
        const meetingInfo = document.getElementById('meetingInfo');
        const event = eventData;
        const startTime = new DayPilot.Date(event.start).toString("h:mm tt");
        const endTime = new DayPilot.Date(event.end).toString("h:mm tt");
        const date = new DayPilot.Date(event.start).toString("dddd, MMMM d, yyyy");
        
        meetingInfo.innerHTML = `
            <div class="selected-meeting">
                <h5>${event.text}</h5>
                <div class="meeting-details-grid">
                    <div class="detail-item">
                        <strong>Date:</strong> ${date}
                    </div>
                    <div class="detail-item">
                        <strong>Time:</strong> ${startTime} - ${endTime}
                    </div>
                    <div class="detail-item">
                        <strong>Type:</strong> ${event.tags?.type || 'Support Group'} ${event.tags?.virtual ? '(Virtual)' : '(In-Person)'}
                    </div>
                    <div class="detail-item">
                        <strong>Location:</strong> ${event.tags?.location || 'Location TBD'}
                    </div>
                    ${event.tags?.meetingId ? `
                        <div class="detail-item">
                            <strong>Meeting ID:</strong> ${event.tags.meetingId}
                        </div>
                    ` : ''}
                    ${event.tags?.passcode ? `
                        <div class="detail-item">
                            <strong>Passcode:</strong> ${event.tags.passcode}
                        </div>
                    ` : ''}
                    ${event.tags?.description ? `
                        <div class="detail-item">
                            <strong>Description:</strong> ${event.tags.description}
                        </div>
                    ` : ''}
                    ${event.tags?.contact ? `
                        <div class="detail-item">
                            <strong>Contact:</strong> <a href="mailto:${event.tags.contact}">${event.tags.contact}</a>
                        </div>
                    ` : ''}
                </div>
                <div class="meeting-actions">
                    ${event.tags?.virtual && event.tags?.link ? 
                        `<a href="${event.tags.link}" target="_blank" class="btn btn-primary">🌐 Join Virtual Meeting</a>` : 
                        event.tags?.location && event.tags.location !== 'Virtual Meeting' ?
                        `<button onclick="calendar.getDirections('${event.tags?.location}')" class="btn btn-primary">📍 Get Directions</button>` :
                        ''
                    }
                    <button onclick="calendar.copyMeetingInfo(${JSON.stringify(event).replace(/"/g, '&quot;')})" class="btn btn-secondary">📋 Copy Info</button>
                </div>
            </div>
        `;
        
        // Update section title
        document.querySelector('#meetingDetails h4').textContent = 'Meeting Details';
    }

    showMeetingsForDate(date) {
        const dateStr = date.toString("yyyy-MM-dd");
        const dayMeetings = this.meetings.filter(meeting => meeting.start.toString("yyyy-MM-dd") === dateStr);
        
        const meetingInfo = document.getElementById('meetingInfo');
        const formattedDate = date.toString("dddd, MMMM d, yyyy");
        
        document.querySelector('#meetingDetails h4').textContent = `Meetings for ${formattedDate}`;
        
        if (dayMeetings.length === 0) {
            meetingInfo.innerHTML = `
                <p style="color: #718096; text-align: center; padding: 2rem;">
                    No meetings scheduled for ${formattedDate}.
                </p>
            `;
            return;
        }
        
        const meetingsHtml = dayMeetings.map(meeting => {
            const startTime = meeting.start.toString("h:mm tt");
            const endTime = meeting.end.toString("h:mm tt");
            return `
                <div class="meeting-item" onclick="calendar.showEventDetails(${JSON.stringify(meeting).replace(/"/g, '&quot;')})">
                    <div class="meeting-time">${startTime}</div>
                    <div class="meeting-info">
                        <h5>${meeting.text}</h5>
                        <p>${meeting.tags?.location || 'Location TBD'}</p>
                        <span class="meeting-type ${meeting.tags?.virtual ? 'virtual' : meeting.tags?.type?.toLowerCase() || 'other'}">${meeting.tags?.type || 'Support Group'} ${meeting.tags?.virtual ? '(Virtual)' : '(In-Person)'}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        meetingInfo.innerHTML = `<div class="meetings-list">${meetingsHtml}</div>`;
    }

    getDirections(location) {
        if (location) {
            const encodedLocation = encodeURIComponent(location);
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank');
        }
    }
    
    copyMeetingInfo(eventData) {
        const startTime = new DayPilot.Date(eventData.start).toString("h:mm tt");
        const date = new DayPilot.Date(eventData.start).toString("dddd, MMMM d, yyyy");
        
        const meetingText = `
${eventData.text}
${date} at ${startTime}
Location: ${eventData.tags?.location || 'TBD'}
Type: ${eventData.tags?.type || 'Support Group'} ${eventData.tags?.virtual ? '(Virtual)' : '(In-Person)'}
${eventData.tags?.contact ? 'Contact: ' + eventData.tags.contact : ''}
        `.trim();
        
        navigator.clipboard.writeText(meetingText).then(() => {
            // Show a brief success message
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    }

    loadEvents() {
        // Convert meetings to DayPilot events format
        const events = this.meetings.map(meeting => ({
            id: meeting.id,
            text: meeting.text,
            start: meeting.start,
            end: meeting.end,
            tags: meeting.tags
        }));
        
        this.calendar.events.list = events;
        this.calendar.update();
    }

    generateSampleMeetings() {
        const meetings = [];
        const today = new DayPilot.Date();
        
        // Meeting types with more detailed information
        const meetingTypes = [
            { 
                name: 'AA Big Book Study', 
                type: 'AA', 
                description: 'Study and discussion of the Big Book of Alcoholics Anonymous',
                duration: 90 
            },
            { 
                name: 'NA Basic Text Meeting', 
                type: 'NA', 
                description: 'Reading and discussion from the NA Basic Text',
                duration: 90 
            },
            { 
                name: 'Smart Recovery Meeting', 
                type: 'SMART', 
                description: 'Science-based addiction recovery support group',
                duration: 90 
            },
            { 
                name: 'Celebrate Recovery', 
                type: 'CR', 
                description: 'Christ-centered recovery program for all hurts, habits, and hang-ups',
                duration: 120 
            },
            { 
                name: 'Women in Recovery', 
                type: 'AA', 
                description: 'Support group specifically for women in recovery',
                duration: 90 
            },
            { 
                name: 'Men\'s Sobriety Circle', 
                type: 'AA', 
                description: 'Male-only AA meeting focusing on sobriety and fellowship',
                duration: 90 
            },
            { 
                name: 'Young People in Recovery', 
                type: 'NA', 
                description: 'Support group for people under 30 in recovery',
                duration: 90 
            },
            { 
                name: 'Dual Diagnosis Support', 
                type: 'Other', 
                description: 'Support for those with both addiction and mental health challenges',
                duration: 90 
            }
        ];
        
        const locations = [
            { name: 'Community Center - 123 Main St, Anytown', virtual: false },
            { name: 'St. Mary\'s Church - 456 Oak Ave, Downtown', virtual: false },
            { name: 'Zoom Meeting Room', virtual: true, link: 'https://zoom.us/j/1234567890' },
            { name: 'Recovery Center - 789 Pine Rd, Westside', virtual: false },
            { name: 'Public Library - 321 Elm St, Midtown', virtual: false },
            { name: 'Google Meet', virtual: true, link: 'https://meet.google.com/abc-defg-hij' },
            { name: 'Unity Hall - 654 Maple Dr, Eastside', virtual: false },
            { name: 'Microsoft Teams', virtual: true, link: 'https://teams.microsoft.com/l/meetup-join/19%3a...' }
        ];
        
        const times = ['7:00', '9:00', '12:00', '15:00', '18:00', '19:00', '20:00'];
        const contacts = [
            'Call (555) 123-4567',
            'Email: info@recoverygroup.org',
            'Text (555) 987-6543',
            'Visit: www.meetinginfo.com',
            null, null // Some meetings don't have contact info
        ];
        
        let meetingId = 1;
        
        // Generate meetings for the next 60 days
        for (let i = 0; i < 60; i++) {
            const date = today.addDays(i);
            
            // Random number of meetings per day (0-4, weighted toward 1-2)
            const weights = [10, 30, 35, 20, 5]; // 0, 1, 2, 3, 4 meetings
            const rand = Math.random() * 100;
            let numMeetings = 0;
            let cumulative = 0;
            for (let j = 0; j < weights.length; j++) {
                cumulative += weights[j];
                if (rand < cumulative) {
                    numMeetings = j;
                    break;
                }
            }
            
            const usedTimes = new Set();
            
            for (let j = 0; j < numMeetings; j++) {
                // Avoid duplicate times on the same day
                let timeStr;
                do {
                    timeStr = times[Math.floor(Math.random() * times.length)];
                } while (usedTimes.has(timeStr) && usedTimes.size < times.length);
                usedTimes.add(timeStr);
                
                const meetingType = meetingTypes[Math.floor(Math.random() * meetingTypes.length)];
                const location = locations[Math.floor(Math.random() * locations.length)];
                const contact = contacts[Math.floor(Math.random() * contacts.length)];
                
                const startDateTime = new DayPilot.Date(date.toString("yyyy-MM-dd") + "T" + timeStr + ":00");
                const endDateTime = startDateTime.addMinutes(meetingType.duration);
                
                meetings.push({
                    id: meetingId++,
                    text: meetingType.name,
                    start: startDateTime,
                    end: endDateTime,
                    tags: {
                        type: meetingType.type,
                        location: location.name,
                        virtual: location.virtual,
                        link: location.link || null,
                        description: meetingType.description,
                        contact: contact
                    }
                });
            }
        }
        
        return meetings;
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new ScheduleRehabCalendar();
});

// Add CSS for navigation and meeting details
const additionalCSS = `
.calendar-navigation {
    margin-bottom: 1rem;
}

.nav-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    margin-bottom: 1rem;
}

.nav-controls h4 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #2d3748;
    min-width: 200px;
    text-align: center;
    margin: 0;
}

.meeting-details-grid {
    display: grid;
    gap: 0.75rem;
    margin: 1rem 0;
}

.detail-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid #f1f5f9;
}

.detail-item strong {
    color: #2d3748;
    margin-right: 0.5rem;
}

.meeting-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.btn-primary:hover {
    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.event-content {
    padding: 2px 4px;
}

.event-time {
    font-weight: 600;
    font-size: 10px;
}

.event-title {
    font-weight: 500;
    font-size: 11px;
    margin: 1px 0;
}

.event-location {
    font-size: 9px;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.selected-meeting {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid #e2e8f0;
}

.selected-meeting h5 {
    color: #2d3748;
    font-size: 1.3rem;
    margin-bottom: 1rem;
}

@media (max-width: 768px) {
    .nav-controls {
        flex-direction: column;
        gap: 1rem;
    }
    
    .meeting-actions {
        flex-direction: column;
    }
    
    .btn {
        width: 100%;
        text-align: center;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
