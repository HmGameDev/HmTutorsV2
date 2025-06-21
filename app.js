// app.js - Fixed version with missing functions
let currentUser = null;
let currentUserRole = null;
let currentUserData = null;
let sessionsUnsubscribe = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up auth state listener
    window.authService.onAuthStateChanged((user, role, userData) => {
        currentUser = user;
        currentUserRole = role;
        currentUserData = userData;
        
        if (user && role) {
            showMainApp();
            updateUIForRole(role);
            loadDashboard();
        } else {
            showAuthSection();
        }
    });

    // Set up form listeners
    setupAuthForms();
    setupSignupForm();
});

// Show/hide sections
function showAuthSection() {
    document.getElementById('authSection').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('authSection').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    if (currentUserData) {
        document.getElementById('userWelcome').textContent = 
            `Welcome, ${currentUserData.firstName}!`;
    }
}

function updateUIForRole(role) {
    const adminLink = document.getElementById('adminLink');
    if (role === 'teacher') {
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }
}

// Authentication functions
function toggleAuthMode(mode) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (mode === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
    
    clearAuthMessages();
}

function toggleTeacherPassword() {
    const userRole = document.getElementById('userRole').value;
    const teacherPasswordGroup = document.getElementById('teacherPasswordGroup');
    const studentFields = document.getElementById('studentFields');
    
    if (userRole === 'teacher') {
        teacherPasswordGroup.classList.add('show');
        studentFields.style.display = 'none';
    } else if (userRole === 'student') {
        teacherPasswordGroup.classList.remove('show');
        studentFields.style.display = 'block';
    } else {
        teacherPasswordGroup.classList.remove('show');
        studentFields.style.display = 'none';
    }
}

