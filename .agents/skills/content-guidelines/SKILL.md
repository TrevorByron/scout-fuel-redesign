---
name: content-guidelines
description: Applies voice, tone, and UI copy conventions when writing interface text, labels, errors, empty states, tooltips, or any user-facing content. Use when writing button labels, form text, error messages, notification copy, page titles, descriptions, empty states, or when the user asks about content style, voice, tone, or branding.
---

# Content Guidelines

Voice, tone, and copy conventions for all user-facing text in the design system.

---

## Voice Principles

| Principle | Meaning |
|---|---|
| **Clear** | Say exactly what you mean. No jargon unless the audience expects it. |
| **Concise** | Use the fewest words that fully convey the message. |
| **Helpful** | Guide the user toward their next action. Don't just describe a state — resolve it. |
| **Confident** | Use direct language. Avoid hedging ("might", "maybe", "we think"). |
| **Respectful** | Never blame the user. Frame problems as situations, not mistakes. |

## Tone by Context

Tone shifts by situation while voice stays constant:

| Context | Tone | Example |
|---|---|---|
| Success confirmations | Warm, brief | "Changes saved" |
| Errors and failures | Direct, supportive | "Couldn't save changes. Check your connection and try again." |
| Destructive actions | Serious, clear | "This will permanently delete all project data. This action cannot be undone." |
| Onboarding / empty states | Encouraging, guiding | "Create your first project to get started." |
| Informational notices | Neutral, factual | "You can now export data in CSV format." |
| Tooltips | Minimal, descriptive | "Filter by date range" |

---

## UI Copy Patterns

### Button Labels

- Use a **verb** or **verb + noun**: "Save", "Create Project", "Send Invite"
- Primary actions: specific verb ("Save Changes", not "Submit")
- Cancel actions: "Cancel" (not "Dismiss", "Close", "Never mind")
- Destructive actions: name the action ("Delete Project", not "Confirm")

| Do | Don't |
|---|---|
| Save Changes | Submit |
| Create Project | Add New |
| Send Invite | OK |
| Delete Account | Yes, Delete |

### Page Titles

- Use nouns or noun phrases: "Settings", "Projects", "Team Members"
- No verbs, articles, or trailing punctuation
- Keep to 1–3 words when possible

### Page Descriptions

- One sentence, present tense
- Describe what the user can do on this page
- Use `text-muted-foreground` styling

| Do | Don't |
|---|---|
| "Manage your account preferences." | "This page is where you can manage your preferences." |
| "All your team's projects." | "Here you'll find a list of all the projects." |

### Section Headings (Frame/Card Titles)

- Short noun phrases: "Profile", "Notifications", "Danger Zone"
- No periods

### Form Labels

- Use nouns: "Email", "Display Name", "Password"
- Sentence case, no colons
- Keep labels to 1–3 words

### Form Descriptions (Help Text)

- Clarify constraints or expectations the label can't convey
- One sentence, no period if under 8 words
- Use `text-muted-foreground text-xs`

| Do | Don't |
|---|---|
| "Must be at least 8 characters" | "Please enter a password that is at least 8 characters long." |
| "We'll never share your email" | "Your email address will not be shared with third parties." |

### Placeholder Text

- Show an example value, not an instruction: `placeholder="jane@example.com"` not `placeholder="Enter your email"`
- For text areas: a brief prompt is acceptable: `placeholder="Tell us about yourself"`

### Error Messages

Structure: **what happened** + **how to fix it**.

| Do | Don't |
|---|---|
| "Email is required" | "Error: field cannot be empty" |
| "Couldn't save changes. Check your connection and try again." | "An error occurred. Error code: 500." |
| "This email is already in use. Try a different one." | "Duplicate entry detected." |

Rules:
- Never use technical jargon (status codes, internal field names)
- Never blame the user ("You forgot to…", "You entered an invalid…")
- Always suggest a next step when possible

### Empty States

- Title: name what's missing ("No projects yet", "No messages")
- Description: explain how to resolve it
- Include a CTA button when the user can fix the empty state

