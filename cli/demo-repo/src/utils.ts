/**
 * Shared formatting utilities.
 */

export function padStart(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

<<<<<<< HEAD
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = padStart(d.getMonth() + 1, 2);
  const day = padStart(d.getDate(), 2);
  return `${year}-${month}-${day}`;
}
=======
export function formatDateTime(d: Date): string {
  const year = d.getFullYear();
  const month = padStart(d.getMonth() + 1, 2);
  const day = padStart(d.getDate(), 2);
  const hours = padStart(d.getHours(), 2);
  const minutes = padStart(d.getMinutes(), 2);
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
>>>>>>> incoming

export function truncate(str: string, maxLength: number): string {
  return str.length <= maxLength ? str : `${str.slice(0, maxLength - 1)}…`;
}
