import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LicenceNumberField } from './LicenceNumberField';
import { Button, useForm, today } from './ui';
import { licenceErrors } from '../../../shared/driving-license.js';
afterEach(cleanup);

function Example() {
  const f = useForm({ licenseNumber: '', issueDate: '2020-01-01', expiryDate: '2040-01-01' });
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        f.validate(licenceErrors(f.values, today()), e.currentTarget);
      }}
    >
      <LicenceNumberField form={f} />
      <Button type="submit">Create account</Button>
    </form>
  );
}
it('uppercases letters and explains rejected separators on blur without discarding the entry', async () => {
  const user = userEvent.setup();
  render(<Example />);
  const field = screen.getByRole('textbox', { name: 'Licence number' });
  await user.type(field, 'ka-0120201234567');
  await user.tab();
  expect(field.value).toBe('KA-0120201234567');
  expect(field.getAttribute('aria-invalid')).toBe('true');
  const descriptions = field
    .getAttribute('aria-describedby')
    .split(' ')
    .map((id) => document.getElementById(id).textContent);
  expect(descriptions.some((s) => s.includes('without spaces or hyphens'))).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(document.activeElement).toBe(field);
  await user.clear(field);
  await user.type(field, 'ka0120201234567');
  await user.tab();
  expect(field.value).toBe('KA0120201234567');
  expect(field.getAttribute('aria-invalid')).toBe('false');
});
it('rejects pasted spaces and malformed numbers on submission', async () => {
  const user = userEvent.setup();
  render(<Example />);
  const field = screen.getByRole('textbox', { name: 'Licence number' });
  await user.click(field);
  await user.paste('KA01 20201234567');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(field.value).toContain(' ');
  await user.clear(field);
  await user.type(field, 'ZZ0120201234567');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Enter a recognised Indian state or union territory code.')).toBeTruthy();
});
