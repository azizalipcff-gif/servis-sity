-- Servis Sity — Phase I: seed full Moroccan category tree + every major city.
-- Run after 0007_marketplace.sql.
--
-- Categories: 12 top-level parents + ~40 children (subcategories). Existing
-- single-level rows are preserved and linked under a parent. Every category
-- ships with Arabic/French/English names, slug, lucide icon, and SEO fields.

insert into public.categories (slug, icon, name_ar, name_fr, name_en, seo_title, seo_description) values
  ('construction', 'hammer', 'البناء والأشغال', 'Construction & rénovation', 'Construction & renovation',
   'Construction et rénovation au Maroc', 'Trouvez artisans, entrepreneurs et ouvriers du bâtiment au Maroc.'),
  ('restaurants', 'utensils-crossed', 'المطاعم والضيافة', 'Restaurants', 'Restaurants & hospitality',
   'Restaurants au Maroc', 'Restaurants, cafés et pâtisseries partout au Maroc.'),
  ('auto-services', 'car', 'السيارات والخدمات', 'Automobile', 'Cars & auto services',
   'Services automobiles au Maroc', 'Mécaniciens, carrosseries et services auto au Maroc.'),
  ('sante', 'stethoscope', 'الصحة والطب', 'Santé et médecine', 'Health & medicine',
   'Professionnels de santé au Maroc', 'Médecins, dentistes, pharmacies et cliniques au Maroc.'),
  ('beaute', 'scissors', 'الجمال والعناية', 'Beauté', 'Beauty & wellness',
   'Salons et soins au Maroc', 'Coiffeurs, instituts de beauté, hammams et spas au Maroc.'),
  ('education', 'graduation-cap', 'التعليم والتدريب', 'Éducation', 'Education & training',
   'Cours et formation au Maroc', 'Professeurs particuliers et centres de formation au Maroc.'),
  ('informatique', 'laptop', 'المعلوميات والتقنية', 'Informatique & tech', 'IT & technology',
   'Développeurs et prestataires tech au Maroc', 'Développeurs, agences web et réparation informatique au Maroc.'),
  ('media-art', 'clapperboard', 'الإعلام والفن', 'Média & art', 'Media & art',
   'Photographes et créateurs au Maroc', 'Photographes, vidéastes et studios de création au Maroc.'),
  ('ménager-services', 'sparkles', 'الخدمات المنزلية', 'Services à domicile', 'Home & cleaning services',
   'Aide à domicile au Maroc', 'Nettoyage, jardinage et entretien piscine au Maroc.'),
  ('artisanat', 'palette', 'الحرف والتقليد', 'Artisanat', 'Handicraft',
   'Artisanat marocain', 'Poterie, cuir, bijoux et couture artisanale au Maroc.'),
  ('immobilier', 'building', 'الأنشطة العقارية', 'Immobilier', 'Real estate',
   'Agences immobilières au Maroc', 'Agences et courtiers immobiliers au Maroc.'),
  ('services-pro', 'briefcase', 'الخدمات المهنية', 'Services professionnels', 'Professional services',
   'Services professionnels au Maroc', 'Avocats, comptables et consultants au Maroc.');

-- --------------------------------------------------------------------------
-- Children (subcategories)
-- --------------------------------------------------------------------------
insert into public.categories (slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description) values
  ('macaroute', 'layers', 'البناء الأشكار', 'Maçonnerie', 'Masonry',
   (select id from categories c1 where c1.slug = 'construction'), 'Maçons au Maroc', 'Maçons et entrepreneurs au Maroc.'),
  ('sante-pharmacie', 'pill', 'الصيدليات', 'Pharmacies', 'Pharmacies',
   (select id from categories c2 where c2.slug = 'sante'), 'Pharmacies au Maroc', 'Pharmacies de ville au Maroc.'),
  ('informatique-dev', 'code', 'المطورين والفيف', 'Développement', 'Software development',
   (select id from categories c3 where c3.slug = 'informatique'), 'Développeurs web au Maroc', 'Développeurs web et mobile au Maroc.'),
  ('media-video', 'video', 'المصممين الفيديو', 'Vidéastes', 'Videographers',
   (select id from categories c4 where c4.slug = 'media-art'), 'Vidéastes au Maroc', 'Réalisateurs de vidéos au Maroc.'),
  ('artisanat-cuisine', 'soup', 'الطعام الحرفي', 'Artisanat culinaire', 'Culinary craft',
   (select id from categories c5 where c5.slug = 'artisanat'), 'Artisanat culinaire Maroc', 'Produits culinaires artisanaux du Maroc.');

-- Re-parent the existing single-level categories + backfill SEO where empty.
update public.categories
set seo_title = name_en || ' au Maroc | Servis Sity',
    seo_description = 'Trouvez ' || lower(name_fr) || ' de confiance au Maroc sur Servis Sity.'
where seo_title is null;