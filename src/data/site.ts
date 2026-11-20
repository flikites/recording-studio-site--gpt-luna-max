/* Single source of truth for The Signal Room site content. */

export const SITE = {
  name: 'The Signal Room',
  tagline: 'Where the next one gets made.',
  city: 'Pompano Beach, FL',
  url: 'https://thesignalroomstudio.com',
  phone: '(954) 555-0134',
  phoneHref: 'tel:+19545550134',
  smsHref: 'sms:+19545550134',
  address: '2811 NE 33rd Street, Suite 7, Pompano Beach, FL 33064',
  mapsLink: 'https://www.google.com/maps/search/recording+studio+Pompano+Beach+FL',
  hours: 'Mon–Sun · 10AM – 2AM (late nights by appointment)',
  instagram: 'https://www.instagram.com/thesignalroom.studio',
  instagramHandle: '@thesignalroom.studio',
  email: 'book@thesignalroomstudio.com',
  rating: '4.9',
  reviewCount: 140,
  sessions: 1200,
  streams: '3M+',
} as const;

export const PRICING = {
  hourlyRate: 35,
  minHours: 2,
  blockHours: 10,
  blockPrice: 230,
  blockSave: 120,
  lateNightRate: 28,
  mixPrice: 150,
  masterPrice: 75,
  mixMasterPrice: 199,
  depositRecording: 50,
  depositMix: 100,
  engineerOnlyRate: 25,
  firstTimerCode: 'FIRST',
  firstTimerDiscount: 25,
} as const;

export const TRACKS = [
  { id: 'no-ceilings', title: 'No Ceilings', artist: 'Kaze', engineer: 'Marcus "Blade" Bell', kind: 'Recorded, mixed & mastered', hue: 74, cat: ['recorded', 'mixed', 'mastered'] },
  { id: 'pressure', title: 'Pressure', artist: 'Rio Pharaoh', engineer: 'Marcus "Blade" Bell', kind: 'Vocals tracked & rough-mixed', hue: 8, cat: ['recorded'] },
  { id: 'midnight-in-pompano', title: 'Midnight in Pompano', artist: 'Mali Lateef', engineer: 'Deja Price', kind: 'Mixed & mastered', hue: 265, cat: ['mixed', 'mastered'] },
  { id: 'brick-by-brick', title: 'Brick by Brick', artist: 'Rio Pharaoh', engineer: 'Trey Cole', kind: 'Recorded', hue: 24, cat: ['recorded'] },
  { id: 'two-am-facade', title: '2AM Façade', artist: 'Dio', engineer: 'Deja Price', kind: 'Mixed', hue: 200, cat: ['mixed'] },
  { id: 'above-the-rim', title: 'Above the Rim', artist: 'Kaze', engineer: 'Deja Price', kind: 'Mastered', hue: 130, cat: ['mastered', 'mixed'] },
] as const;

export const ENGINEERS = [
  {
    id: 'marcus',
    name: 'Marcus "Blade" Bell',
    role: 'Lead Engineer · Tracking',
    bio: '8 years behind the glass. Vocal chains, punch-in workflows, ad-lib stacking and comp passes that actually keep the energy. Right hand for raw rap takes and fast turnarounds.',
    specialty: 'Raw vocals · punch-ins · vocal chains',
    photo: '/img/engineer-marcus-480.avif',
    photoFallback: '/img/engineer-marcus-480.jpg',
    alt: 'Marcus Bell, lead engineer, arms crossed in the control room',
    initials: 'MB',
  },
  {
    id: 'deja',
    name: 'Deja Price',
    role: 'Mix & Master Engineer',
    bio: '200+ records mixed. Low-mid cleanup, 808-to-vocal translation and loud, open masters that hold up next to the records on your reference playlist.',
    specialty: 'Mixing · mastering · vocal tuning',
    photo: '/img/engineer-deja-480.avif',
    photoFallback: '/img/engineer-deja-480.jpg',
    alt: 'Deja Price at the mix desk, monitors glowing',
    initials: 'DP',
  },
  {
    id: 'trey',
    name: 'Trey Cole',
    role: 'Recording Engineer',
    bio: 'Came up on the booth side. Trap, drill and boom-bap session flow — levels right on the first pass, minimal talkback, maximum takes per hour.',
    specialty: 'Trap · drill · session flow',
    photo: '/img/engineer-trey-480.avif',
    photoFallback: '/img/engineer-trey-480.jpg',
    alt: 'Trey Cole leaning in the booth doorway with headphones',
    initials: 'TC',
  },
] as const;

