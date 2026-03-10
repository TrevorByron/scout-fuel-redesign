What all I've done so far:<br><br>
<empty-block/>
## Work Summary — Since Last Write-Up (March 9, 2026)
<empty-block/>
### What We Built This Round
We focused on making the app feel **owned by your clients** — the trucking companies and fleets you serve — rather than by Scout Fuel. That means putting **their** brand and **their** organization front and centre: their logos, their company names, and a smooth, branded experience from login through to the dashboard. We also added a **login splash screen** so that the transition from "signed in" to "dashboard ready" feels intentional and professional.
<empty-block/>
### What's New
- **Organization switcher** — The sidebar now shows the **current client's logo and name** (e.g. Frontier Trucking, Brink Truck Lines, JFW Trucking) instead of Scout Fuel. Users can switch between organizations; each org can have its own logo and subtitle. This makes it clear whose data they're looking at and reinforces that the app is **theirs**.
![Organization switcher](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/org-switcher_localhost_3000.png)
<empty-block/>
- **Login experience** — Login page supports optional full logo and a split layout with branding and form. After submitting, users see a **splash screen** before entering the dashboard.
![Login form](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/login-form_localhost_3000_login.png)
<empty-block/>
- **Client-first branding** — Across the app we surface **organization logos and names** rather than Scout Fuel everywhere. The design decision is explicit: when you're selling to trucking companies, the product should feel like **their** command centre, not a white-label shell with our name on it.
- **Login splash screen** — After a successful login, a short full-screen splash appears with a progress bar and reassuring steps ("Loading all fuel transactions…", "Building your dashboard…", "Gathering insights…"). It sets the tone that the app is loading their data and reduces the abrupt jump straight into the dashboard.
<empty-block/>
### Why It Matters — Client-First Branding
As a startup it's tempting to put our own brand everywhere. But when your customers are **trucking companies and fleets**, they need to feel that this is **their** tool: their logo, their name, their fuel data. The updates we made are designed to do exactly that:
<empty-block/>
- **Organization switcher** shows **company logos and organization names** in the sidebar. So at a glance users see "Frontier Trucking" or "Brink Truck Lines," not "Scout Fuel." That builds trust and makes the app feel like part of their operations.
- **Login** can carry your client's logo (or Scout Fuel's when that's appropriate), and the **splash screen** gives a clear, professional handoff from authentication to dashboard.
- The result: a more **powerful product** for you — one that feels white-label and client-owned, which is exactly what fleet and trucking clients expect when they're making buying decisions.
<empty-block/>
### Why the Splash Screen Matters
The splash screen isn't just eye candy. It:
<empty-block/>
- **Sets expectations** — Users see that the app is loading their data, not just flipping a page.
- **Reduces perceived wait** — A short, purposeful sequence with a progress bar and messages feels faster and more controlled than a blank or spinner-only load.
- **Reinforces branding** — The "Opening Scout Fuel" moment (or your client's name when customized) gives one last clear cue before the dashboard takes over with the **client's** branding.
<empty-block/>
### How It Follows Best Practices
- **Recognition over recall** — The org switcher shows logos and names so users always know which organization they're in.
- **Clear feedback** — The splash screen provides explicit loading steps and progress so users aren't left wondering what's happening.
- **Consistency** — Client logos and names are used consistently in the sidebar and org switcher.
- **Personalisation** — The UI is built to highlight the **client's** brand, which supports conversion and trust in B2B fleet contexts.
<empty-block/>
### Screenshots
Component-level screenshots (zoomed in on each feature) plus full-page views:
<empty-block/>
![Organization switcher (component)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/org-switcher_localhost_3000.png)
![Login form (component)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/login-form_localhost_3000_login.png)
![Login (full page)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_login.png)
![Dashboard with organization switcher](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000.png)
<empty-block/>
*Tip: Add a screenshot of the splash screen to public/client-summary-screenshots/ (e.g. splash-screen.png) after capturing it from the app; then link it here for Notion.*
<empty-block/>
## Scout Fuel — Work Summary (March 9, 2026)
<empty-block/>
### What We Built
Scout Fuel is a **fleet fuel management dashboard** — a web app that gives fleet managers a single place to see fuel usage, costs, driver insights, and recommendations. We set up the project from the ground up and built the first full set of screens so you can see how the product will look and behave.<br><br>
**Choices we made (and why they matter):**<br><br>
We chose **Tailwind CSS** for styling. Tailwind is a utility-first CSS framework: instead of writing custom CSS for every button or layout, we use small, reusable classes that do one thing. The benefit for you: the app stays **consistent**, **fast to load**, and **easy to change** later. New features can match the existing look without starting from scratch.<br><br>
We chose **shadcn/ui** for the interface components. shadcn is a set of open-source, accessible building blocks (buttons, forms, tables, charts, sidebars) that we copy into the project and own. They're not a black box: we can tweak every part to match your brand and UX. The benefits: **professional, accessible UI** out of the box, **full control** over design and behavior, and **no ongoing licensing or lock-in** — it's your code.<br><br>
On top of that we added **three switchable style themes** (blue/violet, warm/amber, teal/green) and **light and dark mode** plus a **collapsible sidebar** so the layout works on different screen sizes.
<empty-block/>
### What's New
- **Project foundation** — Next.js app with Tailwind CSS and shadcn/ui; responsive layout with sidebar and header.
- **Login** — Dedicated login screen with a simple form and branding area, ready to be wired to your auth.
- **Dashboard (home)** — Main view with KPIs, fuel price trends chart, recent transactions table, cost-saving opportunities, and driver leaderboard.
- **Live Fleet Map** — Map view for fleet locations (MapLibre/Leaflet), ready for real-time or sample data.
- **Fuel Transactions** — Filterable, sortable table of fuel transactions.
- **Driver Insights** — Driver-level metrics (MPG, cost per mile) with charts.
- **Route Optimizer** — Screen for route planning and optimization inputs.
- **Budget & Forecasting** — Budget vs actual views with bar charts.
- **Alerts & Recommendations** — Placeholder for alerts and actionable recommendations.
- **Style switcher** — Three theme variants plus light/dark mode, with choice persisted.
<empty-block/>
### Why It Matters
You get a **single, coherent product** instead of a patchwork of screens. Fleet managers can move from login to dashboard to transactions to drivers to budget without leaving one app. The choices we made (Tailwind + shadcn) mean the UI is **consistent**, **accessible**, and **easy to evolve** — so when you add real data, new roles, or new features, the foundation is already in place.
<empty-block/>
### How It Follows Best Practices
- **Visual hierarchy and consistency** — Clear structure and shared design tokens so the most important information stands out.
- **Recognition over recall** — Navigation is always visible in the sidebar with clear labels (Dashboard, Live Fleet Map, Fuel Transactions, etc.).
- **Accessibility** — shadcn components built with keyboard navigation, focus states, and semantic structure (WCAG-oriented).
- **Responsive layout** — Sidebar collapses on smaller widths; login and dashboard work across desktop and tablet.
- **Performance** — Next.js and Tailwind support code splitting and lean CSS so the app can stay fast as we add more screens and data.
<empty-block/>
### Screenshots
Screenshots are served from the deployed app. If you don't see them yet, deploy the repo to Vercel (or your host); they live in **public/client-summary-screenshots/**.
![Login](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_login.png)
![Dashboard](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000.png)
![Live Fleet Map](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_fleet.png)
![Fuel Transactions](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_transactions.png)
![Driver Insights](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_drivers.png)
![Route Optimizer](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_route_optimizer.png)
![Budget & Forecasting](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_budget.png)
![Alerts & Recommendations](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_alerts.png)
<empty-block/>
### Next Steps
- Connect login to your authentication provider.
- Plug in real data sources for transactions, drivers, and fleet locations.
- Add any role-based views or permissions you need.
- Refine copy, labels, and branding (logo, colors) to match your final product.
