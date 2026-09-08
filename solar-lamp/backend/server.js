const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente do .env
dotenv.config({ path: path.join(__dirname, '.env') });

const Order = require('./src/models/Order');
const pushService = require('./src/services/pushService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexão com o MongoDB Atlas
let isMongoConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDatabase() {
    if (mongoose.connection.readyState === 1) {
        isMongoConnected = true;
        return;
    }

    if (!MONGODB_URI || MONGODB_URI.includes('usuario:senha')) {
        console.warn('⚠️ AVISO: MONGODB_URI não foi configurada com suas credenciais reais no .env.');
        console.warn('👉 Para salvar pedidos permanentemente no MongoDB Atlas, atualize a variável MONGODB_URI no arquivo .env');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        isMongoConnected = true;
        console.log('✅ Conexão estabelecida com sucesso com o MongoDB Atlas!');
        pushService.syncLocalSubscriptionsToMongo().catch(() => {});
    } catch (err) {
        console.error('❌ Erro ao conectar ao MongoDB Atlas:', err.message);
        console.warn('O servidor continuará operando para receber requisições.');
    }
}

connectDatabase();

// Middleware para garantir conexão ativa no Vercel / serverless
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1 && MONGODB_URI && !MONGODB_URI.includes('usuario:senha')) {
        try {
            await connectDatabase();
        } catch (e) {}
    }
    next();
});

// Armazenamento em memória / fallback caso o MongoDB ainda não esteja conectado
let fallbackOrders = [];

// ==========================================
// ROTAS DA API
// ==========================================

/**
 * ROTA: Chave Pública VAPID para Inscrição no Push
 * GET /api/vapid-public-key
 */
app.get('/api/vapid-public-key', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return res.status(500).json({ error: 'Chave VAPID pública não configurada' });
    }
    res.json({ publicKey });
});

/**
 * ROTA: Status da Conexão / Health Check
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        database: isMongoConnected ? 'connected' : 'disconnected_or_pending',
        timestamp: new Date().toISOString()
    });
});

/**
 * ROTA: Salvar Inscrição Push do Administrador
 * POST /api/subscribe
 */
app.post('/api/subscribe', (req, res) => {
    try {
        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Inscrição push inválida' });
        }

        pushService.saveSubscription(subscription);
        res.status(201).json({
            success: true,
            message: 'Inscrição do administrador salva com sucesso para notificações!'
        });
    } catch (error) {
        console.error('Erro ao salvar inscrição push:', error.message);
        res.status(500).json({ error: 'Erro ao processar inscrição push' });
    }
});

/**
 * ROTA: Receber Novo Pedido
 * POST /api/orders
 */
app.post('/api/orders', async (req, res) => {
    try {
        const {
            kitName,
            quantity,
            totalPrice,
            province,
            customerName,
            phone,
            whatsapp,
            address
        } = req.body;

        // Validação básica dos campos obrigatórios
        if (!customerName || !phone || !whatsapp || !address || !kitName || !totalPrice || !province) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos obrigatórios devem ser preenchidos.'
            });
        }

        const orderData = {
            kitName,
            quantity: Number(quantity) || 1,
            totalPrice: Number(totalPrice),
            province,
            customerName,
            phone,
            whatsapp,
            address,
            status: 'pendente',
            orderDate: new Date()
        };

        let savedOrder;

        if (isMongoConnected) {
            // Salvar no MongoDB Atlas
            savedOrder = await Order.create(orderData);
        } else {
            // Salvar em fallback caso MongoDB não esteja configurado ainda
            savedOrder = {
                _id: 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                ...orderData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            fallbackOrders.unshift(savedOrder);
        }

        console.log(`📦 Novo pedido recebido! Cliente: ${savedOrder.customerName} | Total: ${savedOrder.totalPrice} Mt`);

        // Disparar notificação push assíncrona para administradores
        pushService.sendNewOrderNotification(savedOrder).catch(err => {
            console.error('Erro ao enviar notificação push:', err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Pedido realizado com sucesso!',
            order: savedOrder
        });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao processar o pedido: ' + error.message
        });
    }
});

