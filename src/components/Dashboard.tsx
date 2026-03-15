import React, { useState } from 'react';
import { Link as LinkIcon, Loader2, PlayCircle, Download, Scissors } from 'lucide-react';

export function Dashboard() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState<any[]>([]);
  const [progressStep, setProgressStep] = useState('');
  const [progressDetails, setProgressDetails] = useState('');

  // Extract YouTube ID from various URL formats
  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setVideoId(extractVideoId(newUrl));
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsProcessing(true);
    setClips([]);
    setProgressStep('Connecting...');
    setProgressDetails('');
    
    // Use Server-Sent Events to stream progress
    const eventSource = new EventSource(`http://localhost:3001/api/process-clips?url=${encodeURIComponent(url)}`);

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setProgressStep(data.step);
      setProgressDetails(data.details);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      eventSource.close();
      
      const formattedClips = data.clips.map((clip: any, index: number) => ({
        id: index,
        title: clip.title || 'Viral Hook',
        score: clip.score || 90 + Math.floor(Math.random() * 10),
        duration: clip.duration || '0:30',
        img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=400&h=711',
        explanation: clip.explanation
      }));
      
      setClips(formattedClips);
      setIsProcessing(false);
      setUrl('');
    });

    eventSource.addEventListener('error', (e: any) => {
      eventSource.close();
      setIsProcessing(false);
      if (e.data) {
         try {
           const errData = JSON.parse(e.data);
           alert(errData.message || 'Error processing video.');
         } catch(err) {
           alert('Pipeline connection error.');
         }
      }
    });
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Create New Clips</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Paste a YouTube, Google Drive, or Rumble link below to let AI find the best hooks.
        </p>

        <form onSubmit={handleProcess} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>
            <LinkIcon color="var(--text-secondary)" size={20} />
            <input 
              type="url" 
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={handleUrlChange}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1.125rem',
                outline: 'none',
                padding: '0.5rem 0'
              }}
              required
            />
          </div>

          {/* Video Thumbnail Preview */}
          {videoId && !isProcessing && clips.length === 0 && (
            <div className="animate-fade-in" style={{
              width: '100%',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: '1px solid var(--glass-border)',
              marginTop: '0.5rem'
            }}>
              <img 
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
                alt="Video Preview" 
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '400px', objectFit: 'cover' }}
                onError={(e) => {
                  // Fallback to high quality if maxres doesn't exist for this video
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%)',
                pointerEvents: 'none'
              }}></div>
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
                 <p style={{ color: 'white', fontWeight: 600, fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Video Ready for Processing</p>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isProcessing}
              style={{ padding: '0.75rem 2rem' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : (
                <>
                  Get Clips in 1 Click
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '8px' }}>
                    Free
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {isProcessing && (
          <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem', padding: '3rem', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 2rem' }}>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(144, 79, 250, 0.2)', borderRadius: '50%' }}></div>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--accent-purple)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1.5s linear infinite' }}></div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                <Scissors size={32} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{progressStep || 'Analyzing Video...'}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{progressDetails || 'Starting up the AI magic.'}</p>
          </div>
        )}

        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>

      {clips.length > 0 && (
        <div className="animate-fade-in" style={{ marginTop: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem' }}>Your Generated Clips <span style={{ color: 'var(--accent-purple)', background: 'rgba(144,79,250,0.1)', padding: '4px 12px', borderRadius: 'full', fontSize: '1rem', verticalAlign: 'middle', marginLeft: '12px' }}>{clips.length} Clips</span></h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {clips.map(clip => (
              <div key={clip.id} className="glass-panel" style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', aspectRatio: '9/16', background: '#000', overflow: 'hidden' }}>
                  <img src={clip.img} alt={clip.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(255,255,255,0.2)' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <PlayCircle size={28} color="white" />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--gradient-main)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 'bold' }}>
                    Score {clip.score}
                  </div>
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', backdropFilter: 'blur(4px)' }}>
                    {clip.duration}
                  </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{clip.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {clip.explanation}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}>
                      <Download size={18} /> Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
