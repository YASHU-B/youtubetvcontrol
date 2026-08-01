import { VideoItem } from "@/data/playlist";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yashubeatztv.web.app";
export const SITE_NAME = "YashuBeatz TV";

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": SITE_URL,
    "description": "24/7 Live streaming continuous Telugu songs, Tamil songs, HD music videos, hit lyrics and non-stop music TV.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/songs?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    },
    "inLanguage": ["en", "te", "ta"]
  };
}

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": `${SITE_URL}/icons/icon-512.png`,
    "sameAs": [
      "https://youtube.com",
      "https://facebook.com"
    ]
  };
}

export function getMusicPlaylistSchema(songs: VideoItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    "name": "Trending Telugu & Tamil Music Video Hits",
    "numTracks": songs.length,
    "description": "24/7 continuous playlist of top Telugu video songs, Tamil hit music, and viral South Indian soundtrack videos.",
    "track": songs.map((song, index) => ({
      "@type": "MusicRecording",
      "position": index + 1,
      "name": song.title,
      "byArtist": {
        "@type": "MusicGroup",
        "name": song.artist
      },
      "inAlbum": {
        "@type": "MusicAlbum",
        "name": song.movie || "Single"
      },
      "url": `${SITE_URL}/songs/${song.slug || song.id}`,
      "duration": `PT${Math.floor(song.duration / 60)}M${song.duration % 60}S`
    }))
  };
}

export function getMusicRecordingSchema(song: VideoItem) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": song.title,
    "byArtist": {
      "@type": "MusicGroup",
      "name": song.singers || song.artist
    },
    "inAlbum": {
      "@type": "MusicAlbum",
      "name": song.movie || "Single"
    },
    "duration": `PT${Math.floor(song.duration / 60)}M${song.duration % 60}S`,
    "inLanguage": song.language === "Telugu" ? "te" : "ta",
    "genre": [`${song.language || 'South Indian'} Songs`, "South Indian Music", "Film Soundtrack"],
    "datePublished": `${song.year || 2024}-01-01`,
    "url": `${SITE_URL}/songs/${song.slug || song.id}`,
    "description": song.description || `${song.title} - ${song.artist}`
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${SITE_URL}${item.url}`
    }))
  };
}
