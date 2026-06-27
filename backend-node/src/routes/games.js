const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/helpers');
const { verifyAdmin } = require('../middleware/auth');

// Helper to parse JSON strings from DB safely
function parseJsonArray(str) {
  if (!str) return [];
  try {
    // If it's already an array, return it
    if (Array.isArray(str)) return str;
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
}

// Map database row to package format
function packageView(row, isAdmin = false) {
  const highlights = parseJsonArray(row.highlights);
  const data = {
    id: row.id,
    name: row.name,
    price: row.price,
    gameId: row.game_id,
    subtitle: row.subtitle || '',
    description: row.description || '',
    badge: row.badge || '',
    isRecommended: Boolean(row.is_recommended),
    items: highlights,
    highlights: highlights,
    delivery: row.delivery || 'Instant',
    support: row.support || '24/7',
    guarantee: row.guarantee || '100% Safe',
    audience: row.audience || ''
  };

  if (isAdmin) {
    data.adminNotes = row.admin_notes || '';
    data.isActive = Boolean(row.is_active);
  }
  return data;
}

// Map database row to game format
function gameView(row, packages) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    supportedAndroid: Boolean(row.supported_android),
    supportedIos: Boolean(row.supported_ios),
    warrantyDays: row.warranty_days || 0,
    warrantyNote: row.warranty_note || '',
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    referenceTitle: row.reference_title || '',
    playImage: row.play_image || '',
    playStore: row.play_store || '',
    catalogType: row.catalog_type || 'default',
    category: {
      name: row.category_name || '',
      slug: row.category_slug || ''
    },
    banStatus: row.ban_status || 'safe',
    banRiskPercentage: row.ban_risk_percentage || 0,
    screenshots: parseJsonArray(row.screenshots),
    videoUrl: row.video_url || '',
    packages
  };
}

