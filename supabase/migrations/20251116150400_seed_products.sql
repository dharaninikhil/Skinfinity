/*
  # Seed the product catalogue

  The base migration seeded categories and skin concerns but no products, so a
  freshly provisioned database rendered an empty storefront with no way to
  exercise the cart, wishlist, search or checkout paths.

  Idempotent: every insert is keyed on `products.slug` / `skin_concerns.slug`
  and uses `ON CONFLICT DO NOTHING`, so re-running it is safe.

  Prices are INR. `image_url` is left empty on purpose — the client falls back to
  the branded placeholder in `public/assets/products/placeholder.svg`. Point it at
  your Supabase Storage bucket when real photography is available.
*/

-- ------------------------------------------------------------------ products

WITH seed(name, slug, short_description, description, ingredients, how_to_use,
          price, compare_at_price, category_slug, is_new, stock_quantity, rating, review_count) AS (
  VALUES
    ('Hanbang Rice Water Cleansing Foam', 'hanbang-rice-water-cleansing-foam',
     'Creamy low-pH foam that lifts sunscreen without stripping',
     'A dense, cushiony foam built on rice water and green tea. It removes SPF, sebum and city grime while staying close to the skins natural pH, so there is no squeaky tight feeling afterwards. Use it as the second step of an evening double cleanse.',
     'Rice ferment filtrate, green tea extract, glycerin, panthenol, centella asiatica',
     'Massage a pea-sized amount into damp skin for 30 seconds, then rinse with lukewarm water. Use morning and night.',
     1150, 1450, 'cleanser', true, 42, 4.6, 218),

    ('Jeju Green Tea Balancing Cleanser', 'jeju-green-tea-balancing-cleanser',
     'Gel cleanser for oily and combination skin',
     'A lightweight gel that foams gently and rinses clean, formulated around Jeju green tea for oil control without dryness. Ideal for humid weather and for skin that turns shiny by midday.',
     'Green tea leaf water, salicylic acid (BHA 0.5%), allantoin, tea tree leaf oil',
     'Apply to damp skin, work into a light lather and rinse. Follow with toner.',
     1090, NULL, 'cleanser', false, 35, 4.4, 96),

    ('Mugwort Calming Cream Cleanser', 'mugwort-calming-cream-cleanser',
     'Fragrance-free cream cleanser for reactive skin',
     'A non-foaming cream cleanser with mugwort and madecassoside for skin that reacts to everything. It cleanses by dissolving rather than stripping, leaving the barrier intact.',
     'Artemisia princeps extract, madecassoside, squalane, ceramide NP',
     'Smooth over dry skin, add water to emulsify and rinse. Fragrance-free and safe for daily use.',
     1290, NULL, 'cleanser', false, 18, 4.7, 64),

    ('Heartleaf 77 Soothing Toner', 'heartleaf-77-soothing-toner',
     '77% heartleaf extract to calm visible redness',
     'A watery toner with 77% houttuynia cordata extract that settles flushed, irritated skin within minutes. Layers well under serums and works as a quick mask when pressed into cotton pads.',
     'Houttuynia cordata extract (77%), panthenol, beta-glucan, sodium hyaluronate',
     'Pat two to three drops onto clean skin, or soak two cotton pads and leave on the cheeks for five minutes.',
     1450, 1799, 'toner', true, 60, 4.8, 412),

    ('Bifida Ferment Essence Toner', 'bifida-ferment-essence-toner',
     'Fermented hydrating layer for barrier repair',
     'A slightly viscous essence-toner hybrid packed with bifida ferment lysate. It delivers the hydration of an essence with the lightness of a toner, making it the perfect first layer in a multi-step routine.',
     'Bifida ferment lysate, galactomyces ferment filtrate, niacinamide 2%, adenosine',
     'Apply to damp skin immediately after cleansing and press in with open palms.',
     1650, NULL, 'toner', false, 24, 4.5, 133),

    ('Snail Mucin 92 Repair Ampoule', 'snail-mucin-92-repair-ampoule',
     '92% snail secretion filtrate for bounce and repair',
     'The cult hydration step. A silky, slightly slippery ampoule with 92% snail secretion filtrate that plumps fine dehydration lines and speeds up the look of healing after breakouts.',
     'Snail secretion filtrate (92%), sodium hyaluronate, panthenol, betaine',
     'Layer two to three drops over toner, morning and night, then seal with moisturiser.',
     1899, 2299, 'ampoule-serum', true, 55, 4.7, 890),

    ('Vitamin C 12% Brightening Serum', 'vitamin-c-12-brightening-serum',
     'Stable brightening for dullness and post-acne marks',
     'A 12% stabilised vitamin C serum with ferulic acid and vitamin E, buffered to reduce tingling. Targets uneven tone, sun spots and the marks left behind by breakouts.',
     'Ethyl ascorbic acid 12%, ferulic acid, tocopherol, niacinamide 3%',
     'Use three to four drops on dry skin in the morning. Always follow with SPF. Introduce slowly if you are new to vitamin C.',
     2150, NULL, 'ampoule-serum', false, 30, 4.3, 205),

    ('Retinal 0.1 Night Renewal Serum', 'retinal-01-night-renewal-serum',
     'Encapsulated retinaldehyde for texture and fine lines',
     'An encapsulated retinal serum that works overnight on texture, pores and fine lines with less irritation than conventional retinol. Buffered with panthenol and centella.',
     'Retinal 0.1%, panthenol, centella asiatica, squalane, ceramide NP',
     'Apply a pea-sized amount to dry skin at night, two to three times a week, building up tolerance. Not for use during pregnancy. Wear SPF daily.',
     2650, 3100, 'ampoule-serum', true, 12, 4.5, 78),

    ('Niacinamide 10 Pore Refining Serum', 'niacinamide-10-pore-refining-serum',
     'Sebum control and visibly tighter pores',
     'A no-frills 10% niacinamide serum with zinc PCA for oily, congested skin. Reduces the look of enlarged pores over four to six weeks and helps regulate shine.',
     'Niacinamide 10%, zinc PCA 1%, adenosine, sodium hyaluronate',
     'Two to three drops after toner, morning or night. Pairs well with BHA on alternate evenings.',
     1250, NULL, 'ampoule-serum', false, 48, 4.4, 356),

    ('Ceramide Barrier Cream', 'ceramide-barrier-cream',
     'Rich ceramide moisturiser for dry and dehydrated skin',
     'A cushiony cream with five ceramides and cholesterol in a skin-identical ratio. It repairs a compromised barrier and locks in every layer underneath without feeling heavy.',
     'Ceramide NP, ceramide AP, cholesterol, shea butter, panthenol, madecassoside',
     'Warm a small amount between the palms and press onto the face as the last step of your routine.',
     1999, 2400, 'moisturizer', true, 40, 4.8, 512),

    ('Birch Juice Water Gel Cream', 'birch-juice-water-gel-cream',
     'Oil-free gel cream for oily and combination skin',
     'A weightless gel-cream built on birch sap instead of water. It hydrates in layers and dries down to a natural, non-greasy finish that sits well under sunscreen and makeup.',
     'Birch sap 62%, hyaluronic acid, panthenol, allantoin',
     'Apply a generous layer morning and night. Refrigerate for an extra cooling effect.',
     1750, NULL, 'moisturizer', false, 27, 4.5, 189),

    ('Collagen Firming Night Cream', 'collagen-firming-night-cream',
     'Peptide-rich overnight cream for loss of elasticity',
     'A denser night cream with hydrolysed collagen and a six-peptide complex. It targets sagging and expression lines while you sleep, and wakes the skin looking rested.',
     'Hydrolysed collagen, copper tripeptide-1, acetyl hexapeptide-8, adenosine, squalane',
     'Use as the final step at night. Follow with an eye cream if desired.',
     2450, NULL, 'moisturizer', false, 15, 4.2, 61),

    ('Centella Recovery Sheet Mask (5 pack)', 'centella-recovery-sheet-mask-5-pack',
     'Cooling centella sheets for stressed, sun-exposed skin',
     'Five thin cotton sheets soaked in a centella and panthenol essence. They drop skin temperature quickly and take the sting out of over-exfoliation or a long day in the sun.',
     'Centella asiatica extract, madecassoside, panthenol, asiaticoside, glycerin',
     'Apply to cleansed, toned skin for 15 to 20 minutes. Pat in the remaining essence; do not rinse.',
     899, 1150, 'mask-treatment', true, 80, 4.6, 274),

    ('Kaolin Pore Clay Mask', 'kaolin-pore-clay-mask',
     'Wash-off clay mask for blackheads and congestion',
     'A kaolin and bentonite clay mask with BHA that draws out congestion around the nose and chin without cracking and dehydrating the skin.',
     'Kaolin, bentonite, salicylic acid 1%, green tea extract, glycerin',
     'Spread an even layer on dry skin, leave for 10 minutes, then rinse with lukewarm water. Use once or twice a week.',
     1350, NULL, 'mask-treatment', false, 33, 4.3, 118),

    ('Overnight Sleeping Water Mask', 'overnight-sleeping-water-mask',
     'Gel sleeping mask that hydrates until morning',
     'A bouncy gel sleeping mask with hyaluronic acid and squalane. Apply it over your night cream and wake up with skin that still feels damp and plump.',
     'Sodium hyaluronate, squalane, beta-glucan, trehalose, panthenol',
     'Apply a thick layer as the final night step, two to three times a week. Rinse in the morning.',
     1550, NULL, 'mask-treatment', false, 22, 4.4, 87),

    ('Aqua Light SPF50+ PA++++ Sunscreen', 'aqua-light-spf50-pa-sunscreen',
     'Weightless watery SPF with no white cast',
     'A runny, serum-like sunscreen that disappears into every skin tone and layers cleanly under makeup. Reapplication over the day does not pill.',
     'Uvinul A Plus, tinosorb S, niacinamide, centella asiatica, panthenol',
     'Apply two finger-lengths as the last morning step. Reapply every two to three hours during sun exposure.',
     1699, 1999, 'sunscreen', true, 65, 4.9, 1042),

    ('Mineral Gentle SPF50 Sunscreen', 'mineral-gentle-spf50-sunscreen',
     '100% mineral filters for sensitive and post-procedure skin',
     'A zinc oxide sunscreen with no chemical filters, fragrance or essential oils. Slightly more present on the skin than a chemical SPF, but tolerated by almost everyone.',
     'Zinc oxide 15%, titanium dioxide 3%, ceramide NP, allantoin, squalane',
     'Pat rather than rub to avoid a white cast. Apply as the last morning step and reapply through the day.',
     1899, NULL, 'sunscreen', false, 20, 4.1, 74),

    ('Tinted Dewy SPF40 Sunscreen', 'tinted-dewy-spf40-sunscreen',
     'Sheer tint and glow in a single morning step',
     'A tinted sunscreen that evens out tone and leaves a dewy finish, replacing both primer and light foundation on easy-skin days.',
     'Iron oxides, tinosorb S, niacinamide, hyaluronic acid, adenosine',
     'Blend a generous amount over moisturiser. Available in one sheer universal tint.',
     1599, NULL, 'sunscreen', false, 26, 4.3, 143),

    ('Lip Sleeping Mask Berry', 'lip-sleeping-mask-berry',
     'Overnight lip treatment that fixes flaking by morning',
     'A thick, jam-like lip mask with berry extract and murumuru butter. It softens flakes overnight and works just as well as a heavy balm during the day.',
     'Murumuru seed butter, shea butter, berry complex, vitamin C derivative',
     'Apply a thick layer before bed and wipe gently in the morning. Dab a thin layer over lip products for shine.',
     950, 1200, 'lipcare', true, 70, 4.7, 388),

    ('Ceramide Lip Balm Unscented', 'ceramide-lip-balm-unscented',
     'Fragrance-free balm for chapped, sensitive lips',
     'A matte, fragrance-free stick with ceramides and peptides for lips that react to flavoured balms. Stays put for hours.',
     'Ceramide NP, shea butter, peppermint-free base, vitamin E',
     'Apply as needed throughout the day and before bed.',
     699, NULL, 'lipcare', false, 44, 4.5, 152),

    ('Glass Skin Starter Set', 'glass-skin-starter-set',
     'Cleanser, toner, ampoule and cream for the classic routine',
     'The four-step routine that produces the finish everyone calls glass skin: a low-pH cleanser, a hydrating toner, a snail mucin ampoule and a ceramide cream. Priced below buying the four separately.',
     'See individual products in the set',
     'Use in order, morning and night: cleanse, tone, ampoule, cream. Add SPF in the morning.',
     4499, 5799, 'sets', true, 10, 4.8, 96),

    ('Oily Skin Reset Set', 'oily-skin-reset-set',
     'Balancing cleanser, BHA toner, niacinamide and gel cream',
     'A four-piece set for shine-prone, congested skin: green tea gel cleanser, BHA toner, 10% niacinamide serum and an oil-free gel cream.',
     'See individual products in the set',
     'Cleanse, tone, serum, gel cream. Morning and night; add SPF in the morning.',
     3999, 4899, 'sets', false, 8, 4.4, 41),

    ('Silicone Facial Cleansing Brush', 'silicone-facial-cleansing-brush',
     'Waterproof sonic brush for a deeper cleanse',
     'A palm-sized sonic cleansing brush with soft silicone bristles. Waterproof, USB-C rechargeable and far gentler than a manual scrub.',
     'Medical-grade silicone, ABS body, USB-C rechargeable',
     'Use with your cleanser two to three times a week on a low setting. Rinse and air dry after each use.',
     2299, NULL, 'merchandise', false, 14, 4.2, 33),

    ('Headband and Spatula Application Kit', 'headband-and-spatula-application-kit',
     'Everyday accessories for a mess-free routine',
     'A terry headband that keeps hair off your face during masking, plus a hygienic spatula for scooping cream from jars.',
     'Terry cotton headband, PP spatula',
     'Machine wash the headband at 30 degrees. Rinse the spatula after each use.',
     549, 799, 'merchandise', false, 25, 4.0, 12)
)
INSERT INTO products (
  name, slug, short_description, description, ingredients, how_to_use,
  price, compare_at_price, category_id, is_new, stock_quantity, rating, review_count,
  image_url, created_at, updated_at
)
SELECT
  s.name, s.slug, s.short_description, s.description, s.ingredients, s.how_to_use,
  s.price, s.compare_at_price, c.id, s.is_new, s.stock_quantity, s.rating, s.review_count,
  '', now() - (random() * interval '30 days'), now()
