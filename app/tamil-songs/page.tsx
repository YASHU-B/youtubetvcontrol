import type { Metadata } from "next";
import Link from "next/link";
import { PLAYLIST } from "@/data/playlist";
import { getBreadcrumbSchema, getMusicPlaylistSchema, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tamil Songs 2026 - Top Tamil Hit Video Songs, Playlists & Kuthu Beats",
  description: "Listen to top Tamil songs online! Stream viral Tamil video songs from Beast (Arabic Kuthu), Varisu (Ranjithame), Maari 2 (Rowdy Baby), Master (Vaathi Coming), Jailer (Kaavaalaa), and Enemy (Tum Tum).",
  keywords: [
    "Tamil songs", "Tamil hit songs 2026", "Tamil video songs", "Top Tamil movie music",
    "Arabic Kuthu Tamil song", "Ranjithame Vijay song", "Rowdy Baby Dhanush Sai Pallavi",
    "Vaathi Coming Anirudh", "Kaavaalaa Tamannaah Jailer", "Tum Tum song Tamil",
    "Anirudh Ravichander Tamil hits", "Yuvan Shankar Raja songs", "Tamil mass kuthu songs"
  ],
  alternates: {
    canonical: `${SITE_URL}/tamil-songs`,
  },
  openGraph: {
    title: "Tamil Songs 2026 - Top Tamil Hit Video Songs & Playlists",
    description: "Stream non-stop Tamil video songs, Kollywood film music, and kuthu beats 24/7 on YashuBeatz TV.",
    url: `${SITE_URL}/tamil-songs`,
    type: "website"
  }
};

export default function TamilSongsPage() {
  const tamilSongs = PLAYLIST.filter((song) => song.language === "Tamil");

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Tamil Songs", url: "/tamil-songs" }
  ]);

  const playlistSchema = getMusicPlaylistSchema(tamilSongs);

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
        <span className="text-white font-medium">Tamil Songs</span>
      </nav>

      <header className="mb-10 border-b border-neutral-800 pb-6">
        <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-amber-500 mb-4">
          Tamil Songs 2026 - Top Hit Video Songs & Kollywood Music
        </h1>
        <p className="text-neutral-300 text-base md:text-lg max-w-4xl leading-relaxed">
          Discover and listen to top <strong>Tamil songs online</strong>. Experience high-energy <strong>Tamil video songs</strong>, viral kuthu beats, and blockbuster Kollywood tracks featuring superstars Thalapathy Vijay, Rajinikanth, Dhanush, and music directors Anirudh Ravichander, Yuvan Shankar Raja, and Thaman S.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-red-500 flex items-center gap-2">
          <span>⚡</span> Trending Tamil Video Songs Playlist
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tamilSongs.map((song) => (
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
          Non-Stop Tamil Video Music Stream
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed mb-4">
          Whether you are looking for Anirudh Ravichander's viral sensations like <em>Arabic Kuthu</em> and <em>Vaathi Coming</em>, Dhanush & Sai Pallavi's iconic <em>Rowdy Baby</em>, or Rajinikanth's blockbuster hit <em>Kaavaalaa</em>, YashuBeatz TV brings you a non-stop 24/7 live visual television experience directly in your browser.
        </p>
        <div className="inline-block">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-all"
          >
            ▶ Launch 24/7 Tamil Live Player
          </Link>
        </div>
      </section>
    </main>
  );
}
