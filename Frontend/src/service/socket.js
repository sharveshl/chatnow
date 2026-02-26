import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
    if (socket?.connected) return socket;

    // Derive the base URL from the backend API url (strip /api)
    const backendUrl = import.meta.env.VITE_backendurl?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

    socket = io(backendUrl, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✓ Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('✗ Socket disconnected:', reason);
    });

    return socket;
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
