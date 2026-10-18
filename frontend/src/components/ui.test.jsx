import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Button, Field, ErrorMessage, useData, useForm, dateErrors } from './ui';
vi.mock('../services/api', () => ({ api: vi.fn() }));
import { api } from '../services/api';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Shared rental interaction primitives', () => {
  it('associates field errors with inputs and uses masked/revealable password semantics', async () => {
    const user = userEvent.setup();
    render(
      <Field
        label="Password"
        name="password"
        type="password"
        error="Use at least 6 characters."
        autoComplete="new-password"
      />,
    );
    const input = screen.getByLabelText('Password', { exact: true });
    expect(input.type).toBe('password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')).textContent).toContain(
      '6 characters',
    );
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
  it('busy buttons cannot dispatch duplicate writes and expose pending state', async () => {
    const click = vi.fn();
    render(
      <Button busy onClick={click}>
        Confirm booking
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Confirm booking' });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(click).not.toHaveBeenCalled();
  });
  it('form validation focuses the first invalid field and retains values', async () => {
    function Example() {
      const f = useForm({ email: 'retained@example.com' });
      return (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            f.validate({ email: 'Check this email.' }, e.currentTarget);
          }}
        >
          <Field label="Email" {...f.bind('email')} />
          <Button type="submit">Save</Button>
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
    expect(screen.getByLabelText('Email').value).toBe('retained@example.com');
  });
  it('cancels obsolete reads so slow responses never overwrite a newer route', async () => {
    const pending = [];
    api.mockImplementation(
      (path, { signal }) => new Promise((resolve) => pending.push({ path, signal, resolve })),
    );
    function Example({ path }) {
      const result = useData(path);
      return <div>{result.loading ? 'Loading' : result.data?.label}</div>;
    }
    const view = render(<Example path="/vehicles/1" />);
    await waitFor(() => expect(pending.length).toBe(1));
    view.rerender(<Example path="/vehicles/2" />);
    await waitFor(() => expect(pending.length).toBe(2));
    expect(pending[0].signal.aborted).toBe(true);
    pending[1].resolve({ label: 'New vehicle' });
    await screen.findByText('New vehicle');
    pending[0].resolve({ label: 'Old vehicle' });
    expect(screen.queryByText('Old vehicle')).toBe(null);
  });
  it('shared form and inline recovery expose accessible names and relationships', async () => {
    const { container } = render(
      <main>
        <h1>Book your ride</h1>
        <form noValidate>
          <Field label="Pick-up date" type="date" name="pickup" />
          <Field label="Payment method" name="method">
            <option>UPI</option>
            <option>Card</option>
          </Field>
          <Field label="Email" name="email" type="email" error="Enter your email address." />
          <ErrorMessage message="Connection interrupted. Try again." />
          <Button type="submit">Confirm booking</Button>
        </form>
      </main>,
    );
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
  it('rental dates reject missing or reversed ranges', () => {
    expect(Object.keys(dateErrors('', ''))).toEqual(['pickupDate', 'dropoffDate']);
    expect(dateErrors('2040-01-02', '2040-01-01').dropoffDate).toBeTruthy();
    expect(dateErrors('2040-01-02', '2040-01-04')).toEqual({});
  });
});
