import React, { useState } from 'react';

interface PackageFormModalProps {
  pkg?: any;
  gameId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function PackageFormModal({ pkg, gameId, onClose, onSaved }: PackageFormModalProps) {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    price: pkg?.price || 0,
    subtitle: pkg?.subtitle || '',
    description: pkg?.description || '',
    badge: pkg?.badge || 'Public',
    isRecommended: pkg?.isRecommended || false,
    isActive: pkg?.isActive ?? true,
    highlights: pkg?.highlights ? pkg.highlights.join('\n') : '',
    delivery: pkg?.delivery || 'ภายใน 5-15 นาที',
    support: pkg?.support || 'ตอบแชททุกวัน 09:00-23:00',
    guarantee: pkg?.guarantee || 'รับประกันตามเงื่อนไขร้าน 7 วัน',
    audience: pkg?.audience || '',
    adminNotes: pkg?.adminNotes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const highlightsArray = formData.highlights.split('\n').map(s => s.trim()).filter(s => s !== '');

    try {
      const res = await fetch('/api/admin-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          packageId: pkg?.id,
          gameId: gameId,
          ...formData,
          price: parseFloat(formData.price as any),
          highlights: highlightsArray,
          items: highlightsArray
        })
      });

      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || 'Failed to save package');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{pkg ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจใหม่'}</h3>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div className="alert-danger" style={{ padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: '4px' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>ชื่อแพ็กเกจ</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>ราคา (บาท)</label>
              <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="input-field" required />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>คำโปรย (Subtitle)</label>
            <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>คำอธิบาย (Description)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input-field" rows={2}></textarea>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>รายการเด่น (Highlights - 1 บรรทัดต่อ 1 ข้อ)</label>
            <textarea name="highlights" value={formData.highlights} onChange={handleChange} className="input-field" rows={4} placeholder="เช่น&#10;เพิ่มเงิน 99M&#10;ตั๋วสุ่ม 1000 ใบ"></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>การจัดส่ง (Delivery)</label>
              <input type="text" name="delivery" value={formData.delivery} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>การดูแล (Support)</label>
              <input type="text" name="support" value={formData.support} onChange={handleChange} className="input-field" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>บันทึกของแอดมิน (Admin Notes - ไม่โชว์หน้าเว็บ)</label>
            <input type="text" name="adminNotes" value={formData.adminNotes} onChange={handleChange} className="input-field" />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="isRecommended" checked={formData.isRecommended} onChange={handleChange} /> เป็นแพ็กเกจแนะนำ
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} /> เปิดใช้งาน
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลแพ็กเกจ'}
          </button>
        </form>
      </div>
    </div>
  );
}
