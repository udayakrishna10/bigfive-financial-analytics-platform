import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root');
console.log("Root element:", root);

if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            {/* <SimpleApp /> */}
            <App />
        </React.StrictMode>,
    )
} else {
    console.error("FAILED TO FIND ROOT ELEMENT");
}
