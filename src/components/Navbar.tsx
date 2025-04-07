import React from 'react'
import logo from '../assets/cropped_fitforce_logo.png'
import { Link } from 'react-router-dom'

const Navbar = () => {
    return (
        <div className='navbar'>
            <img src={logo} alt="" width="90px" />
            <ul>
                <Link to='/'><li>Home</li></Link>
                <Link to='/Workout'><li>Workout</li></Link>
                <Link to='/Quiz'><li>Quiz</li></Link>
                <Link to='/Tracker'><li>Tracker</li></Link>
                <Link to='/Settings'><li>Settings</li></Link>
            </ul>
            <button>Get Started</button>
        </div>
    )
}

 export default Navbar