import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./assembly-flow/pages/assembly-flow-page/assembly-flow-page.component').then(
        (m) => m.AssemblyFlowPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
