# Servis Sity — Buyer Handover Checklist

## 1. Commercial agreement

- [ ] Buyer identity / company details recorded.
- [ ] License type recorded: non-exclusive or exclusive.
- [ ] Purchase price recorded.
- [ ] Payment milestones recorded.
- [ ] Support period recorded.
- [ ] Included / excluded assets recorded.
- [ ] Domain / hosted demo inclusion recorded.

## 2. Source delivery

- [ ] Final Git commit / release SHA recorded.
- [ ] Source repository transferred or delivered.
- [ ] No private credentials committed.
- [ ] Environment variable names documented.
- [ ] Build and deployment instructions delivered.

## 3. Supabase setup

- [ ] Buyer creates a new Supabase project.
- [ ] Database migrations applied.
- [ ] Required RLS policies verified.
- [ ] Storage buckets/configuration verified.
- [ ] Buyer creates their own Auth/OAuth configuration.
- [ ] Demo data is clearly separated from real production data.

## 4. Vercel setup

- [ ] Buyer creates or controls the Vercel project.
- [ ] Production environment variables configured.
- [ ] Build succeeds.
- [ ] Production deployment succeeds.
- [ ] Buyer-owned domain connected.
- [ ] Canonical URL environment variable updated.

## 5. Functional verification

- [ ] Public homepage loads.
- [ ] Business catalog loads.
- [ ] Business detail pages load.
- [ ] Services load.
- [ ] Products load.
- [ ] Search works.
- [ ] Business owner dashboard works.
- [ ] Admin moderation works.
- [ ] Authentication works.
- [ ] Messaging works.
- [ ] Reviews work.
- [ ] Booking flow is verified if enabled for the buyer.
- [ ] Images / storage are verified.

## 6. SEO verification

- [ ] Canonical origin points to buyer domain.
- [ ] robots.txt is accessible.
- [ ] sitemap.xml is accessible.
- [ ] hreflang URLs point to buyer domain.
- [ ] Business/service/product canonical URLs are correct.
- [ ] Organization/WebSite brand is "Servis Sity" unless buyer rebrands it.
- [ ] Search Console property is created by the buyer.
- [ ] Sitemap submitted by the buyer.
- [ ] Representative URLs inspected in Search Console.

## 7. Support handover

Recommended support window: 14 days.

Included:
- Setup clarification.
- Reproduction and correction of defects in the delivered code.
- Deployment/configuration guidance for buyer-owned infrastructure.

Not automatically included:
- New features.
- Major redesigns.
- Ongoing maintenance.
- Paid third-party services.
- Hosting bills.
- Provider approval for payment gateways, OAuth, maps, email or other external services.
