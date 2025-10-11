import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

export interface KitchenDisplaySocket {
  displayId: string;
  tenantId: string;
  userId?: string;
  connected: boolean;
  lastSeen: Date;
}

/**
 * WebSocket service for real-time kitchen display updates
 */
export class WebSocketService {
  private static io: SocketIOServer;
  private static connectedDisplays: Map<string, KitchenDisplaySocket> = new Map();

  /**
   * Initialize WebSocket server
   */
  static initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/socket.io'
    });

    this.setupSocketHandlers();
    console.log('🔌 WebSocket server initialized for Kitchen Display System');
  }

  /**
   * Set up socket event handlers
   */
  private static setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('🔌 New socket connection:', socket.id);

      // Handle kitchen display connection
      socket.on('join-display', async (data: { displayId: string; tenantId: string; token?: string }) => {
        try {
          // Verify authentication if token provided
          let userId: string | undefined;
          if (data.token) {
            const decoded = jwt.verify(data.token, process.env.NEXTAUTH_SECRET || 'secret') as any;
            userId = decoded.userId;
          }

          const displaySocket: KitchenDisplaySocket = {
            displayId: data.displayId,
            tenantId: data.tenantId,
            userId,
            connected: true,
            lastSeen: new Date()
          };

          // Store connection
          this.connectedDisplays.set(socket.id, displaySocket);

          // Join display room
          const roomName = `display-${data.displayId}`;
          await socket.join(roomName);

          console.log(`🖥️ Display ${data.displayId} connected to room ${roomName}`);

          // Send connection confirmation
          socket.emit('display-connected', {
            success: true,
            displayId: data.displayId,
            message: 'Connected to kitchen display'
          });

          // Send initial data
          this.sendDisplayUpdate(data.displayId, data.tenantId);

        } catch (error) {
          console.error('❌ Error joining display:', error);
          socket.emit('display-error', {
            error: 'Failed to join display',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle order status updates
      socket.on('update-order-status', async (data: {
        displayOrderId: string;
        tenantId: string;
        newStatus: 'new' | 'preparing' | 'ready' | 'completed';
        userId?: string;
      }) => {
        try {
          const displaySocket = this.connectedDisplays.get(socket.id);
          if (!displaySocket || displaySocket.tenantId !== data.tenantId) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          // Import here to avoid circular dependency
          const { KitchenDisplayService } = await import('./kitchen-display-service');
          
          await KitchenDisplayService.updateOrderStatus(
            data.displayOrderId,
            data.tenantId,
            data.newStatus,
            data.userId || displaySocket.userId
          );

          // Broadcast update to all displays for this tenant
          this.broadcastToTenant(data.tenantId, 'order-status-updated', {
            displayOrderId: data.displayOrderId,
            newStatus: data.newStatus,
            updatedAt: new Date()
          });

          console.log(`✅ Order status updated: ${data.displayOrderId} -> ${data.newStatus}`);

        } catch (error) {
          console.error('❌ Error updating order status:', error);
          socket.emit('error', {
            message: 'Failed to update order status',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle heartbeat/ping
      socket.on('ping', () => {
        const displaySocket = this.connectedDisplays.get(socket.id);
        if (displaySocket) {
          displaySocket.lastSeen = new Date();
          socket.emit('pong');
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const displaySocket = this.connectedDisplays.get(socket.id);
        if (displaySocket) {
          console.log(`🖥️ Display ${displaySocket.displayId} disconnected`);
          this.connectedDisplays.delete(socket.id);
        }
      });

      // Handle errors
      socket.on('error', (error: any) => {
        console.error('🔌 Socket error:', error);
      });
    });

    // Clean up stale connections every 5 minutes
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  /**
   * Send new order to kitchen displays
   */
  static async sendNewOrder(tenantId: string, order: any): Promise<void> {
    try {
      console.log('📤 Broadcasting new order to displays:', order.orderNumber);

      // Broadcast to all displays for this tenant
      this.broadcastToTenant(tenantId, 'new-order', {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          orderType: order.orderType,
          totalAmount: order.totalAmount,
          items: order.items,
          specialInstructions: order.specialInstructions,
          createdAt: order.createdAt
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error broadcasting new order:', error);
    }
  }

  /**
   * Send display update with current orders
   */
  static async sendDisplayUpdate(displayId: string, tenantId: string): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { KitchenDisplayService } = await import('./kitchen-display-service');
      
      const orders = await KitchenDisplayService.getDisplayOrders(displayId, tenantId);
      
      this.io.to(`display-${displayId}`).emit('display-update', {
        orders,
        timestamp: new Date()
      });

      console.log(`📊 Sent display update to display-${displayId}: ${orders.length} orders`);

    } catch (error) {
      console.error('❌ Error sending display update:', error);
    }
  }

  /**
   * Broadcast message to all displays for a tenant
   */
  static broadcastToTenant(tenantId: string, event: string, data: any): void {
    try {
      // Find all connected displays for this tenant
      const tenantDisplays = Array.from(this.connectedDisplays.values())
        .filter(display => display.tenantId === tenantId);

      tenantDisplays.forEach(display => {
        this.io.to(`display-${display.displayId}`).emit(event, data);
      });

      console.log(`📡 Broadcasted ${event} to ${tenantDisplays.length} displays for tenant ${tenantId}`);

    } catch (error) {
      console.error('❌ Error broadcasting to tenant:', error);
    }
  }

  /**
   * Send notification to specific display
   */
  static sendToDisplay(displayId: string, event: string, data: any): void {
    try {
      this.io.to(`display-${displayId}`).emit(event, data);
      console.log(`📨 Sent ${event} to display-${displayId}`);
    } catch (error) {
      console.error('❌ Error sending to display:', error);
    }
  }

  /**
   * Get connected displays for a tenant
   */
  static getConnectedDisplays(tenantId: string): KitchenDisplaySocket[] {
    return Array.from(this.connectedDisplays.values())
      .filter(display => display.tenantId === tenantId);
  }

  /**
   * Check if display is connected
   */
  static isDisplayConnected(displayId: string): boolean {
    return Array.from(this.connectedDisplays.values())
      .some(display => display.displayId === displayId && display.connected);
  }

  /**
   * Clean up stale connections
   */
  private static cleanupStaleConnections(): void {
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    const now = new Date();

    for (const [socketId, display] of this.connectedDisplays.entries()) {
      if (now.getTime() - display.lastSeen.getTime() > staleThreshold) {
        console.log(`🧹 Cleaning up stale connection: display-${display.displayId}`);
        this.connectedDisplays.delete(socketId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  static getConnectionStats(): {
    totalConnections: number;
    displaysByTenant: { [tenantId: string]: number };
    averageUptime: number;
  } {
    const displays = Array.from(this.connectedDisplays.values());
    const displaysByTenant: { [tenantId: string]: number } = {};

    displays.forEach(display => {
      displaysByTenant[display.tenantId] = (displaysByTenant[display.tenantId] || 0) + 1;
    });

    return {
      totalConnections: displays.length,
      displaysByTenant,
      averageUptime: 0 // Could be calculated based on connection time
    };
  }
}
