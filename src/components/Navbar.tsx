import React, { useEffect, useState } from 'react'
import logo from '../assets/cropped_fitforce_logo.png'
import { Link } from 'react-router-dom'
import { fetchUserAttributes } from 'aws-amplify/auth';

// Admin emails allowed to access the admin page
const ADMIN_EMAILS = [
  '',
  '8020lux@gmail.com'
];

const Navbar = () => {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const userAttributes = await fetchUserAttributes();
                const userEmail = userAttributes.email;
                
                if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
                    setIsAdmin(true);
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        };
        
        checkAdmin();
    }, []);

    return (
        <div className='navbar'>
            <img src={logo} alt="" width="90px" />
            <ul>
                <Link to='/'><li>Home</li></Link>
                <Link to='/Workout'><li>Workout</li></Link>
                <Link to='/MealPlan'><li>MealPlan</li></Link>
                <Link to='/Quiz'><li>Quiz</li></Link>
                <Link to='/Tracker'><li>Tracker</li></Link>
                <Link to='/Settings'><li>Settings</li></Link>
                {isAdmin && <Link to='/Admin'><li>Admin</li></Link>}
            </ul>
            <button>Get Started</button>
        </div>
    )
}

export default Navbar
