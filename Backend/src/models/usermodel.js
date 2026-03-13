import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    about: {
        type: String,
        default: ""
    },
    profilePhoto: {
        type: String,
        default: ""
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    riskScore: {
        type: Number,
        default: 0
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: true
    },
    lastKnownLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        capturedAt: { type: Date, default: null }
    },
},
    {
        timestamps: true
    }
);

// Text index for fast user search by username or name
userSchema.index({ username: 'text', name: 'text' });

const User = mongoose.model('User', userSchema);
export default User;