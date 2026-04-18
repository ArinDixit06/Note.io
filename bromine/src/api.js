const API_URL = 'https://note-io-5hpc.onrender.com/api/notes';

const parseResponse = async (response, fallbackMessage) => {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return response.json();
};

export const fetchNotes = async () => {
  const response = await fetch(API_URL);
  return parseResponse(response, 'Failed to fetch notes');
};

export const createNote = async (note) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });

  return parseResponse(response, 'Failed to create note');
};

export const updateNote = async (id, note) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      localId: note.localId,
      title: note.title,
      content: note.content,
      coverImage: note.coverImage,
    }),
  });

  return parseResponse(response, 'Failed to update note');
};

export const deleteNote = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });

  return parseResponse(response, 'Failed to delete note');
};
