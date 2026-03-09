# Best Practices Reference

Use this file when writing the "How It Follows Best Practices" section of a client summary. Pick the categories relevant to the work done. Be specific — quote the principle name where relevant.

---

## UX / Usability

| Practice | Description | When to cite |
|---|---|---|
| Visual hierarchy | Most important elements are largest/most prominent | Login CTAs, form design, dashboards |
| Progressive disclosure | Complex options revealed only when needed | Multi-step flows, settings pages |
| Minimize cognitive load (Miller's Law) | Chunks information into digestible groups | Navigation, forms, dashboards |
| Fitts's Law | Interactive targets are sized appropriately for easy clicking | Buttons, links, mobile touch targets |
| Error prevention | Form validates inline before submission | Any form |
| Hick's Law | Fewer choices = faster decisions | Onboarding, pricing pages |
| Recognition over recall | Users see options rather than having to remember them | Navigation, menus, autocomplete |
| Consistency | UI patterns match across the app and with web conventions | Any redesign |
| Clear feedback | Every action confirms its result | Buttons, form submission, loading states |
| Empty states | Designed state for when there's no content | Lists, dashboards, search results |

---

## Accessibility (WCAG 2.1 AA)

| Practice | Description | When to cite |
|---|---|---|
| Colour contrast | Text meets 4.5:1 ratio (3:1 for large text) | Any redesign with new colours |
| Keyboard navigability | All interactions reachable via keyboard | Forms, modals, dropdowns |
| Focus indicators | Visible focus ring on interactive elements | Any interactive component |
| ARIA labels | Screen reader labels on icon-only buttons | Icon buttons, image links |
| Alt text | Meaningful descriptions on images | Any page with images |
| Semantic HTML | Correct heading hierarchy, landmark regions | Any page rebuild |
| Touch target size | Minimum 44×44px per WCAG 2.5.5 | Mobile views |
| Reduced motion | Animations respect `prefers-reduced-motion` | Animated components |

---

## Performance

| Practice | Description | When to cite |
|---|---|---|
| Lazy loading | Images/components load only when needed | Image-heavy pages, long lists |
| Code splitting | JS bundles split by route | Large SPAs |
| Optimised images | WebP/AVIF, srcset, correct sizing | Any page with images |
| Minimal render-blocking | CSS in `<head>`, JS deferred | Landing pages |
| Core Web Vitals — LCP | Largest Contentful Paint < 2.5s | Any page optimisation |
| Core Web Vitals — CLS | Cumulative Layout Shift < 0.1 | Pages with dynamic content |
| Core Web Vitals — INP | Interaction to Next Paint < 200ms | Interactive pages |
| Server-side rendering | HTML returned with content, not empty shell | SEO-important pages |
| Edge caching | Static assets served from CDN | Any deployment |

---

## Security

| Practice | Description | When to cite |
|---|---|---|
| HTTPS everywhere | All traffic encrypted | Any network feature |
| CSRF protection | Forms include CSRF tokens | Any form that mutates state |
| Content Security Policy | CSP headers prevent XSS | Any web app |
| Rate limiting | Login/API endpoints throttled | Auth flows |
| Secure password handling | Hashed with bcrypt/argon2, not stored plain | Auth redesigns |
| OAuth / SSO | Delegates auth to trusted provider | Login redesigns |
| Input validation | Server-side validation, not just client-side | Any form |
| Least privilege | Users/services have minimum required permissions | Permission systems |

---

## Mobile / Responsive Design

| Practice | Description | When to cite |
|---|---|---|
| Mobile-first | Designed for small screens, enhanced for large | Any responsive work |
| Fluid typography | Font sizes scale with viewport | Any redesign |
| Responsive images | Different image sizes served per viewport | Image-heavy pages |
| Thumb-friendly layout | Primary actions in bottom half of screen | Mobile-specific designs |
| No horizontal scroll | Content reflows correctly at all widths | Any responsive fix |

---

## Conversion / Business Impact

| Practice | Description | When to cite |
|---|---|---|
| Clear CTA | One primary action per screen | Landing pages, onboarding |
| Reduced friction | Fewer steps to complete a goal | Checkout, signup, login |
| Trust signals | Reviews, security badges, social proof | Checkout, pricing |
| Personalisation | Content tailored to user context | Dashboards, recommendations |
| A/B testability | Components structured to support experiments | Any product feature |
| Funnel analytics | Key steps instrumented for tracking | Multi-step flows |

---

## Code Quality (for internal summaries)

| Practice | Description | When to cite |
|---|---|---|
| Component-driven | UI broken into reusable, isolated components | Frontend work |
| Single responsibility | Each module/function does one thing | Any refactor |
| Test coverage | Unit/integration/e2e tests added | Any feature with tests |
| Type safety | TypeScript types on public APIs | TS projects |
| Documented | JSDoc / README updated | Library or API changes |
