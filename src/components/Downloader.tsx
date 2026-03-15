import React, { useState } from 'react';
import { UploadCloud, Link as LinkIcon, Loader2, Download } from 'lucide-react';

export function Downloader() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        // Trigger file download in browser
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `cliply_download_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to download video');
      }
    } catch (error) {
      console.error(error);
      alert('Network error communicating with the backend.');
    } finally {
      setIsProcessing(false);
      setUrl('');
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Source Quality Downloader</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Paste a YouTube, Twitch, or Kick link below to download the absolute maximum source quality A/V.
        </p>

        <form onSubmit={handleDownload} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isProcessing}
              style={{ padding: '0.75rem 2rem', width: '100%', maxWidth: '300px' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Fetching Stream...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download Maximum Quality
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
