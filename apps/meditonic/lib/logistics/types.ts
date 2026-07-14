export interface ServiceabilityInput {
  pickupPincode: string;
  deliveryPincode: string;
  weightGrams: number;
  isCod: boolean;
}

export interface ServiceabilityOutput {
  isServiceable: boolean;
  codAvailable: boolean;
  estimatedDays: number;
  shippingCharge: number;
  carrierName?: string;
}

export interface ShipmentInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{ name: string; sku: string; price: number; quantity: number; weightGrams: number; hsn?: string }>;
  isCod: boolean;
  codAmount: number;
  pickupLocationName: string;
  totalWeightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShipmentOutput {
  providerOrderId: string;
  providerShipmentId: string;
  awbCode: string;
  courierName: string;
  labelUrl?: string;
  invoiceUrl?: string;
  estimatedDeliveryDate?: Date;
  status: 'PENDING' | 'MANIFESTED' | 'FAILED';
  rawResponse?: any;
}
