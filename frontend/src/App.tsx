import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/home/Hero';
import { Footer } from './components/layout/Footer';
import { GameList } from './components/games/GameList';
import { OrderTrackingWidget } from './components/orders/OrderTrackingWidget';
import { LeaderboardWidget } from './components/home/LeaderboardWidget';
import { OrderModal } from './components/orders/OrderModal';
import { FaqGuide } from './components/home/FaqGuide';
import { Game, Category, PublicData } from './types';

// Declare global to access window.STATIC_GAMES
declare global {
  interface Window {
    STATIC_GAMES: PublicData | null;
  }
}

export function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        let data: any = window.STATIC_GAMES;
        
        if (!data) {
          const response = await fetch('/api/games');
          if (!response.ok) throw new Error('Failed to fetch data');
          const json = await response.json();
          data = json.data;
        }

        if (Array.isArray(data)) {
          const extractedCategories = Array.from(new Set(data.map((g: Game) => g.category.name))).map(name => ({
            name: name,
            slug: data.find((g: Game) => g.category.name === name)?.category.slug || ''
          }));
          setCategories(extractedCategories);
          setGames(data);
        } else if (data) {
          setCategories(data.categories || []);
          setGames(data.games || []);
        }
      } catch (err) {
        setError('ไม่สามารถโหลดข้อมูลเกมได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <main className="page-shell" id="top">
      <Navbar />
      <OrderTrackingWidget />
      <Hero onSearch={handleSearch} />
      <LeaderboardWidget />
      
      <section id="games" className="section" style={{ marginTop: '24px' }}>
        {isLoading ? (
          <div className="glass-card game-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <h2 style={{ fontSize: '24px', color: '#5a4c62' }}>กำลังโหลดข้อมูลเกม...</h2>
          </div>
        ) : error ? (
          <div className="glass-card game-panel" style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
            <h2 style={{ fontSize: '20px' }}>{error}</h2>
          </div>
        ) : (
          <GameList 
            games={games} 
            categories={categories} 
            searchTerm={searchTerm} 
            onSelectGame={setSelectedGame} 
          />
        )}
      </section>

      {selectedGame && (
        <OrderModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}

      <FaqGuide />
      <Footer />
    </main>
  );
}
