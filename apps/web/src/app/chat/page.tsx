'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Paperclip, Mic, Search } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [selectedChat, setSelectedChat] = useState<number | null>(1);

  const chats = [
    { id: 1, name: 'Sarah Johnson', lastMsg: 'Sure, I will send the report', time: '2m ago', unread: 2 },
    { id: 2, name: 'Engineering Team', lastMsg: 'Mike: The build is ready', time: '15m ago', unread: 0 },
    { id: 3, name: 'Mike Chen', lastMsg: 'Thanks for the help!', time: '1h ago', unread: 0 },
    { id: 4, name: 'HR Announcements', lastMsg: 'Holiday calendar updated', time: '3h ago', unread: 1 },
  ];

  const messages = [
    { id: 1, sender: 'Sarah Johnson', text: 'Hi! Can you share the project status?', time: '10:30 AM', isMine: false },
    { id: 2, sender: 'You', text: 'Sure! We are on track for the deadline.', time: '10:32 AM', isMine: true },
    { id: 3, sender: 'Sarah Johnson', text: 'Great! Can you send me the report?', time: '10:33 AM', isMine: false },
    { id: 4, sender: 'You', text: 'I will send it by EOD today.', time: '10:35 AM', isMine: true },
    { id: 5, sender: 'Sarah Johnson', text: 'Sure, I will send the report', time: '10:36 AM', isMine: false },
  ];

  return (
    <div className="min-h-screen bg-silver-50 flex flex-col">
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-navy-900">Messages</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Chat List */}
        <div className="w-80 bg-white border-r border-silver-200 flex flex-col">
          <div className="p-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`w-full p-4 text-left hover:bg-silver-50 border-b border-silver-100 ${
                  selectedChat === chat.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-medium text-sm">
                      {chat.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-navy-900 truncate">{chat.name}</p>
                      <span className="text-xs text-silver-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-silver-500 truncate">{chat.lastMsg}</p>
                  </div>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col bg-silver-50">
          {selectedChat ? (
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl ${
                        msg.isMine
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-navy-900 rounded-bl-md border border-silver-200'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.isMine ? 'text-blue-200' : 'text-silver-400'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white border-t border-silver-200">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-silver-500 hover:text-navy-900 hover:bg-silver-100 rounded-lg">
                    <Paperclip size={20} />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="p-2 text-silver-500 hover:text-navy-900 hover:bg-silver-100 rounded-lg">
                    <Mic size={20} />
                  </button>
                  <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-silver-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
