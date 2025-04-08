import React from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from '@aws-amplify/ui-react';
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import amplifyconfig from "../amplify_outputs.json";
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter } from 'react-router-dom'
import { configureAPI } from "./apiConfig";

// Initialize Amplify
Amplify.configure(amplifyconfig);

// Configure API endpoints
configureAPI();

ReactDOM.createRoot(document.getElementById("root")!).render(
  
  <BrowserRouter>
    <Authenticator>
      <App />
    </Authenticator>
  </BrowserRouter>
);
