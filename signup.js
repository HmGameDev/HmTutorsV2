import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    teacherPassword: '',
    subject: '',
    grade: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate teacher password if role is teacher
      if (formData.role === 'teacher' && formData.teacherPassword !== 'HumzahMohsin') {
        setError('Invalid teacher password');
        setLoading(false);
        return;
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        subject: formData.subject || null,
        grade: formData.grade || null,
        createdAt: new Date()
      });

      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Create Account</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        
        {formData.role === 'teacher' && (
          <input
            type="password"
            name="teacherPassword"
            placeholder="Teacher Secret Password"
            value={formData.teacherPassword}
            onChange={handleChange}
            required
          />
        )}
        
        {formData.role === 'student' && (
          <>
            <select name="subject" value={formData.subject} onChange={handleChange} required>
              <option value="">Select Subject</option>
              <option value="SAT Math">SAT Math</option>
              <option value="Algebra 1">Algebra 1</option>
              <option value="Algebra 2">Algebra 2</option>
              <option value="AP Precalculus">AP Precalculus</option>
              <option value="Chemistry">Chemistry</option>
            </select>
            
            <select name="grade" value={formData.grade} onChange={handleChange} required>
              <option value="">Select Grade</option>
              <option value="8">8th Grade</option>
              <option value="9">9th Grade</option>
              <option value="10">10th Grade</option>
              <option value="11">11th Grade</option>
              <option value="12">12th Grade</option>
            </select>
          </>
        )}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

export default Register;