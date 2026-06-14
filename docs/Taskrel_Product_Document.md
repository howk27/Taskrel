# TASKREL
**Product Document - Tool 1**
*Mobile Contractor Quote and Operations Platform*
`taskrel.com | v1.1 | June 2026`

---

## 1. Product Overview

Taskrel is a mobile-first platform for solo and small trade contractors who need to quote, schedule, invoice, and collect payments from the field. The app should feel like a quiet operational tool: fast, legible, professional, and built around the work contractors repeat every day.

The first product wedge is AI-assisted quote creation with a consistent client-facing format. From there, Taskrel connects the quote to scheduling, invoicing, payment collection, and export.

The business model remains simple: contractors pay a flat **$19/month** for unlimited use.

---

## 2. Product Direction

Taskrel should help contractors answer three practical questions:

- Can I create a professional quote quickly from my phone?
- Can I send every quote with the same trusted format and branding?
- Can I see what work is active, scheduled, unpaid, or ready for follow-up?

Jobber is a workflow reference for expectations around quotes, quote templates, scheduling, invoicing, and client-facing documents:

- Jobber features: https://www.getjobber.com/features/
- Jobber quotes: https://www.getjobber.com/features/quotes/
- Jobber quote templates: https://help.getjobber.com/hc/en-us/articles/29292809768983-Quote-Templates
- Jobber advanced quote customization: https://help.getjobber.com/hc/en-us/articles/28400864393495-Advanced-Quote-Customization

Taskrel is **not** trying to match Jobber feature-for-feature in v1. Jobber is a reference point for contractor workflow expectations; Taskrel's v1 priority is a simpler mobile-first path from quote to scheduled job to invoice.

---

## 3. Problem Being Solved

Small contractors often quote from memory, text messages, Word docs, spreadsheets, or handwritten notes. This creates avoidable problems:

- Quotes are inconsistent from job to job.
- Client-facing documents can look unprofessional.
- Follow-up is easy to miss after a quote is sent.
- Scheduled work is separated from quote and invoice history.
- Invoices are created late or forgotten.
- Payment and export records are scattered.

Taskrel solves this with a connected workflow: generate quote, review quote, send quote, schedule job, create invoice, collect payment, and export records.

---

## 4. Target Market

### Primary User

- Solo or small contractor, usually 1-10 employees.
- Florida-based at launch, especially South Florida.
- Non-technical and phone-first.
- Currently quoting manually or using lightweight tools.
- Not using field service management software.

### Business Types

Onboarding groups contractors into broad business categories:

- Home Improvement
- Mechanical Services
- Outdoor Services
- General Contracting
- Other

### Trades Served in v1

Contractors may select multiple trades and choose one primary trade. The primary trade is the default for AI quote generation, while the selected trades represent the contractor profile.

- Painting
- Roofing
- Flooring
- Landscaping
- HVAC
- Plumbing
- Electrical

---

## 5. Competitive Landscape and Positioning

The market has a gap between manual tools and full field-service platforms:

- **Jobber:** quoting, scheduling, invoicing, CRM, and workflow automation. Useful reference, but more expensive and heavier than Taskrel v1.
- **ServiceTitan:** enterprise field-service platform, too large for Taskrel's target contractor.
- **Housecall Pro:** strong field-service workflow, still more complex than Taskrel's intended v1.
- **Free tools:** flexible, but lack structure, reminders, consistent documents, and connected records.

**Taskrel position:** $19/month flat. Built around a simple mobile workflow and professional quote consistency first.

---

## 6. v1 Feature Scope

| Feature | v1 | Later |
|---|:---:|:---:|
| Login, signup, account recovery | Yes | - |
| Failed auth attempt value preservation | Yes | - |
| Business type onboarding | Yes | - |
| Multi-trade onboarding | Yes | - |
| Primary trade selection for AI defaults | Yes | - |
| AI quote generator | Yes | - |
| Quote workflow screen with filters/search | Yes | - |
| Quote template presets: classic, modern, compact | Yes | - |
| Business branding on quote documents | Yes | - |
| Logo URL on quote documents | Yes | Storage upload |
| Default quote terms and client note | Yes | Rich template editor |
| Quote delivery by email or SMS | Yes | Automated follow-ups |
| Snapshot quote business/template settings when sent | Yes | Versioned template history |
| Auto client list from sent quotes | Yes | Full CRM |
| Native job calendar | Yes | Google Calendar sync |
| Invoicing from quote | Yes | Change orders |
| Stripe Connect payments | Yes | Advanced payment rules |
| CSV export | Yes | Accounting integrations |
| Google Sheets sync | Yes | Two-way sync |
| Client portal | Later | Yes |
| Optional quote add-ons | Later | Yes |
| Deep drag-and-drop quote customization | Later | Yes |
| Multi-user crew management | Later | Yes |