/**
 * ROTA: Listar Todos os Pedidos (com filtros opcionais)
 * GET /api/orders
 */
app.get('/api/orders', async (req, res) => {
    try {
        const { status, search } = req.query;
        let orders = [];

        if (isMongoConnected) {
            const query = {};
            if (status && status !== 'todos') {
                query.status = status;
            }
            if (search) {
                query.$or = [
                    { customerName: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { whatsapp: { $regex: search, $options: 'i' } }
                ];
            }
            orders = await Order.find(query).sort({ orderDate: -1 });
        } else {
            orders = [...fallbackOrders];
            if (status && status !== 'todos') {
                orders = orders.filter(o => o.status === status);
            }
            if (search) {
                const term = search.toLowerCase();
                orders = orders.filter(o =>
                    (o.customerName && o.customerName.toLowerCase().includes(term)) ||
                    (o.phone && o.phone.toLowerCase().includes(term)) ||
                    (o.whatsapp && o.whatsapp.toLowerCase().includes(term))
                );
            }
        }

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar pedidos' });
    }
});

/**
 * ROTA: Retornar Estatísticas
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
    try {
        let allOrders = [];

        if (isMongoConnected) {
            allOrders = await Order.find({});
        } else {
            allOrders = fallbackOrders;
        }

        const total = allOrders.length;
        const pendentes = allOrders.filter(o => o.status === 'pendente').length;
        const confirmados = allOrders.filter(o => o.status === 'confirmado').length;
        const enviados = allOrders.filter(o => o.status === 'enviado').length;
        const entregues = allOrders.filter(o => o.status === 'entregue').length;
        const cancelados = allOrders.filter(o => o.status === 'cancelado').length;

        // Vendas totais somadas (excluindo cancelados)
        const totalVendas = allOrders
            .filter(o => o.status !== 'cancelado')
            .reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);

        res.json({
            success: true,
            total,
            pendentes,
            confirmados,
            enviados,
            entregues,
            cancelados,
            totalVendas
        });
    } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
        res.status(500).json({ success: false, error: 'Erro ao calcular estatísticas' });
    }
});

/**
 * ROTA: Obter um Pedido Específico
 * GET /api/orders/:id
 */
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let order;

        if (isMongoConnected) {
            order = await Order.findById(id);
        } else {
            order = fallbackOrders.find(o => o._id.toString() === id);
        }

        if (!order) {
            return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Erro ao buscar pedido por ID:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar pedido' });
    }
});

/**
 * ROTA: Atualizar Status do Pedido
 * PUT /api/orders/:id
 */
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pendente', 'confirmado', 'enviado', 'entregue', 'cancelado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Status inválido. Deve ser um dos seguintes: ${validStatuses.join(', ')}`
            });
        }

        let updatedOrder;

        if (isMongoConnected) {
            updatedOrder = await Order.findByIdAndUpdate(
                id,
                { status, updatedAt: new Date() },
                { new: true, runValidators: true }
            );
        } else {
            const index = fallbackOrders.findIndex(o => o._id.toString() === id);
            if (index !== -1) {
                fallbackOrders[index].status = status;
                fallbackOrders[index].updatedAt = new Date();
                updatedOrder = fallbackOrders[index];
            }
        }

        if (!updatedOrder) {
            return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
        }

        console.log(`🔄 Status do pedido #${id.slice(-6)} atualizado para: "${status}"`);
        res.json({
            success: true,
            message: 'Status do pedido atualizado com sucesso!',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar pedido: ' + error.message });
    }
});

/**
 * ROTA: Deletar Pedido
 * DELETE /api/orders/:id
 */
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let deleted = false;

        if (isMongoConnected) {
            const result = await Order.findByIdAndDelete(id);
            deleted = !!result;
        } else {
            const initialLen = fallbackOrders.length;
            fallbackOrders = fallbackOrders.filter(o => o._id.toString() !== id);
            deleted = fallbackOrders.length < initialLen;
        }

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
        }

        console.log(`🗑️ Pedido #${id.slice(-6)} removido com sucesso`);
        res.json({
            success: true,
            message: 'Pedido deletado com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao deletar pedido:', error);
        res.status(500).json({ success: false, error: 'Erro ao deletar pedido: ' + error.message });
    }
});

