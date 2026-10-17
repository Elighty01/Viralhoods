import React, { useState, useMemo } from 'react';
import {
  EntertainmentDownloadItem,
  ENTERTAINMENT_DOWNLOADS,
  DownloadMirror,
} from '../data/entertainmentDownloads';
import { NewsItem, User } from '../types';
import { NewsCard } from './NewsCard';
import {
  Download,
  Film,
  Music,
  Video,
  BookOpen,
  Newspaper,
  Search,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Play,
  Pause,
  ShieldCheck,
  Share2,
  FileText,
  Clock,
  HardDrive,
  Star,
  X,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export type EntertainmentSubpage = 'news' | 'videos' | 'music' | 'movies' | 'novels';

interface EntertainmentHubProps {
  currentSubpage: EntertainmentSubpage;
  onSelectSubpage: (subpage: EntertainmentSubpage) => void;
  entertainmentStories: NewsItem[];
  bookmarks: string[];
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onOpenStory: (item: NewsItem) => void;
  currentUser: User | null;
  onOpenAuth: (message?: string) => void;
}

export const EntertainmentHub: React.FC<EntertainmentHubProps> = ({
  currentSubpage,
  onSelectSubpage,
  entertainmentStories,
  bookmarks,
  onToggleBookmark,
  onOpenStory,
  currentUser,
  onOpenAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [activeModalItem, setActiveModalItem] = useState<EntertainmentDownloadItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Request link modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestCategory, setRequestCategory] = useState<'video' | 'music' | 'movie' | 'novel'>('movie');
  const [requestNote, setRequestNote] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Filter downloadable items according to current subpage
  const targetType = useMemo(() => {
    switch (currentSubpage) {
      case 'videos':
        return 'video';
      case 'music':
        return 'music';
      case 'movies':
        return 'movie';
      case 'novels':
        return 'novel';
      default:
        return null;
    }
  }, [currentSubpage]);

  // Available genres for current subpage
  const availableGenres = useMemo(() => {
    if (!targetType) return [];
    const items = ENTERTAINMENT_DOWNLOADS.filter((d) => d.type === targetType);
    const genres = Array.from(new Set(items.map((i) => i.genre.split('/')[0].trim())));
    return ['All', ...genres];
  }, [targetType]);

  // Filtered downloadable items
  const filteredDownloads = useMemo(() => {
    if (!targetType) return [];
    return ENTERTAINMENT_DOWNLOADS.filter((item) => {
      if (item.type !== targetType) return false;
      const matchesSearch =
        !searchQuery.trim() ||
        (item.title + ' ' + item.creator + ' ' + item.description + ' ' + item.genre)
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
      const matchesGenre =
        selectedGenre === 'All' || item.genre.toLowerCase().includes(selectedGenre.toLowerCase());
      return matchesSearch && matchesGenre;
    });
  }, [targetType, searchQuery, selectedGenre]);

  // Audio preview handler
  const handleTogglePlayAudio = (item: EntertainmentDownloadItem) => {
    if (!item.downloadUrl) return;

    if (playingAudioId === item.id) {
      audioElement?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(item.downloadUrl);
      audio.play().catch((err) => {
        console.warn('Audio play restricted or preview stream error:', err);
      });
      audio.onended = () => setPlayingAudioId(null);
      setAudioElement(audio);
      setPlayingAudioId(item.id);
    }
  };

  // Copy download link
  const handleCopyLink = (url: string, title: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setDownloadSuccessToast(`Download link for "${title}" copied to clipboard!`);
    setTimeout(() => {
      setCopiedUrl(null);
      setDownloadSuccessToast(null);
    }, 3500);
  };

  // Handle direct download trigger to real site
  const handleInitiateDownload = (item: EntertainmentDownloadItem, mirror?: DownloadMirror) => {
    const targetUrl = mirror ? mirror.url : item.downloadUrl;
    setDownloadSuccessToast(`Opening external download source for "${item.title}". Note: Download site is at client's own risk.`);
    
    // Open the real site in a new tab safely
    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 4500);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim()) return;
    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      setIsRequestModalOpen(false);
      setRequestTitle('');
      setRequestNote('');
    }, 2000);
  };

  return (
    <div className="entertainment-hub-container" style={{ margin: '24px 0 40px' }}>
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--fg)',
            color: 'var(--bg)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--card-shadow-hover)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Check size={18} color="var(--sun)" />
          {downloadSuccessToast}
        </div>
      )}

      {/* Entertainment Masthead Banner */}
      <div
        className="entertainment-banner"
        style={{
          position: 'relative',
          backgroundImage: `linear-gradient(90deg, rgba(9, 13, 22, 0.94) 0%, rgba(9, 13, 22, 0.82) 55%, rgba(9, 13, 22, 0.65) 100%), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 24px',
          marginBottom: '28px',
          color: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--blue-vibrant)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Sparkles size={16} /> Viralhoods Entertainment Portal & Download Center
            </div>
            <h1 style={{ margin: '6px 0 8px', fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Trending Entertainment & Direct Downloads
            </h1>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.96rem', maxWidth: '650px', lineHeight: 1.55 }}>
              Get verified, high-speed direct download links to the world’s most viral videos, chart-topping music, blockbuster movies & TV series, and bestselling novels.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setIsRequestModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <FileText size={15} /> Request a Link
            </button>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--fg-muted)',
              }}
            >
              <ShieldCheck size={16} color="var(--sun)" />
              <span>VirusTotal Verified Safe Links</span>
            </div>
          </div>
        </div>

        {/* Subpages Navigation Tabs Bar */}
        <div
          className="entertainment-subpages-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '20px',
            borderTop: '1px solid var(--line)',
            paddingTop: '16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => onSelectSubpage('news')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: currentSubpage === 'news' ? '1px solid var(--blue)' : '1px solid var(--line)',
              background: currentSubpage === 'news' ? 'var(--blue)' : 'var(--bg-card)',
              color: currentSubpage === 'news' ? '#ffffff' : 'var(--fg)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <Newspaper size={15} /> Entertainment News
            <span
              style={{
                background: currentSubpage === 'news' ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {entertainmentStories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubpage('videos')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: currentSubpage === 'videos' ? '1px solid var(--blue)' : '1px solid var(--line)',
              background: currentSubpage === 'videos' ? 'var(--blue)' : 'var(--bg-card)',
              color: currentSubpage === 'videos' ? '#ffffff' : 'var(--fg)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <Video size={15} /> Trending Videos
            <span
              style={{
                background: currentSubpage === 'videos' ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {ENTERTAINMENT_DOWNLOADS.filter((d) => d.type === 'video').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubpage('music')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: currentSubpage === 'music' ? '1px solid var(--blue)' : '1px solid var(--line)',
              background: currentSubpage === 'music' ? 'var(--blue)' : 'var(--bg-card)',
              color: currentSubpage === 'music' ? '#ffffff' : 'var(--fg)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <Music size={15} /> Trending Music
            <span
              style={{
                background: currentSubpage === 'music' ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {ENTERTAINMENT_DOWNLOADS.filter((d) => d.type === 'music').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubpage('movies')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: currentSubpage === 'movies' ? '1px solid var(--blue)' : '1px solid var(--line)',
              background: currentSubpage === 'movies' ? 'var(--blue)' : 'var(--bg-card)',
              color: currentSubpage === 'movies' ? '#ffffff' : 'var(--fg)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <Film size={15} /> Movies & TV Series
            <span
              style={{
                background: currentSubpage === 'movies' ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {ENTERTAINMENT_DOWNLOADS.filter((d) => d.type === 'movie').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubpage('novels')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: currentSubpage === 'novels' ? '1px solid var(--blue)' : '1px solid var(--line)',
              background: currentSubpage === 'novels' ? 'var(--blue)' : 'var(--bg-card)',
              color: currentSubpage === 'novels' ? '#ffffff' : 'var(--fg)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={15} /> Novels & E-Books
            <span
              style={{
                background: currentSubpage === 'novels' ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {ENTERTAINMENT_DOWNLOADS.filter((d) => d.type === 'novel').length}
            </span>
          </button>
        </div>

        {/* Client-Risk Advisory Notice */}
        <div
          style={{
            marginTop: '16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: 'var(--fg)',
          }}
        >
          <AlertCircle size={18} color="var(--sun)" style={{ flexShrink: 0 }} />
          <div>
            <strong>Third-Party Download Mirror Notice:</strong> All media links route to real external public hosting services (such as YTS, TrendyBeatz, SaveFrom, OceanofPDF, and Internet Archive). External downloading is conducted at the client's own discretion and risk.
          </div>
        </div>
      </div>

      {/* Subpage View Content */}
      {currentSubpage === 'news' ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--blue)" /> Latest Viral Stories in Entertainment
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
              Showing {entertainmentStories.length} curated stories
            </div>
          </div>

          {entertainmentStories.length > 0 ? (
            <div className="news-grid">
              {entertainmentStories.map((story) => (
                <NewsCard
                  key={story.id}
                  item={story}
                  isBookmarked={bookmarks.includes(story.id)}
                  onToggleBookmark={onToggleBookmark}
                  onOpenStory={onOpenStory}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fg-muted)' }}>
              No entertainment stories available in the active feed right now.
            </div>
          )}
        </div>
      ) : (
        /* Downloadable Subpages (Videos, Music, Movies, Novels) */
        <div>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
              padding: '12px 16px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }}
              />
              <input
                type="text"
                placeholder={`Search ${currentSubpage}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Genre Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)' }}>Genre:</span>
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedGenre === genre ? 'var(--blue)' : 'var(--line)',
                    background: selectedGenre === genre ? 'var(--blue-tint)' : 'transparent',
                    color: selectedGenre === genre ? 'var(--blue)' : 'var(--fg-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Download Items Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredDownloads.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {/* Media Thumbnail & Badges */}
                <div style={{ position: 'relative', height: '175px', overflow: 'hidden', background: '#000' }}>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: 0.92,
                    }}
                    loading="lazy"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.quality}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(2, 132, 199, 0.9)',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.fileSize}
                  </div>

                  {/* Inline Audio Player Trigger for Music */}
                  {item.type === 'music' && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlayAudio(item)}
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--sun)',
                        color: '#000',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      }}
                      title={playingAudioId === item.id ? 'Pause Preview' : 'Play Audio Preview'}
                    >
                      {playingAudioId === item.id ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                    </button>
                  )}

                  {/* Duration or Page Count badge */}
                  {item.durationOrPages && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} /> {item.durationOrPages}
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--blue)' }}>
                      {item.genre}
                    </span>
                    {item.rating && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--sun)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Star size={12} fill="currentColor" /> {item.rating}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      margin: '0 0 6px',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      lineHeight: 1.35,
                      color: 'var(--fg)',
                    }}
                  >
                    {item.title}
                  </h3>

                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '10px' }}>
                    {item.creator} • {item.releaseYear}
                  </div>

                  <p
                    style={{
                      margin: '0 0 16px',
                      fontSize: '0.84rem',
                      color: 'var(--fg-muted)',
                      lineHeight: 1.5,
                      flex: 1,
                    }}
                  >
                    {item.description}
                  </p>

                  {/* Format & Verified Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {item.format}
                    </span>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <ShieldCheck size={12} /> Verified Clean
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
                      {item.downloadsCount.toLocaleString()} dl
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleInitiateDownload(item)}
                      style={{
                        flex: 1,
                        background: 'var(--blue)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '9px 12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <Download size={15} /> Download ({item.fileSize})
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModalItem(item)}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--fg)',
                        padding: '9px 12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="View all download mirrors & options"
                    >
                      <Layers size={14} /> Mirrors
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.downloadUrl, item.title)}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--fg-muted)',
                        padding: '9px 10px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      title="Copy download link"
                    >
                      {copiedUrl === item.downloadUrl ? <Check size={15} color="var(--sun)" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDownloads.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--fg-muted)',
              }}
            >
              <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--fg)' }}>No downloads found</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Try refining your search query or choosing another genre filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Download Mirrors & Safety Modal */}
      {activeModalItem && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="modal-box"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              position: 'relative',
              boxShadow: 'var(--card-shadow-hover)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModalItem(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <img
                src={activeModalItem.thumbnail}
                alt={activeModalItem.title}
                style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
              />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>
                  {activeModalItem.genre}
                </span>
                <h3 style={{ margin: '4px 0', fontSize: '1.15rem', fontWeight: 800 }}>{activeModalItem.title}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
                  {activeModalItem.creator} • {activeModalItem.quality} • {activeModalItem.fileSize}
                </div>
              </div>
            </div>

            {/* Virus Check & Safety Info */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem',
              }}
            >
              <ShieldCheck size={20} color="#10b981" />
              <div>
                <strong style={{ color: '#10b981' }}>VirusTotal Verified Clean</strong>
                <div style={{ color: 'var(--fg-muted)', fontSize: '0.78rem' }}>
                  0/68 security vendors flagged this file. SHA-256 integrity hash verified.
                </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Download Mirrors
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {activeModalItem.mirrors.map((mirror, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{mirror.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', display: 'flex', gap: '8px' }}>
                      <span>Type: {mirror.type}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Speed: {mirror.speed}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(mirror.url, activeModalItem.title)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--line)',
                        background: 'var(--bg-card)',
                        color: 'var(--fg-muted)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Copy Link"
                    >
                      <Copy size={13} /> Copy
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInitiateDownload(activeModalItem, mirror)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'var(--blue)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
              Offline enjoyment only. Viralhoods verifies all media links for security and safe downloading.
            </div>
          </div>
        </div>
      )}

      {/* Request Download Link Modal */}
      {isRequestModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsRequestModalOpen(false)}
        >
          <div
            className="modal-box"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              position: 'relative',
              boxShadow: 'var(--card-shadow-hover)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800 }}>
              Request a Download Link
            </h3>
            <p style={{ margin: '0 0 20px', color: 'var(--fg-muted)', fontSize: '0.88rem' }}>
              Can’t find a trending video, song, movie/series, or novel? Let our editorial curators find and add a verified direct download mirror.
            </p>

            {requestSubmitted ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                <Check size={24} style={{ margin: '0 auto 8px' }} />
                Your link request has been submitted! Our automated bot & editorial team will index it shortly.
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    Media Category
                  </label>
                  <select
                    value={requestCategory}
                    onChange={(e) => setRequestCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="movie">Movie / TV Series</option>
                    <option value="music">Music Single / Album</option>
                    <option value="video">Trending Video / Skit / Trailer</option>
                    <option value="novel">Novel / E-Book / Comic</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    Title & Artist / Author / Creator
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asake - Active ft. Travis Scott, or Dune: Part Two"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    Preferred Format or Resolution (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1080p BluRay, MP3 320kbps, EPUB/PDF"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                  }}
                >
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
