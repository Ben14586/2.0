import React from 'react';
import { Category } from '../../types';

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryFilter({ categories, activeCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="category-filter" role="group" aria-label="กรองตามหมวดหมู่เกม">
      <button
        type="button"
        className={activeCategory === 'all' ? 'primary-action' : 'secondary-action'}
        aria-pressed={activeCategory === 'all'}
        onClick={() => onSelectCategory('all')}
      >
        ทั้งหมด
      </button>
      {categories.map((category) => (
        <button
          type="button"
          key={category.id}
          className={activeCategory === category.id ? 'primary-action' : 'secondary-action'}
          aria-pressed={activeCategory === category.id}
          onClick={() => onSelectCategory(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
