'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EmployeeLayout } from '../../components/layout/EmployeeLayout';
import { useChat } from '../../viewmodels/useChat';
import { useAuth } from '../../lib/auth-context';
import { Bot, Send, User as UserIcon } from 'lucide-react';

export default function ChatPage() {
  const { messages, loading, sendMessage } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const suggestions = [
    "What's my leave balance?",
    "Can I take tomorrow off?",
    "How many performance points do I have?",
    "What's the WFH policy?"
  ];

  return (
    <EmployeeLayout>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm z-10">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mr-4 shadow-sm">
          <Bot className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI Chief of Staff</h1>
          <div className="flex items-center text-xs text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Always available
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm">
              <Bot className="w-5 h-5 text-brand-600" />
            </div>
            <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm max-w-[85%] text-sm leading-relaxed">
              Hello {user?.displayName || 'there'}! I&apos;m your AI Chief of Staff. I can help you with leave requests, performance points, and answering questions about company policies. How can I help you today?
            </div>
          </div>

          {messages.length === 0 && (
            <div className="pl-11 flex flex-wrap gap-2 mt-4">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => { setInput(s); setTimeout(handleSend, 0); }}
                  className="px-4 py-2 bg-white border border-brand-200 text-brand-700 rounded-full text-xs font-medium hover:bg-brand-50 hover:border-brand-300 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm mt-1">
                  <Bot className="w-5 h-5 text-brand-600" />
                </div>
              )}
              
              <div className="flex flex-col">
                <div className={`px-5 py-3 shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm max-w-[85%] ml-auto' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm max-w-[85%]'
                }`}>
                  <div className="whitespace-pre-wrap font-[family-name:var(--font-geist-sans)]">{msg.content}</div>
                </div>
                <span className={`text-[10px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0 shadow-sm mt-1">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm mt-1">
                <Bot className="w-5 h-5 text-brand-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                <div className="flex space-x-1.5 items-center h-4">
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto relative flex items-end shadow-sm rounded-xl bg-gray-50 border border-gray-200 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-shadow">
          <textarea
            ref={textareaRef}
            className="w-full max-h-[120px] bg-transparent resize-none py-3 pl-4 pr-12 focus:outline-none text-sm text-gray-900 scrollbar-thin"
            placeholder="Type your message..."
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 bottom-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          AI Chief of Staff can make mistakes. Consider verifying important information.
        </p>
      </div>
    </EmployeeLayout>
  );
}
