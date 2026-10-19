-- DriveEase uses its Express API and a server-only PostgreSQL connection.
-- Supabase client keys must not expose application tables, views or functions.
DO $$
DECLARE
  object_name text;
  client_role text;
BEGIN
  FOREACH object_name IN ARRAY ARRAY['users','driving_licenses','vehicles','vehicle_images','bookings','payments','maintenance','trip_details','reviews'] LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', current_schema(), object_name);
  END LOOP;
  FOREACH object_name IN ARRAY ARRAY['booking_details','vehicle_utilization'] LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', current_schema(), object_name);
  END LOOP;
  FOREACH client_role IN ARRAY ARRAY['PUBLIC','anon','authenticated'] LOOP
    IF client_role = 'PUBLIC' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
      FOREACH object_name IN ARRAY ARRAY['users','driving_licenses','vehicles','vehicle_images','bookings','payments','maintenance','trip_details','reviews','booking_details','vehicle_utilization'] LOOP
        EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %s', current_schema(), object_name, CASE WHEN client_role='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(client_role) END);
      END LOOP;
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.customer_booking_history(bigint) FROM %s', current_schema(), CASE WHEN client_role='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(client_role) END);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.sync_vehicle_maintenance_status() FROM %s', current_schema(), CASE WHEN client_role='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(client_role) END);
    END IF;
  END LOOP;
END;
$$;
