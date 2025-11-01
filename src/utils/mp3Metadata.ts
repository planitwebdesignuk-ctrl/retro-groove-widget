import { parseBlob } from 'music-metadata-browser';

export interface Mp3Metadata {
  title: string;
  artist: string;
}

/**
 * Extract metadata from MP3 file using ID3 tags or filename fallback
 */
export async function extractMp3Metadata(file: File): Promise<Mp3Metadata> {
  try {
    const metadata = await parseBlob(file);
    const title = metadata.common.title || parseFilename(file.name).title;
    const artist = metadata.common.artist || parseFilename(file.name).artist;
    
    return {
      title: title || file.name.replace('.mp3', ''),
      artist: artist || 'Unknown Artist'
    };
  } catch (error) {
    // Fallback to filename parsing if metadata extraction fails
    const parsed = parseFilename(file.name);
    return {
      title: parsed.title || file.name.replace('.mp3', ''),
      artist: parsed.artist || 'Unknown Artist'
    };
  }
}

/**
 * Parse filename for metadata (e.g., "Artist - Title.mp3")
 */
function parseFilename(filename: string): { title: string; artist: string } {
  const nameWithoutExt = filename.replace(/\.mp3$/i, '');
  
  // Try to parse "Artist - Title" format
  if (nameWithoutExt.includes(' - ')) {
    const parts = nameWithoutExt.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim()
      };
    }
  }
  
  // Fallback: use filename as title
  return {
    title: nameWithoutExt,
    artist: ''
  };
}
