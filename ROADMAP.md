# Lorestone — Roadmap & Feature Ideas

## Already Built (don't re-implement)
- Sessions with voice recording & transcription
- Wiki with rich text editor
- Missions & chapters
- Items & relics
- Dice rolls
- Encounters / active combat tracker (initiative, HP, conditions, turns, rounds)
- Characters & NPCs (via `role` field on Character)
- Factions & reputation tracking
- Merchants & wares (with stock, haggle DC, categories, detail page)
- Decisions / branching narrative trees
- Analytics (dice stats, character breakdown, session history)
- Map uploads & mission maps

---

## Subscription Tiers (not yet implemented)

### Free — core DM toolkit
- 1 campaign
- Missions & chapters (full)
- Wiki (capped ~30 pages)
- Basic session log (no recording, no transcription)
- Items & relics
- Dice rolls (no analytics)
- Decisions & branching

### Pro (~$6–9/mo) — active campaign DM
- Unlimited campaigns
- Unlimited wiki pages
- Voice recording + transcription (Deepgram cost)
- Session analytics
- Merchant & economy tools
- Loot management
- Session export (PDF / markdown)

### Table (~$14–18/mo) — serious / long-running campaigns
- Everything in Pro
- Player Portal (read-only shared view)
- Multi-DM / collaborator access
- Campaign backup & export
- Map uploads beyond a storage limit
- Priority support

### Backend enforcement
- Never trust the frontend to enforce tier limits
- Add a `requireTier(ctx, campaignId, 'pro')` guard helper
- Apply at the resolver level on every gated mutation/query
- Throw a GraphQL error if tier doesn't qualify

---

## Player Portal (Table tier)

A DM-curated, read-only view of the campaign from the players' perspective.
Nothing is shared unless the DM explicitly publishes it.

| Feature | Notes |
|---|---|
| Wiki pages | Only pages flagged `playerVisible` |
| Missions / chapters | Active & completed only, no DM notes or decision trees |
| Session recaps | DM publishes a summary after each session |
| Party items | Items the DM flags as "party knows about" |
| Characters / party roster | Basic info, portraits |
| Dice roll feed | Post-session stats, nat 20 highlights |
| Between-session polls | DM posts a choice, players vote on next direction |
| Session notifications | Email / push when recap published or next session scheduled |

---

## Feature Ideas & Nice-to-Haves

### High priority
- **NPC tracker** — structured view of NPCs: faction, relationship to party, last seen location, status (alive/dead/missing). Currently NPCs live in Characters but have no dedicated relationship/location tracking.
- **Calendar / in-world timeline** — in-world date tracking, session dates on a campaign timeline, upcoming events pinned to dates
- **Session prep checklist** — DM builds a list before each session, checks off during play
- **Map annotations** — pin locations on uploaded maps, link pins to wiki pages, missions, or NPCs

### Session quality
- **Recap generator** — summarize transcript segments into a publishable player recap via Claude API
- **Highlight moments** — flag transcript lines as "memorable quote" or "key moment" during recording
- **Mood / music board** — link Spotify playlists or ambient tracks to scenes or locations

### Campaign management
- **Rumor board** — things players have heard, with a DM-only true/false flag
- **Secrets & reveals** — track what the party knows vs. what the DM is holding back

### Payments (needed before public launch)
- **Processor: Stripe** — supports Costa Rica, direct payouts to local bank (BAC, Banco Nacional, etc.), handles subscriptions natively
- **Alternative: LemonSqueezy** — simpler than Stripe, acts as merchant of record (they handle global VAT/tax compliance), good for solo devs
- **Schema changes needed** — add `stripeCustomerId`, `subscriptionTier`, `subscriptionExpiresAt` to User model
- **Stripe webhook endpoint** — listen for `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated` to update tier in DB — this is the source of truth, not the frontend
- **Stripe hosted checkout** — no need to build a payment form, redirect to Stripe's page
- **Products to create in Stripe** — Free (no charge), Pro (~$7/mo), Table (~$16/mo)
- **Demo users** — no Stripe account needed during demo period, tier set directly in DB via invite system
- **At expiry** — send email warning 2 weeks before demo ends, prompt to enter payment, downgrade to Free if no action

### Demo invite system (needed before Reddit launch)
- **Invite link generator** — admin generates a unique token link (e.g. `/invite/abc123`), sends it to a DM
- **Invite flow** — link takes them to a signup page, account is automatically enrolled in a 3-month Pro demo on creation
- **Invite token model** — tokens stored in DB with: `code`, `usedBy`, `usedAt`, `expiresAt`, `tier`, `durationDays`
- **Admin dashboard** — simple page to generate invite links, see who signed up, how many tokens remain
- **Cap enforcement** — max 50 active demo accounts, generating more requires manual override
- **Auto-expiry** — after 3 months, account downgrades to Free tier automatically, user gets an email warning 2 weeks before
- **No credit card on signup** — demo users don't enter payment info, conversion happens at expiry

