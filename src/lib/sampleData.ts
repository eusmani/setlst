import type { ReviewData } from "@/components/review/ReviewCard";

export interface SampleMember {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  _count: { reviews: number; followers: number };
}

export interface SampleAlbum {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number;
  avgRating: number;
  reviewCount: number;
}

export const SAMPLE_REVIEWS: ReviewData[] = [
  {
    id: "s1",
    rating: 5,
    body: "One of the most ambitious albums ever recorded. Every track feels like a movement in a larger symphony.",
    createdAt: "2025-05-18T14:22:00Z",
    user: { id: "u1", username: "velvetears", avatar: null },
    album: {
      spotifyId: "7ycBtnsMtyVbbwTfJwRjSP",
      title: "To Pimp a Butterfly",
      artist: "Kendrick Lamar",
      artwork: "https://i.scdn.co/image/ab67616d0000b273cdb645498cd9569a4e79a82c",
    },
    _count: { likes: 34 },
  },
  {
    id: "s2",
    rating: 4.5,
    body: "Joni at her most raw. Blue doesn't just age well — it feels like it was written yesterday.",
    createdAt: "2025-05-10T09:05:00Z",
    user: { id: "u2", username: "mireillep", avatar: null },
    album: {
      spotifyId: "1vz94WpXDVYIEGja8cjFNa",
      title: "Blue",
      artist: "Joni Mitchell",
      artwork: "https://i.scdn.co/image/ab67616d0000b273b414b3b7e6fb44c2b64f2d2d",
    },
    _count: { likes: 18 },
  },
  {
    id: "s3",
    rating: 5,
    body: "The modal jazz blueprint. Fifty-plus years later nothing sounds like this and nothing has topped it.",
    createdAt: "2025-04-28T20:11:00Z",
    user: { id: "u3", username: "basslinetheory", avatar: null },
    album: {
      spotifyId: "1weenld61qoidwYuZ1GESA",
      title: "Kind of Blue",
      artist: "Miles Davis",
      artwork: "https://i.scdn.co/image/ab67616d0000b273e8e28219724c2423afa4d320",
    },
    _count: { likes: 27 },
  },
  {
    id: "s4",
    rating: 4.5,
    body: "Every song earns its place. Reckoner alone is worth the price of admission.",
    createdAt: "2025-04-15T16:40:00Z",
    user: { id: "u4", username: "ghostfreq", avatar: null },
    album: {
      spotifyId: "5vkqYmiPBYLaalcmjujWxK",
      title: "In Rainbows",
      artist: "Radiohead",
      artwork: "https://i.scdn.co/image/ab67616d0000b2736ab7b0f16e5f073b2e0a2e3d",
    },
    _count: { likes: 22 },
  },
  {
    id: "s5",
    rating: 5,
    body: "Frank made something that feels genuinely private. Like reading someone's diary and being changed by it.",
    createdAt: "2025-03-30T11:55:00Z",
    user: { id: "u5", username: "solsticeaudio", avatar: null },
    album: {
      spotifyId: "3mH6qwIy9crq0I9YQbOuDf",
      title: "Blonde",
      artist: "Frank Ocean",
      artwork: "https://i.scdn.co/image/ab67616d0000b2732d27116a0bdfc4d705e63e69",
    },
    _count: { likes: 41 },
  },
  {
    id: "s6",
    rating: 4,
    body: "DOOM and Madlib feeding off each other's energy. Loopy and grimy in the best possible way.",
    createdAt: "2025-03-12T08:30:00Z",
    user: { id: "u1", username: "velvetears", avatar: null },
    album: {
      spotifyId: "19bQiwEKhXUBJWY6oV3KZk",
      title: "Madvillainy",
      artist: "Madvillain",
      artwork: "https://i.scdn.co/image/ab67616d0000b273afc4cefdb5b7e0c2a9ea73f8",
    },
    _count: { likes: 15 },
  },
  {
    id: "s7",
    rating: 4.5,
    body: "Hauntingly beautiful. Vespertine sounds like it was recorded inside a snow globe.",
    createdAt: "2025-02-20T19:22:00Z",
    user: { id: "u2", username: "mireillep", avatar: null },
    album: {
      spotifyId: "5COXoX5dPeeHHAKBvBaS0r",
      title: "Vespertine",
      artist: "Björk",
      artwork: "https://i.scdn.co/image/ab67616d0000b2731b40dde4df2c6abe4dfe4c73",
    },
    _count: { likes: 12 },
  },
  {
    id: "s8",
    rating: 5,
    body: "The album that made me fall in love with music all over again. Haiti still gives me chills.",
    createdAt: "2025-02-05T13:10:00Z",
    user: { id: "u3", username: "basslinetheory", avatar: null },
    album: {
      spotifyId: "3CXIbTBLDfnbBiZnYuFGR3",
      title: "Funeral",
      artist: "Arcade Fire",
      artwork: "https://i.scdn.co/image/ab67616d0000b2739a73ed8bb0f5a6a76a7f0ba2",
    },
    _count: { likes: 9 },
  },
];

