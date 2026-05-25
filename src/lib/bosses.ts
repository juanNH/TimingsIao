import type { StaticImageData } from "next/image";
import abyssariaImage from "@/assets/bosses/abyssaria.png";
import archimagoImage from "@/assets/bosses/archimago.png";
import djinImage from "@/assets/bosses/djin.png";
import garvelothImage from "@/assets/bosses/garveloth.png";
import gorgonaImage from "@/assets/bosses/gorgona.png";
import guardaImage from "@/assets/bosses/guarda.png";
import khernGhardImage from "@/assets/bosses/khern-ghard.png";
import vampiroImage from "@/assets/bosses/vampiro.png";

export type Boss = {
  id: string;
  name: string;
  shortName: string;
  image: StaticImageData;
  respawnMinMinutes: number;
  respawnMaxMinutes: number;
  respawnLabel: string;
};

function hours(hoursValue: number) {
  return hoursValue * 60;
}

export const BOSSES: Boss[] = [
  {
    id: "garveloth",
    name: "Garveloth",
    shortName: "GA",
    image: garvelothImage,
    respawnMinMinutes: 30,
    respawnMaxMinutes: 45,
    respawnLabel: "Respawn: 30 - 45 m"
  },
  {
    id: "archimago",
    name: "Archimago",
    shortName: "AR",
    image: archimagoImage,
    respawnMinMinutes: hours(6),
    respawnMaxMinutes: hours(9),
    respawnLabel: "Respawn: 6 h - 9 h"
  },
  {
    id: "djin",
    name: "Djin",
    shortName: "DJ",
    image: djinImage,
    respawnMinMinutes: hours(4),
    respawnMaxMinutes: hours(6) + 30,
    respawnLabel: "Respawn: 4 h - 6 h 30 m"
  },
  {
    id: "guarda",
    name: "Guarda",
    shortName: "GU",
    image: guardaImage,
    respawnMinMinutes: hours(3) + 30,
    respawnMaxMinutes: hours(5) + 30,
    respawnLabel: "Respawn: 3 h 30 m - 5 h 30 m"
  },
  {
    id: "gorgona",
    name: "Gorgona",
    shortName: "GO",
    image: gorgonaImage,
    respawnMinMinutes: 45,
    respawnMaxMinutes: hours(1) + 40,
    respawnLabel: "Respawn: 45 m - 1 h 40 m"
  },
  {
    id: "khern-ghard",
    name: "Khern Ghard",
    shortName: "KG",
    image: khernGhardImage,
    respawnMinMinutes: hours(5),
    respawnMaxMinutes: hours(8),
    respawnLabel: "Respawn: 5 h - 8 h"
  },
  {
    id: "vampiro",
    name: "Vampiro",
    shortName: "VA",
    image: vampiroImage,
    respawnMinMinutes: hours(1),
    respawnMaxMinutes: hours(4),
    respawnLabel: "Respawn: 1 h - 4 h"
  },
  {
    id: "abyssaria",
    name: "Abyssaria",
    shortName: "AB",
    image: abyssariaImage,
    respawnMinMinutes: hours(3) + 30,
    respawnMaxMinutes: hours(5) + 30,
    respawnLabel: "Respawn: 3 h 30 m - 5 h 30 m"
  }
];
