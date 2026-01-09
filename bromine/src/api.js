const API_URL = "https://note-io-6fm6.onrender.com/api/notes"; 

export const fetchNotes = async () => {
  const response = await fetch(API_URL);
  return response.json();
};

export const createNote = async (note) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
  if (!response.ok) throw new Error("Failed to create note");
  return response.json();
};

export const updateNote = async (id, note) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      localId: note.localId, // <--- CRITICAL: Must send localId on update too
      title: note.title,
      content: note.content,
      coverImage: note.coverImage
    }),
  });
  if (!response.ok) throw new Error("Failed to update note");
  return response.json();
};

export const deleteNote = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete note");
  return response.json();
};
