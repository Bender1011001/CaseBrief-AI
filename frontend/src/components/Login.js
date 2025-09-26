import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuthStore } from '../store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert('Auth failed: ' + error.message);
    }
  };
  return (
    <div style={{ padding: '20px' }}>
      <h2>{isSignUp ? 'Sign Up' : 'Login'}</h2>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ display: 'block', margin: '10px 0', padding: '5px' }} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', margin: '10px 0', padding: '5px' }} />
      <button onClick={handleAuth} style={{ margin: '10px 5px' }}>{isSignUp ? 'Sign Up' : 'Login'}</button>
      <button onClick={() => setIsSignUp(!isSignUp)} style={{ margin: '10px 5px' }}>Switch to {isSignUp ? 'Login' : 'Sign Up'}</button>
    </div>
  );
}