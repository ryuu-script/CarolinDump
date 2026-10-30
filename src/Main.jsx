/*
Purpose: Entry point of the app: mounts React on the page and wraps App in the router so every page can use routing.
Dependencies:
         JSX: App.jsx
         CSS: stylesheets/global.css
         JS: NULL
*/

// imports
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './stylesheets/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)