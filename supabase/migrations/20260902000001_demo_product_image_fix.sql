-- Demo-only asset fix. Uses a verified Unsplash-hosted image.
BEGIN;

UPDATE public.products
SET images = ARRAY['https://images.unsplash.com/photo-1781552482537-2442f7d3c51f?auto=format&fit=crop&fm=jpg&q=80&w=1200']
WHERE slug = 'demo-p3';

COMMIT;
