import React from 'react';

export function Footer() {
  return (
    <div style={{ textAlign: 'center', margin: '48px 0 12px', fontSize: '13px', color: '#8d6e63' }}>
      © {new Date().getFullYear()} Game Services. All rights reserved.
    </div>
  );
}
