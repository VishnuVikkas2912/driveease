// Shared by registration UI and API. This checks structure, not government issuance,
// ownership, driving entitlement or suspension status. Never call it verification.
// Historical state codes remain supported because renewals can retain old numbers.
const states = new Set(
  'AN AP AR AS BR CG CH DD DL DN GA GJ HP HR JH JK KA KL LA LD MH ML MN MP MZ NL OD OR PB PY RJ SK TN TR TS TG UK UA UP WB'.split(
    ' ',
  ),
);
const isoDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function licenceErrors({ licenseNumber, issueDate, expiryDate }, currentDate) {
  const errors = {};
  let year;
  if (typeof licenseNumber !== 'string' || !licenseNumber) {
    errors.licenseNumber = 'Enter your driving licence number.';
  } else if (!/^[A-Za-z0-9]+$/.test(licenseNumber)) {
    errors.licenseNumber = 'Use letters and digits only, without spaces or hyphens.';
  } else {
    const number = licenseNumber.toUpperCase();
    // Standard compact format: SS + RR + YYYY + seven-digit serial.
    // AP/TS/TG also use three-digit issuing-office codes (16 compact characters).
    const parts = /^(?<state>[A-Z]{2})(?<office>\d{2,3})(?<year>\d{4})(?<serial>\d{7})$/.exec(
      number,
    );
    if (
      !parts ||
      (parts.groups.office.length === 3 && !['AP', 'TS', 'TG'].includes(parts.groups.state))
    ) {
      errors.licenseNumber =
        'Check the format, for example KA0120201234567 (no spaces or hyphens).';
    } else if (!states.has(parts.groups.state)) {
      errors.licenseNumber = 'Enter a recognised Indian state or union territory code.';
    } else {
      year = Number(parts.groups.year);
      if (year < 1900 || year > Number(currentDate.slice(0, 4))) {
        errors.licenseNumber =
          'The issue year in your licence number must be between 1900 and this year.';
      }
    }
  }
  if (!isoDate(issueDate) || issueDate > currentDate || issueDate < '1900-01-01') {
    errors.issueDate = 'Enter a valid issue date from 1900 through today.';
  } else if (year && year > Number(issueDate.slice(0, 4))) {
    // A renewed card may have a later issue date than its original licence year.
    errors.issueDate = 'The issue date cannot be earlier than the year in your licence number.';
  }
  if (!isoDate(expiryDate) || expiryDate <= issueDate || expiryDate < currentDate) {
    errors.expiryDate = 'Enter an expiry date after the issue date that has not passed.';
  }
  return errors;
}
