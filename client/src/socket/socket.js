import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [myId, setMyId] = useState('');
  const [isReady, setIsReady] = useState(false);
  const usernameRef = { current: '' };
  const announcedRef = { current: false };

  const connect = (username) => {
    if (username) usernameRef.current = username;
    socket.connect();
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };

  const createRoom = (room) => {
    socket.emit('create_room', room);
  };

  const joinRoom = (room) => {
    socket.emit('join_room', room);
  };

  const leaveRoom = (room) => {
    socket.emit('leave_room', room);
  };

  const sendRoomMessage = (room, message) => {
    socket.emit('room_message', { room, message });
  };

  const prependMessages = (olderMessages) => {
    if (!Array.isArray(olderMessages) || olderMessages.length === 0) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const merged = [...olderMessages.filter((m) => !existingIds.has(m.id)), ...prev];
      return merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });
  };

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setMyId(socket.id);
      if (usernameRef.current && !announcedRef.current) {
        socket.emit('user_join', usernameRef.current);
        announcedRef.current = true;
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      announcedRef.current = false;
      setIsReady(false);
    };

    const addUnique = (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };

    const onReceiveMessage = (message) => {
      setLastMessage(message);
      addUnique(message);
      socket.emit('ack_delivered', { messageId: message.id });
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      addUnique(message);
      socket.emit('ack_delivered', { messageId: message.id });
    };

    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.system && last.message === `${user.username} joined the chat`) return prev;
        return [
          ...prev,
          {
            id: Date.now(),
            system: true,
            message: `${user.username} joined the chat`,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    };

    const onUserLeft = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    const onJoinedAck = (data) => {
      if (data && data.id) setMyId(data.id);
      setIsReady(true);
    };
    const onRooms = (list) => setRooms(list);
    const onRoomMessage = (message) => {
      setLastMessage(message);
      addUnique(message);
      socket.emit('ack_delivered', { messageId: message.id });
    };
    const onDelivered = ({ messageId, userId }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deliveredTo: Array.from(new Set([...(m.deliveredTo || []), userId])) } : m));
    };
    const onRead = ({ messageId, userId }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), userId])) } : m));
    };
    socket.on('rooms', onRooms);
    socket.on('room_message', onRoomMessage);
    socket.on('message_delivered', onDelivered);
    socket.on('message_read', onRead);
    socket.on('joined_ack', onJoinedAck);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('rooms', onRooms);
      socket.off('room_message', onRoomMessage);
      socket.off('message_delivered', onDelivered);
      socket.off('message_read', onRead);
      socket.off('joined_ack', onJoinedAck);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    rooms,
    myId,
    isReady,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    createRoom,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    prependMessages,
  };
};

export default socket; 