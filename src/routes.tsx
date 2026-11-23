import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { env } from './env';
import Home from './rooms/Home';
import RedirectToStream from './rooms/RedirectToStream';

const Screening = lazy(() => import('./rooms/screening/Screening'));

const screening = (
  <Suspense fallback={<div className="fixed inset-0 bg-void" />}>
    <Screening />
  </Suspense>
);
const home: RouteObject = { path: '/', element: <Home /> };
const elsewhere: RouteObject = {
  path: '*',
  element: <Navigate to="/" replace />,
};

/** klpq.io: the room, and a door to the stream site. */
const wwwRoutes: RouteObject[] = [
  home,
  { path: '/stream/*', element: <RedirectToStream /> },
  elsewhere,
];

/** stream.klpq.io: the room, and every channel at /:channel[/:protocol[/:app]]. */
const streamRoutes: RouteObject[] = [
  home,
  { path: '/:channel/:protocol/:app', element: screening },
  { path: '/:channel/:protocol', element: screening },
  { path: '/:channel', element: screening },
  elsewhere,
];

export const router = createBrowserRouter(
  env.CURRENT_PAGE === 'www' ? wwwRoutes : streamRoutes,
);
