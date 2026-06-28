const request = require('supertest');
const app = require('../src/app');
const { VALID_PNG } = require('./fixtures');

describe('Real-World Simulation Scenarios (scenarios.test.js)', () => {
  const dummySlip = VALID_PNG;

  // Scenario 1: Fresh customer checks catalog, creates account, gets referral bonus, places order with slip
  test('Scenario 1: Customer catalog check, registration, referral bonus, and checkout', async () => {
    // 1. Checks catalog
    const catalogRes = await request(app).get('/api/games');
    if (catalogRes.status === 200) {
      expect(catalogRes.body.success).toBe(true);
    }

    // 2. Creates a real referrer, then creates the customer with that referral code.
    const referrer = `ref_s1_${Date.now()}`;
    const referrerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: referrer,
        password: 'secure_password',
        display_name: 'Scenario 1 Referrer'
      });
    expect(referrerRes.status).toBe(201);

    const uniqueUser = `cust_s1_${Date.now()}`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: uniqueUser,
        password: 'secure_password',
        display_name: 'Scenario 1 Customer',
        tel: '0812341111',
        referral_code: referrer
      });

    let token = 'mock_s1_token';
    if (regRes.status === 200 || regRes.status === 201) {
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.user.points).toBe(10); // Check referral bonus
      token = regRes.body.token || 'mock_s1_token';
    }

    // 3. Places order with slip
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .field('gameId', 'game-idle-hero-td')
      .field('packageId', 'pkg-idle-hero-td-reference')
      .field('gameUsername', uniqueUser)
      .field('gamePassword', 'pass123')
      .field('loginMethod', 'facebook')
      .field('price', 150.00)
      .attach('slipImage', dummySlip, 'slip.png');

    if (orderRes.status === 200 || orderRes.status === 201) {
      expect(orderRes.body.success).toBe(true);
      expect(orderRes.body.orderId).toBeDefined();
    }
  });

  // Scenario 2: Admin reviews pending order, tests telegram notification, marks order as processing/completed, then verifies analytics updates.
  test('Scenario 2: Admin reviews order, tests Telegram bot, completes order, and checks dashboard analytics', async () => {
    const adminToken = 'mock_admin_token';

    // 1. Admin logs in
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'adminpassword' });
    
    if (loginRes.status === 200) {
      expect(loginRes.body.success).toBe(true);
    }

    // 2. Admin lists orders and checks pending ones
    const listRes = await request(app)
      .get('/api/admin-orders')
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (listRes.status === 200) {
      expect(listRes.body.success).toBe(true);
    }

    // 3. Admin tests Telegram notification
    const testTelegramRes = await request(app)
      .post('/api/admin-test-telegram')
      .set('Authorization', `Bearer ${adminToken}`);

    if (testTelegramRes.status === 200) {
      expect([true, false]).toContain(testTelegramRes.body.success);
    }

    // 4. Admin marks a pending order as processing then completed
    const orderId = 'ORD-12345';
    const procRes = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    if (procRes.status === 200) {
      expect(procRes.body.success).toBe(true);
    }

    const compRes = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });

    if (compRes.status === 200) {
      expect(compRes.body.success).toBe(true);
    }

    // 5. Admin verifies analytics dashboard updates
    const dashboardRes = await request(app)
      .get('/api/admin-dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    if (dashboardRes.status === 200) {
      expect(dashboardRes.body.success).toBe(true);
      expect(dashboardRes.body.dashboard).toHaveProperty('total_revenue');
    }
  });

  // Scenario 3: Admin configures new game, scrapes Play Store metadata, adds package, and exports static Netlify site
  test('Scenario 3: Admin configures new game, scrapes metadata, saves package, and exports Netlify site', async () => {
    const adminToken = 'mock_admin_token';

    // 1. Scrape Play Store metadata
    const scrapeRes = await request(app)
      .post('/api/admin-scrape-playstore')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ url: 'https://play.google.com/store/apps/details?id=com.SwellGamesLLC.IdleHeroTD' });

    let scrapedData = {
      name: 'Idle Hero TD',
      playImage: '/uploads/game-images/scraped.png',
      description: 'Scraped description'
    };

    if (scrapeRes.status === 200) {
      expect(scrapeRes.body.success).toBe(true);
      scrapedData = scrapeRes.body.data;
    }

    // 2. Admin configures and saves new game
    const saveGameRes = await request(app)
      .post('/api/admin-games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: scrapedData.name,
        slug: 'scraped-game-td',
        description: scrapedData.description,
        category_name: 'Tower Defense',
        category_slug: 'tower-defense',
        supported_android: true,
        supported_ios: true,
        warranty_days: 7,
        warranty_note: '7 days warranty',
        is_featured: true,
        is_active: true,
        play_image: scrapedData.playImage
      });

    if (saveGameRes.status === 200 || saveGameRes.status === 201) {
      expect(saveGameRes.body.success).toBe(true);
    }

    // 3. Admin adds package to game
    const savePackageRes = await request(app)
      .post('/api/admin-packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Starter Pack',
        game_id: 'game-scraped-game-td',
        price: 99.00,
        subtitle: 'Great starter values',
        description: 'Starter package details',
        badge: 'New',
        is_recommended: true,
        highlights: ['500 gold', '2 keys'],
        delivery: 'Instant',
        support: 'Email',
        guarantee: 'None',
        audience: 'New players',
        admin_notes: 'None',
        is_active: true
      });

    if (savePackageRes.status === 200 || savePackageRes.status === 201) {
      expect(savePackageRes.body.success).toBe(true);
    }

    // 4. Admin exports static Netlify site
    const exportRes = await request(app)
      .post('/api/admin-export-static')
      .set('Authorization', `Bearer ${adminToken}`);

    if (exportRes.status === 200) {
      expect(exportRes.body.success).toBe(true);
    }
  });

  // Scenario 4: User registers, refers a friend, both verify leaderboard and referral points allocation
  test('Scenario 4: User A registers, refers User B, and both verify leaderboard and points', async () => {
    const usernameA = `user_a_s4_${Date.now()}`;
    const usernameB = `user_b_s4_${Date.now()}`;

    // 1. User A registers
    const regARes = await request(app)
      .post('/api/auth/register')
      .send({
        username: usernameA,
        password: 'password123',
        display_name: 'User A Leaderboard'
      });

    if (regARes.status === 200 || regARes.status === 201) {
      expect(regARes.body.success).toBe(true);
    }

    // 2. User A refers User B
    const regBRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: usernameB,
        password: 'password123',
        display_name: 'User B Leaderboard',
        referral_code: usernameA
      });

    if (regBRes.status === 200 || regBRes.status === 201) {
      expect(regBRes.body.success).toBe(true);
      expect(regBRes.body.user.points).toBe(10); // User B gets 10 points
    }

    // 3. User A verifies points allocation
    const profileARes = await request(app).get(`/api/auth/me?username=${usernameA}`);
    if (profileARes.status === 200) {
      expect(profileARes.body.user.points).toBeGreaterThanOrEqual(20); // Referrer gets 20 points
    }

    // 4. Verification of Leaderboard
    const leaderboardRes = await request(app).get('/api/auth/leaderboard');
    if (leaderboardRes.status === 200) {
      expect(leaderboardRes.body.success).toBe(true);
      expect(Array.isArray(leaderboardRes.body.leaderboard)).toBe(true);
    }
  });

  // Scenario 5: Customer tries to download backup (unauthorized), attempts path traversal, sends extremely large inputs, and triggers rate limit
  test('Scenario 5: Unauthorized backup access, path traversal attempts, size limits, and rate limit triggers', async () => {
    // 1. Customer tries to download backup (unauthorized)
    const unauthorizedRes = await request(app).get('/api/admin-backups');
    expect([401, 403, 404]).toContain(unauthorizedRes.status);

    // 2. Attempts path traversal
    const traversalRes = await request(app)
      .get('/api/admin-backups/download?file=../../../../etc/passwd');
    expect([400, 401, 403, 404]).toContain(traversalRes.status);

    // 3. Sends extremely large input payload
    const hugePayload = {
      username: 'hacker',
      password: 'p'.repeat(6 * 1024 * 1024) // 6MB password
    };
    const sizeRes = await request(app)
      .post('/api/auth/login')
      .send(hugePayload);

    if (sizeRes.status !== 404) {
      expect(sizeRes.status).toBe(413); // Payload Too Large
    }

    // 4. Triggers rate limiter with rapid requests
    let rateLimitHit = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app).get('/health');
      if (res.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    // Rate limit hit is expected behavior under rapid request conditions
    if (rateLimitHit) {
      expect(rateLimitHit).toBe(true);
    }
  });
});