---

## 7. UX and Visual System

Taskrel must be mobile-first at 390px width before desktop polish is considered.

Visual direction:

- Dark shell with restrained slate surfaces.
- Orange primary action color.
- Clean Phosphor icons instead of emoji or custom inline SVG icons where practical.
- Compact page headers, metric strips, segmented controls, strong empty states, and professional work-item cards.
- Utility-first contractor feel: clear, direct, and operational.
- Avoid decorative gradients, orbs, novelty illustrations, and marketing-style dashboard clutter.

Primary app screens:

- Dashboard: active quotes, scheduled jobs, unpaid invoice summary.
- Quotes: workflow list with filters for Active, Drafts, Sent, Approved, Archived.
- Quote detail: professional quote preview using shared quote document renderer.
- Calendar: selected-day work view with specific empty states.
- Invoices: conversion and payment workflow.
- Settings: account, quote document defaults, billing, export.

---

## 8. Quote Consistency and Templates

Contractors need every quote to feel consistent. v1 uses controlled template presets rather than a full document builder.

### Template Presets

- **Classic:** dark Taskrel-style quote with orange totals.
- **Modern:** high-contrast professional quote with a secondary approval feel.
- **Compact:** paper-like quote for dense line items.

### Business Document Settings

Contractor profile stores:

- Logo URL
- Display business name
- Business phone
- Business email
- Business website
- License or insured text
- Default terms
- Default client note
- Default quote template preset

When a quote is sent, Taskrel snapshots business and template settings into the quote. This keeps the client-facing document stable even if the contractor later changes branding or terms.

---

## 9. Public Interfaces and Data Model

### Contractor Fields

- `business_type`
- `trade` as a backward-compatible alias for primary trade
- `primary_trade`
- `trades text[]`
- `logo_url`
- `business_phone`
- `business_website`
- `license_text`
- `quote_default_terms`
- `quote_default_note`
- `quote_template_preset`

### Quote Fields

- `business_snapshot jsonb`
- `template_preset`

---

## 10. Key Technical Decisions

- **Framework:** Next.js App Router and TypeScript.
- **Styling:** Tailwind CSS with mobile-first layouts.
- **Database/Auth:** Supabase PostgreSQL and Supabase Auth.
- **AI:** Claude API for trade-specific quote generation.
- **Payments:** Stripe for subscriptions and Stripe Connect for contractor-client payments.
- **SMS:** Twilio.
- **Email:** SendGrid.
- **Export:** CSV and optional Google Sheets sync.
- **Hosting:** Vercel.

---

## 11. Launch Phases

| Phase | Name | Pricing | Goal |
|---|---|---|---|
| 1 | APR Validation | Free | Validate phone-first quote creation with a real non-technical contractor. |
| 2 | Public Launch | $19/mo | Launch full v1 workflow with quotes, scheduling, invoicing, payments, and exports. |
| 3 | System Expansion | TBD | Add follow-ups, add-ons, crew features, CRM depth, and integrations based on usage. |

---

## 12. Success Metrics

### Validation Phase

- APR creates at least 3 quotes without assistance in the first 2 weeks.
- Quote output is accurate enough to send after review.
- Quote documents look consistent across multiple jobs.
- Mobile UX works cleanly with no desktop fallback.

### Public Launch

- 10 paying contractors within 30 days.
- $190 MRR within month 1.
- At least 1 contractor using quote, schedule, invoice, and export in the same workflow.

---

## 13. What Taskrel Is Not in v1

- Not a full CRM.
- Not a multi-crew dispatch platform.
- Not an accounting platform.
- Not a client portal.
- Not a marketplace.
- Not a drag-and-drop quote designer.
- Not an automated follow-up platform yet.

---

## 14. Cowork Instructions

- Treat this PRD as the source of truth.
- Build mobile-first and verify at 390px.
- Do not use emoji in the product UI.
- Prefer Phosphor icons for navigation, actions, and empty states.
- Keep the UI utilitarian, readable, and contractor-appropriate.
- Preserve backward compatibility for the existing `trade` field.
- Snapshot sent quote business/template settings.
- Use Jobber only as a workflow reference, not as a v1 feature checklist.
