import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VehiclePhoto, PhotoCredit } from './VehiclePhoto';
afterEach(cleanup);
it('uses the model photo from the API and never substitutes an unrelated image after failure', () => {
  const vehicle = {
    brand: 'Tata',
    model: 'Nexon',
    vehicle_type: 'CAR',
    image_url: '/images/vehicles/nexon.webp',
  };
  const view = render(<VehiclePhoto vehicle={vehicle} />);
  const image = screen.getByRole('img', { name: 'Tata Nexon' });
  expect(image.getAttribute('src')).toBe(vehicle.image_url);
  fireEvent.error(image);
  expect(screen.getByRole('img', { name: 'Tata Nexon photo unavailable' })).toBeTruthy();
  expect(view.container.querySelector('img')).toBe(null);
  view.rerender(
    <VehiclePhoto
      vehicle={{
        ...vehicle,
        brand: 'Hyundai',
        model: 'i20',
        image_url: '/images/vehicles/i20.webp',
      }}
    />,
  );
  expect(screen.getByRole('img', { name: 'Hyundai i20' }).getAttribute('src')).toBe(
    '/images/vehicles/i20.webp',
  );
});
it('keeps photographer attribution and license discoverable', () => {
  render(<PhotoCredit src="/images/vehicles/nexon.webp" />);
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(2);
  expect(links[0].getAttribute('href')).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\//);
  expect(links[1].getAttribute('href')).toMatch(/^https:\/\/creativecommons.org\/licenses\//);
  expect(links[0].getAttribute('rel')).toContain('noreferrer');
});
