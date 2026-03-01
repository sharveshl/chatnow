const CACHE_PREFIX = 'chatnow_msgs_';
const MAX_MESSAGES = 50;
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function getKey(chatUsername) {
    return CACHE_PREFIX + chatUsername;
}

/**
 * Get cached messages for a conversation.
 * Returns { messages, timestamp } or null if expired/missing.
 */
export function getCachedMessages(chatUsername) {
    try {
        const raw = localStorage.getItem(getKey(chatUsername));
        if (!raw) return null;

        const data = JSON.parse(raw);
        const age = Date.now() - (data.timestamp || 0);

        if (age > TTL_MS) {
            localStorage.removeItem(getKey(chatUsername));
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

/**
 * Store messages in cache (keeps only latest MAX_MESSAGES).
 */
export function setCachedMessages(chatUsername, messages) {
    try {
        const trimmed = messages.slice(-MAX_MESSAGES);
        localStorage.setItem(getKey(chatUsername), JSON.stringify({
            messages: trimmed,
            timestamp: Date.now()
        }));
    } catch {
        // localStorage full or unavailable — silently fail
    }
}

/**
 * Append a single message to the cache for a conversation.
 */
export function appendCachedMessage(chatUsername, message) {
    try {
        const cached = getCachedMessages(chatUsername);
        const messages = cached ? [...cached.messages, message] : [message];
        setCachedMessages(chatUsername, messages);
    } catch {
        // silently fail
    }
}

/**
 * Update the status of a message in the cache.
 */
export function updateCachedMessageStatus(chatUsername, messageId, status) {
    try {
        const cached = getCachedMessages(chatUsername);
        if (!cached) return;

        const updated = cached.messages.map(msg =>
            msg._id === messageId ? { ...msg, status } : msg
        );
        setCachedMessages(chatUsername, updated);
    } catch {
        // silently fail
    }
}

/**
 * Mark all messages from a specific sender as read in cache.
 */
export function markCachedMessagesRead(chatUsername, readerUsername) {
    try {
        const cached = getCachedMessages(chatUsername);
        if (!cached) return;

        const updated = cached.messages.map(msg => {
            // If the sender of the message is NOT the reader (i.e., my messages), mark as read
            if (msg.sender?.username !== readerUsername && msg.status !== 'read') {
                return { ...msg, status: 'read' };
            }
            return msg;
        });
        setCachedMessages(chatUsername, updated);
    } catch {
        // silently fail
    }
}

/**
 * Remove all expired message caches.
 */
export function clearExpiredCache() {
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        for (const key of keys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (Date.now() - (data?.timestamp || 0) > TTL_MS) {
                    localStorage.removeItem(key);
                }
            } catch {
                localStorage.removeItem(key);
            }
        }
    } catch {
        // silently fail
    }
}
