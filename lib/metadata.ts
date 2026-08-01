/**
 * Clean up common YouTube title junk like "(Official Video)", "[HD]", etc.
 */
function cleanString(str: string): string {
    return str
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\[Official.*?\]/gi, '')
        .replace(/\(Video.*?\)/gi, '')
        .replace(/\[Video.*?\]/gi, '')
        .replace(/\(Lyrics.*?\)/gi, '')
        .replace(/\[Lyrics.*?\]/gi, '')
        .replace(/\(Lyrical.*?\)/gi, '')
        .replace(/\[Lyrical.*?\]/gi, '')
        .replace(/\(HD\)/gi, '')
        .replace(/\[HD\]/gi, '')
        .replace(/\(4K\)/gi, '')
        .replace(/\[4K\]/gi, '')
        .replace(/\d{4}/g, '') // Remove years like 2024
        .trim();
}

/**
 * Smartly parse a video title into { title, artist }.
 * Handles formats like "Artist - Title", "Title | Artist", etc.
 */
export function parseVideoMetadata(rawTitle: string, rawArtist?: string): { title: string; artist: string } {
    // 1. Initial sanitization - treat empty/whitespace as null/undefined
    let titleToParse = (rawTitle || '').trim();
    let artistToParse = (rawArtist || '').trim();

    // 2. If title is truly empty, we can't do much, use fallback
    if (!titleToParse) titleToParse = 'Unknown Title';
    if (!artistToParse) artistToParse = 'Unknown Artist';

    // 3. Attempt to split the titleToParse (maybe it contains both)
    const separators = [' - ', ' | ', ' : ', ' ~ ', ' — '];
    let splitResult: string[] | null = null;

    for (const sep of separators) {
        if (titleToParse.includes(sep)) {
            splitResult = titleToParse.split(sep);
            break;
        }
    }

    if (!splitResult && titleToParse.includes('-')) {
        splitResult = titleToParse.split('-');
    }

    // 4. Handle results based on splits
    if (splitResult && splitResult.length >= 2) {
        const part0 = cleanString(splitResult[0]);
        const part1 = cleanString(splitResult[1]);
        
        // If part0 is already our artist, part1 is definitely the title
        if (part0.toLowerCase() === artistToParse.toLowerCase()) {
            return { title: part1, artist: part0 };
        }

        // Standard case: take first part as title for "Song Name Only" experience
        // BUT if part0 is empty (fully cleaned) or represents the Artist, take part1
        const titleCandidate = part0 || part1 || 'Unknown Title';
        const artistCandidate = part1 || artistToParse || 'Unknown Artist';

        return { 
            title: titleCandidate,
            artist: artistCandidate
        };
    }

    // 5. If we have a valid artist from OEmbed but no title separators
    const isArtistValid = artistToParse && 
                          !['Unknown Artist', 'Unknown', 'System', 'Admin'].includes(artistToParse);

    if (isArtistValid && titleToParse !== 'Unknown Title') {
        return { 
            title: cleanString(titleToParse), 
            artist: cleanString(artistToParse) 
        };
    }

    // 6. Final fallback
    const finalTitle = cleanString(titleToParse) || titleToParse || 'Unknown Title';
    const finalArtist = cleanString(artistToParse) || artistToParse || 'Unknown Artist';

    return {
        title: finalTitle,
        artist: finalArtist
    };
}
