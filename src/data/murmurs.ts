/**
 * Things the room says. Lowercase, no explanation, never a slogan.
 *
 * The voice is a tired man narrating a town at night, a town where everyone
 * is cheerful about something they will not name, and a room that has been
 * watching longer than you have. None of it is from anywhere.
 */
export const MURMURS = [
  // the room
  'someone left the television on in the forest.',
  'you were in the dream too. you sat right there.',
  'do not wake the one in the other room.',
  'it was always this late.',
  'the fan is turning the wrong way again.',
  'this is not the first time you have read this.',
  'the house has one more window than it did yesterday.',
  'somebody is laughing behind the curtain. it has been hours.',
  'the snow is coming from inside.',
  'your chair is still warm. you have not got up.',
  'i counted the televisions again. it went differently.',
  'it is quieter with the sound on.',
  'there is somebody standing where the signal is strongest.',
  'every clock in here is right. they do not agree.',
  'the light in the hallway is on a timer. the timer is on a different timer.',
  'the curtain moved first. then the wind came.',
  'one of these televisions is a window. do not work out which.',
  'the floor was a different pattern when you were small.',

  // the pig, the boars
  'the pig knows your name. it is not telling.',
  'the boar was in the kitchen again. it had made coffee.',
  'they are not looking for food. they are looking for the remote.',
  'we do not feed the big one. it arrives fed.',
  'a boar walked through an hour ago. it has not finished.',

  // a tired man, at night
  'my hands were on the table. then they were not my hands.',
  'i took two of the white ones and the room got longer.',
  'you can sleep when the tape runs out. the tape does not run out.',
  'the man across the street has been lighting the same cigarette for an hour.',
  'someone is parked outside with the headlights on. they are waiting for whoever comes after you.',
  'they found the car. the radio was still warm.',
  'he said he would only be a minute. that was the minute.',
  'it has been snowing since tuesday. nobody will say which tuesday.',
  'i wrote it all down so i would remember. the handwriting is not mine.',
  'there was a name on the back of the photograph. it was yours, spelled better.',
  'you look tired. you looked tired in the photograph too.',
  'ask me what i did before this. go on. i would like to know as well.',
  'i kept the receipt. it is for something i have not bought yet.',
  'the last thing she said was the weather. the weather was wrong.',
  'i have been awake long enough to hear the building think.',
  'there are four doors on this floor and i only rented the one.',

  // the town
  'the diner is open. the diner has always been open. do not go in.',
  'everybody in this town owns exactly one photograph of the same lake.',
  'the mayor saw it too. the mayor is fine now. completely fine.',
  'the map of the town has a street on it that the town does not.',
  'nobody here has seen the announcer. everybody can describe him.',
  'the night shift came in. they were also the day shift.',
  'somebody keeps leaving the porch light on for a man who is already inside.',
  'the pie was fine. it was the plate that knew.',
  'the forest sent a letter. it was mostly wet.',
  'we buried the tape in the garden. the garden plays it back in spring.',
  'the sheriff waved. his hand kept going after he stopped.',
  'the church bell rings at a quarter past. nobody has agreed what of.',
  'they repainted the water tower. it is the same colour, but on purpose now.',
  'the lake is closed today. it will reopen when it has calmed down.',
  'the weather tomorrow: this room.',

  // instructions nobody asked for
  'if the phone rings, let it. if it stops, worry.',
  'three knocks means it is safe. you counted four.',
  'there is a number you are not supposed to call. you already know it.',
  'the owls have stopped. that is worse.',
  'we are experiencing no difficulties. please stand by anyway.',
  'do not thank the operator. she remembers.',
  'when the red light goes out, look at your hands. just to check.',
  'if you see yourself on the small television, wave. it is polite.',

  // to someone who is not there
  "you saw that too. didn't you. no. you never do.",
  'i am going to tell you what i think, and you are going to agree, like always.',
  'you were right about the coffee. i will not say what about.',
  'i have decided to trust you. this is not good news for either of us.',
  'say something. no, not that.',
];

export const murmurOfTheDay = () =>
  MURMURS[Math.floor(Date.now() / 86_400_000) % MURMURS.length];

/** Clips a live set plays on the wall until you tune in for real. */
const FEEDS = ['3', '10', '1', '6', '2', '7'];
export const feedFor = (name: string) => {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return `/assets/images/index/${FEEDS[sum % FEEDS.length]}.mp4`;
};
