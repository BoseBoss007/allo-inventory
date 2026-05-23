export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface WarehouseStock {
  inventoryId: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: string | number;
  sku: string;
  warehouses: WarehouseStock[];
}

export interface ReservationInventory {
  id: string;
  productId: string;
  warehouseId: string;
  totalUnits: number;
  product: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    price: string | number;
    sku: string;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

export interface Reservation {
  id: string;
  inventoryId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  inventory: ReservationInventory;
}
