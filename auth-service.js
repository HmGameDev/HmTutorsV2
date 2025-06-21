// auth-service.js - Fixed version
class AuthService {
  constructor() {
    // Check if Firebase is properly initialized
    if (!window.firebase) {
      console.error('Firebase not loaded! Make sure Firebase scripts are loaded before auth-service.js');
      return;
    }
    
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.currentUser = null;
    this.userRole = null;
    this.userData = null;
    this.TEACHER_PASSWORD = "HumzahMohsin";
    
    // Callback for auth state changes
    this.authStateCallback = null;
    
    // Test Firestore connection
    this.testFirestoreConnection();
    
    // Listen for auth state changes
    this.auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? user.email : 'No user');
      this.currentUser = user;
      
      if (user) {
        // Load user data and role
        const userData = await this.loadUserRole();
        this.userData = userData;
        
        // Notify the app about auth state change
        if (this.authStateCallback) {
          this.authStateCallback(user, this.userRole, this.userData);
        }
      } else {
        this.userRole = null;
        this.userData = null;
        
        // Notify the app about auth state change
        if (this.authStateCallback) {
          this.authStateCallback(null, null, null);
        }
      }
    });
  }

  // Set up auth state change listener
  onAuthStateChanged(callback) {
    this.authStateCallback = callback;
  }

  // Test if Firestore is working
  async testFirestoreConnection() {
    try {
      console.log('Testing Firestore connection...');
      const testDoc = await this.db.collection('test').doc('connection').get();
      console.log('Firestore connection successful');
    } catch (error) {
      console.error('Firestore connection failed:', error);
    }
  }

  // Register new user - Updated to match your app.js expectations
  async register(userData) {
    try {
      console.log('Starting registration process for:', userData.email);
      
      const isTeacher = userData.role === 'teacher';
      
      // Validate teacher password if signing up as teacher
      if (isTeacher && userData.teacherPassword !== this.TEACHER_PASSWORD) {
        throw new Error('Invalid teacher verification code');
      }

      console.log('Creating auth user...');
      // Create auth user
      const userCredential = await this.auth.createUserWithEmailAndPassword(userData.email, userData.password);
      const user = userCredential.user;
      console.log('Auth user created:', user.uid);

      // Create user document in Firestore
      const userDoc = {
        uid: user.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Add student-specific fields if student
      if (!isTeacher) {
        userDoc.grade = userData.grade || '';
        userDoc.subject = userData.subject || '';
      }

      console.log('Saving user document to Firestore...', userDoc);
      
      // Save to Firestore
      await this.db.collection('users').doc(user.uid).set(userDoc);
      
      console.log('User document saved successfully!');

      // Verify the document was saved
      const savedDoc = await this.db.collection('users').doc(user.uid).get();
      if (savedDoc.exists) {
        console.log('Verification: Document exists in Firestore', savedDoc.data());
      } else {
        console.error('Verification failed: Document not found in Firestore');
      }

      return { success: true, user: user, role: userDoc.role };
    } catch (error) {
      console.error('Error in register:', error);
      return { success: false, error: error.message };
    }
  }

  // Login user - Updated to match your app.js expectations
  async login(email, password) {
    try {
      console.log('Signing in user:', email);
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update last login
      await this.db.collection('users').doc(user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Load user role and data
      const userData = await this.loadUserRole();
      
      return { success: true, user: user, role: this.userRole, userData: userData };
    } catch (error) {
      console.error('Error signing in:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Logout user - Updated to match your app.js expectations
  async logout() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.userRole = null;
      this.userData = null;
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
      console.log('Loading user role for:', this.currentUser.uid);
      const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.userRole = userData.role;
        console.log('User role loaded:', this.userRole);
        return userData;
      } else {
        console.error('User document not found in Firestore');
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