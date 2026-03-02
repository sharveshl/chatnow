import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    encrypted: {
        type: String,
        required: true
    },
    iv: {
        type: String,
        required: true
    },
    authTag: {
        type: String,
        required: true
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

groupMessageSchema.index({ group: 1, createdAt: -1 });

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);
export default GroupMessage;
