/**
 * Visual identity for each enterprise type — icon + tint colour for cards,
 * lists, dashboards. Falls back to a sensible default if a type is missing.
 *
 * Type IDs match `enterprise_types` (see migration 010 + 150).
 */
import {
  Sprout,
  Leaf,
  Fish,
  Egg,
  Bird,
  Beef,
  Milk,
  Wheat,
  Cookie,
  Cherry,
  GlassWater,
  Hexagon,
  Drumstick,
  Carrot,
  PiggyBank,
  Rabbit,
  Factory,
  type LucideIcon,
} from 'lucide-react';

export type EnterpriseCategory = 'crops' | 'livestock' | 'aquaculture' | 'processing';

export interface EnterpriseVisual {
  icon: LucideIcon;
  /** Tailwind class for the icon tile background tint (10% opacity feel). */
  tileBg: string;
  /** Tailwind class for the icon colour. */
  iconColor: string;
}

const BY_NAME: Record<string, LucideIcon> = {
  'Vegetable Production': Carrot,
  'Hydroponics': Leaf,
  'Seedling Production': Sprout,
  'Broiler Production': Drumstick,
  'Egg Production': Egg,
  'Hatchery': Bird,
  'Duck Production': Bird,
  'Piggery': PiggyBank,
  'Dairy Production': Milk,
  'Ram Breeding': Beef,
  'Ram & Buck Breeding': Beef,
  'Livestock Production': Beef,
  'Fish Production': Fish,
  'Meat Processing': Factory,
  'Fruit Drying': Cherry,
  'Fruit & Vegetable Processing': Carrot,
  'Milling': Wheat,
  'Bee Keeping': Hexagon,
  'Rabbit Production': Rabbit,
  'Meat Drying': Cookie,
  'Fruit Juice Making': GlassWater,
};

/** Tile colour by category — keeps the lists scannable. */
const CATEGORY_TINT: Record<EnterpriseCategory, { tileBg: string; iconColor: string }> = {
  crops:       { tileBg: 'bg-success/15',     iconColor: 'text-success' },
  livestock:   { tileBg: 'bg-warning/15',     iconColor: 'text-warning' },
  aquaculture: { tileBg: 'bg-info/15',        iconColor: 'text-info' },
  processing:  { tileBg: 'bg-secondary/25',   iconColor: 'text-foreground' },
};

export function getEnterpriseVisual(
  name: string | null | undefined,
  category: EnterpriseCategory | string | null | undefined,
): EnterpriseVisual {
  const icon = (name && BY_NAME[name]) || Sprout;
  const tint =
    category && category in CATEGORY_TINT
      ? CATEGORY_TINT[category as EnterpriseCategory]
      : { tileBg: 'bg-muted', iconColor: 'text-muted-foreground' };
  return { icon, ...tint };
}
