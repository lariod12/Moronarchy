import {
  Biohazard,
  Clover,
  CloudLightning,
  Coins,
  Crosshair,
  DoorOpen,
  Dices,
  Drumstick,
  Gem,
  HandCoins,
  HandHelping,
  Hammer,
  Handshake,
  Megaphone,
  Shield,
  ShieldHalf,
  Sparkles,
  Sprout,
  Store,
  Sword,
  Swords,
  TrendingUp,
  Wheat,
  Droplets
} from "lucide-react";
import type { ReactNode } from "react";
import type { GlobalEventId, ItemId, PersonalEventId, ResidentKind } from "@moronarchy/core/engine";
import { FarmerMaskIcon, HorseIcon, SickleIcon, WarriorMaskIcon } from "../ui/icons";

// One icon per item / event / resident kind, so every screen draws the same picture for the same thing.
export const itemIcon = (itemId: ItemId, size = 56): ReactNode => {
  switch (itemId) {
    case "horse":
      return <HorseIcon width={size} height={size} />;
    case "luckyDie":
      return <Dices size={size} />;
    case "meat":
      return <Drumstick size={size} />;
    case "warHorn":
      return <Megaphone size={size} />;
    case "woodShield":
      return <Shield size={size} />;
    case "sickle":
      return <SickleIcon width={size} height={size} />;
    case "hammer":
      return <Hammer size={size} />;
    case "ironSword":
      return <Sword size={size} />;
    case "ironArmor":
      return <ShieldHalf size={size} />;
    case "cloverCharm":
      return <Clover size={size} />;
  }
};

export const eventIcon = (eventId: GlobalEventId | PersonalEventId, size = 28): ReactNode => {
  switch (eventId) {
    case "harvestFestival":
      return <Wheat size={size} />;
    case "plague":
      return <Biohazard size={size} />;
    case "royalTax":
      return <Coins size={size} />;
    case "peaceTreaty":
      return <Handshake size={size} />;
    case "warFever":
      return <Swords size={size} />;
    case "marketBoom":
      return <TrendingUp size={size} />;
    case "bountifulYear":
      return <Sprout size={size} />;
    case "treasureChest":
      return <Gem size={size} />;
    case "wanderingMerchant":
      return <Store size={size} />;
    case "healingSpring":
      return <Droplets size={size} />;
    case "volunteer":
      return <HandHelping size={size} />;
    case "blessing":
      return <Sparkles size={size} />;
    case "pickpocket":
      return <HandCoins size={size} />;
    case "ambush":
      return <Crosshair size={size} />;
    case "storm":
      return <CloudLightning size={size} />;
    case "desertion":
      return <DoorOpen size={size} />;
  }
};

export const residentIcon = (kind: ResidentKind, size = 56): ReactNode =>
  kind === "warrior" ? <WarriorMaskIcon width={size} height={size} /> : <FarmerMaskIcon width={size} height={size} />;
