// components/ChatProvider.tsx
import React, { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('react-chat-widget'), { ssr: false });

interface ChatProviderProps {
  children: ReactNode;
}

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
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

