import React from 'react';
import { Video, Zap } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: 'home' | 'dashboard' | 'downloader' | 'trimmer') => void;
  currentPage: 'home' | 'dashboard' | 'downloader' | 'trimmer';
}

export function Navbar({ onNavigate, currentPage }: NavbarProps) {
  return (
    <nav style={{ 
      position: 'fixed', 
      top: 0, 
      width: '100%', 
      zIndex: 50,
      background: 'rgba(10, 10, 12, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)'
    }}>
      <div className="container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        height: '72px' 
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          onClick={() => onNavigate('home')}
        >
          <div style={{
            background: 'var(--gradient-main)',
            padding: '8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Video size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.05em' }}>
            Clip<span style={{ color: 'var(--accent-purple)' }}>Ly</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button 
            style={{ 
              color: currentPage === 'home' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              transition: 'color var(--transition-fast)'
            }}
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            style={{ 
              color: currentPage === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              transition: 'color var(--transition-fast)'
            }}
            onClick={() => onNavigate('dashboard')}
          >
            AI Clapper
          </button>
          <button 
            style={{ 
              color: currentPage === 'downloader' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              transition: 'color var(--transition-fast)'
            }}
            onClick={() => onNavigate('downloader')}
          >
            Downloader
          </button>
          <button 
            style={{ 
              color: currentPage === 'trimmer' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              transition: 'color var(--transition-fast)'
            }}
            onClick={() => onNavigate('trimmer')}
          >
            Trimmer
          </button>
          
          {currentPage === 'home' && (
            <button 
              className="btn btn-primary"
              onClick={() => onNavigate('dashboard')}
            >
              <Zap size={18} />
              Start Clipping
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
