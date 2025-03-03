'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b">
      <div className="flex items-center space-x-2">
        {/* <img 
          src="/api/placeholder/40/40" 
          alt="Logo" 
          className="h-10 w-10 rounded-full"
        /> */}
        <span className="font-bold text-xl">Governance</span>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        {isMenuOpen && (
          <div className="absolute top-16 right-4 bg-white shadow-lg rounded-lg p-4 w-64 z-50">
            <div className="space-y-4">
              <appkit-button />
              {/* <div className="space-y-2">
                <a href="#" className="block px-4 py-2 hover:bg-gray-100 rounded-lg">Home</a>
                <a href="#" className="block px-4 py-2 hover:bg-gray-100 rounded-lg">Dashboard</a>
                <a href="#" className="block px-4 py-2 hover:bg-gray-100 rounded-lg">Settings</a>
              </div> */}
            </div>
          </div>
        )}
      </div>

      {/* Desktop menu */}
      <div className="hidden md:flex items-center space-x-8">
        {/* <nav className="flex items-center space-x-6">
          <a href="#" className="text-gray-700 hover:text-blue-600">Home</a>
          <a href="#" className="text-gray-700 hover:text-blue-600">Dashboard</a>
          <a href="#" className="text-gray-700 hover:text-blue-600">Settings</a>
        </nav> */}
        
        <appkit-button />
      </div>
    </header>
  );
};

export default Header;