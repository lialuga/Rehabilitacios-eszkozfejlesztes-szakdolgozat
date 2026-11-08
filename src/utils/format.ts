import {Language, TranslationKey, translate} from '../i18n/translations';

const pad = (value: number) => value.toString().padStart(2, '0');

export const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

export const formatAngle = (angle: number, digits = 1) => {
  const rounded = Number(angle.toFixed(digits));
  const sign = rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded).toFixed(digits)}°`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDay = (timestamp: number, language: Language) => {
  const date = new Date(timestamp);
  const months = translate(language, 'monthsShort').split(',');
  return translate(language, 'dateFormat', {
    month: months[date.getMonth()],
    day: date.getDate(),
  });
};

export const formatRelativeDay = (timestamp: number, language: Language) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return translate(language, 'today');
  }
  if (isSameDay(date, yesterday)) {
    return translate(language, 'yesterday');
  }
  return formatDay(timestamp, language);
};

export const formatWeekdayDate = (timestamp: number, language: Language) => {
  const date = new Date(timestamp);
  const weekdays = translate(language, 'weekdays').split(',');
  return `${weekdays[date.getDay()]}, ${formatDay(timestamp, language)}`;
};

export const formatTotalTime = (ms: number, language: Language) => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const key: TranslationKey = hours > 0 ? 'hoursMinutes' : 'minutesOnly';
  return translate(language, key, {h: hours, m: minutes});
};
