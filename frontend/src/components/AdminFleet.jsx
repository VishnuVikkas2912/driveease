import React, { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { LocationField } from './LocationField';
import { VehicleEditor } from './VehicleEditor';
import {
  Button,
  Field,
  Feedback,
  ErrorMessage,
  Loading,
  Empty,
  Modal,
  Pagination,
  UnsavedGuard,
  useForm,
  useData,
  Status,
  money,
} from './ui';

export function AdminNavigation({ fleet = false }) {
  return (
    <nav className="admin-navigation" aria-label="Administration">
      <Link
        className={`button ${fleet ? 'outline' : ''}`}
        to="/admin"
        aria-current={!fleet ? 'page' : undefined}
      >
        Overview & maintenance
      </Link>
      <Link
        className={`button ${fleet ? '' : 'outline'}`}
        to="/admin?view=fleet"
        aria-current={fleet ? 'page' : undefined}
      >
        Fleet & pickup hubs
      </Link>
      <Link className="button outline" to="/bookings">
        Reservations <ArrowUpRight size={16} />
      </Link>
    </nav>
  );
}

export function AdminFleet({ token }) {
  const notify = useContext(Feedback),
    [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1),
    locationId = params.get('locationId') || '';
  const [revision, setRevision] = useState(0),
    [editing, setEditing] = useState(null),
    [creating, setCreating] = useState(false),
    [vehicleEditor, setVehicleEditor] = useState(undefined);
  const result = useData(
    `/admin/fleet?limit=11&offset=${(page - 1) * 10}&locationId=${encodeURIComponent(locationId)}`,
    token,
    revision,
  );
  const move = useForm({ locationId: '' }),
    hub = useForm({ city: '', name: '', address: '' });
  const rows = result.data?.slice(0, 10) || [];
  const changeParams = (values) =>
    setParams({ view: 'fleet', ...(locationId ? { locationId } : {}), ...values });
  useEffect(() => {
    if (result.data?.length === 0 && page > 1) changeParams({ page: page - 1 });
  }, [result.data]);
  async function saveMove(e) {
    e.preventDefault();
    if (
      !move.validate(
        move.values.locationId ? {} : { locationId: 'Choose a pickup hub.' },
        e.currentTarget,
      )
    )
      return;
    move.setBusy(true);
    try {
      await api(`/admin/fleet/${editing.vehicle_id}/location`, {
        method: 'PATCH',
        token,
        body: { locationId: move.values.locationId, previousLocationId: editing.location_id },
      });
      setEditing(null);
      setRevision((n) => n + 1);
      notify('Pickup hub updated.');
    } catch (e) {
      move.setError(e.message);
    } finally {
      move.setBusy(false);
    }
  }
  async function saveHub(e) {
    e.preventDefault();
    const errors = Object.fromEntries(
      Object.entries(hub.values)
        .filter(([, v]) => !v.trim())
        .map(([k]) => [k, 'Complete this field.']),
    );
    if (!hub.validate(errors, e.currentTarget)) return;
    hub.setBusy(true);
    try {
      await api('/admin/locations', { method: 'POST', token, body: hub.values });
      setCreating(false);
      hub.setValues({ city: '', name: '', address: '' });
      setRevision((n) => n + 1);
      notify('Pickup hub created. Assign vehicles to make it bookable.');
    } catch (e) {
      hub.setError(e.message);
    } finally {
      hub.setBusy(false);
    }
  }
  return (
    <>
      <AdminNavigation fleet />
      <section className="panel fleet-management">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ONE VEHICLE. ONE HOME.</p>
            <h2>Fleet & pickup hubs</h2>
            <p className="muted">
              Each registration is a separate rental unit. Collection and return use the same hub.
            </p>
          </div>
          <div className="row-actions">
            <Button onClick={() => setVehicleEditor(null)}>Add vehicle</Button>
            <Button
              className="outline"
              onClick={() => {
                hub.setError('');
                setCreating(true);
              }}
            >
              Add pickup hub
            </Button>
          </div>
        </div>
        <div className="fleet-filter">
          <LocationField
            key={revision}
            allowAll
            value={locationId}
            onChange={(e) =>
              setParams({
                view: 'fleet',
                ...(e.target.value ? { locationId: e.target.value } : {}),
              })
            }
          />
          {locationId && (
            <Button className="outline small" onClick={() => setParams({ view: 'fleet' })}>
              Clear hub filter
            </Button>
          )}
          <Button className="small outline" onClick={() => setRevision((n) => n + 1)}>
            Refresh fleet
          </Button>
        </div>
        {result.loading ? (
          <Loading text="Loading fleet locations…" />
        ) : result.error ? (
          <ErrorMessage message={result.error} retry={result.retry} />
        ) : rows.length ? (
          <>
            <div className="table-wrap borderless">
              <table>
                <caption className="sr-only">Rental units and assigned pickup hubs</caption>
                <thead>
                  <tr>
                    <th scope="col">Vehicle / registration</th>
                    <th scope="col">Pickup & return hub</th>
                    <th scope="col">Daily rate</th>
                    <th scope="col">Status</th>
                    <th scope="col">Manage vehicle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.vehicle_id}>
                      <td>
                        <b>
                          {v.brand} {v.model}
                        </b>
                        <small>
                          {v.vehicle_number} · Unit #{v.vehicle_id}
                        </small>
                      </td>
                      <td>
                        <b>{v.city || 'Unassigned'}</b>
                        <small>{v.location_name || 'Assign a hub before booking'}</small>
                      </td>
                      <td>{money(v.price_per_day)}</td>
                      <td>
                        <Status value={v.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button className="small outline" onClick={() => setVehicleEditor(v)}>
                            Edit vehicle
                          </Button>
                          <Button
                            className="small outline"
                            disabled={v.location_locked}
                            onClick={() => {
                              move.setValues({ locationId: v.location_id || '' });
                              move.setError('');
                              move.setErrors({});
                              setEditing(v);
                            }}
                          >
                            Change pickup hub
                          </Button>
                        </div>
                        {v.location_locked && (
                          <small>Locked by an upcoming or active reservation</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              hasMore={result.data.length > 10}
              onChange={(p) => changeParams({ page: p })}
              label="Fleet"
            />
          </>
        ) : (
          <Empty
            title="No vehicles at this hub"
            text="Choose another hub or clear the filter to manage the whole fleet."
          />
        )}
      </section>
      {vehicleEditor !== undefined && (
        <VehicleEditor
          vehicle={vehicleEditor}
          token={token}
          onClose={() => setVehicleEditor(undefined)}
          onSaved={() => {
            setVehicleEditor(undefined);
            setRevision((n) => n + 1);
          }}
        />
      )}
      {editing && (
        <Modal
          title={`Move ${editing.brand} ${editing.model}?`}
          description={`${editing.vehicle_number} · Current hub: ${editing.city || 'unassigned'}. Saving changes where future customers collect and return this physical vehicle. Existing booking locations remain recorded.`}
          onClose={() => !move.busy && setEditing(null)}
        >
          <form noValidate className="stack-form" onSubmit={saveMove}>
            <LocationField required {...move.bind('locationId')} />
            <ErrorMessage message={move.error} />
            <div className="dialog-actions">
              <Button
                autoFocus
                type="button"
                className="outline"
                disabled={move.busy}
                onClick={() => setEditing(null)}
              >
                Keep current hub
              </Button>
              <Button type="submit" busy={move.busy}>
                Confirm pickup hub
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {creating && (
        <Modal
          title="Add pickup hub"
          description="Enter the city and collection address customers should use. Vehicles can only be assigned here when they have no active or upcoming reservations."
          onClose={() => !hub.busy && setCreating(false)}
        >
          <form noValidate className="stack-form" onSubmit={saveHub}>
            <Field label="City" required maxLength={80} {...hub.bind('city')} />
            <Field label="Hub name" required maxLength={100} {...hub.bind('name')} />
            <Field label="Pickup address" required maxLength={240} {...hub.bind('address')} />
            <ErrorMessage message={hub.error} />
            <div className="dialog-actions">
              <Button
                type="button"
                className="outline"
                disabled={hub.busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={hub.busy}>
                Create pickup hub
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <UnsavedGuard dirty={creating && !hub.busy && Object.values(hub.values).some(Boolean)} />
    </>
  );
}
