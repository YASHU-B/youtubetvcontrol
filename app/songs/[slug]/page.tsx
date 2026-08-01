import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLAYLIST, VideoItem } from "@/data/playlist";
import { getBreadcrumbSchema, getMusicRecordingSchema, SITE_URL } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PLAYLIST.map((song) => ({
    slug: song.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const song = PLAYLIST.find((s) => s.slug === slug);

  if (!song) {
    return {
      title: "Song Not Found - YashuBeatz TV",
    };
  }

  const title = `${song.title} - ${song.movie} (${song.language} Song) | YashuBeatz TV`;
  const description = `${song.description} Listen to ${song.title} sung by ${song.singers}, music by ${song.musicDirector}. Stream on YashuBeatz TV 24/7.`;

  return {
    title,
    description,
    keywords: song.keywords,
    alternates: {
      canonical: `${SITE_URL}/songs/${song.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/songs/${song.slug}`,
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    }
  };
}

export default async function SongDetailPage({ params }: Props) {
  const { slug } = await params;
  const song = PLAYLIST.find((s) => s.slug === slug);

  if (!song) {
    notFound();
  }

  const categoryUrl = song.language === "Telugu" ? "/telugu-songs" : "/tamil-songs";

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: `${song.language} Songs`, url: categoryUrl },
    { name: song.title, url: `/songs/${song.slug}` }
  ]);

  const musicRecordingSchema = getMusicRecordingSchema(song);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-8 md:px-12 max-w-5xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicRecordingSchema) }}
      />

      <nav className="text-sm text-neutral-400 mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-red-400">Home</Link>
        <span>/</span>
        <Link href={categoryUrl} className="hover:text-red-400">{song.language} Songs</Link>
        <span>/</span>
        <span className="text-white font-medium truncate">{song.title}</span>
      </nav>

      <article className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-10 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/70 border border-red-800/50 px-3 py-1 rounded-full">
            {song.language} Video Song • {song.year}
          </span>
          <span className="text-xs text-neutral-400">
            Movie / Album: <strong className="text-white">{song.movie}</strong>
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          {song.title}
        </h1>

        <div className="aspect-video w-full rounded-xl overflow-hidden mb-8 border border-neutral-800 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${song.id}?autoplay=0&rel=0`}
            title={`${song.title} - ${song.movie} Official Video`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8 text-sm">
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/70">
            <h2 className="text-xs uppercase font-bold text-red-500 mb-2">Song Info</h2>
            <ul className="space-y-2 text-neutral-300">
              <li><strong className="text-neutral-400">Track Title:</strong> {song.title}</li>
              <li><strong className="text-neutral-400">Movie/Album:</strong> {song.movie} ({song.year})</li>
              <li><strong className="text-neutral-400">Singers:</strong> {song.singers}</li>
              <li><strong className="text-neutral-400">Music Director:</strong> {song.musicDirector}</li>
              <li><strong className="text-neutral-400">Language:</strong> {song.language}</li>
            </ul>
          </div>

          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/70">
            <h2 className="text-xs uppercase font-bold text-amber-500 mb-2">Featured Lyrics Line</h2>
            <blockquote className="text-neutral-200 italic leading-relaxed font-serif text-base border-l-2 border-amber-500 pl-3">
              "{song.lyricsSnippet}"
            </blockquote>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6">
          <h2 className="text-lg font-bold text-white mb-2">About {song.title} ({song.movie})</h2>
          <p className="text-neutral-300 text-sm leading-relaxed mb-6">
            {song.description}
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link
              href="/"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>▶</span> Stream 24/7 Live Music TV
            </Link>
            <Link
              href={categoryUrl}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm px-5 py-3 rounded-xl transition-all"
            >
              More {song.language} Songs →
            </Link>
          </div>
        </div>
      </article>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-neutral-200">Recommended {song.language} Songs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {PLAYLIST.filter((s) => s.language === song.language && s.slug !== song.slug)
            .slice(0, 3)
            .map((rec) => (
              <Link
                key={rec.id}
                href={`/songs/${rec.slug}`}
                className="bg-neutral-900 border border-neutral-800 hover:border-red-600 p-4 rounded-xl block transition-all"
              >
                <span className="text-[11px] text-neutral-400 block mb-1">{rec.movie}</span>
                <h3 className="font-bold text-sm text-white truncate">{rec.title}</h3>
                <p className="text-xs text-neutral-400 truncate">{rec.singers}</p>
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
