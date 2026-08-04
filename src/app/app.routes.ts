import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./assembly-line/pages/assembly-line-page/assembly-line-page.component').then(
        (m) => m.AssemblyLinePageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
