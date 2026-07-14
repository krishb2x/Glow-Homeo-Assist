import { ShiprocketProvider } from "./shiprocket";
import { LogisticsProvider } from "./provider";

export * from "./types";
export * from "./provider";
export * from "./shiprocket";

export function getLogisticsProvider(providerName: string = "shiprocket"): LogisticsProvider {
  if (providerName.toLowerCase() === "shiprocket") {
    return new ShiprocketProvider();
  }
  throw new Error(`Unsupported logistics provider: ${providerName}`);
}
