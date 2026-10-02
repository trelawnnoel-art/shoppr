// Domain types for SHOPPR v0.1 mock data.
// Terminology: customer = "SHOPPR" or "customer", gig worker = "Scout",
// order = "Mission".

export type Category =
  | 'Fashion'
  | 'Footwear'
  | 'Beauty'
  | 'Electronics'
  | 'Home'
  | 'Gifts'
  | 'Wellness'
  | 'Luxury';

export interface Store {
  id: string;
  name: string;
  category: Category;
  distanceMiles: number;
  etaMinutes: number;
  isOpen: boolean;
  scoutsAvailable: number;
  availabilityConfidence: 'high' | 'medium' | 'low';
}

export interface Product {
  id: string;
  name: string;
  storeName: string;
  category: Category;
  price: number;
  etaMinutes: number;
}

export type MissionStatus =
  | 'created'
  | 'scout_accepted'
  | 'shopping'
  | 'purchase_confirmed'
  | 'on_the_way'
  | 'complete';

export interface Mission {
  id: string;
  title: string;
  storeName: string;
  status: MissionStatus;
  scoutName: string;
  scoutId: string | null;
  etaMinutes: number | null;
  /** Human, in-the-moment context — e.g. "2 stops away", "Scout has entered the store". */
  note: string;
}

export interface Scout {
  id: string;
  name: string;
  rating: number;
  photoUrl: string | null;
}

export type MessageSender = 'customer' | 'scout';

export interface Message {
  id: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
}

export interface UserProfile {
  initials: string;
  firstName: string;
  savedSizesCount: number;
  favoriteStoresCount: number;
  savedItemsCount: number;
}

export interface AiTool {
  id: string;
  name: string;
  description: string;
}

export interface AiSuggestion {
  id: string;
  prompt: string;
}
