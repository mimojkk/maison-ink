import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './overrides.css';

const categories = ['All work', 'Fine Line', 'Blackwork', 'Black & Grey', 'Micro Realism', 'Ornamental', 'Japanese'];
const blankTattoo = { title: '', category: 'Fine Line', artist: '', description: '', image: '' };
const blankArtist = { name: '', specialty: '', bio: '', image: '' };
const blankBooking = { name: '', email: '', phone: '', service: 'Custom tattoo', date: '', message: '' };

async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const adminRequest = (path === '/bookings' && method === 'GET')
    || path.startsWith('/bookings/')
    || (['/tattoos', '/artists'].some((resource) => path === resource || path.startsWith(`${resource}/`)) && method !== 'GET');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (adminRequest && sessionStorage.getItem('maison-admin-password')) {
    headers['X-Admin-Password'] = sessionStorage.getItem('maison-admin-password');
  }
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Something went wrong. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [tattoos, setTattoos] = useState([]);
  const [artists, setArtists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [category, setCategory] = useState('All work');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('Portfolio');
  const [editingTattoo, setEditingTattoo] = useState(null);
  const [editingArtist, setEditingArtist] = useState(null);
  const [bookingForm, setBookingForm] = useState(blankBooking);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh(includeBookings = adminOpen) {
    setLoading(true);
    try {
      const [work, people, requests] = await Promise.all([
        api('/tattoos'), api('/artists'), includeBookings ? api('/bookings') : Promise.resolve(bookings),
      ]);
      setTattoos(work);
      setArtists(people);
      setBookings(requests);
      setError('');
    } catch (err) {
      setError(`${err.message} Make sure the Maison Ink server is running.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function openAdmin() {
    let password = sessionStorage.getItem('maison-admin-password') || '';
    if (password) {
      try {
        await api('/admin/verify', { method: 'POST', headers: { 'X-Admin-Password': password } });
      } catch { sessionStorage.removeItem('maison-admin-password'); password = ''; }
    }
    if (!password) {
      password = window.prompt('Enter the studio manager password:');
      if (password === null) return;
      sessionStorage.setItem('maison-admin-password', password);
      try {
        await api('/admin/verify', { method: 'POST', headers: { 'X-Admin-Password': password } });
      } catch (err) {
        sessionStorage.removeItem('maison-admin-password');
        setNotice(err.message);
        return;
      }
    }
    setAdminOpen(true);
    setNotice('');
    await refresh(true);
  }
  const visibleTattoos = useMemo(() => category === 'All work'
    ? tattoos
    : tattoos.filter((tattoo) => tattoo.category === category), [tattoos, category]);

  async function saveTattoo(event) {
    event.preventDefault();
    try {
      const saved = await api(editingTattoo.id ? `/tattoos/${editingTattoo.id}` : '/tattoos', {
        method: editingTattoo.id ? 'PUT' : 'POST', body: JSON.stringify(editingTattoo),
      });
      setTattoos((items) => editingTattoo.id
        ? items.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...items]);
      setEditingTattoo(null);
      setNotice('Portfolio piece saved.');
    } catch (err) { setNotice(err.message); }
  }

  async function removeTattoo(id) {
    if (!window.confirm('Remove this portfolio piece?')) return;
    try {
      await api(`/tattoos/${id}`, { method: 'DELETE' });
      setTattoos((items) => items.filter((item) => item.id !== id));
      setNotice('Portfolio piece removed.');
    } catch (err) { setNotice(err.message); }
  }

  async function saveArtist(event) {
    event.preventDefault();
    try {
      const saved = await api(editingArtist.id ? `/artists/${editingArtist.id}` : '/artists', {
        method: editingArtist.id ? 'PUT' : 'POST', body: JSON.stringify(editingArtist),
      });
      setArtists((items) => editingArtist.id
        ? items.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...items]);
      setEditingArtist(null);
      setNotice('Artist profile saved.');
    } catch (err) { setNotice(err.message); }
  }

  async function removeArtist(id) {
    if (!window.confirm('Remove this artist profile?')) return;
    try {
      await api(`/artists/${id}`, { method: 'DELETE' });
      setArtists((items) => items.filter((artist) => artist.id !== id));
      setNotice('Artist profile removed.');
    } catch (err) { setNotice(err.message); }
  }

  async function updateBooking(id, status) {
    try {
      const saved = await api(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setBookings((items) => items.map((booking) => booking.id === saved.id ? saved : booking));
    } catch (err) { setNotice(err.message); }
  }

  async function removeBooking(id) {
    if (!window.confirm('Delete this consultation request?')) return;
    try {
      await api(`/bookings/${id}`, { method: 'DELETE' });
      setBookings((items) => items.filter((booking) => booking.id !== id));
    } catch (err) { setNotice(err.message); }
  }

  async function submitBooking(event) {
    event.preventDefault();
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify(bookingForm) });
      setBookingForm(blankBooking);
      setNotice('Your consultation request is in. We’ll be in touch soon.');
      if (adminOpen) setBookings(await api('/bookings'));
    } catch (err) { setNotice(err.message); }
  }

  return (
    <div className="app-shell">
      <div className="announcement"><span>INDEPENDENT TATTOO STUDIO</span><span>NEW JERSEY <b>↗</b></span></div>
      <nav className="site-nav">
        <a className="brand" href="#top" aria-label="Maison Ink home"><span className="brand-mark">M<span>I</span></span><span className="brand-name">MAISON <i>INK</i></span></a>
        <div className="nav-links"><a href="#work">Portfolio</a><a href="#studio">The studio</a><a href="#artists">Artists</a><a href="#book">Visit & book</a></div>
        <button className="nav-book" onClick={() => document.querySelector('#book')?.scrollIntoView({ behavior: 'smooth' })}>Start a project <span>↗</span></button>
        <button className="mobile-menu" onClick={openAdmin} aria-label="Open studio manager">☰</button>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> CUSTOM TATTOOING · NEW JERSEY</p>
            <h1>Made to be<br /><em>meaningful.</em></h1>
            <p className="hero-intro">A considered tattoo experience, from the first sketch to the final detail. Thoughtful custom work, made with you and made to last.</p>
            <div className="hero-actions"><a className="button-primary" href="#book">Tell us your idea <span>↗</span></a><a className="underlined-link" href="#work">Explore the work <span>↓</span></a></div>
            <div className="hero-footnote"><span className="stamp">MI</span><span>Independent artists.<br />Personal work. Always.</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-frame"><img src="https://images.pexels.com/photos/7005673/pexels-photo-7005673.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Tattoo artist working on a client's tattoo in a studio" /><div className="image-caption"><span>THE TATTOO EXPERIENCE</span><a href="https://www.pexels.com/photo/a-tattoo-artist-working-on-a-client-7005673/" target="_blank" rel="noreferrer">PHOTO: SHKRABAANTHONY / PEXELS ↗</a></div></div>
            <div className="hero-side-note">DRAWN WITH INTENTION<br />WORN YOUR WAY</div><div className="hero-index">MI—001</div>
          </div>
          <div className="hero-bottom"><span>PERSONAL BY DESIGN</span><span className="bottom-rule"/><span>SCROLL TO DISCOVER ↓</span></div>
        </section>

        <section className="ticker" aria-label="Studio specialties"><span>FINE LINE</span><i>✳</i><span>BLACKWORK</span><i>✳</i><span>BOTANICAL</span><i>✳</i><span>BLACK & GREY</span><i>✳</i><span>MADE FOR YOU</span></section>

        <section className="portfolio section-wrap" id="work">
          <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line"/> A LIVING PORTFOLIO</p><h2>Ink with <em>intention.</em></h2></div><p className="section-note">Original concepts and selected work from the Maison artists. Every custom piece begins with a conversation.</p></div>
          <div className="category-list" aria-label="Filter tattoo portfolio">{categories.map((item) => <button key={item} className={category === item ? 'category active' : 'category'} onClick={() => setCategory(item)}>{item}<span>{item === 'All work' ? tattoos.length : tattoos.filter((tattoo) => tattoo.category === item).length}</span></button>)}</div>
          {error && <div className="inline-alert">{error}</div>}
          <div className="work-grid">
            {loading && <p className="empty-state">Gathering the collection…</p>}
            {!loading && visibleTattoos.map((tattoo, index) => <article className="work-card" key={tattoo.id}>
              <div className={`work-art art-tone-${index % 4}`}><img src={tattoo.image || '/art/rose.svg'} alt={`${tattoo.title} tattoo reference`} loading="lazy"/><span className="art-number">MI—{String(tattoo.id).padStart(3, '0')}</span><span className="art-type">EDITORIAL REFERENCE</span></div>
              <div className="work-meta"><div><span className="work-category">{tattoo.category}</span><h3>{tattoo.title}</h3></div><span className="work-arrow">↗</span></div>
              <p className="work-description">{tattoo.description || `A considered ${tattoo.category.toLowerCase()} design by ${tattoo.artist || 'Maison Ink'}.`}</p>
              <div className="work-artist">REFERENCE <b>{tattoo.artist || 'Maison Ink'}</b>{tattoo.photographer && <a className="photo-credit-link" href={tattoo.photoCredit || 'https://www.pexels.com/license/'} target="_blank" rel="noreferrer">PHOTO: {tattoo.photographer} ↗</a>}</div>
            </article>)}
            {!loading && visibleTattoos.length === 0 && <div className="empty-state">{tattoos.length ? 'No designs in this collection yet.' : 'The collection is being prepared. Check back soon.'}</div>}
          </div>
          <div className="collection-note"><span>ABOUT THESE IMAGES</span><p>Editorial tattoo references from Pexels; they are not Maison Ink client work. Reference photos are attributed on each image. Replace them with your own client-approved studio portfolio before launch.</p></div>
        </section>

        <section className="studio-section" id="studio"><div className="studio-photo"><img src="https://images.pexels.com/photos/2126124/pexels-photo-2126124.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Colorful tattoo details in a Pexels editorial reference photo"/><a className="photo-credit" href="https://www.pexels.com/photo/close-up-photo-of-person-with-tattoos-2126124/" target="_blank" rel="noreferrer">TATTOO DETAIL · PHOTO: BRETT SAYLES / PEXELS ↗</a></div><div className="studio-copy"><p className="eyebrow"><span className="eyebrow-line"/> A STUDIO WITH ROOM TO BREATHE</p><h2>Good work<br />starts with<br /><em>good listening.</em></h2><p>Maison Ink is an independent tattoo studio in New Jersey. We make a little space for the big things: considered design, honest conversation, and a calm, welcoming tattoo experience.</p><p>Bring a reference, a feeling, or just the beginning of an idea. We’ll figure out the rest together.</p><a className="underlined-link" href="#book">Get to know us <span>↗</span></a><div className="studio-location"><span>FIND OUR STUDIO</span><b>New Jersey</b><small>By appointment · Address shared upon confirmation</small></div></div></section>

        <section className="artists section-wrap" id="artists"><div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line"/> MEET YOUR ARTIST</p><h2>Different hands.<br /><em>One good feeling.</em></h2></div><p className="section-note">A small, independent team with distinct styles and the same care for every person in our chair.</p></div><div className="artist-grid">{artists.length ? artists.map((artist, index) => <article className="artist-card" key={artist.id}><div className={`artist-image artist-tone-${index % 3}`}>{artist.image ? <img src={artist.image} alt={artist.name}/> : <span>{artist.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>}<i>MAISON<br/>ARTIST</i></div><span className="artist-specialty">{artist.specialty || 'CUSTOM TATTOO ARTIST'}</span><h3>{artist.name}</h3><p>{artist.bio || 'Thoughtful custom tattooing, made in conversation with you.'}</p></article>) : <div className="artist-empty"><span>MAISON INK</span><p>Artist introductions coming soon. Get in touch and we’ll help match your idea with the right hands.</p><a className="underlined-link" href="#book">Ask us about artists <span>↗</span></a></div>}</div></section>

        <section className="booking-section" id="book"><div className="booking-aside"><p className="eyebrow"><span className="eyebrow-line"/> YOUR IDEA, OUR NEXT PROJECT</p><h2>Let’s make<br /><em>it yours.</em></h2><p>Tell us a little about what you’re imagining. We’ll get back to you to talk timing, placement, and next steps.</p><div className="booking-contact"><span>BASED IN</span><b>New Jersey</b><span>STUDIO VISITS</span><b>By appointment only</b><span>EMAIL THE STUDIO</span><b><a href="mailto:manzilagency.ke@gmail.com">manzilagency.ke@gmail.com</a></b></div><span className="booking-mark">MI.</span></div>
          <form className="booking-form" onSubmit={submitBooking}><div className="form-heading"><span>01 / NEW PROJECT</span><span>ABOUT 2 MINUTES</span></div><label>Your name<input required value={bookingForm.name} onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })} placeholder="How should we address you?" autoComplete="name"/></label><div className="form-row"><label>Email address<input type="email" required value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} placeholder="you@example.com" autoComplete="email"/></label><label>Phone (optional)<input type="tel" value={bookingForm.phone} onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="(201) 555-0123" autoComplete="tel"/></label></div><div className="form-row"><label>What are you looking for?<select value={bookingForm.service} onChange={(e) => setBookingForm({ ...bookingForm, service: e.target.value })}><option>Custom tattoo</option><option>Flash design</option><option>Consultation</option><option>Cover-up consultation</option></select></label><label>Ideal date (optional)<input type="date" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}/></label></div><label>Tell us about your idea<textarea required rows="4" value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} placeholder="Placement, size, references, or anything you’d like us to know…"/></label><button className="button-primary submit-button" type="submit">Send consultation request <span>↗</span></button><p className="form-privacy">Your details stay with our studio. Submitting this form does not confirm an appointment.</p></form>
        </section>
      </main>

      <footer className="footer"><a className="brand" href="#top"><span className="brand-mark">M<span>I</span></span><span className="brand-name">MAISON <i>INK</i></span></a><span>INDEPENDENT TATTOO STUDIO · NEW JERSEY</span><a href="mailto:manzilagency.ke@gmail.com">MANZILAGENCY.KE@GMAIL.COM</a><a href="#top">BACK TO TOP ↑</a><span>© MAISON INK 2026</span></footer>
      <button className="studio-manager-trigger" onClick={openAdmin}>Studio manager <span>↗</span></button>

      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      {adminOpen && <div className="admin-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdminOpen(false); }}><section className="admin-panel" role="dialog" aria-modal="true" aria-label="Studio manager"><div className="admin-top"><div><p className="eyebrow">MAISON INK · PRIVATE</p><h2>Studio <em>manager.</em></h2></div><button className="close-button" onClick={() => setAdminOpen(false)} aria-label="Close manager">×</button></div><div className="admin-tabs">{['Portfolio', 'Artists', 'Bookings'].map((tab) => <button key={tab} className={adminTab === tab ? 'selected' : ''} onClick={() => { setAdminTab(tab); setEditingTattoo(null); setEditingArtist(null); }}>{tab}<span>{tab === 'Portfolio' ? tattoos.length : tab === 'Artists' ? artists.length : bookings.length}</span></button>)}</div>
        {adminTab === 'Portfolio' && <div className="admin-content"><div className="admin-list-heading"><p>Portfolio pieces</p><button className="button-primary compact" onClick={() => setEditingTattoo({ ...blankTattoo })}>+ Add piece</button></div>{editingTattoo && <form className="admin-form" onSubmit={saveTattoo}><h3>{editingTattoo.id ? 'Edit portfolio piece' : 'Add a portfolio piece'}</h3><label>Title<input required value={editingTattoo.title} onChange={(e) => setEditingTattoo({ ...editingTattoo, title: e.target.value })}/></label><div className="form-row"><label>Style<select value={editingTattoo.category} onChange={(e) => setEditingTattoo({ ...editingTattoo, category: e.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label>Artist<input value={editingTattoo.artist} onChange={(e) => setEditingTattoo({ ...editingTattoo, artist: e.target.value })} placeholder="Artist name"/></label></div><label>Image URL<input value={editingTattoo.image} onChange={(e) => setEditingTattoo({ ...editingTattoo, image: e.target.value })} placeholder="/art/rose.svg or https://…"/></label><label>Photo creator (optional)<input value={editingTattoo.photographer || ''} onChange={(e) => setEditingTattoo({ ...editingTattoo, photographer: e.target.value })} placeholder="Photographer name"/></label><label>Photo credit link<input value={editingTattoo.photoCredit || ''} onChange={(e) => setEditingTattoo({ ...editingTattoo, photoCredit: e.target.value })} placeholder="Photo/portfolio or license URL"/></label><label>Description<textarea rows="3" value={editingTattoo.description} onChange={(e) => setEditingTattoo({ ...editingTattoo, description: e.target.value })}/></label><div className="admin-form-actions"><button type="button" className="button-quiet" onClick={() => setEditingTattoo(null)}>Cancel</button><button className="button-primary compact" type="submit">Save piece ↗</button></div></form>}{tattoos.map((tattoo) => <div className="admin-row" key={tattoo.id}><img src={tattoo.image || '/art/rose.svg'} alt=""/><div><b>{tattoo.title}</b><span>{tattoo.category} · {tattoo.artist || 'Maison Ink'}</span></div><button onClick={() => setEditingTattoo({ ...tattoo })}>Edit</button><button className="danger-action" onClick={() => removeTattoo(tattoo.id)}>Delete</button></div>)}</div>}
        {adminTab === 'Artists' && <div className="admin-content"><div className="admin-list-heading"><p>Artist profiles</p><button className="button-primary compact" onClick={() => setEditingArtist({ ...blankArtist })}>+ Add artist</button></div>{editingArtist && <form className="admin-form" onSubmit={saveArtist}><h3>{editingArtist.id ? 'Edit artist' : 'Add an artist'}</h3><label>Name<input required value={editingArtist.name} onChange={(e) => setEditingArtist({ ...editingArtist, name: e.target.value })}/></label><label>Specialty<input value={editingArtist.specialty} onChange={(e) => setEditingArtist({ ...editingArtist, specialty: e.target.value })} placeholder="Fine line · botanical"/></label><label>Image URL<input value={editingArtist.image} onChange={(e) => setEditingArtist({ ...editingArtist, image: e.target.value })} placeholder="https://…"/></label><label>Bio<textarea rows="3" value={editingArtist.bio} onChange={(e) => setEditingArtist({ ...editingArtist, bio: e.target.value })}/></label><div className="admin-form-actions"><button type="button" className="button-quiet" onClick={() => setEditingArtist(null)}>Cancel</button><button className="button-primary compact" type="submit">Save artist ↗</button></div></form>}{artists.map((artist) => <div className="admin-row" key={artist.id}><div className="admin-avatar">{artist.name.slice(0, 1)}</div><div><b>{artist.name}</b><span>{artist.specialty || 'Maison artist'}</span></div><button onClick={() => setEditingArtist({ ...artist })}>Edit</button><button className="danger-action" onClick={() => removeArtist(artist.id)}>Delete</button></div>)}</div>}
        {adminTab === 'Bookings' && <div className="admin-content"><div className="admin-list-heading"><p>Consultation requests</p><button className="button-quiet" onClick={refresh}>↻ Refresh</button></div>{bookings.length ? bookings.map((booking) => <article className="booking-row" key={booking.id}><div className="booking-row-top"><div><b>{booking.name}</b><span>{booking.email}{booking.phone ? ` · ${booking.phone}` : ''}</span></div><button className="danger-action" onClick={() => removeBooking(booking.id)}>Delete</button></div><p>{booking.message || 'No additional details provided.'}</p><div className="booking-row-bottom"><span>{booking.service || 'Custom tattoo'}{booking.date ? ` · ${booking.date}` : ''}</span><select aria-label={`Status for ${booking.name}`} value={booking.status || 'New'} onChange={(e) => updateBooking(booking.id, e.target.value)}><option>New</option><option>Contacted</option><option>Consultation booked</option><option>Closed</option></select></div></article>) : <div className="empty-state admin-empty">No consultation requests yet.</div>}</div>}
        <p className="admin-footnote">Studio management is password protected. Keep the password private and rotate it if it is shared.</p></section></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
