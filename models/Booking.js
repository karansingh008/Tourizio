const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },
    guestsCount: {
        type: Number,
        required: true
    },
    totalCost: {
        type: String, // Keeping as string to retain currency symbol for display simplicity, or parse to Number
        required: true
    },
    guests: [{
        firstName: String,
        lastName: String,
        age: Number,
        gender: String
    }],
    status: {
        type: String,
        default: 'Confirmed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', bookingSchema);
