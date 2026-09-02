# Verified Feature Matrix

| Feature | Status | How tested | Notes |
|---|---|---|---|
| Production build | Verified | Vercel deployment logs | Build completed after TypeScript fixes |
| Homepage counters | Verified | Live deployment inspection | Counts come from approved/published records |
| Marketplace type selector | Verified | Code and deployed change | All / businesses / services / products |
| Business discovery | Verified | Query inspection | Public query restricts to approved |
| Service discovery | Verified | Query inspection | Detail query restricts to published |
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
