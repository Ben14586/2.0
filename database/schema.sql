CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  cover_image_url TEXT,
  supported_android BOOLEAN DEFAULT true,
  supported_ios BOOLEAN DEFAULT true,
  warranty_days INT DEFAULT 7,
  warranty_note TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  badge VARCHAR(80),
  sort_order INT DEFAULT 0,
  is_recommended BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  package_id UUID REFERENCES packages(id),
  platform VARCHAR(20) NOT NULL,
  customer_note TEXT,
  formatted_message TEXT,
  contact_channel VARCHAR(30),
  status VARCHAR(30) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_games_slug ON games(slug);
CREATE INDEX idx_games_active ON games(is_active);
CREATE INDEX idx_packages_game_id ON packages(game_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);

