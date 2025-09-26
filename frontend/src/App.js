import React from 'react';
import { useAuthStore } from './store';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const { user } = useAuthStore();
  return (
    <div className="App">
      <h1>CaseBrief AI</h1>
      {user ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;