/**
 * ROTA: Testar Disparo de Notificação Push
 * POST /api/test-push
 */
app.post('/api/test-push', async (req, res) => {
    try {
        const testOrder = {
            _id: 'teste_' + Date.now().toString(36),
            customerName: 'Cliente Teste VIP',
            kitName: 'Super Lâmpada Solar Pro',
            quantity: 1,
            totalPrice: 3800
        };
        const results = await pushService.sendNewOrderNotification(testOrder);
        res.json({
            success: true,
            message: 'Notificação de teste disparada!',
            results
        });
    } catch (err) {
        console.error('Erro no test-push:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// ARQUIVOS ESTÁTICOS E DASHBOARD
// ==========================================

// Rota direta para servir o Service Worker no escopo raiz
const swPaths = [
    path.join(__dirname, '..', '..', 'sw.js'),
    path.join(__dirname, '..', 'frontend', 'sw.js'),
    path.join(__dirname, 'sw.js')
];

app.get('/sw.js', (req, res) => {
    for (const p of swPaths) {
        if (fs.existsSync(p)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Service-Worker-Allowed', '/');
            return res.sendFile(p);
        }
    }
    res.status(404).send('Service worker não encontrado');
});

// Servir o logo logons.png de qualquer localização do projeto
app.get('/logons.png', (req, res) => {
    const possiblePaths = [
        path.join(__dirname, 'dashboard', 'logons.png'),
        path.join(__dirname, '..', 'public', 'logons.png'),
        path.join(__dirname, '..', 'frontend', 'logons.png'),
        path.join(__dirname, '..', '..', 'logons.png'),
        path.join(__dirname, '..', 'logons.png')
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            res.setHeader('Content-Type', 'image/png');
            return res.sendFile(p);
        }
    }
    // Caso o usuário ainda não tenha colado logons.png, servir um logo SVG dinâmico elegante como fallback
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981" />
                <stop offset="100%" stop-color="#059669" />
            </linearGradient>
        </defs>
        <rect x="5" y="10" width="40" height="40" rx="12" fill="url(#grad)" />
        <path d="M25 18v8m0 8v2m-6-14l1.5 1.5m9 9l1.5 1.5m-12 0l1.5-1.5m9-9l1.5-1.5M17 30h2m12 0h2" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="25" cy="30" r="4.5" fill="#ffffff"/>
        <text x="55" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="18" fill="#10b981">SOLAR</text>
        <text x="125" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="18" fill="#0f172a">LAMP</text>
        <text x="55" y="44" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="9" fill="#64748b" letter-spacing="1.5">PAINEL DE CONTROLE</text>
    </svg>`);
});

// Servir a página do Dashboard
const dashboardPath = path.join(__dirname, 'dashboard', 'index.html');
app.get('/dashboard', (req, res) => {
    res.sendFile(dashboardPath);
});

// Servir arquivos estáticos adicionais do dashboard
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Servir imagens e arquivos públicos
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}
// Também servir do workspace raiz para imagens existentes (P1.jpg, P2.jpg, etc.)
app.use(express.static(path.join(__dirname, '..', '..')));

// Servir a landing page do frontend na raiz
const frontendDir = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
}

// Iniciar servidor HTTP se não estiver em ambiente serverless (Vercel)
if (process.env.VERCEL !== '1' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`
=====================================================
🚀 SERVIDOR SOLAR LAMP INICIADO COM SUCESSO!
📡 Porta: ${PORT}
🌐 Site Principal:     http://localhost:${PORT}
📊 Painel de Pedidos:  http://localhost:${PORT}/dashboard
⚡ API de Pedidos:     http://localhost:${PORT}/api/orders
🔔 VAPID Public Key:   ${process.env.VAPID_PUBLIC_KEY ? 'Configurada ✅' : 'Ausente ⚠️'}
=====================================================
        `);
    });
}

// Exporta app para suporte ao Vercel Serverless
module.exports = app;
