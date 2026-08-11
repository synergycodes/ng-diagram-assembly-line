import { effect, signal, type WritableSignal } from '@angular/core';

/**
 * localStorage helpers with the SSR guard + private-mode/quota try-catch in one
 * place, so services don't each re-implement the boilerplate.
 */

/** Reads and JSON-parses `key`, returning `fallback` when absent/unavailable/corrupt. */
function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** JSON-serialises `value` into `key`, ignoring write failures. */
function writeStorage<T>(key: string, value: T): void {
  writeStorageRaw(key, JSON.stringify(value));
}

/**
 * Writes a raw string (no JSON wrapping) — for values also read by non-JSON
 * consumers, e.g. the pre-paint theme script in index.html.
 */
export function writeStorageRaw(key: string, value: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore (private mode / quota)
  }
}

/**
 * A writable signal seeded from localStorage that re-persists (as JSON) on every
 * change. Must be created in an injection context (the effect needs one).
 */
export function persistedSignal<T>(key: string, fallback: T): WritableSignal<T> {
  const state = signal<T>(readStorage(key, fallback));
  effect(() => writeStorage(key, state()));
  return state;
}
