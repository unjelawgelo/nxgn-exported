import 'dotenv/config';
import { pool } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

async function selectOne(client, sql, params) {
  const { rows } = await client.query(sql, params);
  return rows[0] || null;
}

async function selectAll(client, sql, params) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('begin');

    // 1) Create or get a Ministry
    let ministry = await selectOne(client, 'select * from ministries where name=$1 limit 1', ['NewGen Church']);
    if (!ministry) {
      const ministryId = uuidv4();
      await client.query(
        `insert into ministries (id, name, passcode, description, created_at, updated_at)
         values ($1,$2,$3,$4, now(), now())`,
        [ministryId, 'NewGen Church', 'NEWGEN123', 'Demo ministry for seeding']
      );
      ministry = await selectOne(client, 'select * from ministries where id=$1', [ministryId]);
      console.log('Created ministry:', ministry.name);
    } else {
      console.log('Using existing ministry:', ministry.name);
    }

    // 2) Create or get an Admin user
    let admin = await selectOne(client, 'select * from users where pincode=$1 limit 1', ['AdminAdminJrev007']);
    if (!admin) {
      const adminId = uuidv4();
      await client.query(
        `insert into users (id, name, pincode, role, ministry_id, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6, now(), now())`,
        [adminId, 'Main Administrator', 'AdminAdminJrev007', 'main_admin', ministry.id, 'approved']
      );
      admin = await selectOne(client, 'select * from users where id=$1', [adminId]);
      console.log('Created admin user:', admin.name);
    } else {
      console.log('Using existing admin user:', admin.name);
      // Ensure attached to ministry and role is main_admin/approved
      await client.query(
        'update users set ministry_id=$1, role=$2, status=$3, updated_at=now() where id=$4',
        [ministry.id, 'main_admin', 'approved', admin.id]
      );
    }

    // Update ministry admin if empty
    if (!ministry.admin_id) {
      await client.query('update ministries set admin_id=$1, updated_at=now() where id=$2', [admin.id, ministry.id]);
    }

    // 3) Seed some Songs
    const existingSongs = await selectAll(client, 'select * from songs where ministry_id=$1', [ministry.id]);
    if (existingSongs.length === 0) {
      const songs = [
        { title: 'Way Maker', category: 'worship', lyrics: 'You are here...', chords: 'C G Am F' },
        { title: 'This Is Amazing Grace', category: 'praise', lyrics: 'Who breaks the power...', chords: 'E B C#m A' },
        { title: '10,000 Reasons', category: 'worship', lyrics: 'Bless the Lord...', chords: 'G D Em C' },
      ];
      for (const s of songs) {
        const id = uuidv4();
        await client.query(
          `insert into songs (id, title, lyrics, chords, category, ministry_id, created_by, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7, now(), now())`,
          [id, s.title, s.lyrics, s.chords, s.category, ministry.id, admin.id]
        );
      }
      console.log('Seeded songs:', songs.length);
    } else {
      console.log('Songs already exist for ministry, skipping seeding songs.');
    }

    // 4) Seed a Playlist with the songs
    const existingPlaylists = await selectAll(client, 'select * from playlists where ministry_id=$1', [ministry.id]);
    if (existingPlaylists.length === 0) {
      const playlistId = uuidv4();
      await client.query(
        `insert into playlists (id, name, description, ministry_id, created_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5, now(), now())`,
        [playlistId, 'Sunday Service', 'Demo playlist', ministry.id, admin.id]
      );
      const songs = await selectAll(client, 'select * from songs where ministry_id=$1 order by title asc', [ministry.id]);
      let pos = 0;
      for (const song of songs) {
        const psId = uuidv4();
        await client.query(
          `insert into playlist_songs (id, playlist_id, song_id, position, added_at)
           values ($1,$2,$3,$4, now())`,
          [psId, playlistId, song.id, pos++]
        );
      }
      console.log('Created playlist with', pos, 'songs.');
    } else {
      console.log('Playlists already exist for ministry, skipping seeding playlist.');
    }

    await client.query('commit');
    console.log('Seed completed.');
  } catch (e) {
    await client.query('rollback');
    console.error('Seed failed:', e?.stack || e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
