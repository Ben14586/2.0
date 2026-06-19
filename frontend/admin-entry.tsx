import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './src/admin/AdminApp';

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>
  );
}