FROM seed s
JOIN categories c ON c.slug = s.category_slug
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------- product_concerns
-- Many-to-many mapping powering "Shop by skin concern".

WITH mapping(product_slug, concern_slug) AS (
  VALUES
    ('hanbang-rice-water-cleansing-foam', 'sensitive'),
    ('hanbang-rice-water-cleansing-foam', 'dry-dehydrated'),
    ('jeju-green-tea-balancing-cleanser', 'acne-breakout'),
    ('jeju-green-tea-balancing-cleanser', 'pores'),
    ('mugwort-calming-cream-cleanser', 'sensitive'),
    ('heartleaf-77-soothing-toner', 'sensitive'),
    ('heartleaf-77-soothing-toner', 'acne-breakout'),
    ('heartleaf-77-soothing-toner', 'dry-dehydrated'),
    ('bifida-ferment-essence-toner', 'dry-dehydrated'),
    ('bifida-ferment-essence-toner', 'wrinkles'),
    ('snail-mucin-92-repair-ampoule', 'dry-dehydrated'),
    ('snail-mucin-92-repair-ampoule', 'acne-breakout'),
    ('snail-mucin-92-repair-ampoule', 'wrinkles'),
    ('vitamin-c-12-brightening-serum', 'dullness-tone'),
    ('vitamin-c-12-brightening-serum', 'acne-breakout'),
    ('retinal-01-night-renewal-serum', 'wrinkles'),
    ('retinal-01-night-renewal-serum', 'pores'),
    ('retinal-01-night-renewal-serum', 'dullness-tone'),
    ('niacinamide-10-pore-refining-serum', 'pores'),
    ('niacinamide-10-pore-refining-serum', 'acne-breakout'),
    ('niacinamide-10-pore-refining-serum', 'dullness-tone'),
    ('ceramide-barrier-cream', 'dry-dehydrated'),
    ('ceramide-barrier-cream', 'sensitive'),
    ('ceramide-barrier-cream', 'wrinkles'),
    ('birch-juice-water-gel-cream', 'dry-dehydrated'),
    ('birch-juice-water-gel-cream', 'pores'),
    ('collagen-firming-night-cream', 'wrinkles'),
    ('collagen-firming-night-cream', 'dry-dehydrated'),
    ('centella-recovery-sheet-mask-5-pack', 'sensitive'),
    ('centella-recovery-sheet-mask-5-pack', 'acne-breakout'),
    ('kaolin-pore-clay-mask', 'pores'),
    ('kaolin-pore-clay-mask', 'acne-breakout'),
    ('overnight-sleeping-water-mask', 'dry-dehydrated'),
    ('aqua-light-spf50-pa-sunscreen', 'dullness-tone'),
    ('aqua-light-spf50-pa-sunscreen', 'sensitive'),
    ('mineral-gentle-spf50-sunscreen', 'sensitive'),
    ('tinted-dewy-spf40-sunscreen', 'dullness-tone'),
    ('lip-sleeping-mask-berry', 'dry-dehydrated'),
    ('ceramide-lip-balm-unscented', 'dry-dehydrated'),
    ('ceramide-lip-balm-unscented', 'sensitive'),
    ('glass-skin-starter-set', 'dry-dehydrated'),
    ('glass-skin-starter-set', 'dullness-tone'),
    ('oily-skin-reset-set', 'acne-breakout'),
    ('oily-skin-reset-set', 'pores')
)
INSERT INTO product_concerns (product_id, concern_id)
SELECT p.id, sc.id
FROM mapping m
JOIN products p ON p.slug = m.product_slug
JOIN skin_concerns sc ON sc.slug = m.concern_slug
ON CONFLICT (product_id, concern_id) DO NOTHING;
