'use strict';

const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 3001);

const DEFAULT_PG = {
  host: 'localhost',
  port: 5432,
  database: 'writer',
  user: 'writer',
  password: 'writer',
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || DEFAULT_PG.host,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : DEFAULT_PG.port,
  database: process.env.PGDATABASE || DEFAULT_PG.database,
  user: process.env.PGUSER || DEFAULT_PG.user,
  password: process.env.PGPASSWORD || DEFAULT_PG.password,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id uuid PRIMARY KEY,
      title text NOT NULL,
      content text NOT NULL,
      updated_at bigint NOT NULL
    );
  `);
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    updatedAt: Number(row.updated_at),
  };
}

const app = express();
app.use(express.json());

app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/pages', async (_req, res) => {
  const result = await pool.query(
    'SELECT id, title, content, updated_at FROM pages ORDER BY updated_at DESC'
  );
  res.json(result.rows.map(mapRow));
});

app.post('/api/pages', async (req, res) => {
  const id = crypto.randomUUID();
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title : 'Untitled';
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  const updatedAt = Date.now();

  const result = await pool.query(
    'INSERT INTO pages (id, title, content, updated_at) VALUES ($1, $2, $3, $4) RETURNING id, title, content, updated_at',
    [id, title, content, updatedAt]
  );

  res.status(201).json(mapRow(result.rows[0]));
});

app.patch('/api/pages/:id', async (req, res) => {
  const id = req.params.id;

  const fields = [];
  const values = [];
  let i = 1;

  if (typeof req.body?.title === 'string') {
    fields.push(`title = $${i++}`);
    values.push(req.body.title);
  }

  if (typeof req.body?.content === 'string') {
    fields.push(`content = $${i++}`);
    values.push(req.body.content);
  }

  const updatedAt = Date.now();
  fields.push(`updated_at = $${i++}`);
  values.push(updatedAt);

  if (fields.length === 1) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE pages SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, title, content, updated_at`,
    values
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(mapRow(result.rows[0]));
});

async function main() {
  await ensureSchema();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`writer-api listening on :${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
