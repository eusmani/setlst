-- SetList seed data
INSERT OR IGNORE INTO User (id, username, email, password, bio, createdAt) VALUES
  ('u1','velvetears','velvetears@example.com','$2b$12$placeholder','Chasing that feeling a great record gives you at 2am.','2025-01-10T10:00:00Z'),
  ('u2','mireillep','mireillep@example.com','$2b$12$placeholder','Folk, jazz, and anything recorded before 1980.','2025-01-12T10:00:00Z'),
  ('u3','basslinetheory','basslinetheory@example.com','$2b$12$placeholder','Low end first, everything else second.','2025-01-15T10:00:00Z');

INSERT OR IGNORE INTO Album (id, spotifyId, title, artist, artwork, year, createdAt) VALUES
  ('a1','7ycBtnsMtyVbbwTfJwRjSP','To Pimp a Butterfly','Kendrick Lamar','https://i.scdn.co/image/ab67616d0000b273cdb645498cd9569a4e79a82c',2015,'2025-01-10T10:00:00Z'),
  ('a2','1vz94WpXDVYIEGja8cjFNa','Blue','Joni Mitchell','https://i.scdn.co/image/ab67616d0000b273b414b3b7e6fb44c2b64f2d2d',1971,'2025-01-10T10:00:00Z'),
  ('a3','1weenld61qoidwYuZ1GESA','Kind of Blue','Miles Davis','https://i.scdn.co/image/ab67616d0000b273e8e28219724c2423afa4d320',1959,'2025-01-10T10:00:00Z');

INSERT OR IGNORE INTO Review (id, rating, body, userId, albumId, createdAt, updatedAt) VALUES
  ('r1',5.0,'One of the most ambitious albums ever recorded.','u1','a1','2025-05-18T14:22:00Z','2025-05-18T14:22:00Z'),
  ('r2',4.5,'Joni at her most raw. Blue doesn''t just age well.','u2','a2','2025-05-10T09:05:00Z','2025-05-10T09:05:00Z'),
  ('r3',5.0,'The modal jazz blueprint. Nothing has topped it.','u3','a3','2025-04-28T20:11:00Z','2025-04-28T20:11:00Z');
