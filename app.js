// OrderWeb.net - Cloud Order Management Application
class OrderManager {
    constructor() {
        this.orders = this.loadOrders();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.displayOrders();
    }

    setupEventListeners() {
        const form = document.getElementById('orderForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const order = {
            id: this.generateOrderId(),
            customerName: formData.get('customerName'),
            email: formData.get('email'),
            product: formData.get('product'),
            quantity: formData.get('quantity'),
            notes: formData.get('notes'),
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        this.addOrder(order);
        this.showSuccessMessage('Order submitted successfully!');
        e.target.reset();
    }

    generateOrderId() {
        return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    addOrder(order) {
        this.orders.unshift(order);
        this.saveOrders();
        this.displayOrders();
    }

    loadOrders() {
        try {
            const stored = localStorage.getItem('orders');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading orders:', error);
            return [];
        }
    }

    saveOrders() {
        try {
            localStorage.setItem('orders', JSON.stringify(this.orders));
        } catch (error) {
            console.error('Error saving orders:', error);
        }
    }

    displayOrders() {
        const ordersList = document.getElementById('ordersList');
        
        if (this.orders.length === 0) {
            ordersList.innerHTML = '<p style="color: #999; text-align: center;">No orders yet. Submit your first order above!</p>';
            return;
        }

        ordersList.innerHTML = this.orders.map(order => this.createOrderCard(order)).join('');
    }

    createOrderCard(order) {
        const date = new Date(order.timestamp);
        const formattedDate = date.toLocaleString();

        return `
            <div class="order-card">
                <div class="order-id">Order ID: ${order.id}</div>
                <h3>${order.customerName}</h3>
                <p><strong>Email:</strong> ${order.email}</p>
                <p><strong>Product:</strong> ${order.product}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
                <p class="order-time">Submitted: ${formattedDate}</p>
            </div>
        `;
    }

    showSuccessMessage(message) {
        const existingMessage = document.querySelector('.success-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.textContent = message;

        const form = document.querySelector('.order-form');
        form.insertBefore(messageDiv, form.querySelector('h2').nextSibling);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OrderManager();
});
