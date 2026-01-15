import React from 'react';
import { ShoppingCart, Coffee, Home, Car, Gift, CreditCard, Book, Heart, Film, Truck, User, Calendar, Package, Wallet } from 'lucide-react';

// Lucide components we still use when there's no emoji mapping
const ICONS: Record<string, React.ComponentType<any>> = {
  ShoppingCart,
  Coffee,
  Home,
  Car,
  Gift,
  CreditCard,
  Book,
  Heart,
  Film,
  Truck,
  User,
  Calendar,
  Package,
  Wallet,
};

// Emoji mapping for more colorful icons and site-specific choices
const EMOJI_MAP: Record<string, { emoji: string; label?: string }> = {
  Target: { emoji: '🎯', label: 'Objectif' },
  Car: { emoji: '🚗', label: 'Voiture' },
  Taxi: { emoji: '🚕', label: 'Taxi' },
  SUV: { emoji: '🚙', label: 'SUV' },
  Bus: { emoji: '🚌', label: 'Bus' },
  Plane: { emoji: '✈️', label: 'Avion' },
  Train: { emoji: '🚆', label: 'Train' },
  MoneyBag: { emoji: '💰', label: 'Argent' },
  MoneyWings: { emoji: '💸', label: 'Argent (sortie)' },
  Bride: { emoji: '👰‍♀️', label: 'Mariée' },
  Girl: { emoji: '👧', label: 'Fille' },
  ManRedHair: { emoji: '👨‍🦰', label: 'Homme' },
  CableCar: { emoji: '🚡', label: 'Télécabine' },
  Hospital: { emoji: '🏥', label: 'Hôpital' },
  Gamepad: { emoji: '🎮', label: 'Jeux' },
  Shopping: { emoji: '🛍️', label: 'Shopping' },
  Books: { emoji: '📚', label: 'Livres' },
  Clothes: { emoji: '👔', label: 'Vêtements' },
  ShoppingCart: { emoji: '🛒', label: 'Course' },
  Wallet: { emoji: '👛', label: 'Porte-monnaie' },
  Gift: { emoji: '🎁', label: 'Cadeau' },
  Coffee: { emoji: '☕', label: 'Boisson' },
  Book: { emoji: '📖', label: 'Livre' },
  // New emojis requested
  LowBattery: { emoji: '🪫', label: 'Batterie faible' },
  Lightning: { emoji: '⚡', label: 'Électricité' },
  Plug: { emoji: '🔌', label: 'Prise électrique' },
  WomanWithHeadscarf: { emoji: '🧕', label: 'Femme (voilée)' },
  Dining: { emoji: '🍽️', label: 'Repas' },
  Pasta: { emoji: '🍝', label: 'Pâtes' },
  HaircutMan: { emoji: '💇‍♂️', label: 'Coiffure (homme)' },
  Package: { emoji: '📦', label: 'Colis' },
  Construction: { emoji: '🏗️', label: 'Chantier' },
  Factory: { emoji: '🏭', label: 'Usine' },
  CalendarAlt: { emoji: '📆', label: 'Calendrier' },
  Bank: { emoji: '🏦', label: 'Banque' },
  DoctorWoman: { emoji: '👩‍⚕️', label: 'Docteur (femme)' },
  Medical: { emoji: '⚕️', label: 'Symbole médical' },
  Pill: { emoji: '💊', label: 'Médicament' },
  Stethoscope: { emoji: '🩺', label: 'Stéthoscope' },
  HealthWorker: { emoji: '🧑‍⚕️', label: 'Professionnel santé' },
  Tooth: { emoji: '🦷', label: 'Dent' },
  Droplet: { emoji: '💧', label: 'Goutte' },
  Tools: { emoji: '🛠️', label: 'Outils' },
  Graduation: { emoji: '🎓', label: 'Diplôme' },
  // House / pin / phone / laptop requested by user
  Home: { emoji: '🏠', label: 'Maison' },
  Pin: { emoji: '📌', label: 'Épinglé' },
  Phone: { emoji: '📱', label: 'Téléphone' },
  Laptop: { emoji: '💻', label: 'Ordinateur portable' },
};

interface Props {
  name?: string | null;
  fallback?: React.ReactNode;
  size?: number;
  className?: string;
}

export default function IconFromName({ name, fallback = null, size = 16, className = '' }: Props) {
  if (!name) return <span className={className}>{fallback}</span>;

  // Prefer emoji mapping when available so icons are colorful and match the examples
  const emojiEntry = EMOJI_MAP[name];
  if (emojiEntry) {
    // Use a span so emojis scale with font-size; ensure vertical centering via lineHeight
    const style: React.CSSProperties = { fontSize: size, lineHeight: 1 };
    return <span className={className} style={style} aria-label={emojiEntry.label}>{emojiEntry.emoji}</span>;
  }

  const Comp = ICONS[name];
  if (!Comp) return <span className={className}>{fallback}</span>;
  // Lucide icons respect currentColor so they inherit the parent color
  return <Comp size={size} className={className} />;
}

// Normalize an incoming icon string: if the caller passed an emoji, map it back to the canonical key
export function normalizeIconName(icon?: string | null): string | undefined {
  if (!icon) return undefined;
  const trimmed = icon.trim();
  // direct key match
  if (EMOJI_MAP[trimmed] || ICONS[trimmed]) return trimmed;
  // emoji -> key
  for (const key of Object.keys(EMOJI_MAP)) {
    if (EMOJI_MAP[key].emoji === trimmed) return key;
  }
  // otherwise return the original string (it will be validated server-side)
  return trimmed;
} 
