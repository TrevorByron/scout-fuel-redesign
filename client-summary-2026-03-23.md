# Scout Fuel — Work Summary (March 23, 2026)

**Date:** March 23, 2026
**Prepared by:** Trevor Borden
**For:** Scout Fuel

---

## What We Built

Over the past 40 hours, this engagement has delivered a **fully functional React prototype** of the Scout Fuel dashboard — not a Figma mockup, but a working web application ready to connect to a real backend. That distinction matters: moving from this prototype into a live build is a **20x faster** path than starting from a Figma file, because the component architecture, data shape, and UX patterns are already real code.

Beyond the prototype itself, the work has been guided by a single strategic shift: moving Scout Fuel from a **system of record** — a place drivers log in to see what happened — into a **system of intelligence** — a tool that surfaces insights, drives action, and makes the money that's being left on the table visible and recoverable. The redesign was shaped by client feedback across five UI treatments, culminating in a design system deeply influenced by Uber's own design language.

---

## What's New

### 1. Five UI Treatments — Style 5 Is the One

We delivered five distinct visual directions across this engagement. Styles 1–3 established the design space. Styles 4 and 5 were direct iterations built on client feedback.

**Style 5 is the current direction.** It's grounded in a research deep dive into the [Uber design system](https://base.uber.com) — typography, color, density, component behavior, and interaction patterns. An AI model was trained specifically on Uber's design language to validate that every styling decision matched the system correctly. The result is a UI that feels modern, clean, and native to the transportation industry.

![Dashboard — Style 5 (Uber-influenced)](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000.png)

---

### 2. A Gamified Dashboard That Drives Action

The single most important shift in this redesign is what happens when a user opens the dashboard. The old experience was a system of record — data at rest. The new dashboard opens with two cards designed to create motion:

- **Fleet Compliance Score** — styled as a gauge, like a speedometer on a truck dashboard. It resonates immediately with the trucking audience. The goal is simple: get to 100%. If you're at 55%, you feel it. You want to move it.
- **Missed Savings** — the dollar amount sitting on the table from non-compliant stops. The goal is to get it to $0. Together with the compliance gauge, this gives every user a clear before/after target every time they open the app.

This is gamification in the truest sense: not points or badges, but a scoreboard that makes the business problem viscerally legible. Drivers and fleet managers don't need to read a report — they can see whether they're winning or losing in a single glance.

![Compliance Gauge](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/compliance-gauge_localhost_3000.png)

---

### 3. KPI Strip — High-Level Performance at a Glance

Directly below the gamified cards, a stat strip gives managers the key numbers for the selected time frame: total purchased, average cost, total savings, and total spend. These are always current, always filterable, and require no drilling.

![Dashboard KPI Strip](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000.png)

---

### 4. Persistent Time Frame Filters — Today, This Week, This Month

A new quick-filter bar lets users jump instantly between today, this week, and this month. These filters persist across the app — switch on the dashboard, and the drivers, locations, and fuel data pages all reflect the same window. This eliminates the repeated re-filtering that slows down real investigation.

---

### 5. "How Do I Improve This?" — Turning Insights Into Actions

Knowing your compliance score is 55% is useful. Knowing *who* is pulling it down and *where* is actionable. Below the KPI strip, two new attention cards surface the exact intelligence customers need to improve their numbers:

- **Drivers That Need Attention** — drivers who are consistently fueling at non-compliant or non-optimal stops, surfaced by threshold
- **Locations That Need Attention** — stops that keep showing up in transactions but aren't approved or optimized

Alongside these cards, a **"How to Save More"** button (formerly "How to Improve") opens a focused view of exactly which drivers and locations are costing money — so a fleet manager can follow up directly, not just look at a dashboard.

This is the system of intelligence in action: the app doesn't just show the problem, it tells you who to call.

---

### 6. Route Optimizer — Cleaned Up and Mobile-Functional

