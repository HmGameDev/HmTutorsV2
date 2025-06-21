// session-service.js
class SessionService {
  constructor() {
    this.db = window.db;
    this.authService = window.authService;
  }

  // Create a new tutoring session
  async createSession(sessionData) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Only teachers can create sessions' };
      }

      const session = {
        teacherId: this.authService.getCurrentUserId(),
        studentId: sessionData.studentId,
        subject: sessionData.subject,
        date: sessionData.date,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        type: sessionData.type || 'zoom', // 'zoom' or 'in-person'
        status: 'scheduled',
        notes: '',
        homework: '',
        nextTopics: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection('sessions').add(session);
      
      return { success: true, id: docRef.id, session };
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  // Update session notes and details
  async updateSession(sessionId, updateData) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Only teachers can update sessions' };
      }

      const updates = {
        ...updateData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('sessions').doc(sessionId).update(updates);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating session:', error);
      return { success: false, error: error.message };
    }
  }

  // Get sessions for current user
  async getSessions(filters = {}) {
    try {
      let query = this.db.collection('sessions');
      
      // Filter by user role
      const currentUserId = this.authService.getCurrentUserId();
      if (this.authService.isStudent()) {
        query = query.where('studentId', '==', currentUserId);
      } else if (this.authService.isTeacher()) {
        query = query.where('teacherId', '==', currentUserId);
      }

      // Apply additional filters
      if (filters.studentId) {
        query = query.where('studentId', '==', filters.studentId);
      }
      if (filters.date) {
        query = query.where('date', '==', filters.date);
      }
      if (filters.subject) {
        query = query.where('subject', '==', filters.subject);
      }

      const snapshot = await query.orderBy('date', 'desc').orderBy('startTime', 'desc').get();
      
      const sessions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || null,
          updatedAt: data.updatedAt?.toDate().toISOString() || null
        });
      });
      
      return { success: true, sessions };
    } catch (error) {
      console.error('Error getting sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Get sessions for a specific date
  async getSessionsByDate(date) {
    try {
      const filters = { date: date };
      return await this.getSessions(filters);
    } catch (error) {
      console.error('Error getting sessions by date:', error);
      return { success: false, error: error.message };
    }
  }

  // Get session by ID
  async getSession(sessionId) {
    try {
      const doc = await this.db.collection('sessions').doc(sessionId).get();
      
      if (!doc.exists) {
        return { success: false, error: 'Session not found' };
      }

      const data = doc.data();
      const currentUserId = this.authService.getCurrentUserId();
      
      // Check if user has access to this session
      if (data.studentId !== currentUserId && data.teacherId !== currentUserId) {
        return { success: false, error: 'Unauthorized access' };
      }

      return {
        success: true,
        session: {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || null,
          updatedAt: data.updatedAt?.toDate().toISOString() || null
        }
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete session (teacher only)
  async deleteSession(sessionId) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Only teachers can delete sessions' };
      }

      await this.db.collection('sessions').doc(sessionId).delete();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark session as completed
  async completeSession(sessionId, completionData) {
    try {
      if (!this.authService.isTeacher()) {
        return { success: false, error: 'Only teachers can complete sessions' };
      }

      const updates = {
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...completionData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('sessions').doc(sessionId).update(updates);
      
      return { success: true };
    } catch (error) {
      console.error('Error completing session:', error);
      return { success: false, error: error.message };
    }
  }

  // Get upcoming sessions
  async getUpcomingSessions() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = this.db.collection('sessions');
      
      const currentUserId = this.authService.getCurrentUserId();
      if (this.authService.isStudent()) {
        query = query.where('studentId', '==', currentUserId);
      } else if (this.authService.isTeacher()) {
        query = query.where('teacherId', '==', currentUserId);
      }

      query = query.where('date', '>=', today)
                   .where('status', '==', 'scheduled');

      const snapshot = await query.orderBy('date', 'asc').orderBy('startTime', 'asc').get();
      
      const sessions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || null,
          updatedAt: data.updatedAt?.toDate().toISOString() || null
        });
      });
      
      return { success: true, sessions };
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen to sessions in real-time
  listenToSessions(callback, filters = {}) {
    let query = this.db.collection('sessions');
    
    const currentUserId = this.authService.getCurrentUserId();
    if (this.authService.isStudent()) {
      query = query.where('studentId', '==', currentUserId);
    } else if (this.authService.isTeacher()) {
      query = query.where('teacherId', '==', currentUserId);
    }

    // Apply filters
    if (filters.date) {
      query = query.where('date', '==', filters.date);
    }

    return query.orderBy('date', 'desc').orderBy('startTime', 'desc')
      .onSnapshot(snapshot => {
        const sessions = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || null,
            updatedAt: data.updatedAt?.toDate().toISOString() || null
          });
        });
        callback(sessions);
      }, error => {
        console.error('Error listening to sessions:', error);
        callback(null, error);
      });
  }
}

// Create and export global instance
window.SessionService = SessionService;
window.sessionService = new SessionService();