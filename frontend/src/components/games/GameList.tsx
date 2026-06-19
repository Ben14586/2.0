import React, { useState, useMemo } from 'react';
import { Game, Category } from '../../types';
import { CategoryFilter } from './CategoryFilter';
import { GameCard } from './GameCard';

interface GameListProps {
  games: Game[];
  categories: Category[];
  searchTerm: string;
  onSelectGame: (game: Game) => void;
}

export function GameList({ games, categories, searchTerm, onSelectGame }: GameListProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'all' || game.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [games, searchTerm, activeCategory]);

  return (
    <div style={{ padding: '24px 0' }}>
      <CategoryFilter 
        categories={categories} 
        activeCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />
      
      <div style={{ marginBottom: '16px', color: '#6d6077', fontSize: '14px' }}>
        พบ {filteredGames.length} เกม
      </div>

      <div className="game-grid">
        {filteredGames.length > 0 ? (
          filteredGames.map(game => (
            <GameCard key={game.id} game={game} onSelect={onSelectGame} />
          ))
        ) : (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#8d6e63' }}>
            ไม่พบเกมที่ค้นหา
          </div>
        )}
      </div>
    </div>
  );
}
