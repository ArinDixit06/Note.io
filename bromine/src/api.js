const API_URL = 'https://note-io-6fm6.onrender.com/api/notes';

export const fetchNotes = async () => {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
};

export const createNote = async (note) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });

  if (!res.ok) {
    const errorText = await res.text(); // Read the error message from server
    throw new Error(`Server Error: ${errorText}`);
  }

  return res.json();
};

export const updateNote = async (id, note) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });
  return res.json();
};

export const deleteNote = async (id) => {
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
};
