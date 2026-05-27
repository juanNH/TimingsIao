import type { StaticImageData } from "next/image";
import archimagoImage from "@/assets/bosses/archimago.png";
import djinImage from "@/assets/bosses/djin.png";
import garvelothImage from "@/assets/bosses/garveloth.png";
import gorgonaImage from "@/assets/bosses/gorgona.png";
import guardaImage from "@/assets/bosses/guarda.png";
import khernGhardImage from "@/assets/bosses/khern-ghard.png";
import bossData from "@/lib/boss-data.json";

export type Boss = {
  id: string;
  name: string;
  shortName: string;
  image: StaticImageData;
  respawnMinMinutes: number;
  respawnMaxMinutes: number;
  respawnLabel: string;
};

const imagesByBossId: Record<string, StaticImageData> = {
  archimago: archimagoImage,
  djin: djinImage,
  garveloth: garvelothImage,
  gorgona: gorgonaImage,
  guarda: guardaImage,
  "khern-ghard": khernGhardImage
};

export const BOSSES: Boss[] = bossData.map((boss) => ({
  ...boss,
  image: imagesByBossId[boss.id]
}));
