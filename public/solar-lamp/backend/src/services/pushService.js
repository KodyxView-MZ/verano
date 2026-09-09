const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Caminho local de fallback para salvar inscrições
const SUBSCRIPTIONS_FILE = path.join(__dirname, '..', '..', 'subscriptions.json');

// Carregar inscrições existentes do arquivo JSON (fallback)
let memorySubscriptions = [];
try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        const rawData = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
        memorySubscriptions = JSON.parse(rawData);
    }
} catch (error) {
    memorySubscriptions = [];
}

function persistLocalSubscriptions() {
    try {
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(memorySubscriptions, null, 2), 'utf-8');
    } catch (err) {
        // No Vercel (read-only filesystem), ignorar erro de escrita em disco local
    }
}

/**
 * Inicializa a configuração do Web Push com chaves VAPID
 */
function initWebPush() {
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@solarlamp.com';
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.warn('⚠️ Chaves VAPID não configuradas no .env. Notificações push estarão desabilitadas.');
        return false;
    }

    try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        return true;
    } catch (err) {
        console.error('Erro ao configurar VAPID:', err.message);
        return false;
    }
}

initWebPush();

/**
 * Sincroniza inscrições locais do subscriptions.json para o MongoDB se conectado
 */
async function syncLocalSubscriptionsToMongo() {
    if (mongoose.connection.readyState !== 1) return;
    try {
        const Subscription = require('../models/Subscription');
        for (const sub of memorySubscriptions) {
            if (sub && sub.endpoint && sub.keys) {
                await Subscription.findOneAndUpdate(
                    { endpoint: sub.endpoint },
                    {
                        endpoint: sub.endpoint,
                        expirationTime: sub.expirationTime || null,
                        keys: sub.keys
                    },
                    { upsert: true, new: true }
                );
            }
        }
    } catch (e) {
        console.warn('Aviso ao sincronizar inscrições com MongoDB:', e.message);
    }
}

// Tentar sincronização inicial
setTimeout(syncLocalSubscriptionsToMongo, 3000);

/**
 * Retorna todas as inscrições ativas (do MongoDB ou da memória)
 */
async function getAllSubscriptions() {
    if (mongoose.connection.readyState === 1) {
        try {
            const Subscription = require('../models/Subscription');
            const docs = await Subscription.find({});
            if (docs && docs.length > 0) {
                return docs.map(d => ({
                    endpoint: d.endpoint,
                    expirationTime: d.expirationTime,
                    keys: d.keys
                }));
            }
        } catch (e) {
            console.warn('Erro ao buscar inscrições do MongoDB, usando fallback em memória:', e.message);
        }
    }
    return memorySubscriptions;
}

/**
 * Salva a inscrição do administrador para notificações push
 * @param {Object} subscription - Objeto de assinatura PushSubscription
 */
async function saveSubscription(subscription) {
    if (!subscription || !subscription.endpoint) {
        throw new Error('Inscrição inválida: endpoint ausente');
    }

    // 1. Salvar no MongoDB se disponível
    if (mongoose.connection.readyState === 1) {
        try {
            const Subscription = require('../models/Subscription');
            await Subscription.findOneAndUpdate(
                { endpoint: subscription.endpoint },
                {
                    endpoint: subscription.endpoint,
                    expirationTime: subscription.expirationTime || null,
                    keys: subscription.keys
                },
                { upsert: true, new: true }
            );
            console.log('✅ Inscrição push salva no MongoDB Atlas!');
        } catch (e) {
            console.error('Erro ao salvar inscrição no MongoDB:', e.message);
        }
    }

    // 2. Salvar em memória / arquivo local como redundância
    const exists = memorySubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
        memorySubscriptions.push(subscription);
        persistLocalSubscriptions();
    }

    console.log(`📱 Inscrição push registrada com sucesso.`);
    return true;
}

/**
 * Envia uma notificação push para todos os administradores cadastrados
 * @param {Object|string} payload - Dados da notificação
 * @returns {Promise<Array>} Resultado de envio para cada inscrição
 */
async function sendPushNotification(payload) {
    initWebPush();

    const stringPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const results = [];
    const staleSubscriptions = [];

    const activeSubscriptions = await getAllSubscriptions();
    console.log(`📢 Disparando push para ${activeSubscriptions.length} administrador(es)...`);

    for (const sub of activeSubscriptions) {
        try {
            const res = await webpush.sendNotification(sub, stringPayload, {
                urgency: 'high',
                TTL: 24 * 60 * 60 // 24 horas
            });
            results.push({ endpoint: sub.endpoint, success: true, statusCode: res.statusCode });
        } catch (error) {
            console.warn(`Falha no envio push para endpoint: ${error.statusCode || error.message}`);
            // Se o token expirou (410 Gone ou 404 Not Found)
            if (error.statusCode === 410 || error.statusCode === 404) {
                staleSubscriptions.push(sub.endpoint);
            }
            results.push({ endpoint: sub.endpoint, success: false, error: error.message });
        }
    }

    // Remove inscrições expiradas do MongoDB e da memória
    if (staleSubscriptions.length > 0) {
        memorySubscriptions = memorySubscriptions.filter(sub => !staleSubscriptions.includes(sub.endpoint));
        persistLocalSubscriptions();

        if (mongoose.connection.readyState === 1) {
            try {
                const Subscription = require('../models/Subscription');
                await Subscription.deleteMany({ endpoint: { $in: staleSubscriptions } });
                console.log(`🧹 ${staleSubscriptions.length} inscrição(ões) expirada(s) removida(s) do MongoDB.`);
            } catch (e) {}
        }
    }

    return results;
}

/**
 * Envia notificação push formatada de um novo pedido para todos os administradores
 * @param {Object} order - Dados do pedido recém-criado
 */
async function sendNewOrderNotification(order) {
    const formattedPrice = Number(order.totalPrice || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 });
    
    const notificationPayload = {
        title: '💭 NOVO PEDIDO!',
        body: `${order.customerName} - ${order.kitName} (${order.quantity}x) - ${formattedPrice} Mt`,
        icon: '/logons.png',
        badge: '/logons.png',
        tag: `order-${order._id || Date.now()}`,
        renotify: true,
        data: {
            url: '/dashboard',
            orderId: order._id,
            timestamp: Date.now()
        },
        actions: [
            { action: 'open_order', title: 'Ver Pedido' },
            { action: 'close', title: 'Fechar' }
        ]
    };

    console.log(`📢 Disparando notificação de novo pedido: ${notificationPayload.body}`);
    return await sendPushNotification(notificationPayload);
}

module.exports = {
    saveSubscription,
    sendPushNotification,
    sendNewOrderNotification,
    getAllSubscriptions,
    initWebPush,
    syncLocalSubscriptionsToMongo
};
