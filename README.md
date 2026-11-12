# Fleetpoort Journey Planner — fase 1

Alles draait in je browser; data staat alleen in localStorage op je telefoon. Geen API-sleutels, geen kosten.

## Gratis hosten (GitHub Pages, HTTPS nodig voor PWA/offline)
1. Maak een repo, upload de bestanden uit deze map, Settings → Pages → branch `main` / root.
2. Open de URL in Safari op je iPhone → Deel → "Zet op beginscherm".

## Lokaal testen
`python -m http.server 8080` in deze map, open http://localhost:8080 (op dezelfde pc).

## Let op
- OCR (Tesseract.js) laadt bij het eerste gebruik taaldata van internet; daarna cachet de browser dit.
- De parser is generiek; pas hem aan zodra ik een echt (geanonimiseerd) Fleetpoort-screenshot zie.
- Zet NOOIT een NS-sleutel in deze frontend (repo is publiek): fase 2 gebruikt een lokale backend.