### Community & feedback
- **In-app feedback button** — floating button, fields for type (bug / feature / other), description, optional email. Sends to email or Discord webhook
- **Discord server** — `#bug-reports` and `#feature-requests` channels, invite demo DMs directly, enables real-time follow-up and builds early community
- Consider Discord as the primary feedback channel for the demo cohort — DMs already live there

### Player-facing
- **Character sheets** — even read-only, synced from D&D Beyond or manual entry
- **Campaign invite link** — share a link with players to join the portal

### Long-term / ambitious
- **AI encounter generator** — given party level + location, suggest a balanced encounter
- **AI NPC dialogue** — in-character responses based on NPC notes (Claude API)
- **D&D Beyond sync** — pull character stats, spell slots, inventory
- **VTT integration** — push initiative / HP to Foundry or Roll20

---

## Pre-Launch Checklist

### Authentication
- Password reset flow (email link)
- Email verification on signup
- OAuth — Google login to reduce signup friction
- Session expiry & refresh token handling

### Email (transactional)
- Provider: **Resend** or **Postmark** — good deliverability, developer-friendly
- Emails needed: welcome, password reset, email verification, demo expiry warning (2 weeks out), session recap published (player portal), payment failed
- Without this the invite system and payment flows don't work

### Onboarding
- New user lands on empty dashboard — needs guidance or they churn immediately
- Options: sample campaign pre-loaded, setup wizard (name your campaign, invite players), first-visit tooltips
- The first 10 minutes decide if they come back

### Rate limiting
- Auth routes — prevent brute-force login attempts
- Transcription endpoint — prevent someone running up your Deepgram bill
- API globally — basic protection before going public

### Monitoring & error tracking
- **Sentry** — catches frontend and backend errors in real time, free tier is generous
- Railway provides basic logs but Sentry gives you stack traces and context
- Without this you're blind to production issues until users report them

### Backups
- Confirm Railway PostgreSQL backup retention policy
- Campaign data is irreplaceable — losing it destroys trust instantly
- Consider periodic exports to Cloudflare R2 as a secondary backup

### Domain & branding
- **Name: Lorestone** — evocative, fantasy feel, not D&D-specific, works across any TTRPG system
- **Domain: `lorestone.app`** — purchased, point nameservers to Cloudflare immediately
- Cloudflare already handles DNS — straightforward to set up
- Landing page: what the product is, who it's for, pricing, signup CTA

### PWA (Progressive Web App)
- DMs often run sessions on iPad or tablet at the table
- PWA makes the app installable from the browser, no app store needed
- Basic offline support for viewing wiki/missions when internet is spotty

### Launch order (suggested)
1. Auth (password reset + email verification)
2. Transactional email (Resend)
3. Domain + basic landing page
4. Onboarding flow
5. Rate limiting + Sentry
6. Invite system
7. Stripe integration
8. Privacy policy + ToS + audio consent disclaimer
9. Reddit launch (r/DMAcademy first)

---

## Legal & Compliance (before public launch)

### Infrastructure (current)
- **Railway** — backend API + PostgreSQL database hosting
- **Cloudflare** — DNS, CDN, DDoS protection, and likely R2 for file storage (maps, portraits)
- Both are solid choices — Railway scales without config, Cloudflare R2 has no egress fees which keeps storage costs low

### Must-haves before launch
- **Privacy Policy** — what data is collected (recordings, transcripts, campaign content), retention period, deletion on request
- **Terms of Service** — usage rules, what you do with recording data, liability disclaimer
- **Audio consent disclaimer** — surface in the UI before any recording starts: *"Ensure all participants consent to being recorded. Laws vary by jurisdiction."* California and several other states require all-party consent for recorded conversations
- **Deepgram ToS review** — confirm commercial usage allows storing processed transcripts in your own DB long-term

### D&D Beyond / Wizards of the Coast
- Don't reproduce their IP (rules, spells, monster stat blocks) — only sync data the user owns
- Frame D&D Beyond sync as "import your own data", not an official integration
- Avoid the word "integration" — use "import" or "sync"
- WotC actively pursues products that redistribute their content; tools that manage user-owned data are generally safe

### GDPR / Privacy
- If any EU users sign up, session recordings and transcripts are sensitive personal data
- Would require: explicit consent, data deletion on request, ideally EU-region hosting option
- Low risk early on but worth designing deletion flows into the data model now

### Notion
- Using Notion MCP internally for seeding is fine — it's a dev tool, not a product feature
- No risk as long as you're not exposing other users' Notion data

### Cost controls (related to legal exposure)
- Cap recording hours per month on free/demo tiers to limit Deepgram costs and liability surface
- Store only transcripts, not raw audio, unless there's a specific reason to keep audio
