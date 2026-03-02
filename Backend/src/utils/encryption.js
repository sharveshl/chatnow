import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKey() {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext message using AES-256-GCM.
 * @param {string} plaintext
 * @returns {{ encrypted: string, iv: string, authTag: string }} hex-encoded values
 */
export function encryptMessage(plaintext) {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let enc = cipher.update(plaintext, 'utf8', 'hex');
    enc += cipher.final('hex');

    return {
        encrypted: enc,
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex')
    };
}

/**
 * Decrypt a message that was encrypted with encryptMessage().
 * @param {string} encrypted  hex-encoded ciphertext
 * @param {string} iv         hex-encoded IV
 * @param {string} authTag    hex-encoded auth tag
 * @returns {string} plaintext
 */
export function decryptMessage(encrypted, iv, authTag) {
    const key = getKey();

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let dec = decipher.update(encrypted, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}
