const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    age: {
        type: Number
    },
    profilePic: {
        type: String,
        default: '/images/default-avatar.png'
    },
    otp: String,
    otpExpires: Date,
    tempEmail: String
});

module.exports = mongoose.model('User', userSchema);
