export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const fail = (res, status, message) => res.status(status).json({ message });
export const validDateRange = (pickup, dropoff) => {
  const a = new Date(pickup), b = new Date(dropoff), today = new Date(); today.setHours(0,0,0,0);
  return !Number.isNaN(+a) && !Number.isNaN(+b) && a >= today && b > a;
};
