// database-service.js
class DatabaseService {
  constructor() {
    this.db = window.db;
    this.authService = window.authService;
  }

  // Student/Signup related methods (now integrated with auth)
  async addStudentSignup(studentData) {
    try {
      const docRef = await this.db.collection('signups').add({
        ...studentData,
        signupDate: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        contacted: false
      });
      
      console.log('Student signup added with ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding student signup:', error);
      return { success: false, error: error.message };
    }
  }

  async getStudentSignups() {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Unauthorized access' };
      }

      const snapshot = await this.db.collection('signups')
        .orderBy('signupDate', 'desc')
        .get();
      
      const signups = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        signups.push({
          id: doc.id,
          ...data,
          signupDate: data.signupDate?.toDate().toLocaleDateString() || 'N/A'
        });
      });
      
      return { success: true, signups };
    } catch (error) {
      console.error('Error getting student signups:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSignupStatus(signupId, status) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Unauthorized access' };
      }

      await this.db.collection('signups').doc(signupId).update({
        status: status,
        contacted: status === 'contacted' || status === 'enrolled',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating signup status:', error);
      return { success: false, error: error.message };
    }
  }

  // User management methods (enhanced)
  async getUserProfile(userId = null) {
    try {
      const targetUserId = userId || this.authService.getCurrentUserId();
      if (!targetUserId) {
        return { success: false, error: 'No user ID provided' };
      }

      const doc = await this.db.collection('users').doc(targetUserId).get();
      
      if (doc.exists) {
        return { success: true, user: { id: doc.id, ...doc.data() } };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(updateData, userId = null) {
    try {
      const targetUserId = userId || this.authService.getCurrentUserId();
      if (!targetUserId) {
        return { success: false, error: 'No user ID provided' };
      }

      // Check if current user can update this profile
      if (userId && userId !== this.authService.getCurrentUserId() && !this.authService.isTeacher()) {
        return { success: false, error: 'Unauthorized access' };
      }

      await this.db.collection('users').doc(targetUserId).update({
        ...updateData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced session management
  async getSessionsWithUserData(filters = {}) {
    try {
      const sessionResult = await window.sessionService.getSessions(filters);
      if (!sessionResult.success) {
        return sessionResult;
      }

      const sessions = sessionResult.sessions;
      
      // Fetch user data for each session
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          const studentResult = await this.getUserProfile(session.studentId);
          const teacherResult = await this.getUserProfile(session.teacherId);
          
          return {
            ...session,
            studentName: studentResult.success ? 
              `${studentResult.user.firstName} ${studentResult.user.lastName}` : 'Unknown',
            teacherName: teacherResult.success ? 
              `${teacherResult.user.firstName} ${teacherResult.user.lastName}` : 'Unknown',
            studentData: studentResult.success ? studentResult.user : null,
            teacherData: teacherResult.success ? teacherResult.user : null
          };
        })
      );
      
      return { success: true, sessions: enrichedSessions };
    } catch (error) {
      console.error('Error getting sessions with user data:', error);
      return { success: false, error: error.message };
    }
  }

  // Notes management
  async addSessionNote(sessionId, noteData) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Only teachers can add notes' };
      }

      const note = {
        sessionId: sessionId,
        teacherId: this.authService.getCurrentUserId(),
        content: noteData.content,
        type: noteData.type || 'general', // general, homework, next-topics
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection('sessionNotes').add(note);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding session note:', error);
      return { success: false, error: error.message };
    }
  }

  async getSessionNotes(sessionId) {
    try {
      // Check if user has access to this session
      const sessionResult = await window.sessionService.getSession(sessionId);
      if (!sessionResult.success) {
        return sessionResult;
      }

      const snapshot = await this.db.collection('sessionNotes')
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const notes = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || null
        });
      });
      
      return { success: true, notes };
    } catch (error) {
      console.error('Error getting session notes:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics and reporting (teacher only)
  async getStudentProgress(studentId) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Unauthorized access' };
      }

      // Get all sessions for this student
      const sessionsResult = await window.sessionService.getSessions({ studentId });
      if (!sessionsResult.success) {
        return sessionsResult;
      }

      const sessions = sessionsResult.sessions;
      const completedSessions = sessions.filter(s => s.status === 'completed');
      
      // Calculate progress metrics
      const progress = {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        upcomingSessions: sessions.filter(s => s.status === 'scheduled').length,
        subjects: [...new Set(sessions.map(s => s.subject))],
        recentSessions: completedSessions.slice(0, 5)
      };
      
      return { success: true, progress };
    } catch (error) {
      console.error('Error getting student progress:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listeners
  listenToSignups(callback) {
    if (!this.authService.isTeacher()) {
      callback(null, 'Unauthorized access');
      return;
    }

    return this.db.collection('signups')
      .orderBy('signupDate', 'desc')
      .onSnapshot(snapshot => {
        const signups = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          signups.push({
            id: doc.id,
            ...data,
            signupDate: data.signupDate?.toDate().toLocaleDateString() || 'N/A'
          });
        });
        callback(signups);
      }, error => {
        console.error('Error listening to signups:', error);
        callback(null, error);
      });
  }

  // Calendar data management
  async getCalendarData(month, year) {
    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      let query = this.db.collection('sessions');
      
      const currentUserId = this.authService.getCurrentUserId();
      if (this.authService.isStudent()) {
        query = query.where('studentId', '==', currentUserId);
      } else if (this.authService.isTeacher()) {
        query = query.where('teacherId', '==', currentUserId);
      }

      const snapshot = await query
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      
      const calendarData = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        
        if (!calendarData[date]) {
          calendarData[date] = [];
        }
        
        calendarData[date].push({
          id: doc.id,
          ...data
        });
      });
      
      return { success: true, calendarData };
    } catch (error) {
      console.error('Error getting calendar data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export global instance
window.DatabaseService = DatabaseService;
window.dbService = new DatabaseService();