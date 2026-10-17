export interface DownloadMirror {
  name: string;
  url: string;
  speed: 'Ultra Fast' | 'Standard' | 'P2P';
  type: 'Direct CDN' | 'External Host' | 'Torrent / Magnet' | 'Public Archive' | 'Streaming Host';
}

export interface EntertainmentDownloadItem {
  id: string;
  type: 'video' | 'music' | 'movie' | 'novel';
  title: string;
  creator: string; // Artist, Director, Author, or Channel
  description: string;
  thumbnail: string;
  genre: string;
  releaseYear: string;
  fileSize: string;
  format: string;
  quality: string;
  durationOrPages?: string;
  rating?: string;
  downloadUrl: string;
  mirrors: DownloadMirror[];
  downloadsCount: number;
  isTrending: boolean;
  addedDate: string;
  sampleAudioUrl?: string;
  sampleVideoUrl?: string;
  synopsisOrExcerpt?: string;
  episodesCount?: number;
  hostDomain?: string;
}

export const ENTERTAINMENT_DOWNLOADS: EntertainmentDownloadItem[] = [
  // ==========================================
  // TRENDING VIDEOS (Trailers, Skits, Reels, Concerts)
  // ==========================================
  {
    id: 'vid-gta-6-trailer',
    type: 'video',
    title: 'Grand Theft Auto VI - Official Reveal Trailer 2 (Direct Download)',
    creator: 'Rockstar Games Official',
    description: 'The viral record-breaking trailer featuring Vice City in stunning next-gen detail with uncompressed 4K visuals and Dolby Atmos sound.',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    genre: 'Gaming & Film Trailer',
    releaseYear: '2025/2026',
    fileSize: '348 MB',
    format: 'MP4 / H.265',
    quality: '4K Ultra HD (2160p)',
    durationOrPages: '2:18 mins',
    rating: '99% Liked (Viral)',
    hostDomain: 'savefrom.net / youtube.com',
    downloadUrl: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/watch?v=QdBZY2fkU-0',
    mirrors: [
      { name: 'SaveFrom HD Video Downloader (Client Risk)', url: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/watch?v=QdBZY2fkU-0', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Internet Archive Public Media Mirror', url: 'https://archive.org/search.php?query=GTA+VI+Trailer', speed: 'Standard', type: 'Public Archive' },
      { name: 'Official Rockstar YouTube Premiere Source', url: 'https://www.youtube.com/watch?v=QdBZY2fkU-0', speed: 'Ultra Fast', type: 'Streaming Host' }
    ],
    downloadsCount: 184200,
    isTrending: true,
    addedDate: '2026-10-15',
    synopsisOrExcerpt: 'Experience the next chapter of Rockstar Games with Lucia and Jason in Leonida. Download uncompressed master quality.'
  },
  {
    id: 'vid-sabrina-coachella',
    type: 'video',
    title: 'Sabrina Carpenter - Live Coachella Headline Performance (Full HD)',
    creator: 'Sabrina Carpenter & Coachella Live',
    description: 'Electrifying 1080p live concert video featuring "Espresso", "Taste", and "Please Please Please" with multi-cam stage feed.',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    genre: 'Live Concert / Music Video',
    releaseYear: '2026',
    fileSize: '620 MB',
    format: 'MP4 / AAC Stereo',
    quality: '1080p Full HD (60fps)',
    durationOrPages: '38:40 mins',
    rating: '4.9 ★',
    hostDomain: 'youtube.com / savefrom.net',
    downloadUrl: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/results?search_query=Sabrina+Carpenter+Coachella+Full+Performance',
    mirrors: [
      { name: 'SaveFrom Fast MP4 Download (Client Risk)', url: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/results?search_query=Sabrina+Carpenter+Coachella+Full+Performance', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Internet Archive Music Vault', url: 'https://archive.org/search.php?query=Sabrina+Carpenter+Coachella', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 94100,
    isTrending: true,
    addedDate: '2026-10-14'
  },
  {
    id: 'vid-mark-angel-skit',
    type: 'video',
    title: 'Mark Angel & Emanuella - "The Millionaire Landlord" Comedy Special',
    creator: 'Mark Angel Comedy',
    description: 'The highest-trending African comedy skit of the week with over 15 million views across platforms. High-definition offline download.',
    thumbnail: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
    genre: 'Comedy & Viral Skits',
    releaseYear: '2026',
    fileSize: '82 MB',
    format: 'MP4',
    quality: '1080p HD',
    durationOrPages: '6:45 mins',
    rating: '5.0 ★ Funny',
    hostDomain: 'youtube.com / savefrom.net',
    downloadUrl: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/watch?v=N4kM7k6-018',
    mirrors: [
      { name: 'SaveFrom MP4 Downloader (Client Risk)', url: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/watch?v=N4kM7k6-018', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Official Mark Angel Comedy Channel Source', url: 'https://www.youtube.com/watch?v=N4kM7k6-018', speed: 'Ultra Fast', type: 'Streaming Host' }
    ],
    downloadsCount: 215400,
    isTrending: true,
    addedDate: '2026-10-16'
  },
  {
    id: 'vid-avatar-fire-ash',
    type: 'video',
    title: 'Avatar: Fire and Ash - Official Extended IMAX Teaser (Dolby Vision)',
    creator: '20th Century Studios & James Cameron',
    description: 'James Cameron returns to Pandora with the fiery Ash People. Download the official cinema IMAX teaser trailer in master visual quality.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    genre: 'Cinema Trailer / Sci-Fi',
    releaseYear: '2025/2026',
    fileSize: '290 MB',
    format: 'MP4 / 4K UHD',
    quality: '2160p 4K HDR',
    durationOrPages: '2:45 mins',
    rating: '98% Rotten Tomatoes Anticipated',
    hostDomain: 'youtube.com / savefrom.net',
    downloadUrl: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/results?search_query=Avatar+Fire+and+Ash+Official+Trailer',
    mirrors: [
      { name: 'Direct Trailer Video Grabber (Client Risk)', url: 'https://en.savefrom.net/1-youtube-video-downloader-383/?url=https://www.youtube.com/results?search_query=Avatar+Fire+and+Ash+Official+Trailer', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Internet Archive Film Teaser Mirror', url: 'https://archive.org/search.php?query=Avatar+Fire+and+Ash', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 142000,
    isTrending: true,
    addedDate: '2026-10-13'
  },

  // ==========================================
  // TRENDING MUSIC (Afrobeats, Pop, Hip-Hop, Amapiano)
  // ==========================================
  {
    id: 'mus-asake-wizkid-mms',
    type: 'music',
    title: 'MMS (Mungode)',
    creator: 'Asake & Wizkid',
    description: 'The monumental collaboration blending soulful Afrobeats, spiritual melodies, and introspective lyricism. Topping charts across 45 countries.',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    genre: 'Afrobeats / Soul',
    releaseYear: '2026',
    fileSize: '8.4 MB (320kbps) / 28 MB (FLAC)',
    format: 'MP3 320kbps & FLAC Lossless',
    quality: 'Studio Master Quality (320 kbps)',
    durationOrPages: '3:38 mins',
    rating: 'Billboard Global #1',
    hostDomain: 'trendybeatz.com',
    downloadUrl: 'https://trendybeatz.com/download-mp3/44810/asake-mms-ft-wizkid',
    mirrors: [
      { name: 'TrendyBeatz Direct MP3 Host (Client Risk)', url: 'https://trendybeatz.com/download-mp3/44810/asake-mms-ft-wizkid', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'TooXclusive Fast Mirror (Client Risk)', url: 'https://tooxclusive.com/asake-mms-ft-wizkid/', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'JustNaija 320kbps Mirror (Client Risk)', url: 'https://justnaija.com/music/asake-mms-ft-wizkid/', speed: 'Standard', type: 'External Host' },
      { name: 'Audiomack Stream & Offline', url: 'https://audiomack.com/asake/song/mms', speed: 'Ultra Fast', type: 'Streaming Host' }
    ],
    downloadsCount: 318000,
    isTrending: true,
    addedDate: '2026-10-16',
    synopsisOrExcerpt: 'Lyrics: "Mo n be Olorun eledumare, make my blessings overflow... Asake and Big Wiz on a timeless wavelength."'
  },
  {
    id: 'mus-kendrick-not-like-us',
    type: 'music',
    title: 'Not Like Us (Club & Stadium Master)',
    creator: 'Kendrick Lamar',
    description: 'The Grammy-dominating West Coast anthem produced by Mustard with unmatched bass, witty flows, and viral cultural impact.',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    genre: 'Hip-Hop / West Coast Rap',
    releaseYear: '2026',
    fileSize: '10.2 MB (320kbps)',
    format: 'MP3 320kbps',
    quality: 'Explicit Master 320kbps',
    durationOrPages: '4:34 mins',
    rating: '5.0 ★ Hip-Hop Anthem',
    hostDomain: 'trendybeatz.com',
    downloadUrl: 'https://trendybeatz.com/download-mp3/41982/kendrick-lamar-not-like-us',
    mirrors: [
      { name: 'TrendyBeatz Rap Vault (Client Risk)', url: 'https://trendybeatz.com/download-mp3/41982/kendrick-lamar-not-like-us', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Audiomack Official Offline Stream', url: 'https://audiomack.com/kendrick-lamar/song/not-like-us', speed: 'Ultra Fast', type: 'Streaming Host' },
      { name: 'Internet Archive Audio Backup', url: 'https://archive.org/search.php?query=Kendrick+Lamar+Not+Like+Us', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 489000,
    isTrending: true,
    addedDate: '2026-10-15'
  },
  {
    id: 'mus-tems-love-me-jeje',
    type: 'music',
    title: 'Love Me JeJe (Born in the Wild LP)',
    creator: 'Tems',
    description: 'A breezy, warm reimagining of the Nigerian classic wrapped in Tems’ golden, resonant vocal production.',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    genre: 'R&B / Afrobeats / Alternative',
    releaseYear: '2026',
    fileSize: '7.8 MB',
    format: 'MP3 320kbps',
    quality: '320kbps Audio CD Rip',
    durationOrPages: '3:05 mins',
    rating: 'Grammy Nominated ★',
    hostDomain: 'trendybeatz.com',
    downloadUrl: 'https://trendybeatz.com/download-mp3/41908/tems-love-me-jeje',
    mirrors: [
      { name: 'TrendyBeatz MP3 Server (Client Risk)', url: 'https://trendybeatz.com/download-mp3/41908/tems-love-me-jeje', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'JustNaija Music Mirror (Client Risk)', url: 'https://justnaija.com/music/tems-love-me-jeje/', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Audiomack Official Stream', url: 'https://audiomack.com/tems/song/love-me-jeje', speed: 'Ultra Fast', type: 'Streaming Host' }
    ],
    downloadsCount: 220400,
    isTrending: true,
    addedDate: '2026-10-12'
  },
  {
    id: 'mus-tyler-icu-mnike',
    type: 'music',
    title: 'Mnike (Amapiano Mega Club Mix)',
    creator: 'Tyler ICU, Tumelo.za & DJ Maphorisa',
    description: 'The explosive South African log-drum Amapiano banger that has taken global dance clubs and TikTok by storm.',
    thumbnail: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
    genre: 'Amapiano / South African House',
    releaseYear: '2026',
    fileSize: '9.4 MB',
    format: 'MP3 320kbps',
    quality: 'Heavy Bass Club Master',
    durationOrPages: '4:12 mins',
    rating: 'Global Club Sensation',
    hostDomain: 'trendybeatz.com',
    downloadUrl: 'https://trendybeatz.com/download-mp3/34321/tyler-icu-mnike-ft-tumelo-za',
    mirrors: [
      { name: 'TrendyBeatz Amapiano Host (Client Risk)', url: 'https://trendybeatz.com/download-mp3/34321/tyler-icu-mnike-ft-tumelo-za', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Fakaza South Africa Portal (Client Risk)', url: 'https://fakaza.com/mnike', speed: 'Standard', type: 'External Host' },
      { name: 'Audiomack Club Stream', url: 'https://audiomack.com/tyler-icu/song/mnike', speed: 'Ultra Fast', type: 'Streaming Host' }
    ],
    downloadsCount: 175000,
    isTrending: true,
    addedDate: '2026-10-14'
  },

  // ==========================================
  // MOVIES & SERIES (Blockbusters, Series, Nollywood & Hollywood)
  // ==========================================
  {
    id: 'mov-dune-part-two',
    type: 'movie',
    title: 'Dune: Part Two (IMAX Enhanced Edition)',
    creator: 'Denis Villeneuve • Timothée Chalamet & Zendaya',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Includes English, Spanish, French subtitles.',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    genre: 'Sci-Fi / Action / Adventure',
    releaseYear: '2024/2026',
    fileSize: '2.1 GB (1080p) / 4.8 GB (4K)',
    format: 'MKV / MP4 (Dual Audio + Subtitles)',
    quality: '1080p BluRay x265 10bit',
    durationOrPages: '2h 46m',
    rating: 'IMDb 8.6 • Rotten Tomatoes 93%',
    hostDomain: 'yts.mx',
    downloadUrl: 'https://yts.mx/movies/dune-part-two-2024',
    mirrors: [
      { name: 'YTS.mx Verified Film Torrents (Client Risk)', url: 'https://yts.mx/movies/dune-part-two-2024', speed: 'Ultra Fast', type: 'Torrent / Magnet' },
      { name: '1337x Multi-Sub Torrent Index (Client Risk)', url: 'https://1337x.to/sort-search/Dune%20Part%20Two/time/desc/1/', speed: 'Ultra Fast', type: 'Torrent / Magnet' },
      { name: 'Internet Archive Public Domain Search', url: 'https://archive.org/search.php?query=Dune+Part+Two', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 524000,
    isTrending: true,
    addedDate: '2026-10-16',
    synopsisOrExcerpt: 'A boy becomes the messiah of nomadic warriors on a desert planet having giant worms and vast fields of spice.'
  },
  {
    id: 'mov-shogun-season-1',
    type: 'movie',
    title: 'Shōgun (Complete Season 1 - All 10 Episodes Batch)',
    creator: 'Rachel Kondo & Justin Marks • Hiroyuki Sanada, Cosmo Jarvis',
    description: 'The Emmy award-winning masterpiece set in 1600 Japan. Complete Season 1 packed into a single organized download with crisp 1080p and English subtitles.',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    genre: 'Historical Drama / Action',
    releaseYear: '2026',
    fileSize: '4.2 GB (Complete 10 Episodes)',
    format: 'MKV (x265 HEVC)',
    quality: '1080p WEB-DL Multi-Sub',
    durationOrPages: '10 Episodes (approx 58m each)',
    rating: 'IMDb 8.7 • 18 Emmy Awards Winner',
    hostDomain: 'eztvx.to / 1337x.to',
    downloadUrl: 'https://1337x.to/sort-search/Shogun%202024%20Season%201/time/desc/1/',
    mirrors: [
      { name: '1337x Season 1 Complete Pack (Client Risk)', url: 'https://1337x.to/sort-search/Shogun%202024%20Season%201/time/desc/1/', speed: 'Ultra Fast', type: 'Torrent / Magnet' },
      { name: 'EZTV TV Series Index (Client Risk)', url: 'https://eztvx.to/search/shogun-2024', speed: 'Ultra Fast', type: 'Torrent / Magnet' },
      { name: 'Internet Archive Series Companion', url: 'https://archive.org/search.php?query=Shogun+2024+Series', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 389000,
    isTrending: true,
    addedDate: '2026-10-15',
    episodesCount: 10
  },
  {
    id: 'mov-tribe-called-judah',
    type: 'movie',
    title: 'A Tribe Called Judah (Full Nollywood Blockbuster HD)',
    creator: 'Funke Akindele & Adeoluwa Owu',
    description: 'The historic Nigerian comedy-heist that shattered box office records, following five brothers planning a mall heist to save their mother.',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    genre: 'Nollywood / Heist Comedy / Drama',
    releaseYear: '2025/2026',
    fileSize: '1.45 GB',
    format: 'MP4 / 1080p WEBDL',
    quality: '1080p HD (English Subtitles)',
    durationOrPages: '2h 14m',
    rating: 'Record ₦1.4B Box Office • 4.8 ★',
    hostDomain: 'netnaija.com / fzmovies.net',
    downloadUrl: 'https://netnaija.com/movies',
    mirrors: [
      { name: 'NetNaija Nollywood Vault (Client Risk)', url: 'https://netnaija.com/movies', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'FZMovies HD Download (Client Risk)', url: 'https://fzmovies.net', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Internet Archive African Cinema Vault', url: 'https://archive.org/search.php?query=A+Tribe+Called+Judah', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 412000,
    isTrending: true,
    addedDate: '2026-10-14'
  },
  {
    id: 'mov-deadpool-wolverine',
    type: 'movie',
    title: 'Deadpool & Wolverine (Director’s Cut & Gag Reel Pack)',
    creator: 'Shawn Levy • Ryan Reynolds & Hugh Jackman',
    description: 'The Marvel multiverse team-up featuring nonstop action, hilarious fourth-wall breaks, and cameos galore. High-bitrate 1080p download.',
    thumbnail: 'https://images.unsplash.com/photo-1568876694728-451bbf694b83?auto=format&fit=crop&w=1200&q=80',
    genre: 'Action / Superhero / Comedy',
    releaseYear: '2024/2026',
    fileSize: '1.85 GB',
    format: 'MKV / MP4',
    quality: '1080p WEBRip x264',
    durationOrPages: '2h 08m',
    rating: 'IMDb 7.8 • $1.3B Global Box Office',
    hostDomain: 'yts.mx',
    downloadUrl: 'https://yts.mx/movies/deadpool-wolverine-2024',
    mirrors: [
      { name: 'YTS.mx 1080p & 4K Torrents (Client Risk)', url: 'https://yts.mx/movies/deadpool-wolverine-2024', speed: 'Ultra Fast', type: 'Torrent / Magnet' },
      { name: '1337x Marvel High-Speed Tracker (Client Risk)', url: 'https://1337x.to/sort-search/Deadpool%20Wolverine/time/desc/1/', speed: 'Ultra Fast', type: 'Torrent / Magnet' },
      { name: 'Internet Archive Public Media Search', url: 'https://archive.org/search.php?query=Deadpool+and+Wolverine', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 681000,
    isTrending: true,
    addedDate: '2026-10-15'
  },

  // ==========================================
  // NOVELS & E-BOOKS (Fiction, Thrillers, Self-Help, Manga)
  // ==========================================
  {
    id: 'nov-fourth-wing',
    type: 'novel',
    title: 'Fourth Wing (The Empyrean Book 1)',
    creator: 'Rebecca Yarros',
    description: 'Twenty-year-old Violet Sorrengail was meant to enter the Scribe Quadrant. Instead, she is commanded to join the perilous dragon riders at Basgiath War College.',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
    genre: 'Epic Fantasy / Romance / Dragons',
    releaseYear: '2024/2026',
    fileSize: '4.8 MB (EPUB) / 6.2 MB (PDF)',
    format: 'EPUB, PDF & MOBI (Kindle Ready)',
    quality: 'Official Publisher Typography',
    durationOrPages: '528 pages',
    rating: 'Goodreads 4.62 (1.2M Ratings)',
    hostDomain: 'oceanofpdf.com',
    downloadUrl: 'https://oceanofpdf.com/authors/rebecca-yarros/pdf-epub-fourth-wing-the-empyrean-1-download/',
    mirrors: [
      { name: 'OceanofPDF Direct EPUB/PDF (Client Risk)', url: 'https://oceanofpdf.com/authors/rebecca-yarros/pdf-epub-fourth-wing-the-empyrean-1-download/', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Open Library Digital Reader', url: 'https://openlibrary.org/search?q=Fourth+Wing+Rebecca+Yarros', speed: 'Standard', type: 'Public Archive' },
      { name: 'Internet Archive Community Ebook Vault', url: 'https://archive.org/search.php?query=Fourth+Wing+Rebecca+Yarros', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 164000,
    isTrending: true,
    addedDate: '2026-10-16',
    synopsisOrExcerpt: '"A dragon without its rider is a tragedy. A rider without their dragon is dead." Read the opening three chapters online or download complete file.'
  },
  {
    id: 'nov-atomic-habits',
    type: 'novel',
    title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
    creator: 'James Clear',
    description: 'The world’s #1 bestselling guide on how microscopic daily changes compound into remarkable personal and financial transformation.',
    thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
    genre: 'Self-Improvement / Psychology / Productivity',
    releaseYear: '2026 Edition',
    fileSize: '3.4 MB (EPUB) / 5.1 MB (PDF)',
    format: 'EPUB & PDF (Formatted for Mobile & Kindle)',
    quality: 'High-Resolution Vector Graphics & Charts',
    durationOrPages: '320 pages',
    rating: 'New York Times #1 Bestseller (15M+ copies)',
    hostDomain: 'oceanofpdf.com / archive.org',
    downloadUrl: 'https://oceanofpdf.com/authors/james-clear/pdf-epub-atomic-habits-an-easy-proven-way-to-build-good-habits-break-bad-ones-download/',
    mirrors: [
      { name: 'OceanofPDF Digital Edition (Client Risk)', url: 'https://oceanofpdf.com/authors/james-clear/pdf-epub-atomic-habits-an-easy-proven-way-to-build-good-habits-break-bad-ones-download/', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Internet Archive Public Book Reader', url: 'https://archive.org/details/atomic-habits-james-clear', speed: 'Ultra Fast', type: 'Public Archive' },
      { name: 'Open Library Digital Borrowing', url: 'https://openlibrary.org/search?q=Atomic+Habits+James+Clear', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 298000,
    isTrending: true,
    addedDate: '2026-10-15',
    synopsisOrExcerpt: '"You do not rise to the level of your goals. You fall to the level of your systems."'
  },
  {
    id: 'nov-things-fall-apart',
    type: 'novel',
    title: 'Things Fall Apart (Heritage Classics Edition)',
    creator: 'Chinua Achebe',
    description: 'The timeless African masterpiece chronicling Okonkwo, a proud warrior in Igbo society, during the dawn of British colonial rule in Nigeria.',
    thumbnail: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    genre: 'African Literature / Historical Classic',
    releaseYear: '2026 Heritage Edition',
    fileSize: '2.1 MB',
    format: 'PDF, EPUB & Audiobook Companion',
    quality: 'Verified Text & Critical Essay Notes',
    durationOrPages: '209 pages',
    rating: 'Time Magazine 100 Best All-Time Novels',
    hostDomain: 'archive.org',
    downloadUrl: 'https://archive.org/details/thingsfallapart00ache_2',
    mirrors: [
      { name: 'Internet Archive Free Public Library', url: 'https://archive.org/details/thingsfallapart00ache_2', speed: 'Ultra Fast', type: 'Public Archive' },
      { name: 'OceanofPDF Classic Books (Client Risk)', url: 'https://oceanofpdf.com/authors/chinua-achebe/pdf-things-fall-apart-download/', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Open Library Heritage Collection', url: 'https://openlibrary.org/books/OL24209673M/Things_Fall_Apart', speed: 'Standard', type: 'Public Archive' }
    ],
    downloadsCount: 195000,
    isTrending: true,
    addedDate: '2026-10-13'
  },
  {
    id: 'nov-one-piece-manga',
    type: 'novel',
    title: 'One Piece: The Egghead Island Arc (Manga Volumes 108-110)',
    creator: 'Eiichiro Oda',
    description: 'High-resolution colored and monochrome manga digital volumes covering the climactic revelations of Dr. Vegapunk, the Ancient Kingdom, and the Five Elders.',
    thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    genre: 'Manga / Shonen / Adventure',
    releaseYear: '2026',
    fileSize: '145 MB (CBZ / PDF Pack)',
    format: 'CBZ & PDF (Retina HD Panels)',
    quality: 'Full Page Ultra-Res Digital Scan',
    durationOrPages: '580 pages (3 Volumes Bundle)',
    rating: 'Guinness World Record Best-Selling Manga',
    hostDomain: 'readonepiece.com / archive.org',
    downloadUrl: 'https://archive.org/search.php?query=One+Piece+Manga+Egghead',
    mirrors: [
      { name: 'Internet Archive Digital Manga Archive', url: 'https://archive.org/search.php?query=One+Piece+Manga+Egghead', speed: 'Ultra Fast', type: 'Public Archive' },
      { name: 'ReadOnePiece Digital Reader (Client Risk)', url: 'https://ww10.readonepiece.com/', speed: 'Ultra Fast', type: 'External Host' },
      { name: 'Official Shueisha MangaPlus', url: 'https://mangaplus.shueisha.co.jp/titles/100020', speed: 'Standard', type: 'Streaming Host' }
    ],
    downloadsCount: 432000,
    isTrending: true,
    addedDate: '2026-10-16'
  }
];
