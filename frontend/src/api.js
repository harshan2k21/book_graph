// Central API client — all requests proxy through Vite to http://localhost:3001

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Books
  getBooks: () => request('/books'),
  addBook: (payload) => request('/books', { method: 'POST', body: JSON.stringify(payload) }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),
  reanalyzeBook: (id) => request(`/books/${id}/reanalyze`, { method: 'POST' }),

  // Graph
  getGraph: (threshold = 0.75) => request(`/graph?threshold=${threshold}`),

  // Health
  health: () => request('/health'),
};
