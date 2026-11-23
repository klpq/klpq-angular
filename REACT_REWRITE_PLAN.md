# KLPQ: React rewrite and redesign

React rewrite and full redesign. The concept, look, copy and interactions are designed from scratch. Nothing from the current site's design is kept. The only things that survive are the functional contract in section 6 (URLs, stats API, playback, commands, deployment) and whichever asset files are worth reusing.

## Status

Built and running on the `react-rewrite` branch:

- The app is at the repo root; the Angular sources are removed on this branch. `yarn start`, `yarn build`, `yarn build:azure`, `yarn env` and `yarn test` work.
- **Arrival dial**, played in full on every fresh load and skipped only when you come back from a stream page. Clicking the logo in the room returns to it.
- **Sound is on by default** on the dial and in the room, and starts at the first key or click because browsers require one. Quiet static on the dial, hum and the ambient track in the room, a crackle when the electricity arcs. The ear turns it off and the choice is remembered. Stream pages make no sound of their own.
- **Waiting Room** on real API data. Channels come from the API and are never hard-coded.
  - Five gaps in the back curtain with twenty filtered pictures behind them.
  - The floating television shows a ceiling camera's view of the room, with you sitting in it.
  - It snows indoors.
  - Vibes, not references: cold light through blinds that are not there sweeps the room as if a car passed outside; smoke rises from just out of frame; every forty seconds the camera stares at the wrong thing for a while and comes back.
  - Clicking the dark figure makes the lights flicker out for about a second. When they come back he is gone for twenty seconds and the room says "he is gone now." No jumpscare.
  - About seventy murmurs, shuffled per visit, in one voice: a tired man at night, a town that is cheerful about something it will not name.
- **Stream page** with the real player for FLV, HLS and DASH and the old site's behaviours (volume memory, click guard, Firefox surface, token link, saved channels). The television rail stays on the left. No hotkeys, no lights mode.
- **The Exchange**, opened by clicking the pyramid on the room or a stream page: type to filter, arrows move the cord, Enter connects, and an unknown name connects anyway.
- **The Schedule**, computed from the UTC clock so everyone sees the same thing: a hijack of every television, a voice reading digits, a station card on the hour, and the blue hour between three and four in the morning. `?force=hijack`, `numbers`, `ident` or `deadhour` shows one on demand.
- A static room for devices without WebGL and for reduced-motion settings (`?static` shows it).
- Unused assets deleted. Sixteen downloaded images, logged in `ASSETS.md`.
- Unit tests for channel logic and the schedule.

Not built yet:

- Hover previews of live streams on the wall; live sets play a stock clip for now.
- A performance probe that drops weak devices to the static room automatically.
- The laugh takeover, the telephone.

Decided against: literal game references (comic panels, a case notebook, title cards, interrogation buttons, coffee, gauges), a credits card, ESLint, Playwright, re-encoding the clips, stream-page hotkeys and the lights mode. `yarn lint` type-checks only.

Deviation from the stack table: React Router 7, not 8, because 8 needs a newer Node than the one installed locally. No `cmdk`; the Exchange has its own small list logic.

## 1. The concept

**It is 2030 and the internet is dead.** It still loads. But the feeds are machines talking to machines, every door asks you to sign in, every link leads to a page that used to be something. Nobody is there.

**KLPQ is the last free broadcast station.** Unlicensed, unlisted, squatting on infrastructure someone forgot to switch off. It transmits from a room with no address, in a forest full of boars. It has no accounts, no feed, no likes, no chat, no recommendations. You do not browse it. You tune in, the way you found a pirate signal at 3 a.m. by turning a dial through static.

And it is under the kolpak (_под колпаком_, under the bell jar): the station knows it is being watched, and it watches back.

Two things are true at once, and the design lives in the gap between them:

- **It is the newest thing on the internet.** Real-time 3D, a room lit by the actual bitrate, events that every viewer on Earth sees in the same second without a server coordinating them.
- **It looks like the last thing left on the internet.** Dust, dead links, a guestbook that has been full since 2009, a visitor counter that stopped.

### Voice

Decided after the first style frames. These override any example copy elsewhere in this document.

