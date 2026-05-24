export type ExpiryStatus = 'safe' | 'warning' | 'danger' | 'unknown';

export interface ExpiryInfo {
  status: ExpiryStatus;
  daysLeft: number | null;
  label: string;
}

export function getExpiryInfo(date: string | null): ExpiryInfo {
  if (!date) return { status: 'unknown', daysLeft: null, label: 'Дата не указана' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);

  if (daysLeft > 5) return { status: 'safe', daysLeft, label: `${daysLeft} дн` };
  if (daysLeft === 1) return { status: 'warning', daysLeft, label: 'Завтра' };
  if (daysLeft > 0) return { status: 'warning', daysLeft, label: `${daysLeft} дн` };
  if (daysLeft === 0) return { status: 'danger', daysLeft: 0, label: 'Сегодня' };
  return { status: 'danger', daysLeft, label: `Просрочен ${Math.abs(daysLeft)} дн` };
}
