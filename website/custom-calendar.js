// Custom Calendar Widget for Schedule.Rehab
class CustomCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedType = 'recovery-dharma';
        this.selectedFilter = 'all';
        this.meetings = [];
        this.loadRealDharmaMeetings();
    }

    async loadRealDharmaMeetings() {
        try {
            console.log('Loading real Recovery Dharma meetings...');
            
            // Start with sample data for immediate display
            this.meetings = this.generateSampleData();
            this.init();
            
            // Load real data in background
            const response = await fetch('dharma-meetings-calendar.json');
            if (!response.ok) {
                console.warn(`Failed to load real meetings: ${response.status}, using sample data`);
                return;
            }
            
            const realMeetings = await response.json();
            console.log(`Loaded ${realMeetings.length} real Recovery Dharma meetings`);
            
            // Convert to our calendar format
            this.meetings = realMeetings.map(meeting => ({
                id: meeting.id,
                title: meeting.title,
                type: 'recovery-dharma',
                typeName: 'Recovery Dharma',
                emoji: '🧘',
                start: new Date(meeting.start),
                end: new Date(meeting.end),
                virtual: meeting.virtual,
                meetingId: meeting.meetingId,
                passcode: meeting.passcode,
                description: meeting.description,
                location: meeting.location,
                zoomLink: meeting.zoomLink,
                contact: meeting.contact
            }));
            
            console.log(`Updated calendar with ${this.meetings.length} real meetings`);
            
            // Re-render with real data
            this.renderSelectedDateMeetings();
            this.renderTimelineForDate(this.currentDate);
            this.updateMeetingCount();
            
        } catch (error) {
            console.error('Error loading real dharma meetings:', error);
            console.log('Falling back to sample data...');
            this.meetings = this.generateSampleData();
            this.init();
        }
    }

    generateSampleData() {
        // Generate a few sample meetings for immediate display
        const today = new Date();
        const sampleMeetings = [];
        
        const samples = [
            { name: "Recovery Dharma Morning", hours: 9, day: 0 },
            { name: "Evening Support Group", hours: 19, day: 0 },
            { name: "Sunday Awakening", hours: 10, day: 1 },
            { name: "Mindfulness Practice", hours: 18, day: 2 },
            { name: "Weekly Check-in", hours: 20, day: 3 }
        ];
        
        samples.forEach((sample, index) => {
            const start = new Date(today);
            start.setDate(today.getDate() + sample.day);
            start.setHours(sample.hours, 0, 0, 0);
            
            const end = new Date(start);
            end.setHours(start.getHours() + 1);
            
            sampleMeetings.push({
                id: `sample_${index}`,
                title: sample.name,
                type: 'recovery-dharma',
                typeName: 'Recovery Dharma',
                emoji: '🧘',
                start: start,
                end: end,
                virtual: true,
                meetingId: `${123456789 + index}`,
                passcode: '123456',
                description: `${sample.name} - Recovery Dharma support group meeting`,
                location: 'Virtual Meeting',
                zoomLink: `https://zoom.us/j/${123456789 + index}`
            });
        });
        
        return sampleMeetings;
    }

    init() {
        this.setupEventListeners();
        this.renderWeekHeader();
        this.renderSelectedDateMeetings(); // Use selected date instead of today
        this.renderTimelineForDate(this.currentDate); // Show timeline for selected date
        this.updateMeetingCount();
    }

    setupEventListeners() {
        // Meeting type cards
        document.querySelectorAll('.type-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedType = card.dataset.type;
                this.renderSelectedDateMeetings();
                this.updateMeetingCount();
            });
        });

        // Filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.selectedFilter = chip.dataset.filter;
                this.renderTimelineForDate(this.currentDate);
            });
        });

        // Navigation buttons
        document.getElementById('prev-week').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
            this.renderWeekHeader();
            this.renderTimelineForDate(this.currentDate);
            this.renderSelectedDateMeetings();
        });

        document.getElementById('next-week').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
            this.renderWeekHeader();
            this.renderTimelineForDate(this.currentDate);
            this.renderSelectedDateMeetings();
        });

        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchMeetings(e.target.value);
        });
    }

    generateMeetingData() {
        const meetingTypes = [
            { type: 'recovery-dharma', name: 'Recovery Dharma', emoji: '🧘' },
            { type: 'aa', name: 'AA', emoji: '🤝' },
            { type: 'na', name: 'NA', emoji: '💪' },
            { type: 'celebrate-recovery', name: 'Celebrate Recovery', emoji: '✨' },
            { type: 'smart-recovery', name: 'SMART Recovery', emoji: '🧠' }
        ];

        const meetingNames = {
            'recovery-dharma': [
                'Sunday Awakening Online',
                'Silent Meditation',
                'RD Tacoma Hybrid',
                'Daily Non-Dukkha',
                'Rooted in Mindfulness',
                'Queer Paths Online',
                'Codependency Support',
                '3 Jewels Recovery',
                'Deepening Mindfulness',
                'RD Traverse City'
            ],
            'aa': [
                'Big Book Study',
                'Step Working Group',
                'Newcomers Meeting',
                'Open Discussion',
                'Literature Study',
                'Speakers Meeting',
                'Womens Group',
                'Mens Group',
                'Young People AA',
                'Lunch Bunch'
            ],
            'na': [
                'Basic Text Study',
                'Step Working',
                'Just for Today',
                'Candlelight Meeting',
                'Living Clean',
                'Spiritual Principles',
                'Newcomer Focused',
                'Topic Discussion',
                'Literature Study',
                'Recovery Celebration'
            ],
            'celebrate-recovery': [
                'Celebrate Recovery Large Group',
                'Step Study',
                'Open Share',
                'Newcomer Orientation',
                'Sponsors Meeting',
                'Leadership Training',
                'Special Needs',
                'Co-Ed Meeting',
                'Mens Step Study',
                'Womens Step Study'
            ],
            'smart-recovery': [
                'SMART Recovery Meeting',
                'Motivational Enhancement',
                'Change Planning',
                'DISARM Technique',
                'ABCs of Rational Thinking',
                'Cost Benefit Analysis',
                'Brainstorming Solutions',
                'Problem Solving',
                'Urge Management',
                'Building Motivation'
            ]
        };

        const meetings = [];
        const today = new Date();
        
        // Generate meetings for the next 14 days
        for (let day = 0; day < 14; day++) {
            const date = new Date(today);
            date.setDate(today.getDate() + day);
            
            // Generate 3-8 meetings per day
            const numMeetings = Math.floor(Math.random() * 6) + 3;
            
            for (let i = 0; i < numMeetings; i++) {
                const type = meetingTypes[Math.floor(Math.random() * meetingTypes.length)];
                const names = meetingNames[type.type];
                const name = names[Math.floor(Math.random() * names.length)];
                
                // Random time between 7 AM and 10 PM
                const hour = Math.floor(Math.random() * 15) + 7;
                const minute = Math.random() < 0.5 ? 0 : 30;
                
                const meetingDate = new Date(date);
                meetingDate.setHours(hour, minute, 0, 0);
                
                const endDate = new Date(meetingDate);
                endDate.setHours(hour + 1, minute, 0, 0); // 1 hour duration
                
                meetings.push({
                    id: `${type.type}_${day}_${i}`,
                    title: name,
                    type: type.type,
                    typeName: type.name,
                    emoji: type.emoji,
                    start: meetingDate,
                    end: endDate,
                    virtual: Math.random() > 0.3, // 70% virtual
                    meetingId: Math.floor(Math.random() * 900000000) + 100000000,
                    passcode: Math.floor(Math.random() * 900000) + 100000,
                    description: this.generateDescription(name, type.name),
                    location: Math.random() > 0.3 ? 'Virtual Meeting' : this.getRandomLocation()
                });
            }
        }

        return meetings.sort((a, b) => a.start - b.start);
    }

    generateDescription(name, type) {
        const descriptions = {
            'Recovery Dharma': [
                'Mindfulness-based recovery support group',
                'Buddhist-inspired addiction recovery meeting',
                'Meditation and dharma study for recovery',
                'Community-based recovery support'
            ],
            'AA': [
                'Alcoholics Anonymous support meeting',
                'Twelve-step recovery program',
                'Alcohol addiction recovery support',
                'Fellowship and sobriety support'
            ],
            'NA': [
                'Narcotics Anonymous recovery meeting',
                'Drug addiction recovery support',
                'Clean time celebration and support',
                'Twelve-step program for drug addiction'
            ],
            'Celebrate Recovery': [
                'Christ-centered recovery program',
                'Faith-based addiction recovery',
                'Biblical approach to healing',
                'Christian recovery support group'
            ],
            'SMART Recovery': [
                'Science-based recovery program',
                'Motivational enhancement therapy',
                'Cognitive behavioral recovery tools',
                'Self-management addiction recovery'
            ]
        };

        const typeDescriptions = descriptions[type] || descriptions['Recovery Dharma'];
        return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
    }

    getRandomLocation() {
        const locations = [
            'Community Center - 123 Main St',
            'St. Mary\'s Church - 456 Oak Ave',
            'Recovery Center - 789 Pine Rd',
            'Public Library - 321 Elm St',
            'Unity Hall - 654 Maple Dr',
            'First Baptist Church - 987 Cedar Ln',
            'YMCA Building - 147 Birch St',
            'Wellness Center - 258 Spruce Ave'
        ];
        return locations[Math.floor(Math.random() * locations.length)];
    }

    renderWeekHeader() {
        const weekHeader = document.getElementById('week-header');
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date();
        
        let html = '';
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            
            const isToday = day.toDateString() === today.toDateString();
            const isSelected = day.toDateString() === this.currentDate.toDateString();
            
            html += `
                <div class="day-header ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                     onclick="calendar.selectDate('${day.toISOString()}')"
                     style="cursor: pointer;">
                    ${days[i]}
                    <span class="day-number">${day.getDate()}</span>
                </div>
            `;
        }
        
        weekHeader.innerHTML = html;
    }

    selectDate(dateString) {
        this.currentDate = new Date(dateString);
        console.log('Selected date:', this.currentDate.toDateString());
        
        // Update visual state
        this.renderWeekHeader();
        
        // Update timeline to show meetings for selected date
        this.renderTimelineForDate(this.currentDate);
        
        // Update today's meetings section to show selected date meetings
        this.renderSelectedDateMeetings();
    }

    renderSelectedDateMeetings() {
        const container = document.getElementById('today-meetings');
        const selectedDate = this.currentDate;
        
        const selectedDateMeetings = this.meetings.filter(meeting => {
            const meetingDate = meeting.start;
            const sameDay = meetingDate.toDateString() === selectedDate.toDateString();
            const rightType = this.selectedType === 'all' || meeting.type === this.selectedType;
            return sameDay && rightType;
        }).slice(0, 3); // Show only first 3 meetings
        
        const dateStr = selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Update section title
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            const isToday = selectedDate.toDateString() === new Date().toDateString();
            sectionTitle.textContent = isToday ? "Today's Meetings" : `${dateStr} Meetings`;
        }
        
        if (selectedDateMeetings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #a0aec0;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 10px;">event_available</span>
                    <p>No meetings on ${dateStr}</p>
                    <p style="font-size: 12px;">for ${this.getTypeName(this.selectedType)}</p>
                </div>
            `;
            return;
        }

        const html = selectedDateMeetings.map(meeting => {
            const time = meeting.start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            return `
                <div class="meeting-card ${meeting.type}" onclick="calendar.showMeetingDetails('${meeting.id}')">
                    <div class="meeting-time">${time}</div>
                    <div class="meeting-title">${meeting.title}</div>
                    <div class="meeting-description">${meeting.description}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    renderTimelineForDate(selectedDate) {
        const timeline = document.getElementById('timeline');
        
        const dateMeetings = this.meetings.filter(meeting => {
            const meetingDate = meeting.start;
            const sameDay = meetingDate.toDateString() === selectedDate.toDateString();
            const rightType = this.selectedFilter === 'all' || meeting.type === this.selectedFilter;
            return sameDay && rightType;
        });

        if (dateMeetings.length === 0) {
            const dateStr = selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
            });
            
            timeline.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #a0aec0;">
                    <span class="material-icons" style="font-size: 64px; margin-bottom: 20px;">event_note</span>
                    <h3 style="margin-bottom: 10px;">No meetings on ${dateStr}</h3>
                    <p>Try selecting a different date or meeting type</p>
                </div>
            `;
            return;
        }

        const html = dateMeetings.map((meeting, index) => {
            const time = meeting.start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            return `
                <div class="timeline-item" onclick="calendar.showMeetingDetails('${meeting.id}')">
                    <div class="timeline-time">${time}</div>
                    <div class="timeline-card ${meeting.type}">
                        <div class="card-title">${meeting.title}</div>
                        <div class="card-description">${meeting.description}</div>
                        <div class="card-meta">
                            <div class="card-meta-item">
                                <span class="material-icons" style="font-size: 14px;">${meeting.virtual ? 'videocam' : 'place'}</span>
                                ${meeting.virtual ? 'Virtual' : 'In-Person'}
                            </div>
                            <div class="card-meta-item">
                                <span class="material-icons" style="font-size: 14px;">group</span>
                                ${meeting.typeName}
                            </div>
                            ${meeting.virtual && meeting.meetingId ? `
                                <div class="card-meta-item">
                                    <span class="material-icons" style="font-size: 14px;">key</span>
                                    ID: ${meeting.meetingId}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        timeline.innerHTML = html;
    }

    renderTodaysMeetings() {
        const container = document.getElementById('today-meetings');
        const today = new Date();
        
        const todaysMeetings = this.meetings.filter(meeting => {
            const meetingDate = meeting.start;
            const sameDay = meetingDate.toDateString() === today.toDateString();
            const rightType = this.selectedType === 'all' || meeting.type === this.selectedType;
            return sameDay && rightType;
        }).slice(0, 3); // Show only first 3 meetings
        
        if (todaysMeetings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #a0aec0;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 10px;">event_available</span>
                    <p>No meetings today for ${this.getTypeName(this.selectedType)}</p>
                </div>
            `;
            return;
        }

        const html = todaysMeetings.map(meeting => {
            const time = meeting.start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            return `
                <div class="meeting-card ${meeting.type}" onclick="calendar.showMeetingDetails('${meeting.id}')">
                    <div class="meeting-time">${time}</div>
                    <div class="meeting-title">${meeting.title}</div>
                    <div class="meeting-description">${meeting.description}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    renderTimeline() {
        const timeline = document.getElementById('timeline');
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        
        const weekMeetings = this.meetings.filter(meeting => {
            const meetingDate = meeting.start;
            const inWeek = meetingDate >= startOfWeek && meetingDate < endOfWeek;
            const rightType = this.selectedFilter === 'all' || meeting.type === this.selectedFilter;
            return inWeek && rightType;
        });

        if (weekMeetings.length === 0) {
            timeline.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #a0aec0;">
                    <span class="material-icons" style="font-size: 64px; margin-bottom: 20px;">event_note</span>
                    <h3 style="margin-bottom: 10px;">No meetings this week</h3>
                    <p>Try selecting a different meeting type or week</p>
                </div>
            `;
            return;
        }

        const html = weekMeetings.map((meeting, index) => {
            const time = meeting.start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            const isActive = index === 0; // First meeting is "active"
            
            return `
                <div class="timeline-item" onclick="calendar.showMeetingDetails('${meeting.id}')">
                    <div class="timeline-time">${time}</div>
                    <div class="timeline-dot ${isActive ? 'active' : ''}"></div>
                    <div class="timeline-card ${meeting.type}">
                        <div class="card-title">${meeting.title}</div>
                        <div class="card-description">${meeting.description}</div>
                        <div class="card-meta">
                            <div class="card-meta-item">
                                <span class="material-icons" style="font-size: 14px;">${meeting.virtual ? 'videocam' : 'place'}</span>
                                ${meeting.virtual ? 'Virtual' : 'In-Person'}
                            </div>
                            <div class="card-meta-item">
                                <span class="material-icons" style="font-size: 14px;">group</span>
                                ${meeting.typeName}
                            </div>
                            ${meeting.virtual ? `
                                <div class="card-meta-item">
                                    <span class="material-icons" style="font-size: 14px;">key</span>
                                    ID: ${meeting.meetingId}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        timeline.innerHTML = html;
    }

    showMeetingDetails(meetingId) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (!meeting) return;

        const time = meeting.start.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        const date = meeting.start.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Create modal-style popup
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
            ">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #a0aec0;
                ">×</button>
                
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">${meeting.emoji}</div>
                    <h2 style="color: #2d3748; margin-bottom: 5px;">${meeting.title}</h2>
                    <p style="color: #718096;">${meeting.typeName}</p>
                </div>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <div style="display: grid; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-icons" style="color: #667eea;">schedule</span>
                            <div>
                                <strong>Time:</strong> ${date} at ${time}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-icons" style="color: #667eea;">${meeting.virtual ? 'videocam' : 'place'}</span>
                            <div>
                                <strong>Location:</strong> ${meeting.location}
                            </div>
                        </div>
                        ${meeting.virtual ? `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="material-icons" style="color: #667eea;">key</span>
                                <div>
                                    <strong>Meeting ID:</strong> ${meeting.meetingId}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="material-icons" style="color: #667eea;">lock</span>
                                <div>
                                    <strong>Passcode:</strong> ${meeting.passcode}
                                </div>
                            </div>
                        ` : ''}
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <span class="material-icons" style="color: #667eea;">info</span>
                            <div>
                                <strong>Description:</strong> ${meeting.description}
                            </div>
                        </div>
                        ${meeting.contact ? `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="material-icons" style="color: #667eea;">email</span>
                                <div>
                                    <strong>Contact:</strong> <a href="mailto:${meeting.contact}" style="color: #667eea;">${meeting.contact}</a>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    ${meeting.virtual && meeting.zoomLink ? `
                        <button onclick="window.open('${meeting.zoomLink}', '_blank')" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 10px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span class="material-icons">videocam</span>
                            Join Meeting
                        </button>
                    ` : meeting.virtual ? `
                        <button onclick="alert('Meeting ID: ${meeting.meetingId}\\nPasscode: ${meeting.passcode || 'N/A'}')" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 10px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span class="material-icons">videocam</span>
                            Show Meeting Info
                        </button>
                    ` : `
                        <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meeting.location)}', '_blank')" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 10px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span class="material-icons">directions</span>
                            Get Directions
                        </button>
                    `}
                    <button onclick="calendar.copyMeetingInfo('${meetingId}')" style="
                        background: #f8fafc;
                        color: #4a5568;
                        border: 2px solid #e2e8f0;
                        padding: 12px 24px;
                        border-radius: 10px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <span class="material-icons">content_copy</span>
                        Copy Info
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    copyMeetingInfo(meetingId) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (!meeting) return;

        const time = meeting.start.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        const date = meeting.start.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const meetingText = `
${meeting.title}
${date} at ${time}
Type: ${meeting.typeName}
Location: ${meeting.location}
${meeting.virtual ? `Meeting ID: ${meeting.meetingId}\nPasscode: ${meeting.passcode}` : ''}
Description: ${meeting.description}
        `.trim();

        navigator.clipboard.writeText(meetingText).then(() => {
            // Show success message
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                font-weight: 600;
                z-index: 1001;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            toast.innerHTML = `
                <span class="material-icons">check_circle</span>
                Meeting info copied!
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => toast.remove(), 3000);
        });
    }

    searchMeetings(query) {
        if (!query.trim()) {
            this.renderTimeline();
            return;
        }

        const timeline = document.getElementById('timeline');
        const filteredMeetings = this.meetings.filter(meeting => 
            meeting.title.toLowerCase().includes(query.toLowerCase()) ||
            meeting.description.toLowerCase().includes(query.toLowerCase()) ||
            meeting.typeName.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredMeetings.length === 0) {
            timeline.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #a0aec0;">
                    <span class="material-icons" style="font-size: 64px; margin-bottom: 20px;">search_off</span>
                    <h3 style="margin-bottom: 10px;">No meetings found</h3>
                    <p>Try searching for a different term</p>
                </div>
            `;
            return;
        }

        const html = filteredMeetings.slice(0, 10).map((meeting, index) => {
            const time = meeting.start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            return `
                <div class="timeline-item" onclick="calendar.showMeetingDetails('${meeting.id}')">
                    <div class="timeline-time">${time}</div>
                    <div class="timeline-dot"></div>
                    <div class="timeline-card ${meeting.type}">
                        <div class="card-title">${meeting.title}</div>
                        <div class="card-description">${meeting.description}</div>
                        <div class="card-meta">
                            <div class="card-meta-item">
                                <span class="material-icons" style="font-size: 14px;">${meeting.virtual ? 'videocam' : 'place'}</span>
                                ${meeting.virtual ? 'Virtual' : 'In-Person'}
                            </div>
                            <div class="card-meta-item">
                                <span class="material-icons" style="font-size: 14px;">group</span>
                                ${meeting.typeName}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        timeline.innerHTML = html;
    }

    updateMeetingCount() {
        const weekMeetings = this.meetings.filter(meeting => {
            const today = new Date();
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            const meetingDate = meeting.start;
            const inWeek = meetingDate >= today && meetingDate <= weekFromNow;
            const rightType = this.selectedType === 'all' || meeting.type === this.selectedType;
            return inWeek && rightType;
        });

        document.getElementById('meeting-count').textContent = `${weekMeetings.length} meetings`;
    }

    getTypeName(type) {
        const names = {
            'recovery-dharma': 'Recovery Dharma',
            'aa': 'AA',
            'na': 'NA',
            'celebrate-recovery': 'Celebrate Recovery',
            'smart-recovery': 'SMART Recovery',
            'all': 'All Types'
        };
        return names[type] || 'Support Groups';
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new CustomCalendar();
    console.log('Custom calendar initialized');
});
