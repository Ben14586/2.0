import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Game } from '../../types';

interface GameCardProps {
  game: Game;
  onSelect: (game: Game) => void;
}

function resolveImageUrl(game: Game): string {
  const source = game.play_image || game.playImage || '';
  if (!source || source.includes('unsplash.com')) return '';
  if (!source.startsWith('/')) return source;
  const baseUrl = (window as Window & { API_BASE_URL?: string }).API_BASE_URL?.replace(/\/$/, '') || '';
  return `${baseUrl}${source}`;
}

export function GameCard({ game, onSelect }: GameCardProps) {
  const imageUrl = resolveImageUrl(game);
  const [imageFailed, setImageFailed] = useState(false);
  const category = game.category_name || game.categoryName || game.category?.name || 'เกมมือถือ';
  const initial = game.name.slice(0, 2).toUpperCase();

  const handleKeyDown = (event: React.KeyboardEvent<article>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(game);
    }
  };

  return (
    <article
      className="glass-card game-card"
      role="button"
      tabIndex={0}
      aria-label={`ดูแพ็กบริการ ${game.name}`}
      onClick={() => onSelect(game)}
      onKeyDown={handleKeyDown}
    >
      <div className="game-card-topline">
        <div className="game-thumb">
          {imageUrl && !imageFailed ? (
            <img src={imageUrl} alt={`ภาพเกม ${game.name}`} loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </div>

        <div className="game-card-copy">
          <div className="game-card-heading">
            <h3>{game.name}</h3>
            {(game.isFeatured || game.is_featured === 1) && <span className="risk-pill low">แนะนำ</span>}
          </div>
          <p className="game-category">{category}</p>
          <div className="game-meta-row">
            {game.supported_android === 1 && <span className="section-kicker">Android</span>}
            {game.supported_ios === 1 && <span className="section-kicker">iOS</span>}
            {game.banStatus === 'testing' && <span className="risk-pill medium">กำลังตรวจสอบระบบ</span>}
            {game.banStatus === 'banned' && <span className="risk-pill high">พักบริการชั่วคราว</span>}
          </div>
        </div>
      </div>

      <span className="game-card-action">
        ดูแพ็กบริการ
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </article>
  );
}
