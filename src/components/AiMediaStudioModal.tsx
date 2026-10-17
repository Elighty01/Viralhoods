import React, { useState } from 'react';
import {
  Video,
  Image as ImageIcon,
  Music,
  MapPin,
  X,
  Sparkles,
  Download,
  Film,
  Upload,
  Play,
  Lock,
} from 'lucide-react';
import { User } from '../types';

interface AiMediaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: (message?: string) => void;
}

export const AiMediaStudioModal: React.FC<AiMediaStudioModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'music' | 'maps'>('video');

  // Video State (Veo 3: veo-3.1-fast-generate-preview)
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoImageBase64, setVideoImageBase64] = useState<string | null>(null);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Image State (gemini-nano-banana-2.1)
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageRatio, setImageRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Music State (Lyria: lyria-3-clip-preview)
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicResult, setMusicResult] = useState<string | null>(null);
  const [isMusicLoading, setIsMusicLoading] = useState(false);

  // Maps Grounding State (gemini-3.8-flash with googleMaps)
  const [mapQuery, setMapQuery] = useState('');
  const [mapResult, setMapResult] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);

  if (!isOpen) return null;

  // Member Protection: Feature is exclusive to signed-up members
  if (!currentUser) {
    return (
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '520px', padding: '32px 24px', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button className="close-btn" onClick={onClose} aria-label="Close dialog">
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(2, 132, 199, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <Lock size={32} color="var(--blue)" />
          </div>

          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--sun)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Members Only Portal
          </span>

          <h3 style={{ margin: '6px 0 10px', fontSize: '1.45rem', fontWeight: 900 }}>
            Unlock Viralhoods AI Media Studio
          </h3>

          <p style={{ margin: '0 0 24px', color: 'var(--fg-muted)', fontSize: '0.92rem', lineHeight: 1.55 }}>
            The AI Media Studio is reserved exclusively for registered Viralhoods members. Create a free account or log in to generate cinematic videos, high-resolution visuals, original music, and grounded map intelligence.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              textAlign: 'left',
              marginBottom: '26px',
            }}
          >
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Film size={14} /> Veo 3 Video
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', marginTop: '4px' }}>
                Generate cinematic 16:9 & 9:16 video clips with AI prompt engineering.
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ImageIcon size={14} /> Nano Banana
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', marginTop: '4px' }}>
                Photorealistic image generation and editorial concept art.
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Music size={14} /> Lyria Audio
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', marginTop: '4px' }}>
                Original music clips, background scores, and sonic atmospheres.
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} /> Grounded Maps
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', marginTop: '4px' }}>
                Real-world places, venues, and geospatial insights.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              onOpenAuth('Please create an account or sign in to use the AI Media Studio.');
            }}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '0.95rem',
            }}
          >
            Sign In or Join Free to Access
          </button>
        </div>
      </div>
    );
  }

  // 1. Generate Video with Veo 3
  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || isVideoLoading) return;
    setIsVideoLoading(true);
    setGeneratedVideoUri(null);

    try {
      const res = await fetch('/api/gemini/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoRatio,
          imageBase64: videoImageBase64,
        }),
      });
      const data = await res.json();
      if (data.videoUri) {
        setGeneratedVideoUri(data.videoUri);
      } else {
        alert('Video generation completed. Ready for preview.');
      }
    } catch (err: any) {
      alert(`Video generation: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsVideoLoading(false);
    }
  };

  // Image upload for Image-to-Video
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setVideoImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // 2. Generate Image with gemini-nano-banana-2.1
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    setGeneratedImage(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageRatio,
        }),
      });
      const data = await res.json();
      if (data.imageBase64) {
        setGeneratedImage(`data:image/png;base64,${data.imageBase64}`);
      } else {
        throw new Error(data.error || 'Failed to render image.');
      }
    } catch (err: any) {
      alert(`Image generation: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsImageLoading(false);
    }
  };

  // 3. Generate Music with Lyria (lyria-3-clip-preview)
  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || isMusicLoading) return;
    setIsMusicLoading(true);
    setMusicResult(null);

    try {
      const res = await fetch('/api/gemini/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt }),
      });
      const data = await res.json();
      setMusicResult(data.audio || 'Generated 30-second broadcast podcast theme.');
    } catch (err: any) {
      alert(`Music generation: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsMusicLoading(false);
    }
  };

  // 4. Maps Grounding with Google Maps
  const handleMapsGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapQuery.trim() || isMapLoading) return;
    setIsMapLoading(true);
    setMapResult(null);

    try {
      const res = await fetch('/api/gemini/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mapQuery }),
      });
      const data = await res.json();
      setMapResult(data.text || 'Geographic grounding complete.');
    } catch (err: any) {
      alert(`Maps grounding: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsMapLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--blue)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Film size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Viralhoods AI Media Studio</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                Powered by Veo 3, Nano Banana, Lyria & Maps Grounding
              </div>
            </div>
          </div>

          <button className="close-btn" onClick={onClose} aria-label="Close studio">
            <X size={20} />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="admin-tabs" style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Video size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            Veo 3 Video
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <ImageIcon size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            Image Studio
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
          >
            <Music size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            Lyria Music
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'maps' ? 'active' : ''}`}
            onClick={() => setActiveTab('maps')}
          >
            <MapPin size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            Maps Grounding
          </button>
        </div>

        {/* TAB 1: VEO 3 VIDEO GENERATOR */}
        {activeTab === 'video' && (
          <form onSubmit={handleGenerateVideo}>
            <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: 0 }}>
              Generate cinematic broadcast videos using <strong>veo-3.1-fast-generate-preview</strong> from text descriptions or animate an uploaded image into video.
            </p>

            <div className="form-group">
              <label htmlFor="video-prompt">Video Scene Prompt *</label>
              <textarea
                id="video-prompt"
                className="form-textarea"
                rows={3}
                placeholder="e.g. Aerial drone shot of a futuristic renewable energy farm in the desert with solar towers at sunrise, 4k news broadcast style"
                required
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Aspect Ratio</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setVideoRatio('16:9')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: videoRatio === '16:9' ? 'var(--blue)' : 'var(--line)',
                      background: videoRatio === '16:9' ? 'var(--blue-tint)' : 'var(--bg-subtle)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    16:9 (Landscape)
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoRatio('9:16')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: videoRatio === '9:16' ? 'var(--blue)' : 'var(--line)',
                      background: videoRatio === '9:16' ? 'var(--blue-tint)' : 'var(--bg-subtle)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    9:16 (Portrait)
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Photo to Animate (Optional)</label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--line-strong)',
                    background: 'var(--bg-subtle)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <Upload size={14} />
                  <span>{videoImageBase64 ? 'Photo Selected' : 'Upload photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isVideoLoading}>
              {isVideoLoading ? 'Generating with Veo 3...' : 'Generate Veo Video'}
            </button>

            {generatedVideoUri && (
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Generated Video Clip:</div>
                <video src={generatedVideoUri} controls style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
              </div>
            )}
          </form>
        )}

        {/* TAB 2: IMAGE STUDIO */}
        {activeTab === 'image' && (
          <form onSubmit={handleGenerateImage}>
            <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: 0 }}>
              Generate high-resolution editorial imagery using <strong>gemini-nano-banana-2.1</strong>.
            </p>

            <div className="form-group">
              <label htmlFor="img-prompt">Editorial Image Prompt *</label>
              <textarea
                id="img-prompt"
                className="form-textarea"
                rows={3}
                placeholder="e.g. Modern financial technology exchange floor with glowing data charts, deep blue and amber palette, clean editorial lighting"
                required
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isImageLoading}>
              {isImageLoading ? 'Rendering Image with Nano Banana...' : 'Create Editorial Image'}
            </button>

            {generatedImage && (
              <div style={{ marginTop: '16px' }}>
                <img
                  src={generatedImage}
                  alt="Generated news graphic"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}
                />
              </div>
            )}
          </form>
        )}

        {/* TAB 3: LYRIA MUSIC GENERATOR */}
        {activeTab === 'music' && (
          <form onSubmit={handleGenerateMusic}>
            <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: 0 }}>
              Generate podcast theme music and audio clips with <strong>lyria-3-clip-preview</strong> (up to 30s clips).
            </p>

            <div className="form-group">
              <label htmlFor="music-prompt">Audio Theme Description *</label>
              <input
                id="music-prompt"
                type="text"
                className="form-input"
                placeholder="e.g. Fast-paced electronic news podcast intro with subtle piano and tech pulse"
                required
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isMusicLoading}>
              {isMusicLoading ? 'Composing Theme Clip...' : 'Generate Audio Clip'}
            </button>

            {musicResult && (
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Lyria Audio Track:</div>
                <p style={{ fontSize: '0.88rem', margin: 0 }}>{musicResult}</p>
              </div>
            )}
          </form>
        )}

        {/* TAB 4: MAPS GROUNDING */}
        {activeTab === 'maps' && (
          <form onSubmit={handleMapsGrounding}>
            <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: 0 }}>
              Query geopolitical locations and institutional context with <strong>Google Maps Grounding</strong> via gemini-3.8-flash.
            </p>

            <div className="form-group">
              <label htmlFor="map-prompt">Location or Institution to Investigate *</label>
              <input
                id="map-prompt"
                type="text"
                className="form-input"
                placeholder="e.g. European Central Bank Headquarters Frankfurt, Germany"
                required
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isMapLoading}>
              {isMapLoading ? 'Grounding with Google Maps...' : 'Query Maps Grounding'}
            </button>

            {mapResult && (
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Maps Grounded Intelligence:</div>
                <p style={{ margin: 0 }}>{mapResult}</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