The Route Optimizer has been cleaned up substantially. It's functional and styled, and designed to get more immersive as Scout Fuel's trip data grows. Further mobile refinement is possible, but the tool is in a usable state for demos and early adoption.

![Route Optimizer](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_route_optimizer.png)

---

### 7. Driver Insights and Location Insights — Split Apart

The original tool bundled driver and location data together under "Driver Insights." We separated them. As a user, you can now drill into **Driver Insights** for driver-level behavior, or into **Location Insights** for stop-level performance — cleanly, without context switching. The distinction matters more as the data grows.

![Driver Insights](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_drivers.png)

![Location Insights](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_locations.png)

---

### 8. Fuel Data — Transaction History + Pricing Summary

Fuel Data consolidates what users care about in transactions: the full transaction log and a pricing summary by location and date. The interface is a reskin of the insights pattern — consistent and scannable. There's room to simplify this further into a leaner "transactions" view as the product matures.

![Fuel Transactions](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_transactions.png)

---

### 9. Live Fleet — Samsara Integration Ready

A Live Fleet page has been introduced to signal the roadmap overlap with Samsara: real-time truck locations on a map. The integration architecture is in place; this becomes fully live once Samsara is connected.

![Live Fleet](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_fleet.png)

---

### 10. Pilot Rebate Program — Always Accessible, Never Cluttering

The rebate program was already in the sidebar navigation. It's been positioned as a natural, always-accessible destination — click in to see your rebate insights and status — without crowding the primary experience. The placement feels intentional, not tacked on.

---

## Why It Matters

### The Real Problem: Money Left on the Table

Scout Fuel's core value proposition is savings. Dollars that drivers are burning at the wrong stops, on every fill-up, every week. The previous design told drivers and fleet managers *that* they had a problem. The new design tells them *what* the problem is, *who* is causing it, and *what to do about it*.

That's the difference between a system of record and a system of intelligence — and it's the difference between a tool people check occasionally and a tool people use to make decisions.

### Prototype → Production Is a 20x Multiplier

This is a fully functional React prototype. The screens are real components wired to real data shapes. The navigation works. The filters work. The charts and gauges respond to data. The effort required to connect this to a live backend and ship it is **20 times less** than if this had been delivered as Figma — because the hard work of translating design into code is already done.

---

## How It Follows Best Practices

- **Goal gradient effect** — The compliance gauge and missed savings card give users a visible target and visible progress. Users are psychologically motivated to close the gap to 100% and $0.
- **Progressive disclosure** — Time frame filters persist globally; the "How to Save More" modal surfaces detail only when the user asks for it. The dashboard stays clean.
- **Proximity and industry resonance** — The gauge metaphor maps directly to a truck dashboard. Trucking customers recognize it immediately without reading instructions.
- **Recognition over recall** — Drivers and locations that need attention are surfaced proactively. Users don't have to remember to go look — the app tells them.
- **Separation of concerns** — Driver Insights and Location Insights are split so each can evolve independently without coupling.
- **Design system discipline** — Style 5 is grounded in Uber's design system, validated through AI-assisted design review. This ensures the UI patterns are cohesive and defensible, not ad hoc decisions.

---

## Screenshots

![Dashboard](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000.png)

![Compliance Gauge](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/compliance-gauge_localhost_3000.png)

![Driver Insights](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_drivers.png)

![Location Insights](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_locations.png)

![Fuel Transactions](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_transactions.png)

![Route Optimizer](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_route_optimizer.png)

![Live Fleet](https://scout-fuel-redesign.vercel.app/client-summary-screenshots/localhost_3000_fleet.png)

---

## Next Steps

- Deploy latest build to Vercel so all screenshots resolve in Notion
- Determine whether Fuel Data can be simplified to a leaner transactions view
- Plan Samsara integration scope for Live Fleet
- Discuss rebate program data requirements for the Pilot Rebate module
- Decide which features to prioritize in the next 40-hour block
