import React, { useState } from 'react';
import { Scissors, Link as LinkIcon, Loader2, Download, Clock } from 'lucide-react';

export function Trimmer() {
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:15');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTrim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !startTime || !endTime) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, startTime, endTime }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `cliply_trimmed_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to trim video');
      }
    } catch (error) {
      console.error(error);
      alert('Network error communicating with the backend.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Precision Video Trimmer</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Download a specific portion of a video without losing any original quality.
        </p>

        <form onSubmit={handleTrim} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>
            <LinkIcon color="var(--text-secondary)" size={20} />
            <input 
              type="url" 
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '1.125rem', outline: 'none', padding: '0.5rem 0' }}
              required
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Start Time (HH:MM:SS)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>
                  <Clock color="var(--text-secondary)" size={16} />
                  <input 
                    type="text" 
                    placeholder="00:00:00"
                    pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', outline: 'none' }}
                    required
                  />
                </div>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>End Time (HH:MM:SS)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>
                  <Clock color="var(--text-secondary)" size={16} />
                  <input 
                    type="text" 
                    placeholder="00:00:15"
                    pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', outline: 'none' }}
                    required
                  />
                </div>
             </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isProcessing}
              style={{ padding: '0.75rem 2rem', width: '100%', maxWidth: '300px' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing Trim...
                </>
              ) : (
                <>
                  <Scissors size={18} />
                  Trim & Download
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
