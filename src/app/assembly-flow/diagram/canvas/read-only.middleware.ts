import { createMiddlewares, type Middleware } from 'ng-diagram';

/**
 * Model actions blocked while the diagram is read-only (monitor mode) — every
 * user-driven structural edit. Notably absent: `updateNode`/`updateNodes` (the
 * live data-bus feed applies metrics through them), plus selection and viewport/
 * zoom, which stay enabled so the monitor remains navigable and inspectable.
 */
export const READ_ONLY_BLOCKED_ACTIONS = new Set<string>([
  'moveNodesBy',
  'moveNodes',
  'moveNodesStart',
  'moveNodesStop',
  'deleteSelection',
  'deleteNodes',
  'deleteEdges',
  'deleteElements',
  'addNodes',
  'addEdges',
  'paletteDropNode',
  'paste',
  'clearModel',
  'updateEdge',
  'resizeNode',
  'resizeNodeStart',
  'resizeNodeStop',
  'startLinking',
  'moveTemporaryEdge',
  'finishLinking',
  'rotateNodeTo',
  'rotateNodeStart',
  'rotateNodeStop',
  'changeZOrder',
]);

/**
 * Read-only guard: in monitor mode the diagram is view-only, so every user
 * structural edit is cancelled before it reaches the model. Runs ahead of the
 * default chain; live data-bus updates (`updateNode`) are not in the block set,
 * so they still flow through.
 *
 * @param isMonitor Reactive predicate — read afresh on every action so the guard
 *   follows the live mode without rebuilding the middleware chain.
 */
export function createReadOnlyMiddlewares(isMonitor: () => boolean) {
  return createMiddlewares((defaults) => [
    {
      name: 'read-only-monitor',
      execute: (context, next, cancel) => {
        if (
          isMonitor() &&
          context.modelActionTypes.some((action) => READ_ONLY_BLOCKED_ACTIONS.has(action))
        ) {
          cancel();
          return;
        }
        next();
      },
    } satisfies Middleware,
    ...defaults,
  ]);
}
