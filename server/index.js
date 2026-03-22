const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const mapNote = (row) => ({
  _id: row.id,
  localId: row.local_id,
  title: row.title,
  content: row.content,
  coverImage: row.cover_image,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// --- API Routes ---

app.get('/api/notes', async (req, res) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data.map(mapNote));
});

app.post('/api/notes', async (req, res) => {
  const { localId, title = 'Untitled', content = '', coverImage = '' } = req.body;

  if (!localId) {
    return res.status(400).json({ error: 'localId is required' });
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .upsert(
        {
          local_id: localId,
          title,
          content,
          cover_image: coverImage,
        },
        {
          onConflict: 'local_id',
        }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(mapNote(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  const { localId, title, content, coverImage } = req.body;

  const payload = {
    ...(localId ? { local_id: localId } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(content !== undefined ? { content } : {}),
    ...(coverImage !== undefined ? { cover_image: coverImage } : {}),
  };

  const { data, error } = await supabase
    .from('notes')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(mapNote(data));
});

app.delete('/api/notes/:id', async (req, res) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "Note Deleted" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