| Do | Don't |
|---|---|
| "No projects yet — Create your first project to get started." | "There are no items to display." |
| "No notifications — You're all caught up." | "Empty." |

### Toast / Notification Copy

- Title: past-tense confirmation or brief status ("Changes saved", "Invite sent")
- Description (optional): one clarifying sentence
- Keep total copy under 15 words

### Tooltip Text

- Fragment, not a full sentence: "Filter by date range", "Copy to clipboard"
- No periods
- Max ~5 words

### Destructive Confirmation Dialogs

- Title: ask a question naming the target: `Delete "Project Alpha"?`
- Description: state the consequence clearly, end with "This action cannot be undone."
- Confirm button: repeat the destructive verb + noun: "Delete Project"
- Cancel button: "Cancel"

---

## Capitalization

| Element | Convention | Example |
|---|---|---|
| Page titles | Title Case | "Team Members" |
| Section headings | Title Case | "Danger Zone" |
| Button labels | Title Case | "Save Changes" |
| Form labels | Sentence case | "Display name" |
| Descriptions | Sentence case | "Manage your account preferences." |
| Tooltips | Sentence case | "Copy to clipboard" |
| Badge labels | Title Case | "Active", "Draft" |
| Menu items | Title Case | "Edit", "Duplicate" |
| Tab labels | Title Case | "Overview", "Settings" |

---

## Punctuation

- **Periods**: Use in full sentences (descriptions, error messages). Omit in labels, headings, tooltips, and short help text.
- **Exclamation marks**: Never in error messages. Sparingly in success states only.
- **Ellipsis (…)**: Use to indicate truncation or an ongoing process ("Loading…", "Saving…"). Don't use for trailing off.
- **Ampersands (&)**: Avoid. Use "and" in copy.
- **Oxford comma**: Use it: "Edit, duplicate, and delete."

---

## Terminology Consistency

Pick one term and stick with it across the entire product:

| Preferred | Avoid Mixing |
|---|---|
| "Delete" | "Remove", "Destroy", "Erase" |
| "Create" | "Add", "New", "Make" |
| "Save" | "Submit", "Apply", "Update" (unless specifically updating) |
| "Cancel" | "Dismiss", "Close", "Never mind" |
| "Settings" | "Preferences", "Options", "Configuration" |
| "Sign in" / "Sign out" | "Log in" / "Log out", "Login" / "Logout" |

---

## Numbers and Data

- Use numerals for counts: "3 projects", not "three projects"
- Use "No" for zero states in copy: "No projects yet"
- Dates: relative when recent ("2 hours ago"), absolute when older ("Mar 15, 2025")
- File sizes: use abbreviations with space: "4.2 MB", "128 KB"

---

## Branding

### Product Name

- Always use the official product name in title case
- Never abbreviate the product name in user-facing copy
- In headings and navigation, the product name can stand alone

### Brand Voice in Marketing vs Product

| Context | Voice |
|---|---|
| Marketing pages | Aspirational, benefit-driven, slightly warmer |
| Product UI | Functional, precise, action-oriented |

Marketing copy can be more expressive. Product UI copy stays utilitarian.

### Logo and Identity

Use the `Logo` component from `@/components/logo` for all brand marks:

```tsx
import { Logo } from "@/components/logo"

<Logo />                        // Horizontal: mark + wordmark
<Logo variant="stacked" />      // Mark above wordmark
<Logo variant="mark" />         // Circle mark only
<Logo variant="wordmark" />     // "Studio" text only
```

Rules:
- Logo uses `currentColor` — never override with brand colors or custom fills
- Horizontal lockup for navigation and headers; stacked for splash/loading screens
- Mark alone for tight spaces (toolbars, app icons); wordmark alone for footers
- Minimum mark size: 16px. Minimum horizontal lockup: 100px wide
- Clear space around the logo: at least the diameter of the mark on all sides
- Never rotate, stretch, add effects, or rearrange lockup elements
