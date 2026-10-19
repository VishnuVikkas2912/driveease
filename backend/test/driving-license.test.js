import { test } from 'node:test';
import assert from 'node:assert/strict';
import { licenceErrors } from '../../shared/driving-license.js';

const dates = { issueDate: '2020-01-01', expiryDate: '2040-01-01' };
test('compact numbers support standard, historical-state and three-digit AP/TS/TG office formats', () => {
  for (const licenseNumber of [
    'KA0120201234567',
    'dl1420110012345',
    'OR0120201234567',
    'TS00920201234567',
    'TG00920201234567',
    'AP00920201234567',
  ]) {
    assert.deepEqual(licenceErrors({ ...dates, licenseNumber }, '2026-10-19'), {});
  }
});
test('renewals may have later card issue dates; expiry today remains valid', () => {
  assert.deepEqual(
    licenceErrors(
      { licenseNumber: 'MH0120001234567', issueDate: '2020-01-01', expiryDate: '2026-10-19' },
      '2026-10-19',
    ),
    {},
  );
});
test('missing values, invalid lengths, separators, unicode and impossible years are rejected', () => {
  for (const licenseNumber of [
    undefined,
    null,
    12345,
    '',
    'KA012020123456',
    'KA01202012345678',
    'KA00120201234567',
    'KA-0120201234567',
    'KA01\t20201234567',
    'KA0120201234567\n',
    'KA012020１２３４５６７',
    'XX0120201234567',
    'KA0100001234567',
    'KA0120271234567',
  ]) {
    assert(
      licenceErrors({ ...dates, licenseNumber }, '2026-10-19').licenseNumber,
      String(licenseNumber),
    );
  }
});
