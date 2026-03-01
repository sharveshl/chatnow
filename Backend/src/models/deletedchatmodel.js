import mongoose from 'mongoose';

const deletedChatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    otherUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deletedAt: {
        type: Date,
        default: Date.now
    }
});

// One record per user-pair: the user who deleted sees no messages before deletedAt
deletedChatSchema.index({ user: 1, otherUser: 1 }, { unique: true });

const DeletedChat = mongoose.model('DeletedChat', deletedChatSchema);
export default DeletedChat;
