import React from 'react';
import type { Schema } from "../amplify/data/resource";
import Navbar from './components/Navbar'
import { withAuthenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Quiz from './pages/Quiz';
import Workout from './pages/Workout';
import Tracker from './pages/Tracker';


const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();


  return (
    <main>
     
      <div>
        <Navbar />
        <div className='container'>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/settings' element={<Settings />} />
            <Route path='/Quiz' element={<Quiz />} />
            <Route path='/Workout' element={<Workout />} />
            <Route path='/Tracker' element={<Tracker />} />
          </Routes>
        </div>
      </div>

      

      <button
        onClick={() => signOut()}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          backgroundColor: "black",
          color: "white",
          border: "none",
          padding: "12px 24px",
          fontSize: "16px",
          fontWeight: "bold",
          borderRadius: "25px",
          cursor: "pointer",
          transition: "background-color 0.3s ease",
          zIndex: 1000,
        }}
      >
        Sign Out
      </button>


      
    </main>
  );
}

export default withAuthenticator(App);
