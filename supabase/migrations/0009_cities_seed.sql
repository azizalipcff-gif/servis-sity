-- Servis Sity — Phase I: complete Moroccan cities with region + geo + population.
-- Run after 0008_seed.sql. Idempotent: upserts by slug.
-- Arab names are written in Modern Standard Arabic; French/English as commonly used.

insert into public.cities (slug, name_ar, name_fr, name_en, region, lat, lng, population) values
  ('casablanca', 'الدار البيضاء', 'Casablanca', 'Casablanca', 'Casablanca-Settat', 33.5731, -7.5898, 3350000),
  ('rabat', 'الرباط', 'Rabat', 'Rabat', 'Rabat-Salé-Kénitra', 34.0009, -6.8416, 2360000),
  ('marrakech', 'مراكش', 'Marrakech', 'Marrakech', 'Marrakech-Safi', 31.6295, -7.9811, 928850),
  ('fes', 'فاس', 'Fès', 'Fes', 'Fès-Meknès', 34.0181, -5.0078, 1112072),
  ('tanger', 'طنجة', 'Tanger', 'Tangier', 'Tanger-Tétouan-Al Hoceïma', 35.7595, -5.8340, 947952),
  ('agadir', 'أكادير', 'Agadir', 'Agadir', 'Souss-Massa', 30.4278, -9.5981, 593959),
  ('meknes', 'مكناس', 'Meknès', 'Meknès', 'Fès-Meknès', 33.8935, -5.5473, 579523),
  ('oujda', 'وجدة', 'Oujda', 'Oujda', 'Oriental', 34.6807, -1.9074, 692902),
  ('kenitra', 'القنيطرة', 'Kénitra', 'Kenitra', 'Rabat-Salé-Kénitra', 34.2610, -6.5802, 572700),
  ('tetouan', 'تطوان', 'Tétouan', 'Tetouan', 'Tanger-Tétouan-Al Hoceïma', 35.5889, -5.3626, 380787),
  ('sale', 'سلا', 'Salé', 'Salé', 'Rabat-Salé-Kénitra', 34.0370, -6.8222, 982381),
  ('mohammedia', 'المحمدية', 'Mohammédia', 'Mohammedia', 'Casablanca-Settat', 33.6866, -7.3830, 208612),
  ('el-jadida', 'الجديدة', 'El Jadida', 'El Jadida', 'Casablanca-Settat', 33.2550, -8.4999, 194860),
  ('nador', 'الناظور', 'Nador', 'Nador', 'Oriental', 35.1680, -2.0051, 152765),
  ('beni-mellal', 'بني ملال', 'Béni Mellal', 'Beni Mellal', 'Béni Mellal-Khénifra', 32.4463, -6.3498, 192000),
  ('laayoune', 'العيون', 'Laâyoune', 'Laayoune', 'Laâyoune-Sakia El Hamra', 27.1253, -13.1625, 277000),
  ('dakhla', 'الداخلة', 'Dakhla', 'Dakhla', 'Dakhla-Oued Ed-Dahab', 23.6850, -15.9569, 106277),
  ('essaouira', 'الصويرة', 'Essaouira', 'Essaouira', 'Marrakech-Safi', 31.5085, -9.7595, 205000),
  ('taza', 'تازة', 'Taza', 'Taza', 'Fès-Meknès', 34.2144, -3.9847, 207000),
  ('safi', 'أسفي', 'Safi', 'Safi', 'Marrakech-Safi', 32.2994, -9.2372, 308000),
  ('khouribga', 'خريبكة', 'Khouribga', 'Khouribga', 'Béni Mellal-Khénifra', 32.8811, -6.9063, 196000),
  ('berrechid', 'برشيد', 'Berrechid', 'Berrechid', 'Casablanca-Settat', 33.2667, -7.5833, 136000),
  ('settat', 'سطات', 'Settat', 'Settat', 'Casablanca-Settat', 33.0010, -7.9849, 142000),
  ('taroudant', 'تارودانت', 'Taroudant', 'Taroudant', 'Souss-Massa', 30.4700, -8.8740, 257000),
  ('ouarzazate', 'ورزازات', 'Ouarzazate', 'Ouarzazate', 'Souss-Massa', 30.9185, -6.8934, 73700),
  ('al-hoceima', 'الحسيمة', 'Al Hoceïma', 'Al Hoceima', 'Tanger-Tétouan-Al Hoceïma', 35.2446, -6.0344, 186000),
  ('guelmim', 'كلميم', 'Guelmim', 'Guelmim', 'Guelmim-Oued Noun', 28.9872, -10.0574, 118000),
  ('sidi-ifni', 'سيدي إفني', 'Sidi Ifni', 'Sidi Ifni', 'Guelmim-Oued Noun', 29.3781, -10.1772, 20000),
  ('erfoud', 'الراشيدية', 'Erfoud', 'Erfoud', 'Drâa-Tafilalet', 31.5000, -4.2500, 23000),
  ('midelt', 'ميدلت', 'Midelt', 'Midelt', 'Drâa-Tafilalet', 32.6850, -4.7450, 55000),
  ('zagora', 'زاكورة', 'Zagora', 'Zagora', 'Drâa-Tafilalet', 30.3167, -5.8333, 35000),
  ('youssoufia', 'اليوسفية', 'Youssoufia', 'Youssoufia', 'Marrakech-Safi', 32.2500, -8.4500, 67500)
on conflict (slug) do update set
  region = excluded.region,
  lat = excluded.lat,
  lng = excluded.lng,
  population = excluded.population;