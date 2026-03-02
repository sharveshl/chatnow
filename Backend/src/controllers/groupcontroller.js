import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Group from '../models/groupmodel.js';
import GroupMessage from '../models/groupmessagemodel.js';
import User from '../models/usermodel.js';
import { encryptMessage, decryptMessage } from '../utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CREATE GROUP ────────────────────────────────────────────
export const createGroup = async (req, res) => {
    try {
        const { name, memberUsernames, description } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        if (!memberUsernames || memberUsernames.length < 1) {
            return res.status(400).json({ message: 'At least 1 member is required' });
        }

        // Resolve usernames to IDs (exclude deleted users)
        const members = await User.find({
            username: { $in: memberUsernames },
            isDeleted: { $ne: true }
        }).select('_id').lean();

        const memberIds = members.map(m => m._id);

        // Always include admin as member
        const allMemberIds = [
            ...new Set([req.user._id.toString(), ...memberIds.map(id => id.toString())])
        ].map(id => new mongoose.Types.ObjectId(id));

        const group = new Group({
            name: name.trim(),
            description: description?.trim() || '',
            admin: req.user._id,
            members: allMemberIds
        });

        await group.save();

        const populated = await Group.findById(group._id)
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        return res.status(201).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── GET MY GROUPS ────────────────────────────────────────────
export const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        // For each group, get the last message
        const groupsWithLastMsg = await Promise.all(groups.map(async (group) => {
            const lastMsg = await GroupMessage.findOne({ group: group._id })
                .sort({ createdAt: -1 })
                .populate('sender', 'username name')
                .lean();

            let lastMessage = '';
            let lastMessageTime = group.createdAt;
            let lastMessageSender = null;

            if (lastMsg) {
                try {
                    lastMessage = decryptMessage(lastMsg.encrypted, lastMsg.iv, lastMsg.authTag);
                } catch {
                    lastMessage = '[Unable to decrypt]';
                }
                lastMessageTime = lastMsg.createdAt;
                lastMessageSender = lastMsg.sender;
            }

            // Unread count: messages not read by current user
            const unreadCount = await GroupMessage.countDocuments({
                group: group._id,
                sender: { $ne: req.user._id },
                readBy: { $ne: req.user._id }
            });

            return {
                ...group,
                lastMessage,
                lastMessageTime,
                lastMessageSender,
                unreadCount,
                type: 'group'
            };
        }));

        // Sort by lastMessageTime descending
        groupsWithLastMsg.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

        return res.status(200).json(groupsWithLastMsg);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── GET GROUP MESSAGES ───────────────────────────────────────
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { before, limit: queryLimit } = req.query;
        const limit = Math.min(parseInt(queryLimit) || 50, 100);

        const group = await Group.findById(groupId).lean();
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

        const filter = { group: groupId };
        if (before && mongoose.Types.ObjectId.isValid(before)) {
            filter._id = { $lt: new mongoose.Types.ObjectId(before) };
        }

        const messages = await GroupMessage.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate('sender', 'username name profilePhoto')
            .lean();

        const hasMore = messages.length > limit;
        if (hasMore) messages.pop();
        messages.reverse();

        // Decrypt
        const decrypted = messages.map(msg => {
            try {
                return {
                    ...msg,
                    content: decryptMessage(msg.encrypted, msg.iv, msg.authTag),
                    encrypted: undefined, iv: undefined, authTag: undefined
                };
            } catch {
                return { ...msg, content: '[Unable to decrypt]', encrypted: undefined, iv: undefined, authTag: undefined };
            }
        });

        // Mark all unread messages as read by current user
        await GroupMessage.updateMany(
            { group: groupId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } }
        );

        return res.status(200).json({ messages: decrypted, hasMore });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── UPDATE GROUP (name/description) ─────────────────────────
export const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description } = req.body;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can edit group details' });
        }

        if (name?.trim()) group.name = name.trim();
        if (description !== undefined) group.description = description.trim();
        await group.save();

        const populated = await Group.findById(group._id)
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        return res.status(200).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── UPLOAD GROUP PHOTO ───────────────────────────────────────
export const uploadGroupPhoto = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can change group photo' });
        }
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        group.photo = `/uploads/${req.file.filename}`;
        await group.save();

        const populated = await Group.findById(group._id)
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        return res.status(200).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── ADD MEMBERS ──────────────────────────────────────────────
export const addMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { usernames } = req.body;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can add members' });
        }

        const users = await User.find({
            username: { $in: usernames },
            isDeleted: { $ne: true }
        }).select('_id').lean();

        const newIds = users.map(u => u._id.toString());
        const existing = group.members.map(m => m.toString());
        const toAdd = newIds.filter(id => !existing.includes(id)).map(id => new mongoose.Types.ObjectId(id));

        if (toAdd.length > 0) {
            group.members.push(...toAdd);
            await group.save();
        }

        const populated = await Group.findById(group._id)
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        return res.status(200).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── REMOVE MEMBER / LEAVE GROUP ─────────────────────────────
export const removeMember = async (req, res) => {
    try {
        const { groupId, username } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const targetUser = await User.findOne({ username }).select('_id').lean();
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        const isSelf = targetUser._id.toString() === req.user._id.toString();
        const isAdmin = group.admin.toString() === req.user._id.toString();

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ message: 'Only admin can remove members' });
        }

        // Admin cannot leave unless they transfer admin first
        if (isSelf && isAdmin && group.members.length > 1) {
            return res.status(400).json({ message: 'Transfer admin role before leaving' });
        }

        group.members = group.members.filter(m => m.toString() !== targetUser._id.toString());
        await group.save();

        // If group is now empty, delete it
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            return res.status(200).json({ message: 'Group deleted (no members left)' });
        }

        const populated = await Group.findById(group._id)
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        return res.status(200).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── MAKE ADMIN ───────────────────────────────────────────────
export const makeAdmin = async (req, res) => {
    try {
        const { groupId, username } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can transfer admin role' });
        }

        const newAdmin = await User.findOne({ username }).select('_id').lean();
        if (!newAdmin) return res.status(404).json({ message: 'User not found' });

        const isMember = group.members.some(m => m.toString() === newAdmin._id.toString());
        if (!isMember) return res.status(400).json({ message: 'User is not a member of the group' });

        group.admin = newAdmin._id;
        await group.save();

        const populated = await Group.findById(group._id)
            .populate('admin', 'username name profilePhoto')
            .populate('members', 'username name profilePhoto isDeleted')
            .lean();

        return res.status(200).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// ─── DELETE GROUP ─────────────────────────────────────────────
export const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can delete the group' });
        }

        await GroupMessage.deleteMany({ group: groupId });
        await Group.findByIdAndDelete(groupId);

        return res.status(200).json({ message: 'Group deleted' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
