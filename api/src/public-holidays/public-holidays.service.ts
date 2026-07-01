import { Injectable } from '@nestjs/common';
import {
  ALL_STATES,
  getHolidaysForState,
  type HolidayEntry,
} from './holiday-rules';
import { holidaysToIcs } from './holiday-ics.util';

@Injectable()
export class PublicHolidaysService {
  getStates(): string[] {
    return [...ALL_STATES];
  }

  getHolidays(stateName: string, year?: number): {
    state: string;
    year: number;
    holidays: HolidayEntry[];
    total: number;
    officialCount: number;
    childrenCount: number;
  } {
    const y = year ?? new Date().getFullYear();
    const state = ALL_STATES.includes(stateName) ? stateName : 'Berlin';
    const holidays = getHolidaysForState(state, y);
    return {
      state,
      year: y,
      holidays,
      total: holidays.length,
      officialCount: holidays.filter((h) => h.isPublicHoliday).length,
      childrenCount: holidays.filter((h) => h.childrenRelated).length,
    };
  }

  getOverview(year?: number): {
    year: number;
    states: { state: string; total: number; holidays: HolidayEntry[] }[];
  } {
    const y = year ?? new Date().getFullYear();
    const states = ALL_STATES.map((state) => {
      const holidays = getHolidaysForState(state, y);
      return { state, total: holidays.length, holidays };
    });
    return { year: y, states };
  }

  generateIcsFeed(stateName: string, year?: number): string {
    const { state, year: y, holidays } = this.getHolidays(stateName, year);
    return holidaysToIcs(holidays, state, y);
  }
}
