import React from 'react';
import { Field, ErrorMessage, useData } from './ui';

export function LocationField({ allowAll = false, label = 'Pickup hub', ...props }) {
  const result = useData('/vehicles/locations');
  return (
    <>
      <Field label={label} {...props} disabled={props.disabled || result.loading || !!result.error}>
        <option value="">{allowAll ? 'All pickup hubs' : 'Choose a pickup hub'}</option>
        {result.data?.map((l) => (
          <option key={l.location_id} value={l.location_id}>
            {l.city} · {l.name}
          </option>
        ))}
      </Field>
      <ErrorMessage message={result.error} retry={result.retry} />
    </>
  );
}
