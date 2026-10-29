# Nexus Platform

Nexus is a full-stack collaboration platform for entrepreneurs and investors. It provides account registration and profiles, investor/entrepreneur discovery, meeting scheduling, document handling, and one-to-one WebRTC calls attached to accepted meetings.

## Technology

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios, Lucide icons
- Backend: Python 3.13, Django 6, Django REST Framework
- Authentication: JWT access and refresh tokens with `djangorestframework-simplejwt`
- Real-time signaling: Django Channels and Daphne over ASGI WebSockets
- Video and audio: browser WebRTC peer connections with public Google STUN servers
- Database: PostgreSQL via `psycopg2-binary`
- File/image handling: Django media storage and Pillow

## Current Features

- Register and sign in as an entrepreneur or investor; update a profile and browse user profiles.
- Create, list, accept, reject, and cancel meetings. Scheduling rejects overlapping pending or accepted meetings for either person.
- Upload documents, view only documents you uploaded, and attach a signature image.
- Join an accepted meeting's video call. Only its organizer and participant can join, using their JWT access token. Camera/microphone toggles and ICE/offer/answer signaling are included.
- Admin site, JWT refresh endpoint, and uploaded media serving in Django debug mode.
