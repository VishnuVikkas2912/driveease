import React from 'react';
import { Field, today } from './ui';
import { licenceErrors } from '../../../shared/driving-license.js';

export function LicenceNumberField({ form: f }) {
  return (
    <Field
      label="Licence number"
      required
      maxLength={16}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      placeholder="e.g. KA0120201234567"
      hint="State code, RTO code, issue year and 7-digit serial. No spaces or hyphens."
      {...f.bind('licenseNumber')}
      onChange={(e) => {
        f.setValues((v) => ({ ...v, licenseNumber: e.target.value.toUpperCase() }));
        f.setErrors((errors) => ({ ...errors, licenseNumber: '' }));
        f.setError('');
      }}
      onBlur={() => {
        const error = licenceErrors(f.values, today()).licenseNumber;
        f.setErrors((errors) => ({ ...errors, licenseNumber: error || '' }));
      }}
    />
  );
}
