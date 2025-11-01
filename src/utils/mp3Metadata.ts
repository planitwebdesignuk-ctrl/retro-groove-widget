import jsmediatags from 'jsmediatags';

export interface Mp3Metadata {
  title: string;
  artist: string;
}

/**
 * Extract metadata from MP3 file using ID3 tags or filename fallback
 */
export async function extractMp3Metadata(file: File): Promise<Mp3Metadata> {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag) => {
        const tags = tag.tags;
        const title = tags.title || parseFilename(file.name).title;
        const artist = tags.artist || parseFilename(file.name).artist;
        
        resolve({
          title: title || file.name.replace('.mp3', ''),
          artist: artist || 'Unknown Artist'
        });
      },
      onError: () => {
        // Fallback to filename parsing if ID3 tags fail
        const parsed = parseFilename(file.name);
        resolve({
          title: parsed.title || file.name.replace('.mp3', ''),
          artist: parsed.artist || 'Unknown Artist'
        });
      }
    });
  });
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
