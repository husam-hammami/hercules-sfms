import { Facility } from '@shared/schema';

export const getFacilityLocation = (facility: Facility): string =>
  facility.location ?? facility.city ?? facility.address ?? 'Unknown';

export const getFacilityStatus = (facility: Facility): string =>
  facility.status ?? 'unknown';

export const getFacilityEfficiency = (facility: Facility): number =>
  facility.efficiency ?? 0;

export const getFacilityDailyProduction = (facility: Facility): number =>
  facility.dailyProduction ?? 0;

export const getFacilityLatitude = (facility: Facility): number =>
  facility.latitude ?? 0;

export const getFacilityLongitude = (facility: Facility): number =>
  facility.longitude ?? 0;

export const getFacilityLastUpdated = (facility: Facility): Date | string | null =>
  facility.lastUpdated ?? null;