// GET /api/games
router.get('/games', async (req, res) => {
  try {
    const gameRows = await db.all('SELECT * FROM games WHERE is_active = 1');
    const gamesData = [];

    for (const g of gameRows) {
      const pkgRows = await db.all('SELECT * FROM packages WHERE game_id = ? AND is_active = 1', [g.id]);
      const packages = pkgRows.map(p => packageView(p, false));
      gamesData.push(gameView(g, packages));
    }

    return res.status(200).json({ success: true, data: gamesData });
  } catch (error) {
    console.error('Get public games error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/games/:id
router.get('/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const g = await db.get('SELECT * FROM games WHERE id = ? OR slug = ?', [id, id]);
    if (!g) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const pkgRows = await db.all('SELECT * FROM packages WHERE game_id = ? AND is_active = 1', [g.id]);
    const packages = pkgRows.map(p => packageView(p, false));

    return res.status(200).json({ success: true, data: gameView(g, packages) });
  } catch (error) {
    console.error('Get single game error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/admin-games
router.get('/admin-games', verifyAdmin, async (req, res) => {
  try {
    const gameRows = await db.all('SELECT * FROM games');
    const gamesData = [];

    for (const g of gameRows) {
      const pkgRows = await db.all('SELECT * FROM packages WHERE game_id = ?', [g.id]);
      const packages = pkgRows.map(p => packageView(p, true));
      gamesData.push(gameView(g, packages));
    }

    return res.status(200).json({ success: true, data: gamesData });
  } catch (error) {
    console.error('Get admin games error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-scrape-playstore
router.post('/admin-scrape-playstore', verifyAdmin, (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    let appId = url;
    if (url.includes('play.google.com') && url.includes('id=')) {
      try {
        const u = new URL(url);
        appId = u.searchParams.get('id') || url;
      } catch (e) {}
    }

    // Return a realistic mock response matching python scraper return format
    return res.status(200).json({
      success: true,
      data: {
        name: 'Idle Hero TD',
        playImage: 'https://play-lh.googleusercontent.com/icon',
        description: 'A mock description of Idle Hero TD.',
        supportedAndroid: true,
        playStore: `https://play.google.com/store/apps/details?id=${appId}`,
        catalogType: 'Strategy',
        screenshots: [
          'https://play-lh.googleusercontent.com/screenshot1',
          'https://play-lh.googleusercontent.com/screenshot2'
        ],
        videoUrl: 'https://www.youtube.com/watch?v=mock'
      }
    });
  } catch (error) {
    console.error('Scrape playstore error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-games
router.post('/admin-games', verifyAdmin, async (req, res) => {
  try {
    const {
      id, name, slug, description, category_name, category_slug,
      supported_android, supported_ios, warranty_days, warranty_note,
      is_featured, is_active, play_image, banStatus, banRiskPercentage,
      screenshots, video_url, supportedAndroid, supportedIos,
      warrantyDays, warrantyNote, isFeatured, isActive, playImage,
      videoUrl
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const finalSlug = slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const finalCategoryName = category_name || '';
    const finalCategorySlug = category_slug || '';
    
    // Resolve camelCase and snake_case values
    const finalSupportedAndroid = supported_android !== undefined ? (supported_android ? 1 : 0) : (supportedAndroid !== undefined ? (supportedAndroid ? 1 : 0) : 1);
    const finalSupportedIos = supported_ios !== undefined ? (supported_ios ? 1 : 0) : (supportedIos !== undefined ? (supportedIos ? 1 : 0) : 1);
    const finalWarrantyDays = warranty_days !== undefined ? warranty_days : (warrantyDays !== undefined ? warrantyDays : 0);
    const finalWarrantyNote = warranty_note !== undefined ? warranty_note : (warrantyNote !== undefined ? warrantyNote : '');
    const finalIsFeatured = is_featured !== undefined ? (is_featured ? 1 : 0) : (isFeatured !== undefined ? (isFeatured ? 1 : 0) : 0);
    const finalIsActive = is_active !== undefined ? (is_active ? 1 : 0) : (isActive !== undefined ? (isActive ? 1 : 0) : 1);
    
    const finalPlayImage = play_image !== undefined ? play_image : (playImage !== undefined ? playImage : '');
    const finalBanStatus = banStatus !== undefined ? banStatus : 'safe';
    const finalBanRisk = banRiskPercentage !== undefined ? banRiskPercentage : 0;
    const finalScreenshots = JSON.stringify(screenshots || []);
    const finalVideoUrl = video_url !== undefined ? video_url : (videoUrl !== undefined ? videoUrl : '');

    let gameId = id;
    if (!gameId) {
      gameId = 'game-' + crypto.randomBytes(4).toString('hex');
      await db.run(
        `INSERT INTO games (
          id, name, slug, description, category_name, category_slug, 
          supported_android, supported_ios, warranty_days, warranty_note, 
          is_featured, is_active, play_image, ban_status, ban_risk_percentage,
          screenshots, video_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gameId, name, finalSlug, description || '', finalCategoryName, finalCategorySlug,
          finalSupportedAndroid, finalSupportedIos, finalWarrantyDays, finalWarrantyNote,
          finalIsFeatured, finalIsActive, finalPlayImage, finalBanStatus, finalBanRisk,
          finalScreenshots, finalVideoUrl
        ]
      );
    } else {
      // Check if game exists
      const existing = await db.get('SELECT id FROM games WHERE id = ?', [gameId]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }

      await db.run(
        `UPDATE games SET
          name=?, slug=?, description=?, category_name=?, category_slug=?,
          supported_android=?, supported_ios=?, warranty_days=?, warranty_note=?,
          is_featured=?, is_active=?, play_image=?, ban_status=?, ban_risk_percentage=?,
          screenshots=?, video_url=?
        WHERE id=?`,
        [
          name, finalSlug, description || '', finalCategoryName, finalCategorySlug,
          finalSupportedAndroid, finalSupportedIos, finalWarrantyDays, finalWarrantyNote,
          finalIsFeatured, finalIsActive, finalPlayImage, finalBanStatus, finalBanRisk,
          finalScreenshots, finalVideoUrl, gameId
        ]
      );
    }

    return res.status(200).json({ success: true, message: 'Game saved successfully' });
  } catch (error) {
    console.error('Save game error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-games/:game_id
router.post('/admin-games/:game_id', verifyAdmin, async (req, res) => {
  try {
    const gameId = req.params.game_id;
    const {
      name, slug, description, category_name, category_slug,
      supported_android, supported_ios, warranty_days, warranty_note,
      is_featured, is_active, play_image, banStatus, banRiskPercentage,
      screenshots, video_url, supportedAndroid, supportedIos,
      warrantyDays, warrantyNote, isFeatured, isActive, playImage,
      playStore, catalogType, ban_status, ban_risk_percentage, videoUrl
    } = req.body;

    const game = await db.get('SELECT id FROM games WHERE id = ?', [gameId]);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const finalName = name !== undefined ? name : '';
    const finalSlug = slug || (name ? name.toLowerCase().replace(/ /g, '-') : '');
    const finalDescription = description || '';
    const finalCategoryName = category_name || '';
    const finalCategorySlug = category_slug || '';
    
    const finalSupportedAndroid = supported_android !== undefined ? (supported_android ? 1 : 0) : (supportedAndroid !== undefined ? (supportedAndroid ? 1 : 0) : 1);
    const finalSupportedIos = supported_ios !== undefined ? (supported_ios ? 1 : 0) : (supportedIos !== undefined ? (supportedIos ? 1 : 0) : 1);
    const finalWarrantyDays = warranty_days !== undefined ? warranty_days : (warrantyDays !== undefined ? warrantyDays : 0);
    const finalWarrantyNote = warranty_note !== undefined ? warranty_note : (warrantyNote !== undefined ? warrantyNote : '');
    const finalIsFeatured = is_featured !== undefined ? (is_featured ? 1 : 0) : (isFeatured !== undefined ? (isFeatured ? 1 : 0) : 0);
    const finalIsActive = is_active !== undefined ? (is_active ? 1 : 0) : (isActive !== undefined ? (isActive ? 1 : 0) : 1);
    
    const finalPlayImage = play_image !== undefined ? play_image : (playImage !== undefined ? playImage : '');
    const finalBanStatus = banStatus !== undefined ? banStatus : (ban_status !== undefined ? ban_status : 'safe');
    const finalBanRisk = banRiskPercentage !== undefined ? banRiskPercentage : (ban_risk_percentage !== undefined ? ban_risk_percentage : 0);
    const finalScreenshots = JSON.stringify(screenshots || []);
    const finalVideoUrl = video_url !== undefined ? video_url : (videoUrl !== undefined ? videoUrl : '');
    const finalPlayStore = playStore || '';
    const finalCatalogType = catalogType || '';

    await db.run(
      `UPDATE games SET
        name = ?, slug = ?, description = ?, category_name = ?, category_slug = ?,
        supported_android = ?, supported_ios = ?, warranty_days = ?, warranty_note = ?,
        is_featured = ?, is_active = ?, play_image = ?, ban_status = ?, ban_risk_percentage = ?,
        screenshots = ?, video_url = ?, play_store = ?, catalog_type = ?
      WHERE id = ?`,
      [
        finalName, finalSlug, finalDescription, finalCategoryName, finalCategorySlug,
        finalSupportedAndroid, finalSupportedIos, finalWarrantyDays, finalWarrantyNote,
        finalIsFeatured, finalIsActive, finalPlayImage, finalBanStatus, finalBanRisk,
        finalScreenshots, finalVideoUrl, finalPlayStore, finalCatalogType, gameId
      ]
    );

    return res.status(200).json({ success: true, message: 'Game updated successfully' });
  } catch (error) {
    console.error('Update game error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-packages
router.post('/admin-packages', verifyAdmin, async (req, res) => {
  try {
    const {
      id, game_id, name, price, subtitle, description, badge,
      is_recommended, highlights, delivery, support, guarantee,
      audience, admin_notes, is_active
    } = req.body;

    if (!name || !game_id || price === undefined) {
      return res.status(400).json({ success: false, error: 'Required: name, game_id, price' });
    }

    const highlightsJson = JSON.stringify(highlights || []);
    const finalDelivery = delivery || 'Instant';
    const finalSupport = support || '24/7';
    const finalGuarantee = guarantee || '100% Safe';
    const finalIsActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const finalIsRecommended = is_recommended !== undefined ? (is_recommended ? 1 : 0) : 0;

    let pkgId = id;
    if (!pkgId) {
      pkgId = 'pkg-' + crypto.randomBytes(4).toString('hex');
      await db.run(
        `INSERT INTO packages (
          id, game_id, name, price, subtitle, description, badge,
          is_recommended, highlights, delivery, support, guarantee,
          audience, admin_notes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkgId, game_id, name, price, subtitle || '', description || '', badge || '',
          finalIsRecommended, highlightsJson, finalDelivery, finalSupport, finalGuarantee,
          audience || '', admin_notes || '', finalIsActive
        ]
      );
    } else {
      await db.run(
        `UPDATE packages SET
          name=?, price=?, subtitle=?, description=?, badge=?,
          is_recommended=?, highlights=?, delivery=?, support=?,
          guarantee=?, audience=?, admin_notes=?, is_active=?
        WHERE id=?`,
        [
          name, price, subtitle || '', description || '', badge || '',
          finalIsRecommended, highlightsJson, finalDelivery, finalSupport,
          finalGuarantee, audience || '', admin_notes || '', finalIsActive, pkgId
        ]
      );
    }

    return res.status(200).json({ success: true, message: 'Package saved successfully' });
  } catch (error) {
    console.error('Save package error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/admin-games/:id
router.delete('/admin-games/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM games WHERE id = ?', [id]);
    await db.run('DELETE FROM packages WHERE game_id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-games/delete
router.post('/admin-games/delete', verifyAdmin, async (req, res) => {
  try {
    const { game_id } = req.body;
    if (!game_id) {
      return res.status(400).json({ success: false, error: 'game_id is required' });
    }
    await db.run('DELETE FROM games WHERE id = ?', [game_id]);
    await db.run('DELETE FROM packages WHERE game_id = ?', [game_id]);
    return res.status(200).json({ success: true, message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game POST error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
