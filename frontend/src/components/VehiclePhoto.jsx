import React, { useState } from 'react';
import { Bike, CarFront } from 'lucide-react';
import photos from '../data/vehicle-photos.json';

export function VehiclePhoto({ vehicle, loading = 'lazy' }) {
  const src = vehicle.image_url;
  const [failedSrc, setFailedSrc] = useState(null);
  const label = `${vehicle.brand} ${vehicle.model}`;
  if (!src || src === failedSrc) {
    const Icon = vehicle.vehicle_type === 'BIKE' ? Bike : CarFront;
    return (
      <div className="vehicle-photo-fallback" role="img" aria-label={`${label} photo unavailable`}>
        <Icon size={42} />
        <span>Photo unavailable</span>
      </div>
    );
  }
  const photo = photos[src];
  return (
    <img
      src={src}
      alt={label}
      width={photo?.width}
      height={photo?.height}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
}

export function PhotoCredit({ src }) {
  const photo = photos[src];
  if (!photo) return null;
  return (
    <p className="photo-credit">
      Photo:{' '}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
        {photo.author}
      </a>
      <span aria-hidden="true"> · </span>
      <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
        {photo.license}
      </a>
    </p>
  );
}