export const REVIEWS = [
  { name: 'Kaze', handle: '@kazeofficial', text: 'Marcus had my vocal chain dialed in before the beat finished loading. Tracked, comped and rough-mixed a full song in 3 hours. Crazy turnaround.', track: 'No Ceilings — 1.4M streams', initials: 'KZ' },
  { name: 'Rio Pharaoh', handle: '@riopharaoh', text: 'Price is straight up fair and nobody rushes you. Came in with two hooks, left with a record. The room just feels right.', track: 'Pressure', initials: 'RP' },
  { name: 'Mali Lateef', handle: '@mali.lateef', text: 'Deja’s mix sounds like it belongs on the playlist next to my favorite records. Sent my bounce, got back a master in 2 days.', track: 'Midnight in Pompano', initials: 'ML' },
  { name: 'Dio', handle: '@dioisgod', text: 'Booked Thursday, recorded Friday, played it for the whole city Saturday. Easy in, easy out, files same day.', track: '2AM Façade', initials: 'D' },
  { name: 'Trey (client)', handle: '@treyseason', text: 'No smoke and mirrors — they showed me the levels, played me the before/after, I heard it. Booked the block deal on the spot.', track: 'Brick by Brick', initials: 'TS' },
  { name: 'Lena V.', handle: '@lenavb', text: 'As a manager this is my go-to for my roster. Clear rates, no surprise fees, and the engineers actually know rap records.', track: 'Books 3 artists/mo', initials: 'LV' },
] as const;

export const FAQS = [
  {
    q: 'How much does it cost to record at The Signal Room?',
    a: 'Tracking starts at $35/hour with a 2-hour minimum. The Block Deal is 10 hours for $230 (you save $120). Mixing starts at $150, mastering $75, or both for $199 per song. Late-night sessions (after 11PM) are $28/hour. Every rate is on the pricing page — no hidden fees, and we tell you the total before you pay the deposit.',
  },
  {
    q: 'What should I bring to my first session?',
    a: 'Your beats (saved locally — offline is safest), reference tracks for the sound you want, and your lyrics. We have everything else: mics, headphones, hard drives, water. If you’re on a project, bring the project files too and we’ll sync up in five minutes.',
  },
  {
    q: 'Can my producer sit in or send beats remotely?',
    a: 'Yes. Producers are welcome in the control room, and your producer can also email beats ahead of time or join via a shared session. We pass files both ways same day — before your session and after.',
  },
  {
    q: 'How many people can come to the session?',
    a: 'Up to 6 in the room (artist + engineer + crew). More than that and we ask that extra people wait in the lounge — it keeps levels honest and the session fast. Drinks are fine, food is fine, no glass on the console side.',
  },
  {
    q: 'How does the deposit and reschedule policy work?',
    a: 'Recording sessions take a $50 deposit, mix & master takes 50% up front ($100). The deposit comes off your final total. Reschedule free up to 24 hours before. Inside 24 hours we can move you once if we have the room, but the deposit isn’t refundable — it holds your slot on our book. No-shows forfeit the deposit.',
  },
  {
    q: 'Do I own my music? How do I get the files?',
    a: 'You own your masters. Always. That’s not negotiable and it’s not a line. Stems, roughs and final files are delivered same day through a private download link (WeTransfer/Drive). Mix and master revisions: two rounds included, turnaround usually 2–5 days.',
  },
] as const;

export const CREDITS = ['Kaze', 'Rio Pharaoh', 'Mali Lateef', 'Dio', 'Brick Savvy', 'Lena V.', 'Kobi West', 'Satin Saint'] as const;

export const HOURS_OPTS = [2, 3, 4, 5, 6] as const;
