import Link from "next/link";
import { PLAYLIST } from "@/data/playlist";

export default function SEOFooter() {
  const teluguSongs = PLAYLIST.filter(s => s.language === "Telugu");
  const tamilSongs = PLAYLIST.filter(s => s.language === "Tamil");

  return (
    <footer className="w-full bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-800 py-8 px-4 sm:px-8 mt-auto z-40 relative">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <h2 className="text-sm font-bold text-white mb-2">YashuBeatz TV</h2>
          <p className="text-neutral-400 mb-3 leading-relaxed">
            Your #1 destination for 24/7 continuous Telugu songs, Tamil video music, hit movie tracks, and live music streaming.
          </p>
          <div className="flex gap-3">
            <Link href="/" className="hover:text-red-500 font-semibold transition-colors">24/7 Live Player</Link>
            <span>•</span>
            <Link href="/telugu-songs" className="hover:text-red-500 font-semibold transition-colors">Telugu Songs</Link>
            <span>•</span>
            <Link href="/tamil-songs" className="hover:text-red-500 font-semibold transition-colors">Tamil Songs</Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-2">Telugu Songs & Hits</h3>
          <ul className="space-y-1">
            {teluguSongs.slice(0, 6).map((song) => (
              <li key={song.id}>
                <Link 
                  href={`/songs/${song.slug}`}
                  className="hover:text-red-400 transition-colors block truncate"
                  title={`${song.title} - ${song.movie}`}
                >
                  {song.title} ({song.movie})
                </Link>
              </li>
            ))}
            <li>
              <Link href="/telugu-songs" className="text-red-500 hover:underline font-medium block mt-1">
                View All Telugu Songs →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-2">Tamil Songs & Hits</h3>
          <ul className="space-y-1">
            {tamilSongs.slice(0, 6).map((song) => (
              <li key={song.id}>
                <Link 
                  href={`/songs/${song.slug}`}
                  className="hover:text-red-400 transition-colors block truncate"
                  title={`${song.title} - ${song.movie}`}
                >
                  {song.title} ({song.movie})
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tamil-songs" className="text-red-500 hover:underline font-medium block mt-1">
                View All Tamil Songs →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-2">Popular Music Searches</h3>
          <p className="text-neutral-500 text-[11px] leading-normal">
            Telugu Songs 2026, Tamil Video Songs, Pushpa Songs, Oo Antava, Butta Bomma, Arabic Kuthu, Rowdy Baby, Ranjithame, Naatu Naatu, Devara Chuttamalle, Anirudh Tamil Hits, Devi Sri Prasad Telugu Songs, Thaman S Hit Playlists, Free South Music Streaming.
          </p>
          <div className="mt-4 text-[11px] text-neutral-500">
            © {new Date().getFullYear()} YashuBeatz TV. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
