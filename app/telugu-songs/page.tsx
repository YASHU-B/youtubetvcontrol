import type { Metadata } from "next";
import Link from "next/link";
import { PLAYLIST } from "@/data/playlist";
import { getBreadcrumbSchema, getMusicPlaylistSchema, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Telugu Songs 2026 - Top Telugu Video Songs, Hit Playlists & DJ Music",
  description: "Explore and stream top Telugu songs online! Watch hit Telugu video songs from Pushpa (Oo Antava), Ala Vaikunthapurramuloo (Butta Bomma, Ramuloo Ramulaa), RRR (Naatu Naatu), Devara (Chuttamalle), and more in HD.",
  keywords: [
    "Telugu songs", "Telugu video songs", "Telugu hit songs 2026", "Top Telugu movie songs",
    "Oo Antava Telugu song", "Butta Bomma Allu Arjun", "Naatu Naatu RRR", "Chuttamalle Devara",
    "Devi Sri Prasad Telugu hits", "Thaman S Telugu songs", "Telugu DJ songs download", "Telugu romantic video songs"
  ],
  alternates: {
    canonical: `${SITE_URL}/telugu-songs`,
  },
  openGraph: {
    title: "Telugu Songs 2026 - Top Telugu Video Songs & Hit Playlists",
    description: "Stream non-stop Telugu video songs, movie soundtracks, and DJ hits 24/7 on YashuBeatz TV.",
    url: `${SITE_URL}/telugu-songs`,
    type: "website"
  }
};

export default function TeluguSongsPage() {
  const teluguSongs = PLAYLIST.filter((song) => song.language === "Telugu");

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Telugu Songs", url: "/telugu-songs" }
  ]);

  const playlistSchema = getMusicPlaylistSchema(teluguSongs);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-8 md:px-12 max-w-7xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(playlistSchema) }}
      />

      <nav className="text-sm text-neutral-400 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-red-400">Home</Link>
        <span>/</span>
        <span className="text-white font-medium">Telugu Songs</span>
      </nav>

      <header className="mb-10 border-b border-neutral-800 pb-6">
        <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-orange-500 mb-4">
          Telugu Songs 2026 - Top Video Songs & Hit Music
        </h1>
        <p className="text-neutral-300 text-base md:text-lg max-w-4xl leading-relaxed">
          Welcome to the ultimate hub for <strong>Telugu songs online</strong>. Stream trending <strong>Telugu video songs</strong>, blockbuster film soundtracks, soulful melodies, and energetic dance numbers from top stars like Allu Arjun, Ram Charan, Jr NTR, Mahesh Babu, Prabhas, and directors like Devi Sri Prasad, Thaman S, and M.M. Keeravaani.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-red-500 flex items-center gap-2">
          <span>🔥</span> Popular Telugu Video Songs Playlist
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teluguSongs.map((song) => (
            <article 
              key={song.id}
              className="bg-neutral-900 border border-neutral-800 hover:border-red-600 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-red-950/30 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold text-red-400 bg-red-950/60 border border-red-800/40 px-2 py-0.5 rounded inline-block mb-3">
                  {song.movie} ({song.year})
                </span>
                <h3 className="text-xl font-bold text-white hover:text-red-400 mb-2">
                  <Link href={`/songs/${song.slug}`}>
                    {song.title}
                  </Link>
                </h3>
                <p className="text-sm text-neutral-400 mb-2">
                  <strong>Singers:</strong> {song.singers}
                </p>
                <p className="text-sm text-neutral-400 mb-3">
                  <strong>Music:</strong> {song.musicDirector}
                </p>
                <p className="text-xs text-neutral-500 italic bg-neutral-950/70 p-2.5 rounded border border-neutral-800/60 mb-4 line-clamp-2">
                  "{song.lyricsSnippet}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                <Link
                  href={`/songs/${song.slug}`}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Song Details & Lyrics →
                </Link>
                <Link
                  href="/"
                  className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Listen Live 24/7
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
          Why YashuBeatz TV for Telugu Music Streaming?
        </h2>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-neutral-300">
          <div>
            <h3 className="font-bold text-red-400 text-base mb-1">24/7 Continuous TV Broadcast</h3>
            <p>Enjoy uninterrupted, synchronized Telugu video songs broadcast round-the-clock without needing to manually queue tracks.</p>
          </div>
          <div>
            <h3 className="font-bold text-amber-400 text-base mb-1">HD Video & High Quality Audio</h3>
            <p>Crystal clear 4K & 1080p video player integration with official YouTube stream sync for rich sound performance.</p>
          </div>
          <div>
            <h3 className="font-bold text-orange-400 text-base mb-1">Top Chartbuster Playlists</h3>
            <p>Curated Telugu hits from Pushpa, Ala Vaikunthapurramuloo, RRR, Devara, and timeless classics updated continuously.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
