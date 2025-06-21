// auth-service.js
class AuthService {
  constructor() {
    this.auth = window.auth;
    this.db = window.db;
    this.currentUser = null;
    this.userRole = null;
    this.TEACHER_PASSWORD = "HumzahMohsin";
    
    // Listen for auth state changes
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      if (user) {
        this.loadUserRole();
      } else {
        this.userRole = null;
      }
    });
  }

  // Sign up new user
  async signUp(email, password, userData, isTeacher = false, teacherPassword = null) {
    try {
      // Validate teacher password if signing up as teacher
      if (isTeacher && teacherPassword !== this.TEACHER_PASSWORD) {
        throw new Error('Invalid teacher password');
      }

      // Create auth user
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const userDoc = {
        uid: user.uid,
        email: email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: isTeacher ? 'teacher' : 'student',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Add student-specific fields if student
      if (!isTeacher) {
        userDoc.grade = userData.grade;
        userDoc.subjects = userData.subjects || [];
      }

      await this.db.collection('users').doc(user.uid).set(userDoc);

      return { success: true, user: user, role: userDoc.role };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in user
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update last login
      await this.db.collection('users').doc(user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });

      await this.loadUserRole();
      
      return { success: true, user: user, role: this.userRole };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out user
  async signOut() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.userRole = null;
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  }

  // Load user role from Firestore
  async loadUserRole() {
    if (!this.currentUser) return null;
    
    try {
      const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.userRole = userData.role;
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error loading user role:', error);
      return null;
    }
  }

  // Get current user data
  async getCurrentUserData() {
    if (!this.currentUser) return null;
    
    try {
      const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
      if (userDoc.exists) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Check if user is teacher
  isTeacher() {
    return this.userRole === 'teacher';
  }

  // Check if user is student
  isStudent() {
    return this.userRole === 'student';
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get current user UID
  getCurrentUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  // Reset password
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user profile
  async updateProfile(updateData) {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    
    try {
      await this.db.collection('users').doc(this.currentUser.uid).update({
        ...updateData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all students (teacher only)
  async getAllStudents() {
    if (!this.isTeacher()) {
      return { success: false, error: 'Unauthorized' };
    }
    
    try {
      const snapshot = await this.db.collection('users')
        .where('role', '==', 'student')
        .orderBy('createdAt', 'desc')
        .get();
      
      const students = [];
      snapshot.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, students };
    } catch (error) {
      console.error('Error getting students:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export global instance
window.AuthService = AuthService;
window.authService = new AuthService();