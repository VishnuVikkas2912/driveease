import React, { useContext } from 'react';
import { api } from '../services/api';
import photos from '../data/vehicle-photos.json';
import { vehicleErrors } from '../../../shared/vehicle-input.js';
import { LocationField } from './LocationField';
import { Button, Field, Feedback, ErrorMessage, Modal, UnsavedGuard, useForm } from './ui';

export function VehicleEditor({ vehicle, token, onClose, onSaved }) {
  const notify = useContext(Feedback);
  const initial = {
    vehicleNumber: vehicle?.vehicle_number || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    vehicleType: vehicle?.vehicle_type || 'CAR',
    year: String(vehicle?.year || new Date().getFullYear()),
    fuelType: vehicle?.fuel_type || 'PETROL',
    transmission: vehicle?.transmission || 'MANUAL',
    pricePerDay: vehicle?.price_per_day || '',
    locationId: vehicle?.location_id || '',
    imageUrl: vehicle?.image_url || '',
  };
  const f = useForm(initial);
  const dirty = Object.entries(initial).some(
    ([key, value]) => String(value) !== String(f.values[key]),
  );
  async function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!f.validate(vehicleErrors(f.values), form)) return;
    f.setBusy(true);
    try {
      await api(vehicle ? `/vehicles/${vehicle.vehicle_id}` : '/vehicles', {
        method: vehicle ? 'PUT' : 'POST',
        token,
        body: { ...f.values, ...(vehicle ? { previousRevision: vehicle.revision } : {}) },
      });
      notify(vehicle ? 'Vehicle updated.' : 'Vehicle added to the fleet.');
      onSaved();
    } catch (e) {
      if (e.fields) f.validate(e.fields, form);
      f.setError(e.message);
    } finally {
      f.setBusy(false);
    }
  }
  return (
    <>
      <Modal
        title={vehicle ? `Edit ${vehicle.brand} ${vehicle.model}` : 'Add vehicle'}
        description="One registration represents one physical rental unit. Pick the matching model photo, or leave the photo empty. Existing reservation totals stay unchanged."
        onClose={() => !f.busy && onClose()}
      >
        <form noValidate className="stack-form" onSubmit={save}>
          <Field
            label="Registration number"
            required
            maxLength={30}
            {...f.bind('vehicleNumber')}
            onChange={(e) => {
              f.bind('vehicleNumber').onChange({
                ...e,
                target: { value: e.target.value.toUpperCase() },
              });
            }}
          />
          <div className="field-row">
            <Field label="Brand" required maxLength={60} {...f.bind('brand')} />
            <Field label="Model" required maxLength={80} {...f.bind('model')} />
          </div>
          <div className="field-row">
            <Field label="Vehicle type" {...f.bind('vehicleType')}>
              <option value="CAR">Car</option>
              <option value="BIKE">Bike</option>
            </Field>
            <Field
              label="Model year"
              required
              type="number"
              min="1980"
              max={new Date().getFullYear() + 1}
              {...f.bind('year')}
            />
          </div>
          <div className="field-row">
            <Field label="Fuel type" {...f.bind('fuelType')}>
              {['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'].map((v) => (
                <option key={v} value={v}>
                  {v[0] + v.slice(1).toLowerCase()}
                </option>
              ))}
            </Field>
            <Field label="Transmission" {...f.bind('transmission')}>
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATIC">Automatic</option>
            </Field>
          </div>
          <Field
            label="Daily rate (INR)"
            required
            type="number"
            min="0.01"
            step="0.01"
            {...f.bind('pricePerDay')}
          />
          <LocationField
            required
            disabled={vehicle?.location_locked}
            hint={
              vehicle?.location_locked
                ? 'This hub is locked by an upcoming or active reservation.'
                : undefined
            }
            {...f.bind('locationId')}
          />
          <Field
            label="Model photo"
            hint="Library photos represent the model, not the exact rental unit."
            {...f.bind('imageUrl')}
          >
            <option value="">No photo</option>
            {Object.entries(photos).map(([src, p]) => (
              <option key={src} value={src}>
                {p.model}
              </option>
            ))}
          </Field>
          <ErrorMessage message={f.error} />
          <div className="dialog-actions">
            <Button autoFocus type="button" className="outline" disabled={f.busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" busy={f.busy}>
              {vehicle ? 'Save vehicle' : 'Add vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
      <UnsavedGuard dirty={dirty && !f.busy} />
    </>
  );
}
