import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { Link, useBlocker } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LoaderCircle,
  X,
} from 'lucide-react';

export const Feedback = createContext(() => {});
export function FeedbackProvider({ children }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 6500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  return (
    <Feedback.Provider value={setMessage}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div className="toast">
            <Check size={18} />
            <span>{message}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setMessage('')}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </Feedback.Provider>
  );
}
export function Button({ children, busy, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={`button ${className}`}
    >
      <span className={busy ? 'invisible' : ''}>{children}</span>
      {busy && <LoaderCircle className="button-spinner spin" size={20} />}
    </button>
  );
}
export function Field({ label, name, error, type = 'text', children, ...props }) {
  const [show, setShow] = useState(false);
  const id = React.useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <div className={type === 'password' ? 'password-input' : ''}>
        {children ? (
          <select
            id={id}
            name={name}
            {...props}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            {children}
          </select>
        ) : (
          <input
            id={id}
            name={name}
            {...props}
            type={type === 'password' && show ? 'text' : type}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        )}{' '}
        {type === 'password' && (
          <button
            className="icon-button reveal"
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function useForm(initial) {
  const [values, setValues] = useState(initial),
    [errors, setErrors] = useState({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const bind = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      setErrors((v) => ({ ...v, [name]: '' }));
      setError('');
    },
  });
  function validate(next, form) {
    setErrors(next);
    setError('');
    const first = Object.keys(next)[0];
    if (first) {
      form.elements.namedItem(first)?.focus();
      return false;
    }
    return true;
  }
  return { values, setValues, errors, setErrors, error, setError, busy, setBusy, bind, validate };
}
export function ErrorMessage({ message, retry }) {
  return message ? (
    <div className="error-banner" role="alert">
      <AlertCircle size={19} />
      <div>
        {message}
        {retry && (
          <button type="button" className="text-button" onClick={retry}>
            Try again <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  ) : null;
}
export function Loading({ text = 'Loading…' }) {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle size={26} className="spin" />
      <p>{text}</p>
    </div>
  );
}
export function Empty({ title, text, children }) {
  return (
    <div className="state-panel empty-state">
      <span className="empty-mark">—</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Modal({ title, description, children, onClose }) {
  const ref = useRef();
  const titleId = React.useId(),
    descId = React.useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-icon">
        <AlertCircle size={26} />
      </div>
      <h2 id={titleId}>{title}</h2>
      <p id={descId}>{description}</p>
      {children}
    </dialog>
  );
}
export function UnsavedGuard({ dirty }) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  return (
    blocker.state === 'blocked' && (
      <Modal
        title="Leave this form?"
        description="Your unsaved entries will be lost."
        onClose={() => blocker.reset()}
      >
        <div className="dialog-actions">
          <Button autoFocus className="outline" onClick={() => blocker.reset()}>
            Keep editing
          </Button>
          <Button onClick={() => blocker.proceed()}>Leave form</Button>
        </div>
      </Modal>
    )
  );
}
export function Pagination({ page, hasMore, onChange, label = 'records' }) {
  return (
    <nav className="pagination" aria-label={`${label} pagination`}>
      <Button className="outline small" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} /> Previous
      </Button>
      <span>Page {page}</span>
      <Button className="outline small" disabled={!hasMore} onClick={() => onChange(page + 1)}>
        Next <ChevronRight size={16} />
      </Button>
    </nav>
  );
}
export function useData(path, token, revision = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: '' });
    api(path, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: e.message });
      });
    return () => controller.abort();
  }, [path, token, revision, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
export const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const days = (a, b) =>
  a && b ? Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000)) : 0;
export const displayDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value.slice(0, 10)))
    : 'Open-ended';
export function dateErrors(a, b, first = 'pickupDate', last = 'dropoffDate') {
  const errors = {};
  if (!a || a < today()) errors[first] = 'Choose today or a future date.';
  if (!b || b <= a) errors[last] = 'Choose a date after pickup.';
  return errors;
}
export const titleCase = (value) =>
  value
    ?.toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
export function Status({ value }) {
  return <span className={`status ${value}`}>{titleCase(value)}</span>;
}

export function Breadcrumb({ to, parent, current }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to={to}>{parent}</Link>
        </li>
        <li aria-current="page">
          <ChevronRight size={14} aria-hidden="true" />
          {current}
        </li>
      </ol>
    </nav>
  );
}
