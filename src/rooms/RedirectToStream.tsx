import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { env } from '../env';

/** On the landing site, /stream and everything under it lives on the stream site. */
export default function RedirectToStream() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.location.href = `${env.STREAM_PAGE_REDIRECT_URL}${pathname.replace('/stream', '')}${search}`;
  }, [pathname, search]);
  return <div className="fixed inset-0 bg-void" />;
}
