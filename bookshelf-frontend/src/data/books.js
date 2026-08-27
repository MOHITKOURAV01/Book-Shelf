// Local data for the frontend.
//
// This file used to also export `books` — a snapshot of
// bookshelf-backend/data/books.json that nothing kept in sync. Its own header
// called it deprecated and listed what was wrong with it: no `inventory`
// field, prices that went stale the moment the catalogue was edited, and no
// record at all for a book added to the backend.
//
// Every consumer has moved to the API: Home in #274, the book detail page in
// #317, the wishlist in #328 and the Recently Viewed strip in #336. The
// snapshot is gone with the last of them, along with the `genres` list, which
// GET /api/books/genres serves with counts.
//
// `spines` stays, because it has no API behind it. It drives the decorative
// shelf strip in Hero.jsx and is genuinely local: colours and heights for a
// row of book spines, not a catalogue.

export const spines = [
  {
    id: 's1',
    title: 'The Quiet Ones',
    author: 'M. Arora',
    color: '#7A2E2E',
    height: 236,
  },
  {
    id: 's2',
    title: 'Field Notes',
    author: 'D. Kapoor',
    color: '#1F4B43',
    height: 210,
  },
  {
    id: 's3',
    title: 'Half Moon Bay',
    author: 'S. Rhee',
    color: '#B85C2C',
    height: 250,
  },
  {
    id: 's4',
    title: 'Static',
    author: 'A. Voss',
    color: '#3A3F63',
    height: 222,
  },
  {
    id: 's5',
    title: 'Low Tide',
    author: 'R. Menon',
    color: '#5F7A61',
    height: 240,
  },
  {
    id: 's6',
    title: 'The Long Corridor',
    author: 'K. Iyer',
    color: '#93461F',
    height: 214,
  },
  {
    id: 's7',
    title: 'Paper Moths',
    author: 'L. Fischer',
    color: '#2E4057',
    height: 232,
  },
  {
    id: 's8',
    title: 'Ordinary Weather',
    author: 'N. Basu',
    color: '#7A5C2E',
    height: 218,
  },
];
