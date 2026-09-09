const mongoose = require('mongoose');

/**
 * Esquema de Assinaturas Web Push para Notificações do Administrador
 */
const SubscriptionSchema = new mongoose.Schema({
    endpoint: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    expirationTime: {
        type: Date,
        default: null
    },
    keys: {
        p256dh: {
            type: String,
            required: true
        },
        auth: {
            type: String,
            required: true
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
