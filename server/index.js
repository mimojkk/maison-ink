import cors from 'cors';
import express from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 4000);
const here = path.dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.MAISON_DATA_FILE || path.join(here, '../data/maison.json');
const dataDirectory = path.dirname(dataFile);
const adminPassword = process.env.MAISON_ADMIN_PASSWORD;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const initialData = {
  tattoos: [
    { id: 1, title: 'Floral Linework', category: 'Fine Line', artist: 'Maison Artist', description: 'Fine-line floral tattoo reference from a Pexels creator. Editorial example only; replace with your own client-approved studio work.', image: 'https://images.pexels.com/photos/3295586/pexels-photo-3295586.jpeg?auto=compress&cs=tinysrgb&w=1200', photographer: 'Jan Kopřiva', photoCredit: 'https://www.pexels.com/photo/close-up-shot-of-tattoo-on-a-person-s-arm-3295586/' },
    { id: 2, title: 'Botanical Back Piece', category: 'Ornamental', artist: 'Lena', description: 'Fine tattoo detail shown as editorial reference, photographed by Вячеслав Ткачёв on Pexels. Not Maison Ink client work.', image: 'https://images.pexels.com/photos/13304597/pexels-photo-13304597.jpeg?auto=compress&cs=tinysrgb&w=1200', photographer: 'Вячеслав Ткачёв', photoCredit: 'https://www.pexels.com/photo/a-close-up-shot-of-a-woman-s-back-13304597/' },
    { id: 3, title: 'Japanese Koi Sleeve', category: 'Japanese', artist: 'Kai', description: 'Colorful Japanese-inspired sleeve tattoo shown as editorial reference, photographed by Brett Sayles on Pexels. Not Maison Ink client work.', image: 'https://images.pexels.com/photos/2134085/pexels-photo-2134085.jpeg?auto=compress&cs=tinysrgb&w=1200', photographer: 'Brett Sayles', photoCredit: 'https://www.pexels.com/photo/koi-full-sleeved-tattoo-2134085/' },
    { id: 4, title: 'Color & Blackwork Sleeve', category: 'Blackwork', artist: 'Lena', description: 'Illustrative sleeve tattoo shown as an editorial reference, photographed by Kevin Bidwell on Pexels. Not Maison Ink client work.', image: 'https://images.pexels.com/photos/2183131/pexels-photo-2183131.jpeg?auto=compress&cs=tinysrgb&w=1200', photographer: 'Kevin Bidwell', photoCredit: 'https://www.pexels.com/photo/photo-of-left-arm-with-tattoo-2183131/' },
    { id: 5, title: 'Ornamental Sleeve Details', category: 'Micro Realism', artist: 'Kai', description: 'Tattoo detail shown as an editorial reference, photographed by Brett Sayles on Pexels. Not Maison Ink client work.', image: 'https://images.pexels.com/photos/2126124/pexels-photo-2126124.jpeg?auto=compress&cs=tinysrgb&w=1200', photographer: 'Brett Sayles', photoCredit: 'https://www.pexels.com/photo/close-up-photo-of-person-with-tattoos-2126124/' },
    { id: 6, title: 'Floral & Abstract Sleeve', category: 'Black & Grey', artist: 'Maison Artist', description: 'A colorful floral and abstract sleeve shown as an editorial reference, photographed by Brett Sayles on Pexels. Not Maison Ink client work.', image: 'https://images.pexels.com/photos/2126124/pexels-photo-2126124.jpeg?auto=compress&cs=tinysrgb&w=1200', photographer: 'Brett Sayles', photoCredit: 'https://www.pexels.com/photo/close-up-photo-of-person-with-tattoos-2126124/' },
  ],
  artists: [
    { id: 1, name: 'Lena', specialty: 'Fine line · ornamental', bio: 'Drawn to fine detail, thoughtful composition, and custom work that feels personal.', image: '' },
    { id: 2, name: 'Kai', specialty: 'Blackwork · Japanese-inspired', bio: 'Bold shapes, expressive movement, and designs made to sit naturally on the body.', image: '' },
  ],
  bookings: [],
  nextIds: { tattoos: 7, artists: 3, bookings: 1 },
};

if (!existsSync(dataFile)) {
  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
}

