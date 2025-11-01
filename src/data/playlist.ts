// This file structure is designed to be easily replaced with database queries
// In the future, this data can come from Supabase or any other database

export interface Track {
  id: number;
  title: string;
  artist: string;
  audioUrl: string;
  duration: number; // Duration in seconds
}

export const playlist: Track[] = [
  {
    id: 1,
    title: "You Could Be My Angel",
    artist: "Live Performance",
    audioUrl: "/audio/You_Could_Be_My_Angel_Live.mp3",
    duration: 240, // 4:00
  },
  {
    id: 2,
    title: "Soul Survivor",
    artist: "Original Recording",
    audioUrl: "/audio/Soul_Survivor.mp3",
    duration: 210, // 3:30
  },
  {
    id: 3,
    title: "Piece of What it Takes",
    artist: "Studio Version",
    audioUrl: "/audio/Piece_of_What_it_Takes.mp3",
    duration: 195, // 3:15
  },
  {
    id: 4,
    title: "Mama Said",
    artist: "Live Performance",
    audioUrl: "/audio/Mama_Said_Live.mp3",
    duration: 225, // 3:45
  },
  {
    id: 5,
    title: "Gotta Roll",
    artist: "Live Performance",
    audioUrl: "/audio/Gotta_Roll_Live.mp3",
    duration: 180, // 3:00
  },
  {
    id: 6,
    title: "Don't Mind",
    artist: "Original Recording",
    audioUrl: "/audio/Don_t_Mind.mp3",
    duration: 205, // 3:25
  },
  {
    id: 7,
    title: "Come With Me",
    artist: "Studio Version",
    audioUrl: "/audio/Come_With_Me.mp3",
    duration: 215, // 3:35
  },
];

// Future database integration example:
// export async function fetchPlaylist() {
//   const { data, error } = await supabase
//     .from('tracks')
//     .select('*')
//     .order('id');
//   
//   if (error) throw error;
//   return data;
// }
