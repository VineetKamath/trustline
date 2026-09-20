# Trustline browser extension (prototype)

A Chrome Manifest V3 extension showing how Trustline can sit on top of existing booking and marketplace
sites.

## Install

1. `npm run dev` in the repository root (the extension talks to `http://localhost:3000`).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, choose this `extension/`
   folder.
3. Visit http://localhost:3000/marketplace and open a listing.

## What it does

- `content/content.js` runs only on the CityStay demo marketplace. It looks for elements annotated with
  `data-trustline-subject="TL-XXXX"`, fetches each subject's public summary from `/api/trust/:id`
  (only claims the subject chose to publish, re-verified against the ledger), and renders a shield inside a
  closed shadow root so it cannot clash with page styles. Clicking the shield opens the panel.
- It sets `<html data-trustline-extension="active">`; the app's built-in web preview of the overlay then
  hides itself so there is only one overlay.
- `popup/` shows your own booking reliability when you are signed in to Trustline in the same browser.

## What it does not do

- No integration with Airbnb, Ola, Uber, Swiggy, Zomato, Booking.com or any other real platform.
- It reads no page content beyond the `data-trustline-*` attributes and sends nothing about the viewer.
- No icons are bundled; Chrome shows its default puzzle icon.

Future real-platform support would go through `lib/platforms/` adapters backed by official partner APIs.