function loadData() {
  const data = JSON.parse(readFileSync(dataFile, 'utf8'));
  data.tattoos ||= [];
  data.artists ||= [];
  data.bookings ||= [];
  data.nextIds ||= {};
  for (const key of ['tattoos', 'artists', 'bookings']) {
    data.nextIds[key] ||= data[key].reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }
  return data;
}

function saveData(data) {
  writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function importInitialExamples() {
  const data = loadData();
  if (data.tattoos.some((tattoo) => tattoo.photoCredit)) return;
  const examples = initialData.tattoos;
  data.tattoos = data.tattoos.map((tattoo, index) => ({ ...examples[index % examples.length], id: tattoo.id }));
  saveData(data);
}

importInitialExamples();

function requireAdmin(request, response, next) {
  if (!adminPassword) {
    if (process.env.NODE_ENV === 'production') {
      return response.status(503).json({ error: 'Studio management is disabled until the admin password is configured.' });
    }
    return next();
  }
  if (request.get('X-Admin-Password') !== adminPassword) {
    return response.status(401).json({ error: 'Studio manager password required.' });
  }
  return next();
}

function list(resource) {
  return (_request, response) => response.json(loadData()[resource].slice().reverse());
}

function create(resource, requiredFields) {
  return (request, response) => {
    const data = loadData();
    const item = request.body || {};
    if (requiredFields.some((field) => !String(item[field] || '').trim())) {
      return response.status(400).json({ error: `${requiredFields.join(' and ')} required` });
    }
    const saved = { ...item, id: data.nextIds[resource]++ };
    if (resource === 'bookings') saved.status = 'New';
    data[resource].push(saved);
    saveData(data);
    return response.status(201).json(saved);
  };
}

function update(resource, allowedFields) {
  return (request, response) => {
    const data = loadData();
    const index = data[resource].findIndex((item) => item.id === Number(request.params.id));
    if (index === -1) return response.status(404).json({ error: 'Record not found' });
    const updates = Object.fromEntries(allowedFields
      .filter((field) => request.body?.[field] !== undefined)
      .map((field) => [field, request.body[field]]));
    data[resource][index] = { ...data[resource][index], ...updates };
    saveData(data);
    return response.json(data[resource][index]);
  };
}

function remove(resource) {
  return (request, response) => {
    const data = loadData();
    const existing = data[resource].length;
    data[resource] = data[resource].filter((item) => item.id !== Number(request.params.id));
    if (data[resource].length === existing) return response.status(404).json({ error: 'Record not found' });
    saveData(data);
    return response.status(204).end();
  };
}

const api = '/api';
app.get(`${api}/tattoos`, list('tattoos'));
app.post(`${api}/tattoos`, requireAdmin, create('tattoos', ['title', 'category']));
app.put(`${api}/tattoos/:id`, requireAdmin, update('tattoos', ['title', 'category', 'artist', 'description', 'image', 'photographer', 'photoCredit']));
app.delete(`${api}/tattoos/:id`, requireAdmin, remove('tattoos'));
app.get(`${api}/artists`, list('artists'));
app.post(`${api}/artists`, requireAdmin, create('artists', ['name']));
app.put(`${api}/artists/:id`, requireAdmin, update('artists', ['name', 'specialty', 'bio', 'image']));
app.delete(`${api}/artists/:id`, requireAdmin, remove('artists'));
app.get(`${api}/bookings`, requireAdmin, list('bookings'));
app.post(`${api}/bookings`, create('bookings', ['name', 'email']));
app.put(`${api}/bookings/:id`, requireAdmin, update('bookings', ['status']));
app.delete(`${api}/bookings/:id`, requireAdmin, remove('bookings'));
app.post(`${api}/admin/verify`, requireAdmin, (_request, response) => response.json({ valid: true }));
app.get('/art/:file', (request, response) => response.sendFile(path.join(here, '../client/src/art', path.basename(request.params.file))));
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use(express.static(path.join(here, '../client/dist')));
app.get('*', (_request, response, next) => {
  response.sendFile(path.join(here, '../client/dist/index.html'), (error) => {
    if (error) next();
  });
});

app.listen(port, () => console.log(`Maison Ink API and site: http://localhost:${port}`));
