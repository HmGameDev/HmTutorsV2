// app.js - Main application logic
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
        
        const result = await window.authService.login(email, password);
        
        if (result.success) {
            showAuthMessage('Login successful!', 'success');
        } else {
            showAuthMessage(result.error, 'error');
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
        
        const result = await window.authService.register(userData);
        
        if (result.success) {
            showAuthMessage('Account created successfully!', 'success');
            toggleAuthMode('login');
        } else {
            showAuthMessage(result.error, 'error');
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
    document.getElementById(sectionName).classList.add('active');
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');
    
    // Load section-specific content
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'admin') {
        loadAdminPanel();
    }
}

async function logout() {
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
    
    const result = await window.sessionService.getUserSessions(currentUser.uid, currentUserRole);
    const container = document.getElementById('sessionsContainer');
    
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
}

// Signup form
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
            
            const result = await window.dbService.addStudent(studentData);
            
            if (result.success) {
                showMessage('Application submitted successfully! We\'ll be in touch soon.', 'success');
                signupForm.reset();
            } else {
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
    // Calendar rendering logic would go here
    // For brevity, I'll provide a simplified version
    const calendarContainer = document.querySelector('.calendar-container');
    calendarContainer.innerHTML = `
        <h3>Calendar</h3>
        <div class="calendar">
            <div class="calendar-header">
                <button class="calendar-nav" onclick="previousMonth()">&lt;</button>
                <h4>${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
                <button class="calendar-nav" onclick="nextMonth()">&gt;</button>
            </div>
            <div class="calendar-grid">
                <!-- Calendar days would be rendered here -->
                <div class="calendar-day today" onclick="showNotesModal('${date.toISOString().split('T')[0]}')">
                    ${date.getDate()}
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function showMessage(message, type) {
    // Create and show message
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 5000);
}