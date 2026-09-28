/**
 * Helper para calcular as datas de repetição de agendamentos
 */

export const DAYS_OF_WEEK = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' }
] as const;

export function generateRepeatSessionDates(
  startDateStr: string,
  frequency: 'weekly' | 'daily' | 'biweekly' | 'monthly' = 'weekly',
  count: number = 10,
  repeatDays: number[] = []
): string[] {
  if (!startDateStr) return [];
  if (count <= 1) return [startDateStr];

  const dates: string[] = [startDateStr];
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const baseDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

  if (frequency === 'monthly') {
    for (let i = 1; i < count; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setMonth(baseDate.getMonth() + i);
      const y = nextDate.getFullYear();
      const m = (nextDate.getMonth() + 1).toString().padStart(2, '0');
      const d = nextDate.getDate().toString().padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    return dates;
  }

  if (frequency === 'daily') {
    let cur = new Date(baseDate);
    while (dates.length < count) {
      cur.setDate(cur.getDate() + 1);
      if (repeatDays.length === 0 || repeatDays.includes(cur.getDay())) {
        const y = cur.getFullYear();
        const m = (cur.getMonth() + 1).toString().padStart(2, '0');
        const d = cur.getDate().toString().padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
    }
    return dates;
  }

  // Semanalmente ou Quinzenalmente
  const activeDays = repeatDays.length > 0 ? repeatDays : [baseDate.getDay()];

  if (frequency === 'weekly') {
    let cur = new Date(baseDate);
    let maxIterations = 700;
    while (dates.length < count && maxIterations > 0) {
      maxIterations--;
      cur.setDate(cur.getDate() + 1);
      if (activeDays.includes(cur.getDay())) {
        const y = cur.getFullYear();
        const m = (cur.getMonth() + 1).toString().padStart(2, '0');
        const d = cur.getDate().toString().padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
    }
    return dates;
  }

  if (frequency === 'biweekly') {
    let curWeekStart = new Date(baseDate);
    curWeekStart.setDate(curWeekStart.getDate() - curWeekStart.getDay());

    // Dias restantes da primeira semana após a data base
    for (let d = baseDate.getDay() + 1; d <= 6; d++) {
      if (dates.length >= count) break;
      if (activeDays.includes(d)) {
        const nextDay = new Date(curWeekStart);
        nextDay.setDate(curWeekStart.getDate() + d);
        const y = nextDay.getFullYear();
        const m = (nextDay.getMonth() + 1).toString().padStart(2, '0');
        const dayStr = nextDay.getDate().toString().padStart(2, '0');
        dates.push(`${y}-${m}-${dayStr}`);
      }
    }

    let weekOffset = 2;
    let maxCycles = 150;
    while (dates.length < count && maxCycles > 0) {
      maxCycles--;
      const targetWeek = new Date(curWeekStart);
      targetWeek.setDate(curWeekStart.getDate() + (weekOffset * 7));
      for (let d = 0; d <= 6; d++) {
        if (dates.length >= count) break;
        if (activeDays.includes(d)) {
          const nextDay = new Date(targetWeek);
          nextDay.setDate(targetWeek.getDate() + d);
          const y = nextDay.getFullYear();
          const m = (nextDay.getMonth() + 1).toString().padStart(2, '0');
          const dayStr = nextDay.getDate().toString().padStart(2, '0');
          dates.push(`${y}-${m}-${dayStr}`);
        }
      }
      weekOffset += 2;
    }
    return dates;
  }

  return dates;
}
