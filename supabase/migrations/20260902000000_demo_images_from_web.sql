-- Demo-only visual assets: use Unsplash-hosted photos for the synthetic marketplace dataset.
-- No real customer/business endorsement is implied.

BEGIN;

ALTER TABLE public.businesses DISABLE TRIGGER protect_business_admin_fields_trigger;

UPDATE public.businesses
SET
  logo_url = CASE slug
    WHEN 'demo-atlas-reparation-auto' THEN 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-atlas-auto' THEN 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-studio-elegance' THEN 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-elecpro-oujda' THEN 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-elecpro' THEN 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-plomberie-al-amal' THEN 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-clean-maison' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-cafe-medina-oujda' THEN 'https://images.unsplash.com/photo-1517227180537-db47cb70685e?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-cafe-medina' THEN 'https://images.unsplash.com/photo-1517227180537-db47cb70685e?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-dar-al-khayal-resto' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-dar-khayal' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-menuiserie-atlas' THEN 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-prof-plus-academie' THEN 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-prof-plus' THEN 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-clinique-sante-plus' THEN 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-sante-plus' THEN 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-pixel-pro-studio' THEN 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-pixel-pro' THEN 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80'
    WHEN 'demo-peinture-deco' THEN 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80'
    ELSE logo_url
  END,
  cover_url = CASE slug
    WHEN 'demo-atlas-reparation-auto' THEN 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-atlas-auto' THEN 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-studio-elegance' THEN 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-elecpro-oujda' THEN 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-elecpro' THEN 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-plomberie-al-amal' THEN 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-clean-maison' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-cafe-medina-oujda' THEN 'https://images.unsplash.com/photo-1517227180537-db47cb70685e?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-cafe-medina' THEN 'https://images.unsplash.com/photo-1517227180537-db47cb70685e?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-dar-al-khayal-resto' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-dar-khayal' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-menuiserie-atlas' THEN 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-prof-plus-academie' THEN 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-prof-plus' THEN 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-clinique-sante-plus' THEN 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-sante-plus' THEN 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-pixel-pro-studio' THEN 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-pixel-pro' THEN 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80'
    WHEN 'demo-peinture-deco' THEN 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1600&q=80'
    ELSE cover_url
  END
WHERE slug LIKE 'demo-%';

UPDATE public.services s
SET photo_url = b.logo_url,
    gallery = ARRAY[b.cover_url]
FROM public.businesses b
WHERE s.business_id = b.id
  AND b.slug LIKE 'demo-%';

UPDATE public.products p
SET images = CASE p.slug
  WHEN 'demo-p1' THEN ARRAY['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p2' THEN ARRAY['https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p3' THEN ARRAY['https://images.unsplash.com/photo-1474979266404-7caddf02dbb8?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p4' THEN ARRAY['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p5' THEN ARRAY['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p6' THEN ARRAY['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p7' THEN ARRAY['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p8' THEN ARRAY['https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p9' THEN ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p10' THEN ARRAY['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p11' THEN ARRAY['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p12' THEN ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p13' THEN ARRAY['https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p14' THEN ARRAY['https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1200&q=80']
  WHEN 'demo-p15' THEN ARRAY['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80']
  ELSE COALESCE(p.images, ARRAY[]::text[])
END
FROM public.businesses b
WHERE p.business_id = b.id
  AND b.slug LIKE 'demo-%';

-- Guarantee that any demo product added later still gets a real photo.
UPDATE public.products p
SET images = ARRAY[b.cover_url]
FROM public.businesses b
WHERE p.business_id = b.id
  AND b.slug LIKE 'demo-%'
  AND (p.images IS NULL OR array_length(p.images, 1) IS NULL OR array_length(p.images, 1) = 0);

ALTER TABLE public.businesses ENABLE TRIGGER protect_business_admin_fields_trigger;

COMMIT;
