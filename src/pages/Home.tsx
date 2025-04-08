import React from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react';


const Home = () => {
    const { user} = useAuthenticator();
    return(
        <div style={{
            textAlign: 'left', 
            margin: '0',
            padding: '20px'
        }}>
            <h2>Welcome to {user?.signInDetails?.loginId}'s Home Page!</h2>
            <div style={bottomTextStyle}>
          🥳 <strong>Enjoy Being Healthy</strong>
          <br />
          <a href="https://github.com/htmw/2025SA-Team2" style={linkStyle}>
            Please visit our GitHub page. Thank you.
          </a>
        </div>
        </div>
    )
}
const bottomTextStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: "bold",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.41)",
    padding: "10px 15px",
    borderRadius: "8px",
    maxWidth: "2500px",
  };
  
  const linkStyle: React.CSSProperties = {
    color: "#FFD700",
    fontSize: "16px",
    textDecoration: "none",
  };
  

export default Home