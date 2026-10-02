import type { AiSuggestion, AiTool, Category, UserProfile } from './types';

export const categories: Category[] = [
  'Fashion',
  'Footwear',
  'Beauty',
  'Electronics',
  'Home',
  'Gifts',
  'Wellness',
  'Luxury',
];

export const searchPrompts: string[] = [
  'I need an interview outfit.',
  'Find a birthday gift under $100.',
  'I forgot my charger.',
  'Show me black dress shoes nearby.',
];

export const quickSuggestions: string[] = [
  'Outfit tonight',
  'Birthday gift',
  'Home essentials',
  'Electronics',
];

export const userProfile: UserProfile = {
  initials: 'BF',
  firstName: 'Benjamin',
  savedSizesCount: 4,
  favoriteStoresCount: 6,
  savedItemsCount: 11,
};

export const aiTools: AiTool[] = [
  { id: 'stylist', name: 'AI Stylist', description: 'Build a full outfit around one piece' },
  { id: 'gift-finder', name: 'Gift Finder', description: 'Find something they will actually like' },
  { id: 'outfit-builder', name: 'Outfit Builder', description: 'Mix items from stores near you' },
  { id: 'tech-advisor', name: 'Tech Advisor', description: 'Compare specs, skip the jargon' },
  { id: 'beauty-assistant', name: 'Beauty Assistant', description: 'Match products to your routine' },
  { id: 'home-curator', name: 'Home Curator', description: 'Furnish a room, one Mission at a time' },
];

export const aiSuggestions: AiSuggestion[] = [
  { id: 'a1', prompt: 'Build an outfit around this jacket' },
  { id: 'a2', prompt: 'Find running shoes under $120' },
  { id: 'a3', prompt: 'Gift ideas for a coworker, $50 budget' },
  { id: 'a4', prompt: 'Something for a rainy weekend trip' },
];
