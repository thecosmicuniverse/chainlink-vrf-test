import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  CustomTransport,
  PublicClient,
  WalletClient,
  webSocket,
  WebSocketTransport
} from "viem";
import { avalancheFuji } from "viem/chains";
import { JsonRpcAccount } from "viem/accounts";
import "./style.css";

const CONTRACT_ADDRESS = "0xDF2F72B1C3077EfB4F829a9dd5937A92263f6AFA";
const abi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: false, internalType: "uint256", name: "requestId", type: "uint256" }
    ],
    name: "RandomNumberRequested",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "randomNumber", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "blockNumber", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "RandomnessFulfilled",
    type: "event"
  },
  {
    inputs: [],
    name: "requestRandomNumber",
    outputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

let client: PublicClient<WebSocketTransport, typeof avalancheFuji>;
let walletClient: WalletClient<CustomTransport, typeof avalancheFuji, JsonRpcAccount>;

let timer: number;
let requests: {
  from: Address;
  requestId: bigint,
  randomNumber: bigint,
  times: { start: number, requested: number, completed: number, total: number }
}[] = [];
let requestIndex: number = 0;

// Connect to MetaMask
async function connect() {
  walletClient = createWalletClient({
    chain: avalancheFuji,
    transport: custom((window as any).ethereum),
  });

  client = createPublicClient({
    chain: avalancheFuji,
    transport: webSocket("wss://api.avax-test.network/ext/bc/C/ws"),
  });
  await walletClient.switchChain({ id: avalancheFuji.id });

  console.log("Connected!");
}

// Request a random number from the contract
async function requestRandomNumber() {
  (document.getElementById("requestButton") as HTMLButtonElement).disabled = true;

  try {
    if (!walletClient) await connect();
    const [account] = await walletClient.getAddresses();
    const { request } = await client.simulateContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "requestRandomNumber",
      account,
    });

    const tx = await walletClient.writeContract(request);
    console.log("Transaction sent:", tx);

    timer = setInterval(updateTimer, 1);
    requestIndex = requests.push({
      from: account,
      requestId: 0n,
      randomNumber: 0n,
      times: { start: Date.now(), requested: 0, completed: 0, total: 0 }
    }) - 1;
    const row = (document.getElementById("history") as HTMLTableElement).insertRow();
    row.insertCell().textContent = (requestIndex + 1).toString();
    row.insertCell().textContent = "Pending...";
    const d = new Date(requests[requestIndex].times.start);
    row.insertCell().textContent = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
    row.insertCell().textContent = "0.000s";
    row.insertCell().textContent = "0.000s";
    row.insertCell().textContent = "0.000s";
  } catch (err) {
    console.error("Transaction failed", err);
    (document.getElementById("requestButton") as HTMLButtonElement).disabled = false;
  }
}

// Update the timer
function updateTimer() {
  const row = (document.getElementById("history") as HTMLTableElement).rows[requestIndex + 1];
  if (!row) return;
  requests[requestIndex].times.total = (Date.now() - requests[requestIndex].times.start) / 1000;
  row.cells[5].textContent = requests[requestIndex].times.total.toFixed(3) + "s";
  if (requests[requestIndex].requestId === 0n) {
    requests[requestIndex].times.requested = requests[requestIndex].times.total;
    row.cells[3].textContent = requests[requestIndex].times.requested.toFixed(3) + "s";
  } else {
    requests[requestIndex].times.completed = requests[requestIndex].times.total - requests[requestIndex].times.requested;
    row.cells[4].textContent = requests[requestIndex].times.completed.toFixed(3) + "s";
  }
}

// Listen for the RandomnessFulfilled event
async function listenForRandomness() {
  if (!client) await connect();

  client.watchEvent({
    address: CONTRACT_ADDRESS,
    event: abi[0],
    onLogs: (logs) => {
      logs.forEach(log => {
        if (log.eventName !== "RandomNumberRequested") return;
        console.log(`Request ID found: ${log.args.requestId}`);
        requests[requestIndex].requestId = log.args.requestId!;
        (document.getElementById("history") as HTMLTableElement).rows[requestIndex + 1].cells[1].textContent = `${requests[requestIndex].requestId.toString().slice(0, 4)}...${requests[requestIndex].requestId.toString().slice(-4)}`;
      });
    }
  });
  client.watchEvent({
    address: CONTRACT_ADDRESS,
    event: abi[1],
    onLogs: (logs) => {
      logs.forEach(log => {
        if (log.eventName !== "RandomnessFulfilled") return;
        console.log(`Random number received: ${log.args.randomNumber}`);
        clearInterval(timer);
        requests[requestIndex].randomNumber = log.args.randomNumber!;
        updateTimer();
        (document.getElementById("requestButton") as HTMLButtonElement).disabled = false;
      });
    },
  });
}

document.getElementById("requestButton")!.addEventListener("click", requestRandomNumber);
listenForRandomness();