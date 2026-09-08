/**
 * Service Worker - Notificações Push do Sistema de Pedidos
 * Lâmpada Solar Inteligente
 */

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('👷 Service Worker instalado.');
    self.skipWaiting();
});

// Ativação e controle imediato
self.addEventListener('activate', (event) => {
    console.log('⚡ Service Worker ativo e pronto para receber notificações.');
    event.waitUntil(self.clients.claim());
});

// Recebimento de Notificação Push
self.addEventListener('push', (event) => {
    console.log('📩 Evento Push recebido no Service Worker:', event);

    let data = {
        title: '💭 NOVO PEDIDO!',
        body: 'Um novo pedido foi realizado na loja!',
        icon: '/logons.png',
        badge: '/logons.png',
        tag: 'new-order-' + Date.now(),
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        data: { url: '/dashboard' }
    };

    if (event.data) {
        try {
            const parsedData = event.data.json();
            data = { ...data, ...parsedData };
        } catch (e) {
            data.body = event.data.text() || data.body;
        }
    }

    const title = data.title || '💭 NOVO PEDIDO!';
    
    // Opções completas com actions
    const fullOptions = {
        body: data.body,
        icon: data.icon || '/logons.png',
        badge: data.badge || '/logons.png',
        tag: data.tag || ('order-' + Date.now()),
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: data.data || { url: '/dashboard' },
        actions: [
            { action: 'open_order', title: 'Ver Pedido' },
            { action: 'close', title: 'Fechar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, fullOptions).catch((err) => {
            console.warn('Fallback para notificação simplificada sem actions:', err);
            // Fallback para navegadores sem suporte a 'actions' (ex: Firefox ou alguns mobiles)
            return self.registration.showNotification(title, {
                body: data.body,
                icon: data.icon || '/logons.png',
                tag: fullOptions.tag,
                renotify: true,
                requireInteraction: true,
                data: fullOptions.data
            });
        })
    );
});

// Clique na Notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Se o dashboard já estiver aberto em alguma aba, focar nele
            for (let client of windowClients) {
                if (client.url && client.url.includes('/dashboard') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Caso contrário, abrir o dashboard
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
