import React, { useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  CarFront,
  Bike,
  CalendarDays,
  Check,
  ChevronRight,
  Fuel,
  Gauge,
  MapPin,
  MoveUpRight,
  Route as RouteIcon,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import { api } from './services/api';
import {
  Breadcrumb,
  Button,
  Field,
  Feedback,
  FeedbackProvider,
  ErrorMessage,
  Loading,
  Empty,
  Modal,
  Pagination,
  UnsavedGuard,
  useForm,
  useData,
  money,
  today,
  days,
  displayDate,
  dateErrors,
  titleCase,
  Status,
} from './components/ui';
import './styles.css';
const Auth = React.createContext();
function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem('driveease-session'));
  } catch {
    return null;
  }
}
function App() {
  const [session, setS] = useState(readSession),
    [checking, setChecking] = useState(!!readSession());
  const notify = useContext(Feedback);
  const logout = () => {
    sessionStorage.removeItem('driveease-session');
    setS(null);
  };
  const setSession = (value) => {
    sessionStorage.setItem('driveease-session', JSON.stringify(value));
    setS(value);
  };
  useEffect(() => {
    const expired = () => {
      logout();
      notify('Your session expired. Log in to continue.');
    };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  useEffect(() => {
    if (!session?.token) {
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    api('/auth/me', { token: session.token, signal: controller.signal })
      .then((user) => {
        if (!controller.signal.aborted)
          setS((s) => (s ? { ...s, user: { ...s.user, name: user.name, role: user.role } } : null));
      })
      .catch((e) => {
        if (!controller.signal.aborted) notify(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [session?.token]);
  return (
    <Auth.Provider
      value={{ user: session?.user, token: session?.token, setSession, logout, checking }}
    >
      <Layout />
    </Auth.Provider>
  );
}
function Brand() {
  return (
    <Link to="/" className="logo" aria-label="DriveEase home">
      <span className="brand-mark">
        <RouteIcon size={24} />
      </span>
      driveease<span className="brand-period">.</span>
    </Link>
  );
}
function Layout() {
  const { user, logout } = useContext(Auth),
    location = useLocation();
  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
      return;
    }
    window.scrollTo(0, 0);
    const heading = document.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }, [location.pathname, location.hash]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/vehicles">Find a ride</NavLink>
            <Link to="/#how-it-works">How it works</Link>
            {user && (
              <NavLink to="/bookings">
                {user.role === 'ADMIN' ? 'Reservations' : 'My bookings'}
              </NavLink>
            )}
            {user?.role === 'ADMIN' && <NavLink to="/admin">Operations</NavLink>}
          </nav>
          <div className="account">
            {user ? (
              <>
                <span className="user-name">Hi, {user.name.split(' ')[0]}</span>
                <button className="text-button" onClick={logout}>
                  Log out <ArrowUpRight size={16} />
                </button>
              </>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Log in
                </Link>
                <Link className="button small" to="/register">
                  Get started <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <Brand />
          <p>Good rides. Great possibilities.</p>
          <Link to="/vehicles">
            Find your next ride <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DriveEase</span>
          <span>
            A vehicle rental & management project <span className="footer-dot">•</span> Simulated
            payments only
          </span>
          <span>
            Made for the open road <RouteIcon size={15} />
          </span>
        </div>
      </footer>
    </>
  );
}
function PageTitle({ title }) {
  useEffect(() => {
    document.title = `${title} — DriveEase`;
    const heading = document.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }, [title]);
  return null;
}
const vehicleArt = (v) => v.image_url || '/images/open-road.jpg';
function VehicleCard({ vehicle: v, query = '' }) {
  return (
    <article className="vehicle-card">
      <Link
        className="vehicle-image"
        to={`/vehicles/${v.vehicle_id}${query}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <img src={vehicleArt(v)} alt="" loading="lazy" />
        <span className="vehicle-type">
          {v.vehicle_type === 'BIKE' ? <Bike size={15} /> : <CarFront size={15} />}{' '}
          {titleCase(v.vehicle_type)}
        </span>
        <span className="image-note">Illustrative image</span>
      </Link>
      <div className="vehicle-body">
        <div className="vehicle-heading">
          <div>
            <p className="vehicle-brand">{v.brand}</p>
            <h3>
              <Link to={`/vehicles/${v.vehicle_id}${query}`}>{v.model}</Link>
            </h3>
          </div>
          <span className="year">{v.year}</span>
        </div>
        <div className="vehicle-specs">
          <span>
            <Gauge size={15} />
            {titleCase(v.transmission)}
          </span>
          <span>
            <Fuel size={15} />
            {titleCase(v.fuel_type)}
          </span>
          {v.rating && <span>★ {v.rating}</span>}
        </div>
        <div className="vehicle-bottom">
          <div>
            <strong>{money(v.price_per_day)}</strong>
            <span> / day</span>
          </div>
          <Link
            className="round-link"
            to={`/vehicles/${v.vehicle_id}${query}`}
            aria-label={`View ${v.brand} ${v.model}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
      </div>
    </article>
  );
}
function SearchForm({ initial = {}, onSearch, compact = false }) {
  const f = useForm({
    type: initial.type || '',
    pickupDate: initial.pickupDate || '',
    dropoffDate: initial.dropoffDate || '',
  });
  const submit = (e) => {
    e.preventDefault();
    if (
      (f.values.pickupDate || f.values.dropoffDate) &&
      !f.validate(dateErrors(f.values.pickupDate, f.values.dropoffDate), e.currentTarget)
    )
      return;
    onSearch(f.values);
  };
  const clear = (e) => {
    f.setValues({ type: '', pickupDate: '', dropoffDate: '' });
    f.setErrors({});
    onSearch({});
    e.currentTarget.form.elements.namedItem('type').focus();
  };
  return (
    <form noValidate className={`ride-search ${compact ? 'compact-search' : ''}`} onSubmit={submit}>
      <Field label="Your kind of ride" {...f.bind('type')}>
        <option value="">Cars & bikes</option>
        <option value="CAR">Cars</option>
        <option value="BIKE">Bikes</option>
      </Field>
      <Field label="Pick-up date" type="date" min={today()} {...f.bind('pickupDate')} />
      <Field
        label="Return date"
        type="date"
        min={f.values.pickupDate || today()}
        {...f.bind('dropoffDate')}
      />
      <Button className="accent" type="submit">
        Find a ride <ArrowUpRight size={19} />
      </Button>
      {Object.values(f.values).some(Boolean) && (
        <button
          className="icon-button clear-search"
          type="button"
          onClick={clear}
          aria-label="Clear search"
        >
          <X size={18} />
        </button>
      )}
    </form>
  );
}
function Home() {
  const navigate = useNavigate();
  const fleet = useData('/vehicles?limit=3');
  return (
    <>
      <PageTitle title="A little further from ordinary" />
      <section className="home-intro container">
        <div className="intro-top">
          <p className="eyebrow">
            <span /> THE OPEN ROAD IS CALLING
          </p>
          <span className="intro-note">Cars. Bikes. Your next chapter.</span>
        </div>
        <div className="intro-heading">
          <h1>
            A little further
            <br />
            from <span>ordinary.</span>
          </h1>
          <div className="intro-description">
            <p>
              A quick city escape or the long way home. <br />
              Find a ride that feels like you, and make
              <br className="desktop-break" /> a little room for adventure.
            </p>
            <a className="text-link" href="#fleet">
              Meet your next ride <ArrowDownIcon />
            </a>
          </div>
        </div>
        <div className="hero-photo">
          <img
            src="/images/open-road.jpg"
            alt="A camper van beside a road winding through red rock canyons"
            fetchPriority="high"
          />
          <div className="hero-caption">
            <span className="caption-icon">
              <MoveUpRight size={25} />
            </span>
            <div>
              LESS ROUTINE. MORE ROAD.<small>Some plans are better with a detour.</small>
            </div>
          </div>
          <div className="photo-index">
            <MapPin size={14} /> Somewhere worth going
          </div>
        </div>
        <SearchForm
          onSearch={(q) =>
            navigate('/vehicles?' + new URLSearchParams(Object.entries(q).filter(([, v]) => v)))
          }
        />
        <div className="search-footnote">
          <span>
            <Check size={14} /> Choose your dates. See what’s available.
          </span>
          <span>
            <ShieldCheck size={15} /> Clear daily pricing
          </span>
        </div>
      </section>
      <section id="fleet" className="fleet-section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A RIDE FOR EVERY KIND OF DAY</p>
            <h2>Where to next?</h2>
          </div>
          <Link className="text-link" to="/vehicles">
            Explore the fleet <ArrowUpRight size={19} />
          </Link>
        </div>
        {fleet.loading ? (
          <Loading text="Finding your next ride…" />
        ) : fleet.error ? (
          <ErrorMessage message={fleet.error} retry={fleet.retry} />
        ) : fleet.data?.length ? (
          <div className="vehicle-grid">
            {fleet.data.map((v) => (
              <VehicleCard key={v.vehicle_id} vehicle={v} />
            ))}
          </div>
        ) : (
          <Empty
            title="The fleet is taking a breather"
            text="Check back soon for available cars and bikes."
          />
        )}
      </section>
      <section id="how-it-works" className="how-section">
        <div className="container how-inner">
          <div className="how-heading">
            <p className="eyebrow">LESS PLANNING. MORE GOING.</p>
            <h2>
              Your weekend
              <br />
              starts here.
            </h2>
            <p>
              From “let’s go” to keys in hand, <br />
              keep it simple.
            </p>
            <Link className="button" to="/vehicles">
              Find your ride <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="steps">
            {[
              [
                CarFront,
                'Find your kind of ride',
                'A car for company. A bike for the breeze. Browse the fleet and choose what suits your trip.',
              ],
              [
                CalendarDays,
                'Make the dates yours',
                'Choose pick-up and return dates. We check bookings and maintenance before you reserve.',
              ],
              [
                RouteIcon,
                'Book it. Look forward to it.',
                'Create an account, make a simulated payment and follow your booking as it gets approved.',
              ],
            ].map(([Icon, title, text], i) => (
              <div className="step" key={title}>
                <span className="step-icon">
                  <Icon size={24} />
                </span>
                <div>
                  <span className="step-label">STEP {i + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="closing container">
        <RouteIcon size={34} />
        <p>The best part of a plan?</p>
        <h2>Seeing where it takes you.</h2>
        <Link className="text-link" to="/vehicles">
          Let’s find your ride <ArrowUpRight size={20} />
        </Link>
      </section>
    </>
  );
}
function ArrowDownIcon() {
  return <ArrowRight className="arrow-down" size={18} />;
}
function Vehicles() {
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(12);
  const query = params.toString();
  const result = useData('/vehicles?' + query + `&limit=${limit + 1}`);
  const search = (q) => {
    setLimit(12);
    setParams(Object.entries(q).filter(([, v]) => v));
  };
  const items = result.data?.slice(0, limit) || [];
  const detailQuery = `?pickup=${params.get('pickupDate') || ''}&dropoff=${params.get('dropoffDate') || ''}`;
  return (
    <div className="container page">
      <PageTitle title="Find a ride" />
      <div className="page-heading">
        <p className="eyebrow">THE FLEET</p>
        <h1>
          A good day starts
          <br />
          with the right ride.
        </h1>
        <p>Find a car or bike for whatever you have in mind.</p>
      </div>
      <SearchForm key={query} initial={Object.fromEntries(params)} compact onSearch={search} />
      <div className="results-heading">
        <span>
          <SlidersHorizontal size={17} />{' '}
          {result.loading
            ? 'Checking the fleet…'
            : result.error
              ? 'The fleet is temporarily unavailable'
              : `${items.length}${result.data?.length > limit ? '+' : ''} rides to make your own`}
        </span>
        <span>Daily rates in INR</span>
      </div>
      {result.loading ? (
        <Loading text="Checking availability…" />
      ) : result.error ? (
        <ErrorMessage message={result.error} retry={result.retry} />
      ) : items.length ? (
        <>
          <div className="vehicle-grid">
            {items.map((v) => (
              <VehicleCard key={v.vehicle_id} vehicle={v} query={detailQuery} />
            ))}
          </div>
          {result.data.length > limit && (
            <div className="load-more">
              <Button className="outline" onClick={() => setLimit((n) => n + 12)}>
                Load more rides <ArrowRight size={17} />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Empty
          title="A different date, a different adventure"
          text="No rides match this search. Try another date or vehicle type."
        >
          <Button className="outline" onClick={() => search({})}>
            Clear filters
          </Button>
        </Empty>
      )}
    </div>
  );
}
function VehicleDetail() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    navigate = useNavigate();
  const { user, token } = useContext(Auth),
    notify = useContext(Feedback);
  const result = useData('/vehicles/' + id);
  const f = useForm({
    pickupDate: params.get('pickup') || '',
    dropoffDate: params.get('dropoff') || '',
    paymentMethod: 'UPI',
    destination: '',
    distanceKm: '',
  });
  const [saved, setSaved] = useState(false);
  const v = result.data;
  const totalDays = days(f.values.pickupDate, f.values.dropoffDate);
  async function submit(e) {
    e.preventDefault();
    if (
      !f.validate(
        {
          ...dateErrors(f.values.pickupDate, f.values.dropoffDate),
          ...(Number(f.values.distanceKm) < 0
            ? { distanceKm: 'Enter zero or a positive distance.' }
            : {}),
        },
        e.currentTarget,
      )
    )
      return;
    if (!user) {
      setSaved(true);
      navigate(
        '/login?returnTo=' +
          encodeURIComponent(
            location.pathname + `?pickup=${f.values.pickupDate}&dropoff=${f.values.dropoffDate}`,
          ),
      );
      return;
    }
    f.setBusy(true);
    try {
      const b = await api('/bookings', {
        method: 'POST',
        token,
        body: { ...f.values, vehicleId: Number(id), distanceKm: Number(f.values.distanceKm) || 0 },
      });
      setSaved(true);
      notify(`Booking #${b.bookingId} created. Your simulated payment is recorded.`);
      navigate('/bookings');
    } catch (e) {
      f.setError(e.message);
    } finally {
      f.setBusy(false);
    }
  }
  if (result.loading)
    return (
      <div className="container page">
        <PageTitle title="Loading ride" />
        <Loading text="Getting your ride ready…" />
      </div>
    );
  if (result.error)
    return (
      <div className="container page">
        <PageTitle title="Ride unavailable" />
        <ErrorMessage message={result.error} retry={result.retry} />
        <Link className="text-link" to="/vehicles">
          Back to the fleet
        </Link>
      </div>
    );
  return (
    <div className="container page">
      <PageTitle title={`${v.brand} ${v.model}`} />
      <Breadcrumb to="/vehicles" parent="The fleet" current={`${v.brand} ${v.model}`} />
      <div className="detail-grid">
        <section className="ride-overview">
          <div className="detail-image">
            <img src={vehicleArt(v)} alt={`Illustrative ${titleCase(v.vehicle_type)} photograph`} />
            <span className="image-note">Illustrative image · actual vehicle may differ</span>
          </div>
          <div className="detail-title">
            <div>
              <p className="eyebrow">
                {v.brand} / {v.year}
              </p>
              <h1>{v.model}</h1>
            </div>
            <Status value={v.status} />
          </div>
          <div className="spec-grid">
            <div>
              <CarFront />
              <span>Vehicle</span>
              <b>{titleCase(v.vehicle_type)}</b>
            </div>
            <div>
              <Gauge />
              <span>Transmission</span>
              <b>{titleCase(v.transmission)}</b>
            </div>
            <div>
              <Fuel />
              <span>Fuel</span>
              <b>{titleCase(v.fuel_type)}</b>
            </div>
          </div>
          <div className="ride-note">
            <ShieldCheck size={23} />
            <div>
              <b>Checked before you book</b>
              <p>Your dates are checked against existing bookings and scheduled maintenance.</p>
            </div>
          </div>
          <p className="muted">Registration: {v.vehicle_number}</p>
          {v.reviews?.length > 0 && (
            <section className="reviews">
              <h2>From fellow travellers</h2>
              {v.reviews.map((r) => (
                <blockquote key={r.review_id}>
                  <b>
                    {r.name} · {r.rating}/5
                  </b>
                  <p>{r.comment}</p>
                </blockquote>
              ))}
            </section>
          )}
        </section>
        <section className="booking-panel">
          <div className="booking-price">
            <strong>{money(v.price_per_day)}</strong>
            <span> / day</span>
          </div>
          <h2>Make it your next ride.</h2>
          <p className="muted">Choose your dates. We’ll check the rest.</p>
          <form noValidate onSubmit={submit} className="stack-form">
            <div className="field-row">
              <Field
                label="Pick-up date"
                required
                type="date"
                min={today()}
                {...f.bind('pickupDate')}
              />
              <Field
                label="Return date"
                required
                type="date"
                min={f.values.pickupDate || today()}
                {...f.bind('dropoffDate')}
              />
            </div>
            <Field label="Payment method" {...f.bind('paymentMethod')}>
              <option value="UPI">UPI (simulated)</option>
              <option value="CARD">Card (simulated)</option>
              <option value="CASH">Cash (simulated)</option>
            </Field>
            <details className="trip-details">
              <summary>
                Add trip details <span>Optional</span>
              </summary>
              <div className="stack-form">
                <Field label="Destination" maxLength={160} {...f.bind('destination')} />
                <Field
                  label="Distance in km"
                  type="number"
                  min="0"
                  max="999999"
                  {...f.bind('distanceKm')}
                />
              </div>
            </details>
            <div className="cost-summary">
              <span>
                {totalDays
                  ? `${money(v.price_per_day)} × ${totalDays} day${totalDays === 1 ? '' : 's'}`
                  : 'Select dates for your estimate'}
              </span>
              <strong>{money(totalDays * v.price_per_day)}</strong>
            </div>
            <ErrorMessage message={f.error} />
            <Button type="submit" busy={f.busy} disabled={v.status !== 'AVAILABLE'}>
              {user ? 'Confirm booking' : 'Log in to book'} <ArrowUpRight size={19} />
            </Button>
            <p className="payment-note">
              <ShieldCheck size={15} /> Demo payment only. No money is charged.
              <br />
              Bookings are subject to admin approval.
            </p>
          </form>
        </section>
      </div>
      <UnsavedGuard
        dirty={!saved && !f.busy && (!!f.values.destination || !!f.values.distanceKm)}
      />
    </div>
  );
}
function AuthPage({ register = false }) {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    { setSession } = useContext(Auth);
  const f = useForm({
    name: '',
    email: '',
    password: '',
    phone: '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
  });
  const [saved, setSaved] = useState(false);
  const returnTo = params.get('returnTo');
  const destination =
    returnTo && /^\/(vehicles(?:\/\d+)?|bookings|admin)(?:\?|$)/.test(returnTo)
      ? returnTo
      : '/vehicles';
  async function submit(e) {
    e.preventDefault();
    const v = f.values;
    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Enter a valid email address.';
    if (v.password.length < (register ? 6 : 1))
      errors.password = register ? 'Use at least 6 characters.' : 'Enter your password.';
    if (register) {
      if (!v.name.trim()) errors.name = 'Enter your full name.';
      if (!v.licenseNumber.trim()) errors.licenseNumber = 'Enter your driving licence number.';
      if (!v.issueDate || v.issueDate > today()) errors.issueDate = 'Enter a past issue date.';
      if (!v.expiryDate || v.expiryDate <= v.issueDate || v.expiryDate < today())
        errors.expiryDate = 'Enter a valid future expiry date.';
    }
    if (!f.validate(errors, e.currentTarget)) return;
    f.setBusy(true);
    try {
      const s = await api('/auth/' + (register ? 'register' : 'login'), {
        method: 'POST',
        body: v,
      });
      setSession(s);
      setSaved(true);
      navigate(destination);
    } catch (e) {
      f.setError(e.message);
    } finally {
      f.setBusy(false);
    }
  }
  return (
    <div className="container auth-layout">
      <PageTitle title={register ? 'Create account' : 'Log in'} />
      <aside className="auth-story">
        <img src="/images/open-road.jpg" alt="A road winding between red rock canyons" />
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            Good things <br />
            are down <br />
            the road.
          </h2>
          <p>A car. A bike. A change of scenery.</p>
        </div>
      </aside>
      <section className="auth-panel">
        <Breadcrumb to="/" parent="Home" current={register ? 'Create account' : 'Log in'} />
        <p className="eyebrow">{register ? 'NICE TO MEET YOU' : 'WELCOME BACK'}</p>
        <h1>{register ? 'Let’s get you going.' : 'Your next ride awaits.'}</h1>
        <p className="muted">
          {register
            ? 'A few details now. More possibilities ahead.'
            : 'Log in to book a ride and keep track of your trips.'}
        </p>
        <form noValidate onSubmit={submit} className="stack-form">
          {register && (
            <Field
              label="Full name"
              autoComplete="name"
              required
              maxLength={100}
              {...f.bind('name')}
            />
          )}
          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            required
            maxLength={150}
            {...f.bind('email')}
          />
          <Field
            label="Password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            minLength={register ? 6 : 1}
            {...f.bind('password')}
          />
          {register && (
            <>
              <p className="field-hint">
                Use at least 6 characters. You can paste or use a password manager.
              </p>
              <Field
                label="Phone number (optional)"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                {...f.bind('phone')}
              />
              <div className="form-divider">
                <ShieldCheck size={17} /> Driving licence details
              </div>
              <Field label="Licence number" required maxLength={60} {...f.bind('licenseNumber')} />
              <div className="field-row">
                <Field
                  label="Issue date"
                  type="date"
                  required
                  max={today()}
                  {...f.bind('issueDate')}
                />
                <Field
                  label="Expiry date"
                  type="date"
                  required
                  min={today()}
                  {...f.bind('expiryDate')}
                />
              </div>
            </>
          )}
          <ErrorMessage message={f.error} />
          <Button type="submit" busy={f.busy}>
            {register ? 'Create account' : 'Log in'} <ArrowUpRight size={18} />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? 'Already have an account?' : 'New around here?'}{' '}
          <Link
            to={`${register ? '/login' : '/register'}${returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : ''}`}
          >
            {register ? 'Log in' : 'Create an account'} <ArrowRight size={14} />
          </Link>
        </p>
      </section>
      <UnsavedGuard
        dirty={
          !saved && !f.busy && (register ? !!f.values.name || !!f.values.licenseNumber : false)
        }
      />
    </div>
  );
}
function Protected({ admin = false, children }) {
  const { user, checking } = useContext(Auth),
    location = useLocation();
  if (checking) return <Loading text="Checking your session…" />;
  if (!user)
    return (
      <Navigate
        replace
        to={'/login?returnTo=' + encodeURIComponent(location.pathname + location.search)}
      />
    );
  if (admin && user.role !== 'ADMIN')
    return (
      <div className="container page">
        <PageTitle title="Access restricted" />
        <h1 className="sr-only">Access restricted</h1>
        <Empty
          title="This area is for administrators"
          text="You can browse rides and manage your own bookings."
        >
          <Link className="button" to="/vehicles">
            Find a ride
          </Link>
        </Empty>
      </div>
    );
  return children;
}
function Bookings() {
  const { user, token } = useContext(Auth),
    notify = useContext(Feedback),
    [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [revision, setRevision] = useState(0),
    [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const result = useData(`/bookings?limit=11&offset=${(page - 1) * 10}`, token, revision);
  const rows = result.data?.slice(0, 10) || [];
  const setPage = (p) => setParams(p > 1 ? { page: p } : {});
  useEffect(() => {
    if (result.data?.length === 0 && page > 1) setPage(page - 1);
  }, [result.data]);
  async function change(b, status) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/bookings/${b.booking_id}/${status === 'CANCELLED' ? 'cancel' : 'status'}`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      setConfirm(null);
      setRevision((n) => n + 1);
      notify(`Booking #${b.booking_id} ${status.toLowerCase()}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <PageTitle title={user.role === 'ADMIN' ? 'Reservations' : 'My bookings'} />
      <div className="section-heading page-heading">
        <div>
          <p className="eyebrow">
            {user.role === 'ADMIN' ? 'FLEET OPERATIONS' : 'YOUR NEXT CHAPTERS'}
          </p>
          <h1>
            {user.role === 'ADMIN'
              ? 'Reservations, in order.'
              : 'A little something to look forward to.'}
          </h1>
          <p>Booking updates, dates and payment details, all in one place.</p>
        </div>
        <Link className="button outline" to="/vehicles">
          Find another ride <ArrowUpRight size={18} />
        </Link>
      </div>
      {!confirm && <ErrorMessage message={error} />}{' '}
      {result.loading ? (
        <Loading text="Finding your bookings…" />
      ) : result.error ? (
        <ErrorMessage message={result.error} retry={result.retry} />
      ) : rows.length ? (
        <>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                {user.role === 'ADMIN' ? 'All reservations' : 'Your bookings'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ride / booking</th>
                  <th scope="col">Your dates</th>
                  <th scope="col">Rental total</th>
                  <th scope="col">Demo payment</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.booking_id}>
                    <td>
                      <b>
                        {b.brand} {b.model}
                      </b>
                      <small>
                        #{b.booking_id}
                        {user.role === 'ADMIN' && ` · ${b.customer_name}`}
                      </small>
                    </td>
                    <td>
                      {displayDate(b.pickup_date)}
                      <small>to {displayDate(b.dropoff_date)}</small>
                    </td>
                    <td>
                      <b>{money(b.total_amount)}</b>
                    </td>
                    <td>
                      <Status value={b.payment_status} />
                      <small>{b.payment_method} · simulated</small>
                    </td>
                    <td>
                      <Status value={b.booking_status} />
                    </td>
                    <td>
                      {b.booking_status === 'PENDING' ? (
                        <div className="row-actions">
                          {user.role === 'ADMIN' ? (
                            <>
                              <Button
                                className="small outline"
                                busy={busy}
                                onClick={() => change(b, 'APPROVED')}
                              >
                                Approve
                              </Button>
                              <Button
                                className="small ghost danger"
                                disabled={busy}
                                onClick={() => {
                                  setError('');
                                  setConfirm({ booking: b, status: 'REJECTED' });
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Button
                              className="small ghost danger"
                              disabled={busy}
                              onClick={() => {
                                setError('');
                                setConfirm({ booking: b, status: 'CANCELLED' });
                              }}
                            >
                              Cancel booking
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="muted">—</span>
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
            onChange={setPage}
            label="Bookings"
          />
        </>
      ) : (
        <Empty
          title="The road is yours"
          text="Your bookings will appear here. Find a ride to start planning."
        >
          <Link className="button" to="/vehicles">
            Explore the fleet <ArrowUpRight size={18} />
          </Link>
        </Empty>
      )}
      {confirm && (
        <Modal
          title={`${confirm.status === 'CANCELLED' ? 'Cancel' : 'Reject'} booking #${confirm.booking.booking_id}?`}
          description={`${confirm.booking.brand} ${confirm.booking.model}, ${displayDate(confirm.booking.pickup_date)} to ${displayDate(confirm.booking.dropoff_date)}. This reservation will be released. Payments are simulated; no real money is involved.`}
          onClose={() => !busy && setConfirm(null)}
        >
          <ErrorMessage message={error} />
          <div className="dialog-actions">
            <Button autoFocus className="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Keep booking
            </Button>
            <Button
              className="danger-solid"
              busy={busy}
              onClick={() => change(confirm.booking, confirm.status)}
            >
              {confirm.status === 'CANCELLED' ? 'Cancel booking' : 'Reject booking'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Admin() {
  const { token } = useContext(Auth),
    notify = useContext(Feedback),
    [revision, setRevision] = useState(0),
    [confirm, setConfirm] = useState(false),
    [complete, setComplete] = useState(null),
    [completing, setCompleting] = useState(false),
    [completeError, setCompleteError] = useState(''),
    [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const dashboard = useData('/admin/dashboard', token, revision),
    maintenance = useData(`/admin/maintenance?limit=11&offset=${(page - 1) * 10}`, token, revision),
    vehicles = useData('/vehicles?limit=100', token, revision);
  const f = useForm({ vehicleId: '', type: 'Service', startDate: '', endDate: '', cost: '' });
  const d = dashboard.data;
  async function save() {
    f.setBusy(true);
    try {
      await api('/admin/maintenance', {
        method: 'POST',
        token,
        body: {
          ...f.values,
          vehicleId: Number(f.values.vehicleId),
          cost: Number(f.values.cost) || 0,
        },
      });
      setConfirm(false);
      f.setValues({ vehicleId: '', type: 'Service', startDate: '', endDate: '', cost: '' });
      setRevision((n) => n + 1);
      notify('Maintenance scheduled. Vehicle availability updated.');
    } catch (e) {
      f.setError(e.message);
    } finally {
      f.setBusy(false);
    }
  }
  async function finishMaintenance() {
    setCompleting(true);
    setCompleteError('');
    try {
      await api(`/admin/maintenance/${complete.maintenance_id}`, {
        method: 'PATCH',
        token,
        body: { status: 'COMPLETED' },
      });
      setComplete(null);
      setRevision((n) => n + 1);
      notify('Maintenance completed. Fleet availability refreshed.');
    } catch (e) {
      setCompleteError(e.message);
    } finally {
      setCompleting(false);
    }
  }
  function review(e) {
    e.preventDefault();
    const v = f.values,
      errors = {};
    if (!v.vehicleId) errors.vehicleId = 'Choose a vehicle.';
    if (!v.type.trim()) errors.type = 'Name the maintenance task.';
    if (!v.startDate) errors.startDate = 'Choose a start date.';
    if (v.endDate && v.endDate < v.startDate)
      errors.endDate = 'End date must be on or after start.';
    if (Number(v.cost) < 0) errors.cost = 'Enter zero or a positive cost.';
    if (f.validate(errors, e.currentTarget)) {
      setConfirm(true);
    }
  }
  return (
    <div className="container page">
      <PageTitle title="Operations" />
      <div className="page-heading">
        <p className="eyebrow">BEHIND EVERY GOOD RIDE</p>
        <h1>Keep things moving.</h1>
        <p>Your fleet, reservations and maintenance at a glance.</p>
      </div>
      {dashboard.loading ? (
        <Loading text="Loading fleet operations…" />
      ) : dashboard.error ? (
        <ErrorMessage message={dashboard.error} retry={dashboard.retry} />
      ) : (
        <>
          <div className="metrics">
            {[
              ['Simulated revenue', money(d.counts.revenue)],
              ['Customers', d.counts.customers],
              ['Available rides', d.counts.availableVehicles],
              ['Awaiting approval', d.counts.pendingBookings],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="admin-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">FLEET ACTIVITY</p>
                  <h2>Out on the road</h2>
                </div>
                <Link className="text-link" to="/bookings">
                  Reservations <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="table-wrap borderless">
                <table>
                  <caption className="sr-only">Vehicle utilization, top six vehicles</caption>
                  <thead>
                    <tr>
                      <th scope="col">Vehicle</th>
                      <th scope="col">Bookings</th>
                      <th scope="col">Rented days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.utilization.map((v) => (
                      <tr key={v.vehicle_id}>
                        <td>
                          <b>{v.vehicle}</b>
                          <small>{titleCase(v.vehicle_type)}</small>
                        </td>
                        <td>{v.booking_count}</td>
                        <td>{v.rented_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <p className="eyebrow">A LITTLE CARE GOES A LONG WAY</p>
              <h2>Schedule maintenance</h2>
              <p className="muted">Scheduled vehicles leave the available fleet.</p>
              <form noValidate onSubmit={review} className="stack-form">
                <Field
                  label="Vehicle"
                  required
                  disabled={vehicles.loading || !!vehicles.error}
                  {...f.bind('vehicleId')}
                >
                  <option value="">Choose an available vehicle</option>
                  {vehicles.data?.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.brand} {v.model} · {v.vehicle_number}
                    </option>
                  ))}
                </Field>
                <ErrorMessage message={vehicles.error} retry={vehicles.retry} />
                <Field label="Maintenance task" required maxLength={100} {...f.bind('type')} />
                <div className="field-row">
                  <Field label="Start date" type="date" required {...f.bind('startDate')} />
                  <Field
                    label="End date (optional)"
                    type="date"
                    min={f.values.startDate}
                    {...f.bind('endDate')}
                  />
                </div>
                <Field
                  label="Estimated cost (INR)"
                  type="number"
                  min="0"
                  step="0.01"
                  {...f.bind('cost')}
                />
                {!confirm && <ErrorMessage message={f.error} />}
                <Button type="submit">
                  Review maintenance <ArrowUpRight size={18} />
                </Button>
              </form>
            </section>
          </div>
        </>
      )}
      <section className="maintenance-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">IN GOOD HANDS</p>
            <h2>Maintenance records</h2>
          </div>
        </div>
        {maintenance.loading ? (
          <Loading text="Loading maintenance records…" />
        ) : maintenance.error ? (
          <ErrorMessage message={maintenance.error} retry={maintenance.retry} />
        ) : maintenance.data?.length ? (
          <>
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Scheduled and completed maintenance</caption>
                <thead>
                  <tr>
                    <th scope="col">Vehicle</th>
                    <th scope="col">Maintenance</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.data.slice(0, 10).map((m) => (
                    <tr key={m.maintenance_id}>
                      <td>
                        <b>
                          {m.brand} {m.model}
                        </b>
                        <small>{m.vehicle_number}</small>
                      </td>
                      <td>{m.maintenance_type}</td>
                      <td>
                        {displayDate(m.start_date)}
                        <small>to {displayDate(m.end_date)}</small>
                      </td>
                      <td>
                        <Status value={m.maintenance_status} />
                      </td>
                      <td>
                        {m.maintenance_status !== 'COMPLETED' ? (
                          <Button
                            className="small outline"
                            onClick={() => {
                              setCompleteError('');
                              setComplete(m);
                            }}
                          >
                            Mark complete
                          </Button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              hasMore={maintenance.data.length > 10}
              onChange={(p) => setParams(p > 1 ? { page: p } : {})}
              label="Maintenance"
            />
          </>
        ) : (
          <Empty title="All quiet in the workshop" text="Scheduled maintenance will appear here." />
        )}
      </section>
      {confirm && (
        <Modal
          title="Schedule this maintenance?"
          description={`${vehicles.data?.find((v) => String(v.vehicle_id) === f.values.vehicleId)?.brand || 'This vehicle'} will be removed from the available fleet until maintenance is completed. Existing reservations remain unchanged; check them before proceeding.`}
          onClose={() => !f.busy && setConfirm(false)}
        >
          <ErrorMessage message={f.error} />
          <div className="dialog-actions">
            <Button
              autoFocus
              className="outline"
              disabled={f.busy}
              onClick={() => setConfirm(false)}
            >
              Keep editing
            </Button>
            <Button busy={f.busy} onClick={save}>
              Schedule maintenance
            </Button>
          </div>
        </Modal>
      )}
      {complete && (
        <Modal
          title={`Complete ${complete.maintenance_type.toLowerCase()}?`}
          description={`${complete.brand} ${complete.model} will return to the available fleet when all its active maintenance is complete.`}
          onClose={() => !completing && setComplete(null)}
        >
          <ErrorMessage message={completeError} />
          <div className="dialog-actions">
            <Button
              autoFocus
              className="outline"
              disabled={completing}
              onClick={() => setComplete(null)}
            >
              Keep scheduled
            </Button>
            <Button busy={completing} onClick={finishMaintenance}>
              Mark complete
            </Button>
          </div>
        </Modal>
      )}
      <UnsavedGuard dirty={!f.busy && !confirm && !!f.values.vehicleId} />
    </div>
  );
}
function NotFound() {
  return (
    <div className="container page">
      <PageTitle title="Page not found" />
      <h1 className="sr-only">Page not found</h1>
      <Empty
        title="A small detour."
        text="This page doesn’t exist. Let’s get you back on the road."
      >
        <Link className="button" to="/vehicles">
          Explore the fleet <ArrowUpRight size={18} />
        </Link>
      </Empty>
    </div>
  );
}
const router = createBrowserRouter([
  {
    element: (
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    ),
    children: [
      { path: '/', element: <Home /> },
      { path: '/vehicles', element: <Vehicles /> },
      { path: '/vehicles/:id', element: <VehicleDetail /> },
      { path: '/login', element: <AuthPage /> },
      { path: '/register', element: <AuthPage register /> },
      {
        path: '/bookings',
        element: (
          <Protected>
            <Bookings />
          </Protected>
        ),
      },
      {
        path: '/admin',
        element: (
          <Protected admin>
            <Admin />
          </Protected>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
