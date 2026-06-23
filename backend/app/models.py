from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(String)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    tel = Column(String, nullable=True)
    display_name = Column(String)
    points = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    vip_level = Column(String, default="Bronze")

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    token = Column(String, unique=True, index=True)
    token_expires_at = Column(Float)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    games = relationship("Game", back_populates="category")

class Game(Base):
    __tablename__ = "games"
    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name = Column(String)
    image = Column(String)
    description = Column(String)
    cover_image = Column(String)
    is_hot = Column(Boolean, default=False)
    has_bonus = Column(Boolean, default=False)
    ban_status = Column(String, default="Safe")
    ban_risk_percentage = Column(Integer, default=0)
    
    category = relationship("Category", back_populates="games")
    packages = relationship("Package", back_populates="game")

class Package(Base):
    __tablename__ = "packages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    name = Column(String)
    price = Column(Float)
    original_price = Column(Float)
    is_bestseller = Column(Boolean, default=False)
    points_reward = Column(Integer, default=0)
    
    game = relationship("Game", back_populates="packages")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    package_id = Column(Integer, ForeignKey("packages.id"))
    customer_info = Column(String) # JSON
    price = Column(Float)
    slip_image = Column(String)
    status = Column(String, default="pending")
    created_at = Column(DateTime, server_default=func.now())

class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, index=True)
    discount_amount = Column(Float)
    discount_percent = Column(Float)
    max_uses = Column(Integer)
    uses = Column(Integer, default=0)
    expires_at = Column(DateTime)
