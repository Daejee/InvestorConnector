import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to prevent JSON parsing errors from showing to users
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && 
      (event.error.message.includes('JSON') || 
       event.error.message.includes('parse') ||
       event.error.message.includes('<!DOCTYPE'))) {
    console.error('JSON parsing error suppressed:', event.error);
    event.preventDefault(); // Prevent the error from being displayed
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('JSON') || 
       event.reason.message.includes('parse') ||
       event.reason.message.includes('<!DOCTYPE'))) {
    console.error('Unhandled JSON parsing rejection suppressed:', event.reason);
    event.preventDefault(); // Prevent the error from being displayed
    return false;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
