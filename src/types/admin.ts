import type { MealType } from '@/lib/meal';

export interface Guest {
  id: number;
  name: string;
  isChild: boolean;
  mealType: MealType;
  confirmed: boolean | null;
}

export interface RSVP {
  id: number;
  slug: string;
  familyName: string;
  invitedBy: string;
  invitationSent: boolean;
  contactPhone: string;
  comments: string;
  createdAt: string;
  guests: Guest[];
}

export type RSVPFilter = 'all' | 'confirmed' | 'pending' | 'declined';
export type RSVPInvitedByFilter = 'all' | 'papa' | 'mama' | 'bebes';

export interface EventItineraryItem {
  id: number;
  time: string;
  activity: string;
}

export interface EventPhoto {
  id: number;
  url: string;
}

export interface EventGiftRegistry {
  id: number;
  storeName: string;
  registryNumber: string | null;
  url: string | null;
}

export interface Event {
  id: number;
  slug: string;
  title: string;
  celebrantName: string;
  subtitle: string | null;
  quote: string | null;
  date: string;
  heroBackgroundUrl: string | null;
  detailsBackgroundUrl: string | null;
  rsvpBackgroundUrl: string | null;
  parents: string | null;
  godparents: string | null;
  churchName: string | null;
  churchTime: string | null;
  churchAddress: string | null;
  churchMapsUrl: string | null;
  hallName: string | null;
  hallTime: string | null;
  hallAddress: string | null;
  hallMapsUrl: string | null;
  locationsAreSame: boolean;
  dressCode: string | null;
  itinerary: EventItineraryItem[];
  photos: EventPhoto[];
  giftRegistries: EventGiftRegistry[];
  giftEnvelope: boolean;
  giftBankName: string | null;
  giftBankOwner: string | null;
  giftBankAccount: string | null;
  giftBankClabe: string | null;
  rsvpPhone: string | null;
  rsvpDeadline: string | null;
}

export interface GuestInput {
  name: string;
  isChild: boolean;
  mealType: MealType;
  confirmed: boolean | null;
}

export interface TempItineraryInput {
  time: string;
  activity: string;
}

export interface TempRegistryInput {
  storeName: string;
  registryNumber: string;
  url: string;
}
