import type {
  AiSuggestion,
  AiTool,
  Category,
  Mission,
  Product,
  Store,
  UserProfile,
} from './types';

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

export const stores: Store[] = [
  {
    id: 'nike',
    name: 'Nike',
    category: 'Footwear',
    distanceMiles: 0.6,
    etaMinutes: 28,
    isOpen: true,
    scoutsAvailable: 4,
    availabilityConfidence: 'high',
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'Electronics',
    distanceMiles: 0.9,
    etaMinutes: 34,
    isOpen: true,
    scoutsAvailable: 2,
    availabilityConfidence: 'high',
  },
  {
    id: 'sephora',
    name: 'Sephora',
    category: 'Beauty',
    distanceMiles: 1.1,
    etaMinutes: 30,
    isOpen: true,
    scoutsAvailable: 3,
    availabilityConfidence: 'medium',
  },
  {
    id: 'zara',
    name: 'Zara',
    category: 'Fashion',
    distanceMiles: 0.7,
    etaMinutes: 25,
    isOpen: true,
    scoutsAvailable: 5,
    availabilityConfidence: 'high',
  },
  {
    id: 'nordstrom',
    name: 'Nordstrom',
    category: 'Luxury',
    distanceMiles: 1.4,
    etaMinutes: 40,
    isOpen: false,
    scoutsAvailable: 0,
    availabilityConfidence: 'low',
  },
  {
    id: 'macys',
    name: "Macy's",
    category: 'Fashion',
    distanceMiles: 1.2,
    etaMinutes: 36,
    isOpen: true,
    scoutsAvailable: 2,
    availabilityConfidence: 'medium',
  },
  {
    id: 'corner-boutique',
    name: 'The Corner Boutique',
    category: 'Fashion',
    distanceMiles: 0.3,
    etaMinutes: 20,
    isOpen: true,
    scoutsAvailable: 1,
    availabilityConfidence: 'medium',
  },
];

export const products: Product[] = [
  { id: 'p1', name: 'Tapered Wool Trousers', storeName: 'Zara', category: 'Fashion', price: 89, etaMinutes: 25 },
  { id: 'p2', name: 'Air Zoom Pegasus', storeName: 'Nike', category: 'Footwear', price: 130, etaMinutes: 28 },
  { id: 'p3', name: 'USB-C Fast Charger', storeName: 'Apple', category: 'Electronics', price: 39, etaMinutes: 34 },
  { id: 'p4', name: 'Vitamin C Serum', storeName: 'Sephora', category: 'Beauty', price: 48, etaMinutes: 30 },
  { id: 'p5', name: 'Linen Blend Blazer', storeName: 'The Corner Boutique', category: 'Fashion', price: 145, etaMinutes: 20 },
  { id: 'p6', name: 'Weekender Duffel', storeName: "Macy's", category: 'Gifts', price: 76, etaMinutes: 36 },
];

export const missions: Mission[] = [
  {
    id: 'm1',
    title: 'Nike Running Shoes',
    storeName: 'Nike',
    status: 'on_the_way',
    scoutName: 'Maya',
    etaMinutes: 12,
    note: '2 stops away',
  },
  {
    id: 'm2',
    title: 'Birthday gift from Target',
    storeName: 'Target',
    status: 'shopping',
    scoutName: 'Devon L.',
    etaMinutes: 38,
    note: 'Scout has entered the store',
  },
  {
    id: 'm3',
    title: 'Home essentials from IKEA',
    storeName: 'IKEA',
    status: 'created',
    scoutName: 'Not yet assigned',
    etaMinutes: null,
    note: 'Waiting for a Scout',
  },
  {
    id: 'm4',
    title: 'Charger, forgot mine',
    storeName: 'Apple',
    status: 'complete',
    scoutName: 'Priya K.',
    etaMinutes: null,
    note: 'Delivered today',
  },
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
