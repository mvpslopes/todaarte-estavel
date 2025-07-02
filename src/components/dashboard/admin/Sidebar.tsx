import React from 'react';
import { Link } from 'react-router-dom';

export function Sidebar() {
  return (
    <ul className="w-64 bg-white h-full border-r">
      <li>
        <Link to="/dashboard/agenda" className="block px-4 py-2 hover:bg-gray-100">Agenda</Link>
      </li>
      {/* Adicione outros itens do menu conforme necessário */}
    </ul>
  );
} 