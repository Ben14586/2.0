import React, { useState, useEffect } from 'react';
import { Game } from '../../../types';
import { GameFormModal } from '../components/GameFormModal';
import { PackageFormModal } from '../components/PackageFormModal';

export function CatalogManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [selectedGameForPackage, setSelectedGameForPackage] = useState<string | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => {
    setExpandedGames(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-games', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setGames(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const openAddGame = () => {
    setEditingGame(null);
    setIsGameModalOpen(true);
  };

  const openEditGame = (game: Game) => {
    setEditingGame(game);
    setIsGameModalOpen(true);
  };

  const openAddPackage = (gameId: string) => {
    setEditingPackage(null);
    setSelectedGameForPackage(gameId);
    setIsPackageModalOpen(true);
  };

  const openEditPackage = (pkg: any, gameId: string) => {
    setEditingPackage(pkg);
    setSelectedGameForPackage(gameId);
    setIsPackageModalOpen(true);
  };

  const handleGameSaved = () => {
    setIsGameModalOpen(false);
    fetchGames();
  };

  const handlePackageSaved = () => {
    setIsPackageModalOpen(false);
    fetchGames();
  };

  const filteredGames = games.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>จัดการข้อมูลสินค้า</h2>
          <p>เพิ่ม แก้ไข หรือเปลี่ยนสถานะเกมและแพ็กเกจ</p>
        </div>
        <button className="btn btn-primary" onClick={openAddGame}>+ เพิ่มเกมใหม่</button>
      </div>

      <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input 
          type="text" 
          placeholder="ค้นหาชื่อเกม..." 
          className="input-field" 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>กำลังโหลดข้อมูล...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredGames.map(game => (
              <div key={game.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div 
                  style={{ padding: '16px', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => toggleExpand(game.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {game.playImage || game.play_image ? (
                        <img src={game.playImage || game.play_image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{game.name.substring(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {game.name}
                        {!game.isActive && <span className="risk-pill high" style={{ fontSize: '11px', padding: '2px 6px' }}>ซ่อนอยู่</span>}
                        {game.banStatus === 'risk' && <span className="risk-pill medium" style={{ fontSize: '11px', padding: '2px 6px' }}>เฝ้าระวัง {game.banRiskPercentage}%</span>}
                        {game.banStatus === 'testing' && <span className="risk-pill low" style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--warning)', color: 'black' }}>ช่วงทดสอบ</span>}
                        {game.banStatus === 'banned' && <span className="risk-pill high" style={{ fontSize: '11px', padding: '2px 6px' }}>ระงับชั่วคราว</span>}
                      </h3>
                      <span className="muted" style={{ fontSize: '13px' }}>{game.packages?.length || 0} แพ็กเกจ • {game.category?.name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); openEditGame(game); }}>แก้ไขเกม</button>
                    <span style={{ transform: expandedGames[game.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--muted)', display: 'inline-block', padding: '0 8px' }}>▼</span>
                  </div>
                </div>
                
                {expandedGames[game.id] && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0 }}>แพ็กเกจ</h4>
                    <button className="btn btn-outline" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => openAddPackage(game.id)}>+ เพิ่มแพ็กเกจ</button>
                  </div>
                  
                  {game.packages && game.packages.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {game.packages.map((pkg: any) => (
                        <div key={pkg.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', opacity: pkg.isActive ? 1 : 0.6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <strong style={{ display: 'block' }}>{pkg.name}</strong>
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>฿{pkg.price}</span>
                          </div>
                          <div className="muted" style={{ fontSize: '12px', marginBottom: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pkg.subtitle || 'ไม่มีคำโปรย'}
                          </div>
                          <button className="btn btn-outline" style={{ width: '100%', fontSize: '12px', padding: '4px' }} onClick={() => openEditPackage(pkg, game.id)}>
                            แก้ไข
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: '13px' }}>ยังไม่มีแพ็กเกจในเกมนี้</div>
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isGameModalOpen && (
        <GameFormModal 
          game={editingGame || undefined} 
          onClose={() => setIsGameModalOpen(false)} 
          onSaved={handleGameSaved} 
        />
      )}

      {isPackageModalOpen && selectedGameForPackage && (
        <PackageFormModal 
          pkg={editingPackage || undefined}
          gameId={selectedGameForPackage}
          onClose={() => setIsPackageModalOpen(false)}
          onSaved={handlePackageSaved}
        />
      )}
    </div>
  );
}
