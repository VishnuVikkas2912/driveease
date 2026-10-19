export function vehicleErrors(v) {
  const errors = {};
  if (typeof v.vehicleNumber !== 'string' || !/^[A-Z0-9]{6,30}$/.test(v.vehicleNumber))
    errors.vehicleNumber = 'Use 6–30 uppercase letters and digits, without spaces.';
  for (const [key, max] of [
    ['brand', 60],
    ['model', 80],
  ])
    if (typeof v[key] !== 'string' || !v[key].trim() || v[key].length > max)
      errors[key] = `Enter a ${key} within ${max} characters.`;
  if (!['CAR', 'BIKE'].includes(v.vehicleType)) errors.vehicleType = 'Choose car or bike.';
  if (
    !Number.isInteger(Number(v.year)) ||
    Number(v.year) < 1980 ||
    Number(v.year) > new Date().getFullYear() + 1
  )
    errors.year = 'Choose a valid model year from 1980.';
  if (!['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'].includes(v.fuelType))
    errors.fuelType = 'Choose a fuel type.';
  if (!['MANUAL', 'AUTOMATIC'].includes(v.transmission))
    errors.transmission = 'Choose a transmission.';
  if (
    !Number.isFinite(Number(v.pricePerDay)) ||
    Number(v.pricePerDay) <= 0 ||
    Number(v.pricePerDay) > 99999999.99 ||
    !/^\d+(\.\d{1,2})?$/.test(String(v.pricePerDay))
  )
    errors.pricePerDay = 'Enter a positive daily rate, with up to two decimal places.';
  if (
    !/^\d+$/.test(String(v.locationId)) ||
    Number(v.locationId) <= 0 ||
    !Number.isSafeInteger(Number(v.locationId))
  )
    errors.locationId = 'Choose a pickup hub.';
  if (
    v.imageUrl &&
    (typeof v.imageUrl !== 'string' || !/^\/images\/vehicles\/[a-z0-9-]+\.webp$/.test(v.imageUrl))
  )
    errors.imageUrl = 'Choose a model photo from the library or leave it empty.';
  return errors;
}