export const SAMPLE_MEMBERS: SampleMember[] = [
  {
    id: "u1",
    username: "velvetears",
    avatar: null,
    bio: "Chasing that feeling a great record gives you at 2am.",
    _count: { reviews: 47, followers: 83 },
  },
  {
    id: "u2",
    username: "mireillep",
    avatar: null,
    bio: "Folk, jazz, and anything recorded before 1980.",
    _count: { reviews: 31, followers: 56 },
  },
  {
    id: "u3",
    username: "basslinetheory",
    avatar: null,
    bio: "Low end first, everything else second.",
    _count: { reviews: 62, followers: 120 },
  },
  {
    id: "u4",
    username: "ghostfreq",
    avatar: null,
    bio: "Electronic, ambient, and the space between notes.",
    _count: { reviews: 28, followers: 44 },
  },
  {
    id: "u5",
    username: "solsticeaudio",
    avatar: null,
    bio: "R&B and soul from every era. Always looking for the next deep cut.",
    _count: { reviews: 55, followers: 98 },
  },
];

export const SAMPLE_ALBUMS: SampleAlbum[] = [
  { spotifyId: "4tUVkNYSFrrEqqrxBQW9PN", title: "Endtroducing.....", artist: "DJ Shadow", artwork: "https://i.scdn.co/image/ab67616d0000b273c02294cf9b5ec88cd939a8a6", year: 1996, avgRating: 4.7, reviewCount: 640 },
  { spotifyId: "7eaQqVyq6xzAVgsxSzSP83", title: "Supreme Clientele", artist: "Ghostface Killah", artwork: "https://i.scdn.co/image/ab67616d0000b2733d58f24bac130db263b3e4ae", year: 2000, avgRating: 4.6, reviewCount: 520 },
  { spotifyId: "5K9kD50P66neofCR8BoYxg", title: "Blackout!", artist: "Method Man & Redman", artwork: "https://i.scdn.co/image/ab67616d0000b2736a22f24dc3f261206548e15a", year: 1999, avgRating: 4.5, reviewCount: 480 },
  { spotifyId: "5fMlysqhFE0itGn4KezMBW", title: "Donuts", artist: "J Dilla", artwork: "https://i.scdn.co/image/ab67616d0000b27383bb78285449998bb974da45", year: 2006, avgRating: 4.8, reviewCount: 710 },
  { spotifyId: "5ceB3rxgXqIRpsOvVzTG28", title: "Aquemini", artist: "Outkast", artwork: "https://i.scdn.co/image/ab67616d0000b273e2352cc20602d45e9a0e7617", year: 1998, avgRating: 4.7, reviewCount: 830 },
  { spotifyId: "07bIdDDe3I3hhWpxU6tuBp", title: "DAYTONA", artist: "Pusha T", artwork: "https://i.scdn.co/image/ab67616d0000b273263555eebbe2b375593aa31e", year: 2018, avgRating: 4.5, reviewCount: 390 },
  { spotifyId: "2NnkLRaeX33d1Mn8ZLgTo8", title: "Spiderland", artist: "Slint", artwork: "https://i.scdn.co/image/ab67616d0000b273ca727fc0809fb501506ce413", year: 1991, avgRating: 4.6, reviewCount: 290 },
  { spotifyId: "53eHm1f3sFiSzWMaKOl98Z", title: "Souvlaki", artist: "Slowdive", artwork: "https://i.scdn.co/image/ab67616d0000b273f6e31941d10e4819d290af41", year: 1993, avgRating: 4.5, reviewCount: 340 },
  { spotifyId: "19bQiwEKhXUBJWY6oV3KZk", title: "Madvillainy", artist: "Madvillain", artwork: "https://i.scdn.co/image/ab67616d0000b273afc4cefdb5b7e0c2a9ea73f8", year: 2004, avgRating: 4.8, reviewCount: 920 },
  { spotifyId: "5ydx8HEoTmJrxZuPKcTU4V", title: "Pilot Talk", artist: "Curren$y", artwork: "https://i.scdn.co/image/ab67616d0000b273d41506083bca3ed9e364eb50", year: 2010, avgRating: 4.4, reviewCount: 210 },
  {
    spotifyId: "4LH4d3cOWNNsVw41Gqt2kv",
    title: "Purple Rain",
    artist: "Prince",
    artwork: "https://i.scdn.co/image/ab67616d0000b2735c5b9d744dac73d80abd0bb5",
    year: 1984,
    avgRating: 4.6,
    reviewCount: 1100,
  },
  {
    spotifyId: "6dVIqQ8qmQ5GBnJ9shOYGE",
    title: "Dummy",
    artist: "Portishead",
    artwork: "https://i.scdn.co/image/ab67616d0000b2730994af4c9e2b23f2d5c7f879",
    year: 1994,
    avgRating: 4.5,
    reviewCount: 730,
  },
];
