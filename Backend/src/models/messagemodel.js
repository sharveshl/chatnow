import mongoose from 'mongoose';



const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
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
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
},
    {
        timestamps: true
    });

// Compound index for conversation queries (sender↔receiver by time)
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Index for pending message delivery (receiver + status)
messageSchema.index({ receiver: 1, status: 1 });

// Index for status-based bulk updates
messageSchema.index({ sender: 1, receiver: 1, status: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
