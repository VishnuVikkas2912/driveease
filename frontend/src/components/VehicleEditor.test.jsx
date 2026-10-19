import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import axe from 'axe-core';
import { VehicleEditor } from './VehicleEditor';
import { api } from '../services/api';
vi.mock('../services/api', () => ({ api: vi.fn() }));
const vehicle = {
  vehicle_id: '1',
  vehicle_number: 'DL01AB1234',
  brand: 'Tata',
  model: 'Nexon',
  vehicle_type: 'CAR',
  year: 2024,
  fuel_type: 'PETROL',
  transmission: 'AUTOMATIC',
  price_per_day: '2200.00',
  location_id: '1',
  revision: 3,
  image_url: '/images/vehicles/nexon.webp',
};
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  api.mockImplementation(async (path) =>
    path === '/vehicles/locations'
      ? [{ location_id: '1', city: 'Delhi', name: 'Delhi demo hub' }]
      : {},
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function show(props = {}) {
  const onSaved = vi.fn();
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: '/',
          element: (
            <main>
              <h1>Fleet</h1>
              <VehicleEditor token="test-token" onClose={() => {}} onSaved={onSaved} {...props} />
            </main>
          ),
        },
      ])}
    />,
  );
  return onSaved;
}
it('new vehicle validation focuses registration and prevents a partial write', async () => {
  show();
  const user = userEvent.setup();
  await screen.findByRole('option', { name: 'Delhi · Delhi demo hub' });
  await user.click(screen.getByRole('button', { name: 'Add vehicle' }));
  expect(document.activeElement).toBe(
    screen.getByLabelText('Registration number', { exact: false }),
  );
  expect(api.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
});
it('editing submits the revision and preserves values after stale-write rejection', async () => {
  const saved = show({ vehicle });
  const user = userEvent.setup();
  await screen.findByRole('option', { name: 'Delhi · Delhi demo hub' });
  api.mockImplementation(async (path, options) => {
    if (options?.method === 'PUT') throw new Error('This vehicle changed. Refresh the fleet.');
    return [];
  });
  const rate = screen.getByLabelText('Daily rate (INR)', { exact: false });
  await user.clear(rate);
  await user.type(rate, '2500');
  await user.click(screen.getByRole('button', { name: 'Save vehicle' }));
  await screen.findByText('This vehicle changed. Refresh the fleet.');
  expect(rate.value).toBe('2500');
  expect(saved).not.toHaveBeenCalled();
  const write = api.mock.calls.find(([, o]) => o?.method === 'PUT');
  expect(write[1].body.previousRevision).toBe(3);
  expect(write[1].body.locationId).toBe('1');
});
it('reserved vehicle retains a disabled hub and accessible editor controls', async () => {
  show({ vehicle: { ...vehicle, location_locked: true } });
  await screen.findByRole('option', { name: 'Delhi · Delhi demo hub' });
  expect(screen.getByLabelText('Pickup hub', { exact: false }).disabled).toBe(true);
  const results = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations).toEqual([]);
});
