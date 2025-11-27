// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { default as config } from '../../.env.json';

const environment = {
  production: config.NODE_ENV === 'production',
  CHAT_URL: config.CHAT_URL,
  STATS_URL: config.STATS_URL,
  STATS_SERVER: config.STATS_SERVER,
  WSS_URL: config.WSS_URL,
  MPD_URL: config.MPD_URL,
  CURRENT_PAGE: config.CURRENT_PAGE,
  STREAM_PAGE_REDIRECT_URL: config.STREAM_PAGE_REDIRECT_URL,
  MAIN_PAGE_URL: config.MAIN_PAGE_URL,
};

console.log(environment);

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

export default environment;
