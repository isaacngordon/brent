// src/ChatWidget.tsx
"use client";
import React, { useState } from 'react';
import './ChatWidget.css'; 

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
      <p>Hey, do you see the button?</p>
      <button className="chat-toggle-button" onClick={toggleChat}>
        Click Me
      </button>
      {isOpen && <div className="chat-window">Hello World</div>}
    </div>
  );
};

export default ChatWidget;

