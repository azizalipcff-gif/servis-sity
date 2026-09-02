# Verified Feature Matrix

| Feature | Status | How tested | Notes |
|---|---|---|---|
| Production build | Verified | Vercel production deployment | Latest audited deployment reached READY |
| Homepage counters | Incomplete | Code/query audit | Requires recorded live browser verification |
| Marketplace type selector | Incomplete | Code audit | Requires recorded live interaction test |
| Business discovery | Incomplete | Query inspection | Public query restricts to approved; E2E pending |
| Service discovery | Incomplete | Query inspection | Published services now filtered to approved providers; E2E pending |
| Product flow | Incomplete | Code inspection | Needs end-to-end verification |
| Business profile | Incomplete | Code inspection | Browser QA pending |
| Authentication | Incomplete | Tests exist | Live role journey pending |
| Owner permissions | Incomplete | Tests exist | Live session verification pending |
| Admin permissions | Incomplete | Tests exist | Direct URL authorization test pending |
| Moderation | Incomplete | E2E scripts exist | Must be executed |
| Messaging | Not verified | UI/tests exist | Live flow not confirmed |
| Reviews | Incomplete | Query/test coverage | Demo provenance audit pending |
| Billing | Not verified | Tests exist | Do not market as real payments |
| Image uploads | Incomplete | Guard tests exist | Live storage upload pending |
| RTL localization | Incomplete | next-intl structure | Full viewport audit pending |
| SEO/sitemap | Incomplete | Tests exist | Live crawl pending |
| Mobile UX | Not verified | No recorded device matrix | Requires browser QA |

A visible button, route, or test file is not proof that a feature works end-to-end.
