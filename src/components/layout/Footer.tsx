import React from 'react';

const Footer: React.FC = () => (
  <footer className="w-full bg-gray-100 border-t border-gray-200 py-4 mt-8">
    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
      <div className="flex items-center">
        <img 
          src="/logo.png" 
          alt="Tasknova" 
          className="h-6 w-auto mr-2"
        />
        <span>© {new Date().getFullYear()} Tasknova. All rights reserved.</span>
      </div>
      <a
        href="#"
        className="text-blue-600 hover:underline mt-2 md:mt-0"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit our website
      </a>
    </div>
  </footer>
);

export default Footer; 