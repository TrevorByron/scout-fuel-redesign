# Scout Fuel — Work Summary (Since Last Write-Up)
**Date:** March 9, 2026  
**For:** Client / Notion

---

## What We Built This Round

We focused on making the app feel **owned by your clients** — the trucking companies and fleets you serve — rather than by Scout Fuel. That means putting **their** brand and **their** organization front and centre: their logos, their company names, and a smooth, branded experience from login through to the dashboard. We also added a **login splash screen** so that the transition from “signed in” to “dashboard ready” feels intentional and professional.

---

## What's New

- **Organization switcher** — The sidebar now shows the **current client’s logo and name** (e.g. Frontier Trucking, Brink Truck Lines, JFW Trucking) instead of Scout Fuel. Users can switch between organizations; each org can have its own logo and subtitle. This makes it clear whose data they’re looking at and reinforces that the app is **theirs**.

  ![Organization switcher (component)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/org-switcher_localhost_3000.png)

- **Login experience** — Login page supports optional full logo (e.g. full-logo.svg) and a split layout with branding and form. After submitting, users see a **splash screen** before entering the dashboard.

  ![Login form (component)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/login-form_localhost_3000_login.png)

- **Client-first branding** — Across the app we surface **organization logos and names** rather than Scout Fuel everywhere. The design decision is explicit: when you’re selling to trucking companies, the product should feel like **their** command centre, not a white-label shell with our name on it.

- **Login splash screen** — After a successful login, a short full-screen splash appears with a progress bar and reassuring steps (“Loading all fuel transactions…”, “Building your dashboard…”, “Gathering insights…”). It sets the tone that the app is loading their data and reduces the abrupt jump straight into the dashboard.

---

## Why It Matters — Client-First Branding

As a startup it’s tempting to put our own brand everywhere. But when your customers are **trucking companies and fleets**, they need to feel that this is **their** tool: their logo, their name, their fuel data. The updates we made are designed to do exactly that:

- **Organization switcher** shows **company logos and organization names** in the sidebar. So at a glance users see “Frontier Trucking” or “Brink Truck Lines,” not “Scout Fuel.” That builds trust and makes the app feel like part of their operations.

- **Login** can carry your client’s logo (or Scout Fuel’s when that’s appropriate), and the **splash screen** gives a clear, professional handoff from authentication to dashboard.

- The result: a more **powerful product** for you — one that feels white-label and client-owned, which is exactly what fleet and trucking clients expect when they’re making buying decisions.

---

## Why the Splash Screen Matters

The splash screen isn’t just eye candy. It:

- **Sets expectations** — Users see that the app is loading their data, not just flipping a page.
- **Reduces perceived wait** — A short, purposeful sequence with a progress bar and messages feels faster and more controlled than a blank or spinner-only load.
- **Reinforces branding** — The “Opening Scout Fuel” moment (or your client’s name when customized) gives one last clear cue before the dashboard takes over with the **client’s** branding.

---

## How It Follows Best Practices

- **Recognition over recall** — The org switcher shows logos and names so users always know which organization they’re in.
- **Clear feedback** — The splash screen provides explicit loading steps and progress so users aren’t left wondering what’s happening.
- **Consistency** — Client logos and names are used consistently in the sidebar and org switcher.
- **Personalisation** — The UI is built to highlight the **client’s** brand, which supports conversion and trust in B2B fleet contexts.

---

## Screenshots

Component-level screenshots (zoomed in on each feature) plus full-page views:

![Organization switcher (component)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/org-switcher_localhost_3000.png)

![Login form (component)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/login-form_localhost_3000_login.png)

![Login (full page)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_login.png)

![Dashboard with organization switcher](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000.png)

*Tip: Add a screenshot of the splash screen to `public/client-summary-screenshots/` (e.g. `splash-screen.png`) after capturing it from the app.*

**Document order:** This summary is written for newest-first: the most recent work appears at the top of the Notion page; older summaries stay below.

---

## Next Steps (optional)

- Capture and add a splash-screen screenshot to the summary once the app is deployed.
- Connect login to your authentication provider and optionally customize splash copy per client.
- Add more organizations and logos as you onboard new fleet clients.
