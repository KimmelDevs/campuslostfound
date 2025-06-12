'use client';
import { useState, useRef, useEffect } from 'react';

export default function AIPage() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef(null);

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (message === '' || isLoading) return;

    // Add user message to chat
    setMessages(prev => [...prev, { text: message, isUser: true }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      setMessages(prev => [...prev, { text: data.response, isUser: false }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: 'Error: Failed to get AI response. Make sure Ollama is running.', 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900 p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Chat messages container */}
        <div 
          ref={chatBoxRef}
          className="flex-1 overflow-y-auto p-6 bg-gray-900 flex flex-col gap-3"
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.isUser
                  ? 'bg-blue-500 text-white self-end'
                  : 'bg-gray-200 text-gray-800 self-start'
              }`}
            >
              {msg.text}
            </div>
          ))}
          
          {isLoading && (
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-200 text-gray-800 self-start">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-full bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white mx-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}