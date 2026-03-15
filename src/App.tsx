import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard';
import { Downloader } from './components/Downloader';
import { Trimmer } from './components/Trimmer';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'downloader' | 'trimmer'>('home');

  return (
    <>
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main>
        {currentPage === 'home' && <Hero onStart={() => setCurrentPage('dashboard')} />}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'downloader' && <Downloader />}
        {currentPage === 'trimmer' && <Trimmer />}
      </main>
    </>
  );
}

export default App;
