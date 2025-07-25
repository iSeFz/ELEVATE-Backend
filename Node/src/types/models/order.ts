import { Address, TimestampUnion } from './common.js';

export interface Payment {
    method: string;
    credentials: string;
}

export interface BreakDownFee {
    brandId: string;
    brandName: string;
    distance: number;
    nearestBranch: Address;
    fee: number;
}

export interface Shipment {
    createdAt: TimestampUnion;
    deliveredAt?: TimestampUnion;
    totalFees: number;
    breakdown: BreakDownFee[];
    estimatedDeliveryDays: number;
    method: string;
    trackingNumber: string;
    carrier: string;
}

export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    REFUND_REQUESTED = 'refund_requested',
    REFUNDED = 'refunded'
}

export enum REFUND_STATUS {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export interface OrderProduct {
    variantId: string; // Selected variant of the product in the order
    productId: string; // ID of the product in the order
    quantity: number;  // Quantity of the product in the order
    // Denormalized data to avoid extra queries
    brandId: string; // Brand ID for quick access
    brandName: string; // Brand name for quick display
    productName: string;  // Product name for quick display
    size: string;        // Variant size
    colors: string[];     // Variant Colors
    price: number;       // Variant Price at time of order (after discounts)
    imageURL?: string;   // Variant Product image for order display
    // Data for refunding
    refundStatus?: REFUND_STATUS; // Status of the refund process
}

export interface Order {
    id?: string;
    customerId: string;

    address: Address;
    payment: Payment;
    phoneNumber: string;
    pointsRedeemed: number;
    pointsEarned: number;
    price: number;
    status: OrderStatus;
    shipment: Shipment;
    products: OrderProduct[];
    brandIds: string[]; // List of brand IDs associated with the order

    createdAt: TimestampUnion;
    updatedAt: TimestampUnion;
}

export interface ShippingRate {
    minDistance: number;
    maxDistance: number;
    fee: number;
}

export interface WeightSurcharge {
    minWeight: number;
    maxWeight: number;
    surcharge: number;
}

export interface DistanceRange {
    range: string;
    fee: number;
}

export interface OrderCostBreakdown {
    subtotal: number;
    shippingFee: number;
    total: number;
    distanceRange: string;
}
