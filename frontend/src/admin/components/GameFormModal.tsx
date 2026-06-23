import React, { useState } from 'react';
import { Game } from '../../../types';

interface GameFormModalProps {
  game?: Game;
  onClose: () => void;
  onSaved: () => void;
}

export function GameFormModal({ game, onClose, onSaved }: GameFormModalProps) {
  const [formData, setFormData] = useState({
    name: game?.name || '',
    slug: game?.slug || '',
    description: game?.description || '',
    categoryName: game?.category?.name || 'Idle / Mobile',
    supportedAndroid: game?.supported_android ?? true,
    supportedIos: game?.supported_ios ?? true,
    warrantyDays: game?.warranty_days || 7,
    warrantyNote: game?.warranty_note || 'รับประกันตามเงื่อนไขร้าน 7 วัน',
    isFeatured: game?.isFeatured || false,
    isActive: game?.isActive ?? true,
    referenceTitle: game?.referenceTitle || '',
    playImage: game?.playImage || '',
    playStore: game?.playStore || '',
    catalogType: game?.catalogType || 'TD',
    banStatus: game?.banStatus || 'safe',
    banRiskPercentage: game?.banRiskPercentage || 0,
    screenshots: game?.screenshots || [],
    videoUrl: game?.videoUrl || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);

    try {
      setLoading(true);
      const res = await fetch('/api/admin-upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, playImage: data.data.url }));
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          gameId: game?.id,
          ...formData
        })
      });

      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || 'Failed to save game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setScraping(true);
    setError('');
    try {
      const res = await fetch('/api/admin-scrape-playstore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ url: scrapeUrl })
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          name: data.data.name || prev.name,
          playImage: data.data.playImage || prev.playImage,
          description: data.data.description || prev.description,
          categoryName: data.data.categoryName || prev.categoryName,
          playStore: data.data.playStore || prev.playStore,
          screenshots: data.data.screenshots?.length ? data.data.screenshots : prev.screenshots,
          videoUrl: data.data.videoUrl || prev.videoUrl,
        }));
      } else {
        setError(data.error || 'Failed to scrape Play Store');
      }
    } catch (err) {
      setError('Network error during scraping');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{game ? 'แก้ไขเกม' : 'เพิ่มเกมใหม่'}</h3>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        
        {!game && (
          <div style={{ padding: '16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>⚡ ดึงข้อมูลจาก Play Store</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="วางลิงก์ Google Play Store ที่นี่..." 
                className="input-field" 
                value={scrapeUrl} 
                onChange={e => setScrapeUrl(e.target.value)} 
                style={{ flex: 1 }} 
              />
              <button type="button" className="btn btn-primary" onClick={handleScrape} disabled={scraping || !scrapeUrl}>
                {scraping ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล'}
              </button>
            </div>
            <p className="muted" style={{ fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
              ดึงข้อมูลชื่อเกม รูปภาพ คำอธิบาย และหมวดหมู่
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          {error && <div className="alert-danger" style={{ padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: '4px' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>ชื่อเกม</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" required />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>หมวดหมู่ (Category)</label>
              <input type="text" name="categoryName" value={formData.categoryName} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Catalog Type (TD, RPG)</label>
              <select name="catalogType" value={formData.catalogType} onChange={handleChange} className="input-field">
                <option value="TD">Tower Defense (TD)</option>
                <option value="RPG">RPG</option>
                <option value="">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>สถานะการแบน</label>
              <select name="banStatus" value={formData.banStatus} onChange={handleChange} className="input-field">
                <option value="safe">ปลอดภัย (Safe)</option>
                <option value="risk">เฝ้าระวัง (Risk)</option>
                <option value="testing">ช่วงทดสอบ (Testing)</option>
                <option value="banned">ระงับชั่วคราว (Banned)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>อัตราเสี่ยงแบน (%)</label>
              <input type="number" min="0" max="100" name="banRiskPercentage" value={formData.banRiskPercentage} onChange={handleChange} className="input-field" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Slug (อักษรภาษาอังกฤษ/ขีดกลาง)</label>
            <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>คำอธิบาย (Description)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input-field" rows={3}></textarea>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>รูปภาพ (Play Image URL)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" name="playImage" value={formData.playImage} onChange={handleChange} className="input-field" style={{ flex: 1 }} />
              <input type="file" id="image-upload" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
              <label htmlFor="image-upload" className="btn btn-outline" style={{ cursor: 'pointer' }}>อัปโหลดรูป</label>
            </div>
            {formData.playImage && <img src={formData.playImage} alt="preview" style={{ height: '80px', marginTop: '8px', borderRadius: '4px', objectFit: 'cover' }} />}
          </div>

          {/* Screenshots */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>รูปตัวอย่างเกม (Screenshots)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(formData.screenshots || []).map((url: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    value={url} 
                    onChange={e => {
                      const newScreenshots = [...(formData.screenshots || [])];
                      newScreenshots[i] = e.target.value;
                      setFormData(prev => ({ ...prev, screenshots: newScreenshots }));
                    }}
                    className="input-field" 
                    style={{ flex: 1 }} 
                    placeholder="URL รูปภาพ"
                  />
                  <button type="button" className="btn btn-outline" style={{ padding: '6px 10px', color: 'var(--danger)', flexShrink: 0 }} onClick={() => {
                    const newScreenshots = (formData.screenshots || []).filter((_: string, idx: number) => idx !== i);
                    setFormData(prev => ({ ...prev, screenshots: newScreenshots }));
                  }}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline" style={{ fontSize: '13px', padding: '6px 12px', alignSelf: 'flex-start' }} onClick={() => {
                setFormData(prev => ({ ...prev, screenshots: [...(prev.screenshots || []), ''] }));
              }}>+ เพิ่ม URL รูปตัวอย่าง</button>
            </div>
            {(formData.screenshots || []).filter((u: string) => u).length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {(formData.screenshots || []).filter((u: string) => u).map((url: string, i: number) => (
                  <img key={i} src={url} alt={`screenshot-${i}`} style={{ height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
                ))}
              </div>
            )}
          </div>

          {/* Video URL */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>คลิปเกมเพลย์ (Video URL - YouTube/Direct)</label>
            <input type="text" name="videoUrl" value={formData.videoUrl} onChange={handleChange} className="input-field" placeholder="https://www.youtube.com/watch?v=... หรือ URL วิดีโอโดยตรง" />
            {formData.videoUrl && formData.videoUrl.includes('youtube') && (
              <div style={{ marginTop: '8px' }}>
                <iframe 
                  width="100%" 
                  height="200" 
                  src={`https://www.youtube.com/embed/${formData.videoUrl.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || ''}`}
                  style={{ borderRadius: '8px', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="supportedAndroid" checked={formData.supportedAndroid} onChange={handleChange} /> Android
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="supportedIos" checked={formData.supportedIos} onChange={handleChange} /> iOS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} /> เป็นเกมแนะนำ
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} /> เปิดใช้งาน
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเกม'}
          </button>
        </form>
      </div>
    </div>
  );
}
