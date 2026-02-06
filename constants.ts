
import { Announcement, DaySchedule } from './types';

// Helper for default hours
export const DEFAULT_HOURS: DaySchedule[] = [
  { day: 'monday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'tuesday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'wednesday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'thursday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'friday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'saturday', isOpen: true, start: '08:00', end: '12:00' },
  { day: 'sunday', isOpen: false, start: '00:00', end: '00:00' },
];

export const _ANNOUNCEMENTS_DEPRECATED = [];
