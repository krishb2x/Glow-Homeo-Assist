import { ServiceabilityInput, ServiceabilityOutput, ShipmentInput, ShipmentOutput } from "./types";

export interface LogisticsProvider {
  name: string;
  checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityOutput>;
  createShipment(input: ShipmentInput): Promise<ShipmentOutput>;
  cancelShipment(providerOrderId: string): Promise<boolean>;
  generateLabel(providerShipmentId: string): Promise<string>;
}
