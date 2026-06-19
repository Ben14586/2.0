import React from 'react';
import { Category } from '../../types';

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryFilter({ categories, activeCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
      <button 
        className={activeCategory === 'all' ? 'primary-action' : 'secondary-action'}
        onClick={() => onSelectCategory('all')}
        style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '6px 16px', fontSize: '14px', minHeight: 'auto' }}
      >
        ทั้งหมด
      </button>
      {categories.map(cat => (
        <button 
          key={cat.id}
          className={activeCategory === cat.id ? 'primary-action' : 'secondary-action'}
          onClick={() => onSelectCategory(cat.id)}
          style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '6px 16px', fontSize: '14px', minHeight: 'auto' }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
