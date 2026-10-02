# Maison Ink

A responsive tattoo studio website for a New Jersey shop, with a React/Vite storefront and an Express API backed by a simple persistent JSON file. The navy, ivory, and burnt-orange visual system is designed to feel editorial and studio-led on desktop and mobile.

## Run locally

From the project folder:

1. Run `npm install` once.
2. Run `npm run dev`.
3. Open http://localhost:5173.

The storefront uses the Vite development server; API and portfolio requests are proxied to the Express server on port 4000. For a production preview, run `npm run build`, then `npm start` and open http://localhost:4000.

The first server launch creates `data/maison.json` with editable sample flash concepts and artist profiles. This file is the local database and survives restarts.

## Put it online with Render

This repository includes `render.yaml` for a single full-stack Render web service. It builds the React site, serves the Express API and frontend on one URL, stores bookings/portfolio data on a persistent disk, and requires a studio-manager password. The Starter web service and persistent disk are paid Render features; do not remove the disk or use an ephemeral filesystem for real consultation submissions.

1. Create a GitHub repository and push this project folder to it.
2. In Render, choose **New → Blueprint** and connect that GitHub repository. Render reads `render.yaml`.
3. Enter a unique, strong value for `MAISON_ADMIN_PASSWORD` when prompted. Keep it private; the manager asks for it in the browser.
4. Deploy and wait for the `/api/health` check to pass. Render will provide the public `onrender.com` address.
5. Test the booking form and the password-protected **Studio manager**. Add a custom domain in Render later if desired.

The current workspace has no Git remote configured, so it must be pushed to GitHub before Render can access it. I cannot create the hosted service or choose your account/domain without access to your Render and GitHub accounts.

## Studio manager

Choose **Studio manager** in the bottom-right corner to:

- Create, edit, and delete tattoo portfolio pieces.
- Create, edit, and delete artist profiles.
- Review, update the status of, and delete consultation requests.

Portfolio images can be entered as a local art path (for example `/art/rose.svg`) or a hosted image URL. Starter gallery photos are Pexels editorial/reference images and are credited on the site; they are **not Maison Ink client work**. Review Pexels' current license and replace all examples with your own client-approved studio photographs before presenting them as work completed by your shop. Photo sources are listed in `client/src/art/pexels-attribution.json`. Update the sample artist names, descriptions, and studio details to match your real business.

## API

- Tattoos: GET/POST/PUT/DELETE `/api/tattoos`
- Artists: GET/POST/PUT/DELETE `/api/artists`
- Bookings: GET/POST/PUT/DELETE `/api/bookings`
- Health check: GET `/api/health`

**Before public launch:** configure the manager password, review the handling and retention of submitted contact details, and replace the sample studio/location text with accurate business details. The requested date is not an appointment confirmation.
