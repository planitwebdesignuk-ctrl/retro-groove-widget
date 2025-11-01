import VinylPlayer from "@/components/VinylPlayer";
import { playlist } from "@/data/playlist";

const Index = () => {
  return <VinylPlayer tracks={playlist} labelImageUrl="/images/label-cobnet-strange.png" />;
};

export default Index;