function setupAuthForms() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.authService.login(email, password);
            
            if (result.success) {
                showAuthMessage('Login successful!', 'success');
                // The auth state change will handle the UI update
            } else {
                showAuthMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAuthMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            firstName: document.getElementById('regFirstName').value,
            lastName: document.getElementById('regLastName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            role: document.getElementById('userRole').value,
            teacherPassword: document.getElementById('teacherPassword').value,
            grade: document.getElementById('regGrade').value,
            subject: document.getElementById('regSubject').value
        };
        
        // Validate required fields
        if (!userData.firstName || !userData.lastName || !userData.email || !userData.password || !userData.role) {
            showAuthMessage('Please fill in all required fields.', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.authService.register(userData);
            
            if (result.success) {
                showAuthMessage('Account created successfully!', 'success');
                // Clear form
                document.getElementById('registerForm').reset();
                // Switch to login tab after a short delay
                setTimeout(() => {
                    toggleAuthMode('login');
                }, 2000);
            } else {
                showAuthMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showAuthMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function showAuthMessage(message, type) {
    const successEl = document.getElementById('authSuccessMessage');
    const errorEl = document.getElementById('authErrorMessage');
    
    clearAuthMessages();
    
    if (type === 'success') {
        successEl.textContent = message;
        successEl.style.display = 'block';
    } else {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
    
    setTimeout(clearAuthMessages, 5000);
}

function clearAuthMessages() {
    document.getElementById('authSuccessMessage').style.display = 'none';
    document.getElementById('authErrorMessage').style.display = 'none';
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('#mainApp .section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation - Fixed the event reference issue
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Find and activate the clicked link
    const clickedLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (clickedLink) {
        clickedLink.classList.add('active');
    }
    
    // Load section-specific content
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'admin') {
        loadAdminPanel();
    }
}

async function logout() {
    try {
        const result = await window.authService.logout();
        if (result.success) {
            currentUser = null;
            currentUserRole = null;
            currentUserData = null;
            
            if (sessionsUnsubscribe) {
                sessionsUnsubscribe();
                sessionsUnsubscribe = null;
            }
            
            showAuthSection();
        } else {
            console.error('Logout failed:', result.error);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Dashboard functions
async function loadDashboard() {
    if (!currentUser) return;
    
    const dashboardContent = document.getElementById('dashboardContent');
    dashboardContent.innerHTML = `
        <div class="sessions-list" id="sessionsList">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>Recent Sessions</h3>
                ${currentUserRole === 'teacher' ? '<button class="cta-button" onclick="showAddSessionModal()">Add Session</button>' : ''}
            </div>
            <div id="sessionsContainer">Loading sessions...</div>
        </div>
    `;
    
    // Load sessions
    loadUserSessions();
    
    // Set up calendar
    setupCalendar();
}

async function loadUserSessions() {
    if (!currentUser) return;
    
    const container = document.getElementById('sessionsContainer');
    
    // Check if sessionService exists
    if (!window.sessionService) {
        container.innerHTML = '<p style="color: #666; text-align: center;">Session service not available.</p>';
        return;
    }
    
    try {
        const result = await window.sessionService.getUserSessions(currentUser.uid, currentUserRole);
        
        if (result.success) {
            if (result.sessions.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center;">No sessions found.</p>';
            } else {
                container.innerHTML = result.sessions.map(session => `
                    <div class="session-card" onclick="showSessionDetails('${session.id}')">
                        <div class="session-header">
                            <div class="session-date">${session.date}</div>
                            <div class="session-type">${session.sessionType}</div>
                        </div>
                        <div class="session-preview">
                            ${currentUserRole === 'teacher' ? `Student: ${session.studentName}` : ''}
                            <br>Notes: ${session.notes.substring(0, 100)}${session.notes.length > 100 ? '...' : ''}
                        </div>
                    </div>
                `).join('');
            }
        } else {
            container.innerHTML = '<p style="color: #ff6b6b;">Error loading sessions.</p>';
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        container.innerHTML = '<p style="color: #ff6b6b;">Error loading sessions.</p>';
    }
}

// Admin panel function
async function loadAdminPanel() {
    if (currentUserRole !== 'teacher') return;
    
    const adminContent = document.getElementById('admin');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-panel">
            <h2>Admin Panel</h2>
            <div id="adminContent">Loading...</div>
        </div>
    `;
    
    try {
        const result = await window.authService.getAllStudents();
        const adminContentDiv = document.getElementById('adminContent');
        
        if (result.success) {
            if (result.students.length === 0) {
                adminContentDiv.innerHTML = '<p>No students registered yet.</p>';
            } else {
                adminContentDiv.innerHTML = `
                    <div class="student-list">
                        ${result.students.map(student => `
                            <div class="student-card">
                                <div class="student-info">
                                    <div class="info-item">
                                        <span class="info-label">Name</span>
                                        <span class="info-value">${student.firstName} ${student.lastName}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Email</span>
                                        <span class="info-value">${student.email}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Grade</span>
                                        <span class="info-value">${student.grade || 'Not specified'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Subject</span>
                                        <span class="info-value">${student.subject || 'Not specified'}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else {
            adminContentDiv.innerHTML = '<p style="color: #ff6b6b;">Error loading students.</p>';
        }
    } catch (error) {
        console.error('Error loading admin panel:', error);
        document.getElementById('adminContent').innerHTML = '<p style="color: #ff6b6b;">Error loading admin panel.</p>';
    }
}

// Signup form (for the public signup page)
function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(signupForm);
            const studentData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                grade: formData.get('grade'),
                subject: formData.get('subject'),
                parentName: formData.get('parentName'),
                parentEmail: formData.get('parentEmail'),
                goals: formData.get('goals'),
                experience: formData.get('experience')
            };
            
            // Check if dbService exists
            if (!window.dbService) {
                showMessage('Database service not available. Please try again later.', 'error');
                return;
            }
            
            try {
                const result = await window.dbService.addStudent(studentData);
                
                if (result.success) {
                    showMessage('Application submitted successfully! We\'ll be in touch soon.', 'success');
                    signupForm.reset();
                } else {
                    showMessage('Error submitting application. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Signup form error:', error);
                showMessage('Error submitting application. Please try again.', 'error');
            }
        });
    }
}

// Calendar functions
function setupCalendar() {
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;
    
    const currentDate = new Date();
    renderCalendar(currentDate);
}

function renderCalendar(date) {
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;
    
    calendarContainer.innerHTML = `
        <h3>Calendar</h3>
        <div class="calendar">
            <div class="calendar-header">
                <button class="calendar-nav" onclick="previousMonth()">&lt;</button>
                <h4>${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
                <button class="calendar-nav" onclick="nextMonth()">&gt;</button>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">Sun</div>
                <div class="calendar-weekday">Mon</div>
                <div class="calendar-weekday">Tue</div>
                <div class="calendar-weekday">Wed</div>
                <div class="calendar-weekday">Thu</div>
                <div class="calendar-weekday">Fri</div>
                <div class="calendar-weekday">Sat</div>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day today" onclick="showNotesModal('${date.toISOString().split('T')[0]}')">
                    ${date.getDate()}
                </div>
            </div>
        </div>
    `;
}

// Calendar navigation functions
let currentCalendarDate = new Date();

function previousMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar(currentCalendarDate);
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar(currentCalendarDate);
}

// Placeholder functions for missing functionality
function showAddSessionModal() {
    alert('Add Session functionality will be implemented soon!');
}

function showSessionDetails(sessionId) {
    alert(`Session details for ${sessionId} will be implemented soon!`);
}

function showNotesModal(date) {
    alert(`Notes modal for ${date} will be implemented soon!`);
}

// Utility functions
function showMessage(message, type) {
    // Create and show message
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (document.body.contains(messageDiv)) {
            document.body.removeChild(messageDiv);
        }
    }, 5000);
}