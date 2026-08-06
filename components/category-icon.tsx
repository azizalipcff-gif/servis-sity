import {
  Briefcase,
  Camera,
  Coffee,
  Droplets,
  GraduationCap,
  Hammer,
  Paintbrush,
  Scissors,
  Sparkles,
  Stethoscope,
  Store,
  Utensils,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  droplets: Droplets,
  paintbrush: Paintbrush,
  utensils: Utensils,
  hammer: Hammer,
  wrench: Wrench,
  stethoscope: Stethoscope,
  scissors: Scissors,
  "graduation-cap": GraduationCap,
  sparkles: Sparkles,
  coffee: Coffee,
  camera: Camera,
  briefcase: Briefcase,
  store: Store,
};

export function getCategoryIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Store;
  return ICON_MAP[iconName] ?? Store;
}
