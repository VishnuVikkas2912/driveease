export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const fail = (res, status, message) => res.status(status).json({ message });
export const isoDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const validDateRange = (pickup, dropoff) =>
  isoDate(pickup) && isoDate(dropoff) && pickup >= today() && dropoff > pickup;
export const positiveId = (value) =>
  /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
export function pagination(query, defaultLimit = 12) {
  const limit = Number(query.limit ?? defaultLimit),
    offset = Number(query.offset ?? 0);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 101 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  )
    return null;
  return { limit, offset };
}
