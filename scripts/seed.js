const bcrypt = require('bcryptjs');
const db = require('../backend/src/config/database');

const CATEGORIES_DATA = [
  {
    name: 'Apparel & Wear',
    slug: 'apparel-wear',
    description: 'Timeless tailored silhouettes and organic breathable textiles.',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    subcategories: [
      { name: "Men's Minimalist Collection", slug: 'mens-minimalist', description: 'Essential shirts, outerwear, and structured trousers.' },
      { name: "Women's Modern Silhouettes", slug: 'womens-modern', description: 'Understated elegance crafted with premium natural fibers.' }
    ]
  },
  {
    name: 'Living & Interior',
    slug: 'living-interior',
    description: 'Artisanal homeware, sculptural ceramics, and architectural lighting.',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    subcategories: [
      { name: 'Ceramics & Tableware', slug: 'ceramics-tableware', description: 'Hand-thrown stoneware, matte glaze bowls, and carafes.' },
      { name: 'Architectural Lighting', slug: 'architectural-lighting', description: 'Sculptural ambient lamps and brushed bronze pendants.' }
    ]
  },
  {
    name: 'Objects & Everyday',
    slug: 'objects-everyday',
    description: 'Precision timepieces, acoustic hardware, and vegetable-tanned leather.',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    subcategories: [
      { name: 'Analog Timepieces', slug: 'analog-timepieces', description: 'Sapphire crystal, Swiss movement minimalist watches.' },
      { name: 'Audio & Acoustics', slug: 'audio-acoustics', description: 'Studio-grade wireless over-ear monitors and mahogany speakers.' },
      { name: 'Leather Goods', slug: 'leather-goods', description: 'Full-grain carryalls, cardholders, and desk folios.' }
    ]
  }
];

const RAW_PRODUCTS = [
  {
    name: 'Krono Apex Automatic Watch',
    slug: 'krono-apex-automatic-watch',
    category_slug: 'analog-timepieces',
    brand: 'Krono Copenhagen',
    price: 349.00,
    compare_at_price: 420.00,
    stock: 28,
    is_featured: 1,
    short: 'Sapphire crystal dial with 42-hour power reserve and Italian Horween leather strap.',
    desc: 'Crafted for discerning collectors, the Krono Apex merges Scandinavian minimalism with Swiss automatic mechanical movement. Featuring an anti-reflective sapphire crystal face, brushed 316L stainless steel casing, and water resistance up to 50 meters.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80'
    ]
  },
  {
    name: 'Vanguard Noir Chronograph',
    slug: 'vanguard-noir-chronograph',
    category_slug: 'analog-timepieces',
    brand: 'Krono Copenhagen',
    price: 289.00,
    compare_at_price: 350.00,
    stock: 15,
    is_featured: 1,
    short: 'Matte black PVD stainless steel with sub-second chronograph and luminous hands.',
    desc: 'The Vanguard Noir redefines tactical elegance. Designed with aerospace-grade brushed titanium accents and a vegetable-tanned full-grain leather strap.',
    images: [
      'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=80'
    ]
  },
  {
    name: 'Sonos Studio Pro Wireless Headphones',
    slug: 'sonos-studio-pro-wireless-headphones',
    category_slug: 'audio-acoustics',
    brand: 'Sonos Acoustics',
    price: 399.00,
    compare_at_price: 450.00,
    stock: 22,
    is_featured: 1,
    short: 'Active Noise Cancellation with 45mm custom beryllium drivers and memory foam cups.',
    desc: 'Experience uncompromised acoustic fidelity. Equipped with high-resolution lossless Bluetooth 5.3 codecs, dual-mode ambient transparency, and 36 hours of continuous playtime.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80'
    ]
  },
  {
    name: 'Artisan Terra Hand-Thrown Vase',
    slug: 'artisan-terra-hand-thrown-vase',
    category_slug: 'ceramics-tableware',
    brand: 'Atelier Kinto',
    price: 78.00,
    compare_at_price: 95.00,
    stock: 35,
    is_featured: 1,
    short: 'Raw grogged terracotta vase with a subtle volcanic reactive glaze.',
    desc: 'Individually shaped on a potters wheel in Kyoto. Each piece exhibits organic variations in texture and earth-toned pigmentation, creating a one-of-a-kind sculptural vessel.',
    images: [
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&q=80'
    ]
  },
  {
    name: 'Orbital Brass Table Lamp',
    slug: 'orbital-brass-table-lamp',
    category_slug: 'architectural-lighting',
    brand: 'Lumina Works',
    price: 210.00,
    compare_at_price: 260.00,
    stock: 20,
    is_featured: 1,
    short: 'Solid spun brass shade with mouth-blown frosted glass sphere and brass dimmer knob.',
    desc: 'Emits a warm, non-glare ambient glow. Built with solid heavy brass counterweights and a woven braided cord.',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80'
    ]
  },
  {
    name: 'Heritage Weekender Duffel Bag',
    slug: 'heritage-weekender-duffel-bag',
    category_slug: 'leather-goods',
    brand: 'Craftsman Leather Co.',
    price: 295.00,
    compare_at_price: 360.00,
    stock: 16,
    is_featured: 1,
    short: 'Full-grain vegetable-tanned cowhide with solid antique brass YKK hardware.',
    desc: 'The consummate travel companion. Features a dedicated reinforced shoe compartment, padded 16-inch laptop compartment, and lifetime construction warranty.',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
    ]
  }
];

