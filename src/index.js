import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Cette ligne importe le fichier CSS où se trouvent les directives Tailwind
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Si vous voulez commencer à mesurer les performances dans votre application, passez une fonction
// pour enregistrer les résultats (par exemple : reportWebVitals(console.log))
// ou envoyez-les à un point d'analyse. En savoir plus : https://bit.ly/CRA-vitals
reportWebVitals();