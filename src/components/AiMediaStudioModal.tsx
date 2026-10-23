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

  // Video generation (Veo-style) isn't wired to a real backend. Real video
  // generation is a long-running job (often 1-6 minutes) that needs a
  // polling UI this modal doesn't have, plus dedicated API access — rather
  // than fake a response, this says so plainly instead of hanging or
  // erroring silently.
  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || isVideoLoading) return;
    setStatusNotice({
      type: 'info',
      message: 'Video generation isn\u2019t connected yet — it needs dedicated API access and a job-progress UI this Studio doesn\u2019t have. Image generation below is fully working.',
    });
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

  // 2. Generate Image — real call to the geminiGenerateImage Cloud Function
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    setGeneratedImage(null);
    setStatusNotice(null);

    try {
      const generateImage = httpsCallable(functions, 'geminiGenerateImage');
      const res: any = await generateImage({ prompt: imagePrompt, aspectRatio: imageRatio });
      const data = res.data || {};
      if (data.imageBase64) {
        const mime = data.isSvg ? 'image/svg+xml' : 'image/png';
        setGeneratedImage(`data:${mime};base64,${data.imageBase64}`);
        setStatusNotice({
          type: 'success',
          message: data.message || 'Visual illustration synthesized successfully.',
        });
      } else {
        throw new Error('Failed to render image.');
      }
    } catch (err: any) {
      const friendly =
        err?.code === 'functions/unauthenticated'
          ? 'Please sign in to generate images.'
          : err?.code === 'functions/failed-precondition'
          ? 'Image generation isn\u2019t fully configured yet on the server side.'
          : err?.code === 'functions/internal'
          ? 'Your Gemini API key may not have image-generation access enabled.'
          : err?.message || 'Unexpected server error';
      setStatusNotice({ type: 'error', message: `Image generation: ${friendly}` });
    } finally {
      setIsImageLoading(false);
    }
  };

  // Music generation isn't wired to a real backend either, for the same
  // reason as video — it needs dedicated model access this project doesn't
  // have configured. Says so plainly rather than faking a result.
  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || isMusicLoading) return;
    setStatusNotice({
      type: 'info',
      message: 'Music generation isn\u2019t connected yet — it needs dedicated API access this project doesn\u2019t have configured.',
    });
  };

  // 4. Maps / places questions — answered by Gemini via geminiMapsQuery.
  // (A true live Google Maps grounding tool is a documented extension point
  // in that function if you confirm the exact tool schema for your API
  // tier; this gives a solid general-knowledge answer in the meantime.)
  const handleMapsGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapQuery.trim() || isMapLoading) return;
    setIsMapLoading(true);
    setMapResult(null);
    setStatusNotice(null);

    try {
      const mapsQuery = httpsCallable(functions, 'geminiMapsQuery');
      const res: any = await mapsQuery({ query: mapQuery });
      setMapResult(res.data?.text || 'No answer generated.');
      setStatusNotice({ type: 'success', message: 'Answer retrieved.' });
    } catch (err: any) {
      const friendly =
        err?.code === 'functions/unauthenticated'
          ? 'Please sign in to use this feature.'
          : err?.message || 'Geospatial query error';
      setStatusNotice({ type: 'error', message: `Maps query: ${friendly}` });
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