- **English.** The one exception is the community's own word, _подколпаком_, which sits under the logo unexplained.
- **No slogans, no taglines, no year.** Nothing that sounds like a poster for the concept. "The last free station", "2030", "unlicensed, unlisted, still on air" and anything like them are out of the interface. The concept is felt, never stated.
- **Cryptic and dreamlike.** Lowercase, plain words, concrete objects, no explanation: _"someone left the television on in the forest."_ _"the pig knows your name. it is not telling."_ A line should read like something overheard, not written.
- **Numbers go unlabelled.** The clock, channels on air, transmission count and days on air appear as bare figures.
- **Functional labels stay plain** (`WATCH STREAM`, `CARRIER LOCKED`, the stream page's data line), so nothing you need is hidden behind a riddle.

### Seven laws

1. **You tune, you do not browse.** Arrival is a dial through a dead band. Changing channels is zapping. Loading is called tuning, and looks like it.
2. **The site is a place.** You move through curtains, into televisions, down corridors. Every control is an object in a room.
3. **Electricity is alive.** The hum is a character. Lights are powered by the signal: when the bitrate drops, the room dims. Arcs jump. Something lives in the wiring.
4. **The station watches back, and keeps nothing.** It tells you your local time, how long you have been still, how many times you have come here. All of it is read in your browser and never leaves it. The surveillance is theatre; the privacy is real. That contrast with the dead internet is the point.
5. **Reality slips.** Things repeat slightly wrong. The room remembers your last visit and has aged since. A boar is carrying a videotape and nobody explains why.
6. **Everything is narrated.** A tired detective describes your buffering in graphic-novel caption boxes. Intrusive thoughts arrive as captions and are not explained.
7. **Symmetry or nothing.** One-point perspective, dead-center compositions, slow push-ins, hard title cards.

One law above all of them: **the stream page is for watching.** Nothing is ever laid over the picture, nothing strange ever appears on that page uninvited, and the only sound it ever makes is the stream. It is stylized, not haunted. The madness lives in the Dead Band and the Waiting Room.

### Where each influence lands

| Influence                                                                           | What it becomes                                                                                                        |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Lynch: the Red Room                                                                 | The Waiting Room itself. Captions that type backwards and then right themselves.                                       |
| Lynch: electricity, the broadcast hijack in _The Return_                            | Law 3, and the Takeovers in section 3.6                                                                                |
| Lynch: "it is all a tape" (_Mulholland Drive_)                                      | The offline state. The station quietly doubts whether anything was ever live.                                          |
| Lynch: tapes on the doorstep, the man who is already at your house (_Lost Highway_) | The telephone, and the station reading your own details back to you                                                    |
| Lynch: the rabbit sitcom (_Inland Empire_)                                          | A laugh track at the wrong moment                                                                                      |
| Lynch: the ear in the grass (_Blue Velvet_)                                         | The sound control is an ear                                                                                            |
| Lynch: the blue key                                                                 | The access token. A `?token=` link is "the key".                                                                       |
| Lynch: the daily weather report                                                     | Today's number, drawn once a day, the same for everyone                                                                |
| Kubrick                                                                             | Law 7. The watching eye. The slit-scan tunnel when you enter a television. A hexagonal corridor carpet in that spirit. |
| Dupieux, _Reality_                                                                  | The tape inside the boar. Televisions that show the room you are standing in, one layer down.                          |
| Max Payne                                                                           | Narration boxes, the detective voice, the television shows inside the world                                            |
| L.A. Noire                                                                          | The channel as a case file: witnesses, time on air, signal                                                             |
| Podkolpakom                                                                         | Law 4. Photocopied samizdat texture: rubber stamps, redaction bars, typewriter.                                        |
| The dead internet                                                                   | The Dead Band, and the wreckage in section 2                                                                           |
| Numbers stations, pirate radio, public-access cable                                 | Station idents on the hour, a synthetic voice reading digits, test cards                                               |

All of these are mood. No new stills, quotes or music from any of them are added. The clips already in the repo are footage from _Twin Peaks_; they are reused at your direction and are the one exception, and the rights to them are yours to judge.

## 2. Visual system

**Palette**

| Role      | Color                  | Where                                                                            |
| --------- | ---------------------- | -------------------------------------------------------------------------------- |
| Lodge red | `#A30D14`              | Curtains, primary accent, on-air state                                           |
| Void      | `#070506`              | Everything that is not lit                                                       |
| Bone      | `#E8DFC8`              | Text, title cards, the light chevrons of the floor                               |
| Sodium    | `#F0B040`              | Streetlight yellow: captions, stamps, focus rings                                |
| Phosphor  | `#7DFFC0`              | CRT green: on-screen display, signal, timecode                                   |
| Arc       | `#5AA8FF`              | Electricity and the key. Never on screen for more than a second, except the key. |
| Dead link | `#0000EE` on `#C0C0C0` | Only for wreckage from the dead internet                                         |

**Type**

- **Boska** (Fontshare): high-contrast serif with a dramatic italic. Channel names, narration.
- **Tanker** (Fontshare): heavy condensed caps. Title cards, stamps, anything that shouts.
- **JetBrains Mono** (Fontshare): timecodes, the on-screen display, typewritten documents. Covers Cyrillic, so it is the fallback for channel names.
- **Times New Roman, unstyled, from the system.** Used on purpose for dead-internet wreckage: default blue links, grey boxes. It costs zero bytes and reads instantly as "abandoned".

**Three texture layers**, always in this order from back to front:

1. **Film:** grain, halation around bright things, chromatic split at the edges, slow gate weave.
2. **Tape:** scanlines only on things that are diegetically CRTs, tracking tears and static bursts during transitions, video feedback (the pattern you get by pointing a camera at its own monitor) as the psychedelic engine.
3. **Paper:** photocopier noise, rubber stamps (`UNLICENSED`, `UNLISTED`, `ON AIR`), black redaction bars, typewriter strike-through. This is the samizdat layer; it is how the station labels things.

**The wreckage.** Fragments of the dead internet drift through the site as debris, rendered in the dead-link style: a cookie banner with no buttons, "Sign in to continue", "This account has been suspended", a captcha nobody can pass, a 404, a paragraph of obviously machine-written filler. They are props. None of them work. They never block anything.

**The relics.** Things an old personal site would have, all deliberately stuck: a visitor counter frozen at one number, a guestbook marked full since 2009, a webring where both neighbours are dead, an "under construction" sign with cobwebs, "best viewed in a dark room".

**Motion language.** Slow and deliberate by default (600 to 1200 ms, long ease-outs, camera push-ins). Interrupted by violent short events (80 to 250 ms: static burst, arc flash, tape tear). Nothing in between. No bouncy springs anywhere.

### Assets

The look is collage: cut-out photographic objects with hard edges, placed in a 3D room and lit as if they belong there. Cheap, strange, deliberate.

**Reused from the repo where they fit**

- `tv.gltf`: the televisions.
- `boar.png`: one of the boars.
- `lefthand.png`, `righthand.png`: the hands that creep in when you idle.
- `klpq.svg`: the green pyramid, used as the station's mark with an animated eye drawn over it.
- `index/bg.jpg`: the house at night.
- The cassette art in `klpq_on.png`: the tape, or a reference for a new one.
- `kaban.png`: the share image.
- The ten `.mp4` clips: television feeds, re-encoded from 5 to 22 MB each down to roughly 1 MB. Any clip that does not suit the room is dropped.

Everything else in `src/assets` is deleted.

**New cut-outs to source.** Wishlist, trimmed in Phase 0: a mounted boar head, an owl, a human ear, a hanging traffic light, a ceiling fan, a rotary telephone, a floor lamp with a fringed shade, a reel-to-reel recorder, a shortwave radio with a tuning dial, a transmitter mast, utility poles and wires, a cup of black coffee, a typewriter, an empty armchair, a log, a blue key, venetian-blind shadow masks, velvet and carpet textures.

**Already downloaded** (six photos from Wikimedia Commons, all CC BY 2.0, logged in `ASSETS.md`): two portraits of David Lynch, Kyle MacLachlan and Sheryl Lee at the 1990 Emmys, Twede's Cafe in North Bend, and the road with the town sign view in Snoqualmie. CC BY needs a credit line somewhere on the site.

**Not used:** `left.png` and `right.png`.

**Sources.** Public domain or freely licensed only (CC0, CC BY, CC BY-SA with credit):

- Photographs and cut-outs: Wikimedia Commons (public domain and CC0 only), Smithsonian Open Access, The Met Open Access, Rawpixel's public domain collection, Pexels, Unsplash. Photos that are not already transparent get their backgrounds removed locally.
- 3D models, textures and lighting: Poly Haven (all CC0), plus CC0 models on Sketchfab.
- Sound: Freesound, CC0 only.

Every downloaded file is recorded in `ASSETS.md` with its source URL, author and license, and I will list the files for you before fetching them.

## 3. The rooms

### 3.1 The Dead Band (arrival)

You do not land on a home page. You land on a radio dial, already turning.

The whole viewport is a shortwave band in the dark: a needle sweeping, static, a frequency readout. The band is crowded. Every few hundred kilohertz something surfaces out of the snow, full screen, for under a second, and sinks again:

- **Footage:** the station's own clips (the face, the fan, the scream, the picnic), each treated differently.
- **Pictures:** the pig, enormous and pixelated; the house at night; David Lynch; the diner; the road into town; a hand reaching in from the edge.
- **Phrases:** a single murmur in large italic serif.
- **Wreckage:** a login wall, a captcha. A minority now, among the rest.

Then a carrier tone, a red glow, and the letters **KLPQ** pull into focus with _подколпаком_ beneath them and one murmur that changes daily.

The curtain opens out of the static and you are in the Waiting Room.

- The needle stops at each thing for about a second, long enough to see it: roughly twenty seconds on a first visit, about three on later ones. Any key, click or tap skips it instantly.
- You can grab the dial and tune it yourself. Overshoot the signal and you are back in the dead stations.
- It is drawn in 2D and starts immediately, so it doubles as the loading screen while the 3D room downloads behind it.
- A direct link to a stream page skips it entirely and goes straight to a static burst and the picture.

### 3.2 The Waiting Room (home page)

A real 3D room. Red curtains on three sides, chevron floor with a soft reflection, strict one-point perspective. In the center, a wall of CRT televisions. The room is lit by the televisions and by one sodium lamp that buzzes.

- **Each television is a channel.** Live channels play a feed with the channel name burned into the corner and a red tally light. Dead channels show snow. The center set is `stream`, the default channel.
- **Rerouting to a stream is one click.** Click a television and the camera pushes into its glass, through a one-second slit-scan tunnel of light in the station's colors, and out onto that stream page. On desktop, hovering a live set attaches the real stream, muted, as a preview.
- **It is never a puzzle.** A stamped `WATCH STREAM` control is always visible, Enter always goes to `stream`, and every television is a real focusable link labelled with its channel name. Anyone who just wants the stream gets there in one action.
- **One television shows the room.** It shows the Waiting Room from where you are standing, a second late, with a smaller television inside it showing the same thing, and so on down. Move the cursor and all the layers follow, each a little behind.
- **The boars.** The boar is the station's only staff, in three guises. A mounted head above the television wall whose glass eyes follow the cursor. A cut-out boar that sometimes walks through the room behind the sets, at no fixed interval, and is sometimes two boars, the second a frame behind the first. And the host on the test card. Click the walking boar: it stops, looks at you, and leaves a videotape on the floor. Click the tape: every television syncs to the same clip for a few seconds, then the station denies it happened.
- **The pyramid.** The station's existing mark, the green engraved pyramid, hangs over the television wall. The eye inside it is redrawn so it follows the cursor and blinks. Clicking it opens the Exchange (section 3.5). The same pyramid sits in the corner of the stream page.
- **The ear.** On the floor, in the corner. It is the sound control. Sound is off until you click it.
- **The telephone.** It rings once per visit. Answer it and a caption tells you things about yourself: your local time, the name of your time zone's city, how long since you last moved, how many times you have been here. Then: "We keep none of it." Then it never rings again that day.
- **Behind the curtains.** The back wall is four curtains with three gaps that breathe open at different times. Behind each is a wall-sized picture that changes only while its gap is shut: Lynch, the cast, the diner, the road, the house, the pig. Boars pass back there too and are seen only through the gaps.
- **The herd.** Many boars, not one: the pair that is one boar twice, small ones crossing the floor in a line, two on the ceiling walking the other way, one standing at the edge of the room that never moves and is breathing, and one that passes so close it is only a shape.
- **The guest.** Someone is standing at the back of the room. Every time the electricity arcs they are a step closer. Then they are gone, and it starts again.
- **The set that shows the room.** A television on no channel hangs near the ceiling and shows this room a few frames late, with itself inside it, and so on down.
- **Dead sets are not empty.** Their snow rolls, and now and then a face that is not being broadcast holds in it for a moment.
- **The room turns over.** For a few seconds in every minute the whole room is mirrored, labels and all. The floor pattern crawls toward you slowly enough to doubt. The shadow of a fan sweeps the floor; there is no fan. Hands come out of the dark at the edges. Some murmurs are typed backwards.
- **Light.** Bright things bloom, colour splits toward the edges of the frame, and the picture tears for a fraction of a second at long, uneven intervals.
- **Smaller objects.** A cup of coffee that is fuller each time you look back at it. A ceiling fan whose shadow turns slightly slower than the fan. A traffic light in the far corner, swinging, always red.
- **The relics** from section 2 are pinned to the back wall like notices in a stairwell.
- **The room remembers.** Your visit count is kept locally. By the fifth visit there is more dust and a notice has fallen off the wall. By the twentieth a second chair has appeared, facing yours.

**Mobile.** No free camera. The room becomes a portrait corridor with a hexagonal carpet: televisions stacked in perspective, scroll walks you down it, drag tilts the view slightly. Tap a set to enter. Fewer sets, a cheaper shader, the same objects placed along the walls.

**Fallback.** No WebGL, reduced motion, or a weak GPU: a static composed photograph of the room with the same links. Chosen automatically by a performance probe.

### 3.3 The Screening Room (stream page)

**Rules for this page, without exceptions**

- Nothing overlays the picture. Not grain, not captions, not a channel number, not a transition once the stream is playing.
- No sound except the stream. No hum, no clicks, no tones, no voice, whatever the sound setting in the Waiting Room is.
- No Takeovers, no Schedule events, no boars, no hands, no wreckage, no relics. Nothing on this page moves unless it is the stream, live data, or something you did.
- Styling is limited to the controls, the data display, the frame around the picture, and the three states where there is no picture to watch.

The room goes dark and the picture takes over. Desktop: the 16:9 picture as large as the viewport allows, centered, a thin channel rail on the left edge, one display line underneath. Mobile: picture pinned to the top, everything else in a bottom sheet.

**Around the picture**

- **Bias light.** The stream is redrawn, tiny and heavily blurred, behind the frame, so the dark room glows with whatever is on.
- **The room runs on the signal.** The brightness of the glow follows the real bitrate, slowly and silently. A strong stream gives a steady warm room, a weak one a dimmer room. When the stream dies, the lights go with it.
- **Curtains at the edges** of the viewport, barely visible, catching the glow.
- **No WebGL on this page.** CSS and one small 2D canvas. The GPU belongs to the video decoder.

**The on-screen display** shows what the stats API returns, as a VCR overlay in Phosphor mono:

| Data            | Shown as                                                                |
| --------------- | ----------------------------------------------------------------------- |
| Viewer count    | `WITNESSES 12` with a row of small eyes, one per viewer up to a cap     |
| Stream duration | A tape counter `01:24:07` that ticks every second locally between polls |
| Bitrate         | `SIGNAL 4,500` with a strength meter that jitters with the real value   |
| Live flag       | A red tally light and an `ON AIR` stamp                                 |

Every themed label keeps its plain meaning as a tooltip and as its accessible name.

**Being alone is a state.** When the witness count is one, it is you. The display says so, the row of eyes shows a single eye, and it is looking at you.

**When there is no picture, the empty frame is a scene.** These are silent, sit inside the frame where the picture would be, and disappear the moment video starts.

- **Tuning (loading):** snow, slowly resolving. _"The signal was out there. It usually is."_
- **Dead air (offline):** curtains closed over the frame. Behind them, a test card hosted by the boar, and the station's doubt, typed out: there is no broadcast, there was never a broadcast, it is all a tape. Under it, a list stamped `ELSEWHERE, SOMETHING IS ON` with the channels that are live right now. A dead end becomes a route.
- **Chewed (unavailable):** the picture tears like an eaten tape, then a retry control. _"The tape came back chewed."_
- **Going live while you wait:** the glow comes up and the curtains part on their own.
- **The key:** arriving with a `?token=` link shows a blue key turning once in the corner before the picture starts.

**Calm mode.** One key (`L`, "lights on") or one tap strips the styling too: no bias light, no themed labels, no state scenes, a plain dark page with the player, plain-worded stats and controls. It persists, applies to the whole site, and switches on automatically for `prefers-reduced-motion`.

### 3.4 Navigation

Four ways to move, all landing on the same unchanged URLs (`/:channel/:protocol/:app`).

1. **Zap.** Up and down arrows (desktop) or a vertical swipe below the picture (mobile) step through saved channels, live ones first. A silent 200 ms static burst in the empty frame while the next stream connects, and the channel number `CH 03 · MURSHUN` in the display line under the picture, not on it. Number keys 1 to 9 jump directly.
2. **The rail.** A column of miniature televisions on the left edge. Lit means live, snow means dead, the current one is framed in red. Hover shows the name and witness count. A small eject button removes a saved channel. On mobile it is the first section of the bottom sheet.
3. **The Exchange.** Press `/` or click the eye (section 3.5).
4. **Quality.** A three-position selector in the display line (`FLV / HLS / DASH`, plus the app when there are several), showing only what the channel offers.

Also: `H` back to the Waiting Room, `F` fullscreen, `M` mute, `?` a typewritten card listing every key.

### 3.5 The Exchange

A telephone switchboard, full screen, shot from above: rows of sockets, patch cords, a strip of paper labels typed crooked. One socket per saved channel, with a lamp that is lit when the channel is live.

- Type to filter. Arrow keys move a cord between sockets. Enter plugs it in and you are there.
- Type any name that is not on the board and press Enter: the operator writes a new label and connects you to a channel you have never visited.
- Below the channels, the same board carries every other action on the site: quality, sound, Calm mode, back to the Waiting Room. Everything is reachable from here by keyboard alone.
- One socket has no label. Plugging into it does something different each day.

### 3.6 The Schedule and the Takeovers

**All of this happens in the Waiting Room only. None of it ever runs on a stream page.**

The station has a programme, and it is the same for everyone. Events are seeded from the UTC clock, so everyone in the Waiting Room sees the same thing happen in the same second, with no server coordinating it. A shared broadcast, which is exactly what the dead internet lost.

**The Schedule (predictable, communal)**

- **On the hour:** a station ident. A title card, the stamp, a tone.
- **Once a day:** today's number, between one and ten, announced in a caption and shown in a corner until midnight UTC.
- **The dead hour (03:00 to 04:00 local):** the palette drifts to blue, the narrator changes, the relics on the wall are different.

**Takeovers (rare, at least 90 seconds apart)**

- **The hijack.** Every television on the wall cuts to a figure in snow and a line of text repeating. Thirty seconds, then it is gone and nothing acknowledges it.
- **The numbers.** With sound on, a synthetic voice reads a string of digits, flat and patient, using the browser's built-in speech synthesis.
- **The laugh.** A studio audience laughs at nothing.
- **Reverse.** For ten seconds every caption types itself backwards.
- **The hand.** After three idle minutes a hand slides in from the edge of the screen and withdraws when you move.
- **The eye.** It closes. Later it is open and looking somewhere else.
- **The second boar.** The boar walks through the room. Then again, identically.
- **The thought.** A caption that has nothing to do with anything. _"I had the dream about the owls again."_

Hard limits: nothing runs on a stream page, nothing makes sound unless you turned sound on in the Waiting Room, nothing flashes faster than three times a second, and nothing runs in Calm mode.

## 4. Why this is a 2030 site and not a retro skin

- **Shared time without a backend.** The Schedule gives a static site the feeling of a live broadcast that everyone is inside together.
- **Real telemetry as art direction.** Bitrate, witness count and stream state drive the lighting, sound and behavior of the room. Nothing decorative is random when it could be true.
- **Surveillance shown, not done.** The site performs being watched using only what the browser already knows locally, stores nothing remotely, sets no trackers, and says so.
- **No accounts, no feed.** The interface has no place where a login, a recommendation or a notification could go.
- **Decay as a feature.** The site ages per visitor and treats link rot as set dressing.

## 5. Stack

Versions are current as of today.

| Concern      | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core         | React 19.3 with the React Compiler, Vite 8, TypeScript 7 strict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Routing      | React Router 8 as a static SPA, with view transitions between rooms                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Data         | TanStack Query 5 polling every 10 s, native `fetch`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 3D           | three.js 0.187 with React Three Fiber 9, drei 10, and `@react-three/postprocessing`. Home page only, loaded lazily behind the Dead Band. WebGL 2, not WebGPU, for reach.                                                                                                                                                                                                                                                                                                                                                                                                |
| UI motion    | Motion 14: layout transitions, gestures (dial drag, swipe to zap, bottom sheet, patch cords), presence                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Choreography | anime.js 4: timelines for the Dead Band, idents, title cards, text splitting and reversing, stamp impacts                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Exchange     | `cmdk` for the keyboard-first filtering and selection underneath the switchboard visuals                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Sound        | Web Audio API directly for hum, tones and one-shots; the built-in Speech Synthesis API for the numbers voice                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Styles       | Tailwind CSS 4 through its Vite plugin, configured in CSS. The palette, fonts, easings and durations are declared once in `@theme` and become utilities (`bg-lodge`, `text-bone`, `font-card`, `ease-push`). The texture layers are custom utilities written with `@utility`: `grain`, `halation`, `chroma-split`, `scanlines`, `tape-tear`, `xerox`, `stamp`, `redact`, `caption-box`, `dead-link`. Custom variants `calm:`, `live:` and `dead-hour:` let any element restyle itself per state inline. `clsx` with `tailwind-merge`, and the Prettier Tailwind plugin. |
| Icons        | `lucide-react` for the few plain icons that remain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Fonts        | Boska, Tanker, JetBrains Mono from Fontshare, self-hosted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Tests        | Vitest 5, Testing Library, Playwright                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Video        | `hls.js`, `dashjs`, `mpegts.js`, each loaded on demand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Not using GSAP: it is free now, but Motion and anime.js together cover the same ground and are both MIT-licensed.

### Backward-compatible commands

Every command that works today keeps working, on Yarn 1, with the same environment variables and the same `dist` output. The GitHub workflow needs no changes.

| Command                                               | Today                                 | After                                                  |
| ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `yarn start`                                          | `env.js` then `ng serve` on `0.0.0.0` | `env.js` then Vite on `0.0.0.0:4200`                   |
| `yarn build`                                          | `env.js` then `ng build`              | `env.js` then `vite build`                             |
| `yarn build:azure`                                    | Same via local binary                 | Same via local binary                                  |
| `yarn env`                                            | Writes `.env.json`                    | Unchanged; the app keeps reading `.env.json`           |
| `yarn test`, `yarn lint`, `yarn e2e`, `yarn prettier` | Karma, ESLint, Protractor, Prettier   | Vitest, ESLint, Playwright, Prettier                   |
| `yarn ng`                                             | Angular CLI                           | Alias for Vite, because it is funnier than removing it |

## 6. Functional contract (the only things kept)

These are behaviors, not design. They stay so that existing links, saved channels, tokens and deployments keep working.

- **Routes** are identical for both builds. `www`: `/` home, `/stream/**` forwards to the stream site. `stream`: `/` home, `/:channel`, `/:channel/:protocol`, `/:channel/:protocol/:app`. Default channel `stream` (the station no longer uses `main`), default protocol `flv`. `main` and `test` still come back from the API and are shown like any other channel. On `www`, televisions send you to the stream site.
- **Stats API** (checked against the live service):
  - `GET /channels/:name` returns that channel's live streams with viewers, duration, bitrate and edge URL. Polled every 10 s for the channel being watched.
  - `GET /channels` returns the channels that are live right now.
  - `GET /streams` returns paginated broadcast history. Its `options.channels` is the full list of known channels (today: `kino`, `main`, `nomad`, `pyro`, `rebel`, `stream`, `test`), and its `info` holds station totals (16,231 transmissions, about 702 days of airtime).
- **The channel list is never hard-coded.** The television wall, the rail, the Exchange and "Elsewhere, something is on" are built from whatever the API returns, in any quantity. The wall stacks sets around `main` and pulls the camera back as the list grows; a new channel appears as a new television with no code change. Saved channels only affect ordering (yours first).
- **Station totals are real data used as set dressing:** the transmission count and days on air are stamped in the Waiting Room, and the broadcast history can back a logbook later.
- **Saved channels:** same `localStorage.channels` key and validation, same "removed current channel" session flag.
- **Player:** the `<video>` element is created imperatively inside a container and keyed on route params, so polling never recreates it. Volume memory, the click guard on a playing picture and the Firefox overlay are kept. FLV, HLS and DASH with the same native fallbacks on iOS and Android.
- **Token:** `?token=` is stored and sent as the `jwt-token` header.
- **Dropped:** the unreachable `/minimal` route, lodash, axios, RxJS, Font Awesome, the unused `three` 0.162 install and all Angular tooling.

### Structure

```
src/
  main.tsx, routes.tsx, env.ts
  design/        theme.css (Tailwind @theme tokens, @utility textures, variants), fonts, captions, stamps, title cards
  rooms/
    deadband/    arrival dial, wreckage
    waiting/     R3F scene, televisions, boars, eye, ear, telephone, relics, mobile corridor, static fallback
    screening/   StreamPage, player hook, display line, rail, state scenes, bias light, signal-driven lighting
  exchange/      switchboard
  schedule/      UTC-seeded clock, idents, today's number, dead hour
  takeovers/     scheduler, event list, idle detection
  memory/        local visit count and room aging
  sound/
  data/          api, useChannelStats, useSavedChannels, formatDuration
public/assets/   re-encoded clips, models, cut-outs
ASSETS.md
```

## 7. Budgets and guardrails

- **Stream page:** no three.js in its bundle, first frame of video no later than on today's site, effects under 2 ms per frame.
- **Home page:** the Dead Band is interactive within one second; the room holds 60 fps on a mid-range laptop and 30 fps on phones, pixel ratio capped at 1.5, rendering paused when the tab is hidden, automatic drop to the static frame if the probe fails.
- **Assets:** the home page loads under 6 MB in total.
- **Access:** everything reachable by keyboard, visible focus in Sodium, real links under every 3D object, reduced motion respected, no rapid flashing, wreckage and relics hidden from screen readers.
- **Privacy:** no analytics, no third-party requests beyond the stats API and the stream itself. Fonts are self-hosted. What the telephone reads back is never sent anywhere.

## 8. Phases

**Phase 0: style frames. Stop for your approval.** Real coded screens with fake data: the Dead Band, the Waiting Room and the Screening Room, desktop and mobile, with the palette, type, all three texture layers, one television, the display line, one narrated state and a handful of wreckage. The first batch of stock cut-outs is sourced here and listed for your OK before download. I will also pull specific references from the galleries you listed (Godly, Land-book, Cosmos, 60fps), with screenshots.

**Phase 1: scaffold.** Vite, React, Tailwind, the commands table, theme tokens, fonts, asset re-encoding, both route tables.

**Phase 2: working stream, no art.** Data layer, player, token flow, unit tests. An ugly page that plays every protocol correctly.

**Phase 3: the Screening Room.** Layout, display line, state scenes, bias light, signal-driven lighting, rail, zap, quality selector, bottom sheet, Calm mode.

**Phase 4: the Exchange.**

**Phase 5: the Dead Band and the Waiting Room.** Dial, wreckage, 3D room, televisions with feeds, tunnel transition, boars and tape, eye, ear, telephone, relics, mobile corridor, static fallback.

**Phase 6: the Schedule, Takeovers, memory and sound.**

**Phase 7: ship.** Delete Angular, verify both builds through the unchanged workflow, test on Chrome, Firefox, Safari, iOS and Android, check the budgets, merge.

## 9. Risks

| Risk                                                                     | Answer                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The art gets in the way of watching                                      | The stream page has no overlays, no events and no sound of its own, by rule (section 3.3), with a test that fails if anything is stacked above the video element. Calm mode is one key, `WATCH STREAM` is always visible, direct stream links skip the arrival. |
| The arrival sequence annoys regulars                                     | Under two seconds after the first visit, skippable with any input, absent on direct stream links.                                                                                                                                                               |
| Fake wreckage is mistaken for real errors or real consent prompts        | It only ever appears in the dead-link style, never over the interface, never clickable, and never in Calm mode.                                                                                                                                                 |
| "The station knows things about you" reads as creepy rather than playful | It is limited to time, time zone, idle time and visit count, it says plainly that nothing is kept, and that is true.                                                                                                                                            |
| 3D home is slow on phones                                                | Separate cheaper mobile scene, performance probe, static fallback.                                                                                                                                                                                              |
| Hover previews open many live connections                                | One at a time, desktop only, after a delay, torn down on leave.                                                                                                                                                                                                 |
| The weirdness gets old                                                   | Takeovers are rare and seeded; the Schedule changes daily; the room ages. All of it is plain data files that are cheap to extend.                                                                                                                               |
| Scope has roughly doubled                                                | Phases 1 to 4 are a complete, redesigned, shippable stream site. Phases 5 and 6 can be a second release.                                                                                                                                                        |

## 10. Questions for you

None open. Settled: narration in English; _подколпаком_ is the community's name for itself; `test` stays on the wall; the default channel is `stream`.

## Sources consulted

- Codrops, "Inside HAOQI.DESIGN: Letting DOM and WebGL Share a Retro-Futurist Stage": https://tympanus.net/codrops/2026/08/15/inside-haoqi-design-letting-dom-and-webgl-share-a-retro-futurist-stage/
- Codrops, "Inside Shader.se's Scroll-Driven WebGPU Pipeline": https://tympanus.net/codrops/2026/05/19/80s-business-tech-seamless-scene-transitions-inside-shader-ses-scroll-driven-webgpu-pipeline/
- Maxime Heckel, "The Art of Dithering and Retro Shading for the Web": https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web
- three.js forum, "The Magic Theatre: a corridor from Hesse's Steppenwolf": https://discourse.threejs.org/t/the-magic-theatre-a-corridor-from-hesses-steppenwolf-in-three-js/94956
- Matt Sephton, "WebGL CRT Shader": https://blog.gingerbeardman.com/2026/01/04/webgl-crt-shader/
- Motion, "GSAP vs Motion": https://motion.dev/docs/gsap-vs-motion
- Fontshare catalogue: https://www.fontshare.com