function expandProducts(baseList) {
  const fullList = [...baseList];
  const modifiers = ['Edition II', 'Signature Series', 'Limited Studio', 'Refined Cast'];
  const colors = ['Slate', 'Oatmeal', 'Espresso', 'Ivory', 'Onyx'];

  let count = fullList.length;
  let idx = 0;

  while (fullList.length < 52) {
    const parent = baseList[idx % baseList.length];
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    count++;

    const newName = `${parent.name} - ${mod} (${color})`;
    const newSlug = `${parent.slug}-${mod.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${color.toLowerCase()}-${count}`;
    const priceMod = (parent.price * (0.85 + Math.random() * 0.3)).toFixed(2);
    const compareMod = parent.compare_at_price ? (priceMod * 1.25).toFixed(2) : null;

    fullList.push({
      name: newName,
      slug: newSlug,
      category_slug: parent.category_slug,
      brand: parent.brand,
      price: parseFloat(priceMod),
      compare_at_price: compareMod ? parseFloat(compareMod) : null,
      stock: Math.floor(Math.random() * 40) + 5,
      is_featured: count % 6 === 0 ? 1 : 0,
      short: `${parent.short} Hand-finished in ${color}.`,
      desc: `${parent.desc} This bespoke ${mod} variation brings nuanced materials and specialized finishing touches.`,
      images: parent.images
    });
    idx++;
  }

  return fullList;
}

