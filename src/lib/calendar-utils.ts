import { DayOfWeek } from "@/types/crm";

export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  dayNum: number;
  shortLabel: string; // ej. "Lun 2"
  fullLabel: string; // ej. "Lunes 2 de Noviembre"
}

export interface CalendarWeekInfo {
  mondayStr: string; // YYYY-MM-DD
  sundayStr: string; // YYYY-MM-DD
  label: string; // ej. "2 al 8 de Noviembre 2026"
  shortLabel: string; // ej. "2 - 8 Nov"
  weekNumberInMonth: number; // 1, 2, 3, 4, 5
  monthName: string;
  year: number;
  days: CalendarDayInfo[];
}

const DAYS_OF_WEEK_ORDER: DayOfWeek[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MONTH_SHORT_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/**
 * Parsea YYYY-MM-DD a objeto Date local seguro (evitando offsets de zona horaria)
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Formatea Date a YYYY-MM-DD
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el Lunes (YYYY-MM-DD) de la semana correspondiente a cualquier fecha
 */
export function getMondayOfDate(input: Date | string): string {
  const d = typeof input === "string" ? parseLocalDate(input) : new Date(input);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return formatLocalDate(monday);
}

/**
 * Suma o resta semanas al lunes dado
 */
export function addWeeksToMonday(mondayStr: string, weeksCount: number): string {
  const d = parseLocalDate(mondayStr);
  d.setDate(d.getDate() + weeksCount * 7);
  return formatLocalDate(d);
}

/**
 * Genera la estructura completa de una semana a partir de su Lunes (YYYY-MM-DD)
 */
export function getCalendarWeekInfo(mondayStr: string): CalendarWeekInfo {
  const mondayDate = parseLocalDate(mondayStr);
  const days: CalendarDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(mondayDate);
    cur.setDate(mondayDate.getDate() + i);
    const dateStr = formatLocalDate(cur);
    const dayOfWeek = DAYS_OF_WEEK_ORDER[i];
    const dayNum = cur.getDate();
    const monthIndex = cur.getMonth();

    days.push({
      date: dateStr,
      dayOfWeek,
      dayNum,
      shortLabel: `${dayOfWeek.slice(0, 3)} ${dayNum}`,
      fullLabel: `${dayOfWeek} ${dayNum} de ${MONTH_NAMES_ES[monthIndex]}`,
    });
  }

  const sundayDate = parseLocalDate(days[6].date);
  const startDay = mondayDate.getDate();
  const endDay = sundayDate.getDate();
  const startMonthName = MONTH_NAMES_ES[mondayDate.getMonth()];
  const endMonthName = MONTH_NAMES_ES[sundayDate.getMonth()];
  const startMonthShort = MONTH_SHORT_ES[mondayDate.getMonth()];
  const endMonthShort = MONTH_SHORT_ES[sundayDate.getMonth()];
  const year = mondayDate.getFullYear();

  let label = "";
  let shortLabel = "";

  if (mondayDate.getMonth() === sundayDate.getMonth()) {
    label = `${startDay} al ${endDay} de ${startMonthName} ${year}`;
    shortLabel = `${startDay} - ${endDay} ${startMonthShort}`;
  } else {
    label = `${startDay} de ${startMonthShort} al ${endDay} de ${endMonthShort} ${year}`;
    shortLabel = `${startDay} ${startMonthShort} - ${endDay} ${endMonthShort}`;
  }

  // Número de semana en el mes (aproximado basado en el lunes)
  const weekNumberInMonth = Math.min(5, Math.max(1, Math.ceil(mondayDate.getDate() / 7)));

  return {
    mondayStr,
    sundayStr: days[6].date,
    label,
    shortLabel,
    weekNumberInMonth,
    monthName: startMonthName,
    year,
    days,
  };
}

/**
 * Obtiene la fecha exacta (YYYY-MM-DD) para un día de la semana dentro de una semana
 */
export function getDateForDayInWeek(mondayStr: string, dayOfWeek: DayOfWeek): string {
  const idx = DAYS_OF_WEEK_ORDER.indexOf(dayOfWeek);
  if (idx < 0) return mondayStr;
  const d = parseLocalDate(mondayStr);
  d.setDate(d.getDate() + idx);
  return formatLocalDate(d);
}

/**
 * Obtiene el DayOfWeek de un YYYY-MM-DD
 */
export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const map: DayOfWeek[] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return map[day] || "Lunes";
}

/**
 * Retorna las 5 semanas estándar alrededor de una fecha clave (ej. Noviembre 2026)
 */
export function getAvailableCalendarWeeks(baseMondayStr?: string): CalendarWeekInfo[] {
  // Lunes 2 de Noviembre 2026 como base predeterminada
  const defaultBase = baseMondayStr || getMondayOfDate(new Date(2026, 10, 2));
  const weeks: CalendarWeekInfo[] = [];

  // -1 semana, semana base, +1, +2, +3 semanas (5 semanas)
  for (let offset = 0; offset <= 4; offset++) {
    const monday = addWeeksToMonday(defaultBase, offset);
    weeks.push(getCalendarWeekInfo(monday));
  }

  return weeks;
}

