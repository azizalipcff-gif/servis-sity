# Deployment Guide

1. Create a buyer-owned Supabase project.
2. Apply reviewed migrations.
3. Configure storage buckets and RLS.
4. Create a buyer-owned Vercel project linked to the buyer-owned repository/fork.
5. Add only required environment variables in Vercel.
6. Deploy a preview first.
7. Run auth, owner, admin, search, upload and RTL smoke tests.
8. Promote to production only after successful checks.

Never transfer development secrets or service-role keys to a customer repository.
