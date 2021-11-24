import { environment } from 'src/environments/environment';

export const getLink = (name, app) => {
  return `${environment.WSS_URL}/${app}/${name}.flv`;
};

export const getMpdLink = (name, app) => {
  return `${environment.MPD_URL}/mpd/${app}_${name}/index.mpd`;
};
