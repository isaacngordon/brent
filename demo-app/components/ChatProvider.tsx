// components/ChatProvider.tsx
import React from 'react';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('react-chat-widget'), { ssr: false });

const ChatProvider: React.FC = ({ children }) => {
  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
};

export default ChatProvider;

