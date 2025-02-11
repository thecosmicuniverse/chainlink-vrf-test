import { AppKitNetwork, avalancheFuji as avalancheFujiBase } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { PropsWithChildren } from "react";
import { createConfig, WagmiProvider, webSocket } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const avalancheFuji = {
  ...avalancheFujiBase,
  rpcUrls: {
    default: {
      ...avalancheFujiBase.rpcUrls.default,
      websocket: ["wss://api.avax-test.network/ext/bc/C/ws"]
    }
  }
} as const;

export const websocketConfig = createConfig({
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: webSocket(avalancheFuji.rpcUrls.default.websocket[0])
  }
});
const queryClient = new QueryClient();

const projectId = "f265bad97163c730c1852b16ba010e9a";

const metadata = {
  name: "Chainlink VRF Timer",
  description: "Test Chainlink VRF Response Times",
  url: "https://chainlink-vrf-test.cajun.tools",
  icons: ["https://chainlink-vrf-test.cajun.tools/chainlink-link-logo.svg"]
};

const networks = [avalancheFuji] as const satisfies AppKitNetwork[];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
});

export const AppKitProvider = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};