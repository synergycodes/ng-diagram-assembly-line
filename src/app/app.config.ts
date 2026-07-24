import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zone-based change detection (zone.js polyfill declared in angular.json).
    // The live "monitor" feed pushes model updates from setInterval
    // callbacks; zone.js patches those so the canvas re-renders each tick.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
  ],
};
