export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  badge: string;
  is_recommended: number;
  subtitle?: string;
  highlights?: string; // JSON string
  delivery?: string;
  support?: string;
  guarantee?: string;
  audience?: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  is_featured: number;
  supported_android: number;
  supported_ios: number;
  warranty_days: number;
  warranty_note: string;
  catalog_type?: string;
  reference_title?: string;
  play_image?: string;
  play_store?: string;
  banStatus?: string;
  banRiskPercentage?: number;
  packages: Package[];
}

export interface PublicData {
  categories: Category[];
  games: Game[];
}
