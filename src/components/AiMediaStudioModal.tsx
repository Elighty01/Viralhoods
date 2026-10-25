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
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

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

  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // 1. Generate Video with Veo / Omni Flash
  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || isVideoLoading) return;
    setIsVideoLoading(true);
    setGeneratedVideoUri(null);
    setStatusNotice(null);

    try {
      // 1. Try local server API
      let videoBase64: string | null = null;
      try {
        const resp = await fetch('/api/ai/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: videoPrompt.trim(),
            aspectRatio: videoRatio,
            imageBase64: videoImageBase64,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.videoBase64) {
            videoBase64 = data.videoBase64;
          } else if (data.error) {
            setStatusNotice({
              type: 'error',
              message: 'Not working at the moment, try back later',
            });
            return;
          }
        }
      } catch {
        // Fall back to Cloud Function
      }

      // 2. Fall back to Cloud Function
      if (!videoBase64) {
        const generateVideo = httpsCallable(functions, 'geminiGenerateVideo');
        const res: any = await generateVideo({
          prompt: videoPrompt.trim(),
          aspectRatio: videoRatio,
          imageBase64: videoImageBase64,
        });
        videoBase64 = res.data?.videoBase64 || null;
      }

      if (videoBase64) {
        setGeneratedVideoUri(`data:video/mp4;base64,${videoBase64}`);
        setStatusNotice({
          type: 'success',
          message: 'Video synthesized successfully.',
        });
      } else {
        throw new Error('Video generation failed');
      }
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'Not working at the moment, try back later',
      });
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

  // 2. Generate Image with Nano Banana / Flash Image
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    setGeneratedImage(null);
    setStatusNotice(null);

    try {
      // 1. Try local server API
      let imageBase64: string | null = null;
      try {
        const resp = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: imagePrompt.trim(), aspectRatio: imageRatio }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.imageBase64) {
            imageBase64 = data.imageBase64;
          } else if (data.error) {
            setStatusNotice({ type: 'error', message: 'Not working at the moment, try back later' });
            return;
          }
        }
      } catch {
        // Fall back to Cloud Function
      }

      // 2. Fall back to Cloud Function
      if (!imageBase64) {
        const generateImage = httpsCallable(functions, 'geminiGenerateImage');
        const res: any = await generateImage({ prompt: imagePrompt.trim(), aspectRatio: imageRatio });
        imageBase64 = res.data?.imageBase64 || null;
      }

      if (imageBase64) {
        setGeneratedImage(`data:image/png;base64,${imageBase64}`);
        setStatusNotice({
          type: 'success',
          message: 'Visual illustration synthesized successfully.',
        });
      } else {
        throw new Error('Failed to render image.');
      }
    } catch {
      setStatusNotice({ type: 'error', message: 'Not working at the moment, try back later' });
    } finally {
      setIsImageLoading(false);
    }
  };

  // 3. Generate Music with Lyria
  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || isMusicLoading) return;
    setIsMusicLoading(true);
    setMusicResult(null);
    setStatusNotice(null);

    try {
      // 1. Try local server API
      let textResult: string | null = null;
      try {
        const resp = await fetch('/api/ai/music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: musicPrompt.trim() }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.error) {
            setStatusNotice({ type: 'error', message: 'Not working at the moment, try back later' });
            return;
          }
          textResult = data.text || 'Audio track composed.';
        }
      } catch {
        // Fall back to Cloud Function
      }

      if (!textResult) {
        const generateMusic = httpsCallable(functions, 'geminiGenerateMusic');
        const res: any = await generateMusic({ prompt: musicPrompt.trim() });
        textResult = res.data?.text || 'Audio track composed.';
      }

      setMusicResult(textResult);
      setStatusNotice({ type: 'success', message: 'Audio track composed successfully.' });
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'Not working at the moment, try back later',
      });
    } finally {
      setIsMusicLoading(false);
    }
  };

  // 4. Maps / places questions with Google Maps Grounding
  const handleMapsGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapQuery.trim() || isMapLoading) return;
    setIsMapLoading(true);
    setMapResult(null);
    setStatusNotice(null);

    try {
      // 1. Try local server API
      let textResult: string | null = null;
      try {
        const resp = await fetch('/api/ai/maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: mapQuery.trim() }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.error) {
            setStatusNotice({ type: 'error', message: 'Not working at the moment, try back later' });
            return;
          }
          textResult = data.text || null;
        }
      } catch {
        // Fall back to Cloud Function
      }

      if (!textResult) {
        const mapsQuery = httpsCallable(functions, 'geminiMapsQuery');
        const res: any = await mapsQuery({ query: mapQuery.trim() });
        textResult = res.data?.text || 'No answer generated.';
      }

      setMapResult(textResult);
      setStatusNotice({ type: 'success', message: 'Answer retrieved.' });
    } catch {
      setStatusNotice({ type: 'error', message: 'Not working at the moment, try back later' });
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

        {statusNotice && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              background:
                statusNotice.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : statusNotice.type === 'error'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(2, 132, 199, 0.12)',
              border: `1px solid ${
                statusNotice.type === 'success'
                  ? 'rgba(16, 185, 129, 0.35)'
                  : statusNotice.type === 'error'
                  ? 'rgba(239, 68, 68, 0.35)'
                  : 'rgba(2, 132, 199, 0.35)'
              }`,
              color:
                statusNotice.type === 'success'
                  ? '#10b981'
                  : statusNotice.type === 'error'
                  ? '#ef4444'
                  : 'var(--blue)',
            }}
          >
            <span>{statusNotice.message}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
              aria-label="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

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
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', marginBottom: '8px' }}
                />
                <a
                  href={generatedImage}
                  download="viralhoods-editorial-concept.png"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  <Download size={14} /> Download Visual
                </a>
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
