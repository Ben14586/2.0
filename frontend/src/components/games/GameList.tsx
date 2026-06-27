import React, { useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import { Category, Game } from '../../types';
import { CategoryFilter } from './CategoryFilter';
import { GameCard } from './GameCard';

interface GameListProps {
  games: Game[];
  categories: Category[];
  searchTerm: string;
  onSelectGame: (game: Game) => void;
}

export function GameList({ games, categories, searchTerm, onSelectGame }: GameListProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('th');

  const filteredGames = useMemo(() => games.filter((game) => {
    const gameSlug = game.category?.slug || game.category_slug || '';
    const matchesSearch = game.name.toLocaleLowerCase('th').includes(normalizedSearch);
    const matchesCategory = activeCategory === 'all' || gameSlug === activeCategory;
    return matchesSearch && matchesCategory;
  }), [games, normalizedSearch, activeCategory]);

  return (
    <section className="catalog-section" aria-labelledby="game-catalog-title">
      <div className="catalog-heading">
        <div>
          <span className="catalog-eyebrow">GAME CATALOG</span>
          <h2 id="game-catalog-title">เลือกเกมที่ต้องการ</h2>
        </div>
        <p aria-live="polite">พบ {filteredGames.length} เกม</p>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      <div className="game-grid">
        {filteredGames.length > 0 ? filteredGames.map((game) => (
          <GameCard key={game.id} game={game} onSelect={onSelectGame} />
        )) : (
          <div className="glass-card catalog-empty">
            <SearchX size={28} aria-hidden="true" />
            <h3>ไม่พบเกมที่ค้นหา</h3>
            <p>ลองเปลี่ยนคำค้นหรือเลือกหมวดหมู่อื่น</p>
          </div>
        )}
      </div>
    </section>
  );
}
