const mongoose = require('mongoose');

/**
 * Esquema de Dados para Pedidos da Lâmpada Solar Inteligente
 */
const OrderSchema = new mongoose.Schema({
    kitName: {
        type: String,
        required: [true, 'O nome do kit é obrigatório'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'A quantidade é obrigatória'],
        min: [1, 'A quantidade mínima é 1'],
        default: 1
    },
    totalPrice: {
        type: Number,
        required: [true, 'O preço total é obrigatório'],
        min: [0, 'O preço total não pode ser negativo']
    },
    province: {
        type: String,
        required: [true, 'A província é obrigatória'],
        trim: true
    },
    customerName: {
        type: String,
        required: [true, 'O nome do cliente é obrigatório'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'O telefone do cliente é obrigatório'],
        trim: true
    },
    whatsapp: {
        type: String,
        required: [true, 'O WhatsApp do cliente é obrigatório'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'O endereço completo é obrigatório'],
        trim: true
    },
    status: {
        type: String,
        enum: {
            values: ['pendente', 'confirmado', 'enviado', 'entregue', 'cancelado'],
            message: '{VALUE} não é um status válido'
        },
        default: 'pendente'
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Exporta o modelo para uso em rotas e serviços
module.exports = mongoose.model('Order', OrderSchema);
