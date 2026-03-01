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
},
    {
        timestamps: true
    }
);

// Text index for fast user search by username or name
userSchema.index({ username: 'text', name: 'text' });

const User = mongoose.model('User', userSchema);
export default User;