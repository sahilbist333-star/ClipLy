import React from 'react';
import { Sparkles, ArrowRight, Play, Scissors, Layers, Zap } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <div style={{ paddingTop: '120px', paddingBottom: '80px' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: '900px' }}>
        
        <div className="animate-fade-in" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'rgba(144, 79, 250, 0.1)',
          border: '1px solid rgba(144, 79, 250, 0.2)',
          color: 'var(--accent-purple)',
          fontWeight: 500,
          fontSize: '0.875rem',
          marginBottom: '2rem'
        }}>
          <Sparkles size={16} />
          <span>The #1 AI Video Clipping Tool</span>
        </div>

        <h1 className="animate-fade-in stagger-1" style={{ fontSize: '4.5rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          1 long video, <br />
          <span className="text-gradient">10 viral clips.</span>
        </h1>
        
        <p className="animate-fade-in stagger-2" style={{ 
          fontSize: '1.25rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '600px', 
          margin: '0 auto 3rem auto' 
        }}>
          Turn your YouTube videos, Zoom recordings, and podcasts into short, engaging clips for TikTok, Shorts, and Reels in 1 click.
        </p>

        <div className="animate-fade-in stagger-3" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onStart} style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
            Drop a video link
            <ArrowRight size={20} />
          </button>
          <button className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
            <Play size={20} />
            Watch Demo
          </button>
        </div>

        {/* Feature Highlights Mockup */}
        <div className="animate-fade-in stagger-4" style={{ 
          marginTop: '6rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          textAlign: 'left'
        }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-blue)' }}>
              <Scissors size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>AI Curation</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Our AI analyzes your video to find the most engaging hooks and viral moments automatically.</p>
          </div>
          
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(144, 79, 250, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-purple)' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Auto Captions</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Add dynamic, highly-accurate captions with emojis and highlighted keywords.</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(217, 70, 239, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-pink)' }}>
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Auto Reframe</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Intelligently crops your horizontal video into 9:16 vertical format keeping the speaker centered.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
