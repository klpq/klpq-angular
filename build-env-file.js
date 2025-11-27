const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV,
  CHAT_URL: process.env.CHAT_URL,
  STATS_URL: process.env.STATS_URL,
  STATS_SERVER: process.env.STATS_SERVER,
  WSS_URL: process.env.WSS_URL,
  MPD_URL: process.env.MPD_URL,
  CURRENT_PAGE: process.env.CURRENT_PAGE,
  STREAM_PAGE_REDIRECT_URL: process.env.STREAM_PAGE_REDIRECT_URL,
  MAIN_PAGE_URL: process.env.MAIN_PAGE_URL,
};

console.log(env);

fs.writeFileSync('./.env.json', JSON.stringify(env));