async function runSeeder() {
  console.log('[Seeder] Starting database seeding...');

  try {
    // 1. Seed Categories
    const catIdMap = {};
    for (let i = 0; i < CATEGORIES_DATA.length; i++) {
      const root = CATEGORIES_DATA[i];
      const [existingRoot] = await db.query('SELECT id FROM categories WHERE slug = ?', [root.slug]);
      let rootId;

      if (existingRoot.length > 0) {
        rootId = existingRoot[0].id;
      } else {
        const [res] = await db.query(
          `INSERT INTO categories (parent_id, name, slug, description, image_url, is_active, sort_order)
           VALUES (NULL, ?, ?, ?, ?, 1, ?)`,
          [root.name, root.slug, root.description, root.image_url, i + 1]
        );
        rootId = res.insertId;
      }
      catIdMap[root.slug] = rootId;

      if (root.subcategories) {
        for (let j = 0; j < root.subcategories.length; j++) {
          const sub = root.subcategories[j];
          const [existingSub] = await db.query('SELECT id FROM categories WHERE slug = ?', [sub.slug]);
          let subId;
          if (existingSub.length > 0) {
            subId = existingSub[0].id;
          } else {
            const [subRes] = await db.query(
              `INSERT INTO categories (parent_id, name, slug, description, is_active, sort_order)
               VALUES (?, ?, ?, ?, 1, ?)`,
              [rootId, sub.name, sub.slug, sub.description, j + 1]
            );
            subId = subRes.insertId;
          }
          catIdMap[sub.slug] = subId;
        }
      }
    }
    console.log(`[Seeder] Categories established: ${Object.keys(catIdMap).length}`);

    // 2. Seed Products safely
    const productsToSeed = expandProducts(RAW_PRODUCTS);
    let productIndex = 1;
    for (const prod of productsToSeed) {
      const categoryId = catIdMap[prod.category_slug] || 1;
      const sku = `SKU-PROD-${String(productIndex).padStart(5, '0')}`;

      const [existingProd] = await db.query('SELECT id FROM products WHERE slug = ? OR sku = ?', [prod.slug, sku]);
      let productId;

      if (existingProd.length > 0) {
        productId = existingProd[0].id;
      } else {
        const [pRes] = await db.query(
          `INSERT INTO products (
            category_id, name, slug, sku, short_description, description,
            price, compare_at_price, stock_quantity, low_stock_threshold,
            brand, weight, is_featured, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?, 1.25, ?, 1)`,
          [
            categoryId,
            prod.name,
            prod.slug,
            sku,
            prod.short,
            prod.desc,
            prod.price,
            prod.compare_at_price,
            prod.stock,
            prod.brand,
            prod.is_featured
          ]
        );
        productId = pRes.insertId;

        let sortOrder = 0;
        for (const imgUrl of prod.images) {
          await db.query(
            `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [productId, imgUrl, prod.name, sortOrder === 0 ? 1 : 0, sortOrder]
          );
          sortOrder++;
        }
      }
      productIndex++;
    }
    console.log(`[Seeder] Products verified: ${productsToSeed.length}`);

    // 3. Seed Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    const [existingCust] = await db.query('SELECT id FROM users WHERE email = ?', ['customer@example.com']);
    if (existingCust.length === 0) {
      await db.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
         VALUES ('Sami Customer', 'customer@example.com', '+923001234567', ?, 'CUSTOMER', 'ACTIVE', 1)`,
        [passwordHash]
      );
      console.log(' -> Seeded customer: customer@example.com / Password123!');
    }

    const [existingAdmin] = await db.query('SELECT id FROM users WHERE email = ?', ['admin@store.com']);
    if (existingAdmin.length === 0) {
      await db.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
         VALUES ('Store Administrator', 'admin@store.com', '+923009876543', ?, 'ADMIN', 'ACTIVE', 1)`,
        [passwordHash]
      );
      console.log(' -> Seeded admin: admin@store.com / Password123!');
    }

    // 4. Seed Coupons
    const [existingCoupons] = await db.query('SELECT id FROM coupons WHERE code = ?', ['WELCOME10']);
    if (existingCoupons.length === 0) {
      await db.query(`
        INSERT INTO coupons (code, description, discount_type, discount_value, minimum_order_amount, maximum_discount, usage_limit, usage_per_user, is_active)
        VALUES 
        ('WELCOME10', '10% off introductory acquisition', 'PERCENTAGE', 10.00, 1000.00, 1500.00, 500, 1, 1),
        ('MAISON500', 'Flat Rs. 500 discount on orders over Rs. 3,000', 'FIXED', 500.00, 3000.00, 500.00, 200, 1, 1)
      `);
      console.log(' -> Seeded active discount coupons: WELCOME10, MAISON500');
    }

    // 5. Seed Store Settings
    const [existingSettings] = await db.query('SELECT COUNT(*) as count FROM store_settings');
    if (existingSettings[0].count === 0) {
      await db.query(`
        INSERT INTO store_settings (setting_key, setting_value, description) VALUES
        ('store_name', 'Maison & Co. Architectural Goods', 'Store brand title'),
        ('currency', 'PKR', 'Active currency code'),
        ('currency_symbol', 'Rs.', 'Active currency symbol'),
        ('free_shipping_threshold', '2500.00', 'Subtotal threshold for complimentary shipping'),
        ('standard_shipping_fee', '200.00', 'Flat standard shipping rate')
      `);
    }

    console.log('[Seeder] Database seeding finished successfully.');
  } catch (err) {
    console.error('[Seeder] Error:', err);
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  runSeeder();
}

module.exports = runSeeder;
