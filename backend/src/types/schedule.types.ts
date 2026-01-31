/**
 * Tipos para el sistema de publicaciones automáticas
 */

export interface VariationEntry {
  id: string;
  title: string;
  description?: string;
  generatedAt: string;
  publishedAt?: string;
  status: 'generated' | 'published' | 'failed';
}

export interface Frequency {
  interval: number; // 1, 2, 4, 12, 24, etc.
  unit: 'hours' | 'days';
}

export interface ScheduledPublication {
  $id?: string; // Appwrite document ID
  userId: string;
  itemId: string;
  originalTitle: string;
  originalDescription?: string;
  frequency: Frequency;
  variateDescription: boolean;
  maxPublications?: number | null; // null = ilimitado
  isActive: boolean;
  lastPublishedAt?: string; // ISO datetime
  nextPublishAt: string; // ISO datetime
  variationHistory?: VariationEntry[]; // Últimas 10 variaciones
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  metadata?: {
    source?: 'manual' | 'automatic';
    notes?: string;
  };
}

export interface PublicationHistory {
  $id?: string; // Appwrite document ID
  scheduleId: string;
  userId: string;
  itemId: string;
  publishedTitle: string;
  publishedDescription?: string;
  newListingId?: string; // ID de la publicación en ML
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  generatedAt: string; // ISO datetime
  publishedAt?: string; // ISO datetime
  variationIndex?: number;
}

export interface AIVariation {
  title: string;
  description?: string;
}

export interface CreateScheduleRequest {
  itemId: string;
  frequency: Frequency;
  variateDescription?: boolean;
  maxPublications?: number | null;
}

export interface UpdateScheduleRequest {
  frequency?: Frequency;
  variateDescription?: boolean;
  isActive?: boolean;
  maxPublications?: number | null;
}

export interface ScheduleListResponse {
  id: string;
  itemId: string;
  originalTitle: string;
  frequency: Frequency;
  variateDescription: boolean;
  isActive: boolean;
  lastPublishedAt?: string;
  nextPublishAt: string;
  publicationCount: number;
}

export interface CronJobResult {
  processed: number;
  successful: number;
  failed: number;
  errors?: Array<{
    scheduleId: string;
    error: string;
  }>;
}

/**
 * Tipos para MercadoLibre API
 */
export interface MLItem {
  id: string;
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  condition: 'new' | 'used';
  buying_mode: string;
  listing_type_id: string;
  pictures: Array<{ source: string }>;
  attributes: Array<{
    id: string;
    name: string;
    value_name?: string;
    value_type?: string;
  }>;
  sale_terms?: Array<{
    id: string;
    value_name: string;
  }>;
  shipping?: {
    mode: string;
    local_pick_up: boolean;
    free_shipping: boolean;
    logistic_type?: string;
  };
  description?: string;
  date_created: string;
  last_updated: string;
  permalink: string;
  thumbnail: string;
}

export interface MLItemDescription {
  id: string;
  text: string;
  last_updated: string;
}

export interface MLPublishResponse {
  id: string;
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  listing_type_id: string;
  permalink: string;
}

/**
 * Tipos para servicios internos
 */
export interface PublicationSchedulerContext {
  userId: string;
  scheduleId: string;
  itemId: string;
  originalItem: MLItem;
  newVariation: AIVariation;
  timestamp: Date;
}

export interface PublicationResult {
  success: boolean;
  newListingId?: string;
  error?: string;
}
