import User from '../models/usermodel.js';

const SECURITY_SERVICE_URL = 'https://security-service-zzbx.onrender.com';
const RISK_BAN_THRESHOLD = 80;

/**
 * Analyze a message using the security microservice.
 * @param {string} text - The message content to analyze
 * @param {string} userId - The sender's user ID
 * @returns {Promise<{riskScore: number, riskLevel: string, action: string, reasons: string[], flaggedUrls: string[]}>}
 */
export async function analyzeMessage(text, userId) {
    try {
        const response = await fetch(`${SECURITY_SERVICE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, user_id: userId }),
            signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (!response.ok) {
            console.error(`Security service returned ${response.status}`);
            // Fail open — allow the message if the service is down
            return { riskScore: 0, riskLevel: 'none', action: 'allow', reasons: [], flaggedUrls: [] };
        }

        const data = await response.json();

        // Override action based on risk_level per user's requirements:
        // Only "critical" blocks; high/medium/low warn; safe allows
        let action;
        if (data.risk_level === 'critical') {
            action = 'block';
        } else if (data.risk_level === 'high' || data.risk_level === 'medium' || data.risk_level === 'low') {
            action = 'warn';
        } else {
            action = 'allow';
        }

        return {
            riskScore: data.risk_score || 0,
            riskLevel: data.risk_level || 'none',
            action,
            reasons: data.reasons || [],
            flaggedUrls: data.flagged_urls || []
        };
    } catch (err) {
        console.error('Security service error:', err.message);
        // Fail open — don't block messages if the service is unreachable
        return { riskScore: 0, riskLevel: 'none', action: 'allow', reasons: [], flaggedUrls: [] };
    }
}

/**
 * Update a user's cumulative risk score. If it crosses the ban threshold, ban the user.
 * @param {string} userId - The user's MongoDB _id
 * @param {number} messageRiskScore - The risk score from the current message
 * @returns {Promise<{newTotal: number, wasBanned: boolean}>}
 */
export async function updateUserRiskScore(userId, messageRiskScore) {
    if (messageRiskScore <= 0) {
        return { newTotal: 0, wasBanned: false };
    }

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { riskScore: messageRiskScore } },
            { new: true, select: 'riskScore isBanned' }
        );

        if (!user) return { newTotal: 0, wasBanned: false };

        const newTotal = user.riskScore;
        let wasBanned = false;

        if (newTotal >= RISK_BAN_THRESHOLD && !user.isBanned) {
            await User.findByIdAndUpdate(userId, { isBanned: true });
            wasBanned = true;
        }

        return { newTotal, wasBanned };
    } catch (err) {
        console.error('Failed to update user risk score:', err.message);
        return { newTotal: 0, wasBanned: false };
    }
}
