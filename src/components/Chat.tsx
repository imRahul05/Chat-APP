import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { Send, Sun, Moon, LogOut, Users, Plus } from 'lucide-react';

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  group_id: number;
  users: {
    email: string;
  };
}

interface Group {
  id: number;
  name: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups();
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prevMessages => [...prevMessages, payload.new as Message]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
    }
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching groups:', error);
    else setGroups(data || []);
  };

  const fetchMessages = async () => {
    if (!selectedGroup) return;

    const { data, error } = await supabase
      .from('messages_with_users')
      .select(`
        id,
        user_id,
        content,
        created_at,
        group_id,
        user_email
      `)
      .eq('group_id', selectedGroup)
      .order('created_at', { ascending: true });

    if (error) console.error('Error fetching messages:', error);
    else setMessages(data.map(msg => ({ ...msg, users: { email: msg.user_email } })) || []);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedGroup) return;
  
    const { data, error } = await supabase
      .from('messages')
      .insert({ content: newMessage, user_id: user.id, group_id: selectedGroup })
      .select();
  
    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
      setIsTyping(false);
      if (data && data[0]) {
        setMessages(prevMessages => [...prevMessages, data[0]]);
        scrollToBottom();
      }
    }
  };const handleCreateGroup = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Debugging logs
  console.log('Creating group with name:', newGroupName);
  console.log('Current user:', user);

  if (!newGroupName.trim()) {
    console.error('Group name is empty');
    return;
  }

  if (!user) {
    console.error('User is not authenticated');
    return;
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({ name: newGroupName, created_by: user.id })
    .select();

  if (error) {
    console.error('Error creating group:', error);
  } else {
    console.log('Group created successfully:', data);
    setNewGroupName('');
    fetchGroups();
    if (data && data[0]) {
      setSelectedGroup(data[0].id);
    }
  }
};
  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className="bg-indigo-600 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Chat App</h1>
        <div className="flex items-center space-x-4">
          <button onClick={toggleTheme} className="text-white">
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          <button onClick={logout} className="text-white">
            <LogOut />
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Groups</h2>
          <ul>
            {groups.map((group) => (
              <li
                key={group.id}
                className={`cursor-pointer p-2 rounded ${
                  selectedGroup === group.id ? 'bg-indigo-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSelectedGroup(group.id)}
              >
                {group.name}
              </li>
            ))}
          </ul>
          <form onSubmit={handleCreateGroup} className="mt-4">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name"
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            />
            <button
              type="submit"
              className="mt-2 w-full bg-indigo-500 text-white p-2 rounded flex items-center justify-center"
            >
              <Plus className="mr-2" size={16} />
              Create Group
            </button>
          </form>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${message.user_id === user?.id ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block p-2 rounded-lg ${
                    message.user_id === user?.id
                      ? 'bg-indigo-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p>{message.content}</p>
                  <small className="text-xs opacity-75">
                    {message.users.email} - {format(new Date(message.created_at), 'HH:mm')}
                  </small>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setIsTyping(e.target.value.length > 0);
                }}
                placeholder="Type a message..."
                className="flex-1 p-2 rounded-l-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !selectedGroup}
                className="bg-indigo-500 text-white p-2 rounded-r-md disabled:opacity-50"
              >
                <Send />
              </button>
            </div>
            {isTyping && <p className="text-sm text-gray-500 mt-1">Typing...</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;