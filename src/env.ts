// Written by `yarn env` (env.js) from .env or the CI environment.
import config from '../.env.json';

export const env = {
  production: config.NODE_ENV === 'production',
  STATS_URL: config.STATS_URL as string,
  /** `www` builds the landing site, anything else builds the stream site. */
  CURRENT_PAGE: config.CURRENT_PAGE as string,
  STREAM_PAGE_REDIRECT_URL: config.STREAM_PAGE_REDIRECT_URL as string,
  MAIN_PAGE_URL: config.MAIN_PAGE_URL as string,
};

/** The channel you land on when no channel is named. */
export const HERE = 'stream';
