import { networkInterfaces as NetworkInterfaces } from "os";

export function getLocalIp() {
  const networkInterfaces = NetworkInterfaces();
  let localIp = "";

  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const address of networkInterface) {
      if (address.family === "IPv4" && !address.internal) {
        localIp = address.address;
        break;
      }
    }
  }

  return localIp;
}
