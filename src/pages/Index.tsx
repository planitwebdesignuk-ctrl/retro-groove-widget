import VinylPlayer from "@/components/VinylPlayer";
import { playlist } from "@/data/playlist";

const Index = () => {
  return <VinylPlayer tracks={playlist} />;
};

export default Index;
