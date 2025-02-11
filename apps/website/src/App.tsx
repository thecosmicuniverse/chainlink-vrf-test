import githubLogo from "./assets/github-logo.svg";
import "./App.css";
import { useAccount, useBalance, useClient, useSimulateContract, useWatchContractEvent, useWriteContract } from "wagmi";
import { abi, address } from "./assets/contract.ts";
import { avalancheFuji } from "viem/chains";
import { useEffect, useRef, useState } from "react";
import { TimerRequest } from "./types.ts";
import { parseEther } from "viem";
import { websocketConfig } from "./wagmi.tsx";
import { formatAddress, formatDateString, getRecentEvents } from "./utils.ts";
import { useQuery } from "@tanstack/react-query";

function App() {
  const [requests, setRequests] = useState<Record<string, TimerRequest>>({});
  const timeDivs = useRef<Array<HTMLTableCellElement | null>>([]);
  const { address: account } = useAccount();
  const client = useClient({ chainId: avalancheFuji.id });

  const { data: balance = { value: 0n } } = useBalance({
    address: account,
    chainId: avalancheFuji.id,
    query: {
      enabled: !!account,
      placeholderData: { value: 0n, decimals: 18, symbol: "AVAX", formatted: "0" }
    }
  });
  useWatchContractEvent({
    address,
    abi,
    eventName: "RandomNumberRequested",
    config: websocketConfig,
    onLogs(logs) {
      logs.forEach(log => {
        console.log(`Request ID found: ${log.args.requestId}`);
        setRequests({
          ...requests,
          [log.transactionHash]: { ...requests[log.transactionHash], requestId: log.args.requestId! }
        });
      });
    },
  });

  useWatchContractEvent({
    address,
    abi,
    eventName: "RandomnessFulfilled",
    config: websocketConfig,
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log(`Random number received: ${log.args.randomNumber}`);
        const request = Object.values(requests).find(r => r.requestId === log.args.requestId);
        if (!request) return;
        setRequests({
          ...requests,
          [request.txHash]: {
            ...requests[request.txHash],
            randomNumber: log.args.randomNumber!,
            endTime: Date.now()
          }
        });
      });
    },
  });

  const { isError, error } = useSimulateContract({
    abi,
    address,
    functionName: "requestRandomNumber",
    chainId: avalancheFuji.id,
    query: {
      enabled: !!client,
      refetchInterval: 1000
    },
  });

  const { writeContractAsync, isError: isWriteError, error: writeError } = useWriteContract({
    mutation: {
      onSuccess: (txHash) => {
        console.log("Transaction sent:", txHash);
        setRequests({
          ...requests,
          [txHash]: {
            txHash: txHash,
            from: account!,
            requestId: 0n,
            randomNumber: 0n,
            startTime: Date.now(),
            endTime: 0
          }
        });
      },
    }
  });

  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: () => getRecentEvents(),
    staleTime: 1000 * 60 * 60,
    placeholderData: {} as Record<string, TimerRequest>,
  });

  useEffect(() => {
    timeDivs.current = timeDivs.current.slice(0, Object.keys(requests).length);
  }, [requests]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      Object.values(requests)
        .map((r, i) => {
          if (r.endTime === 0) {
            requestAnimationFrame(() => {
              if (timeDivs.current[i] === null) return;
              timeDivs.current[i].textContent = ((Date.now() - r.startTime) / 1000).toFixed(3) + "s";
            });
          }
        });

    }, 100);
    return () => clearInterval(intervalId);
  }, [Object.values(requests), timeDivs]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 flex w-full pt-2 px-4 justify-center sm:justify-end">
        {/* @ts-expect-error msg */}
        <appkit-button />
      </div>

      <h1>Chainlink VRF Timer</h1>
      <p className="flex gap-1">
        Contract:
        <a
          className="hidden md:block"
          href="https://testnet.snowscan.xyz/address/0xDF2F72B1C3077EfB4F829a9dd5937A92263f6AFA#code"
          target="_blank"
        >
          0xDF2F72B1C3077EfB4F829a9dd5937A92263f6AFA
        </a>
        <a
          className="md:hidden"
          href="https://testnet.snowscan.xyz/address/0xDF2F72B1C3077EfB4F829a9dd5937A92263f6AFA#code"
          target="_blank"
        >
          0xDF2F...6AFA
        </a>
      </p>
      <button
        onClick={() => writeContractAsync({
          address,
          abi,
          functionName: "requestRandomNumber",
          chain: avalancheFuji
        })}
        disabled={isError || balance.value < parseEther("0.01")}
      >
        Request Random Number
      </button>
      {(isError || isWriteError) ? (
        <p className="bg-red-600">{isError ? error.message : isWriteError ? writeError.message : ""}</p>
      ) : null}
      <table id="history">
        <thead>
          <tr>
            <th className="max-[450px]:hidden">Txn</th>
            <th className="max-[580px]:hidden">From</th>
            <th className="max-[700px]:hidden">Request ID</th>
            <th>Start Time</th>
            <th>Finish Time</th>
            <th>Elapsed</th>
          </tr>
        </thead>
        <tbody>
          {Object.values({ ...history, ...requests })
            .sort((a, b) => b.startTime - a.startTime)
            .map(({ txHash, from, requestId, startTime, endTime }, i) => (
              <tr key={txHash}>
                <td className="max-[450px]:hidden">{txHash ? txHash.slice(-8) : ""}</td>
                <td className="max-[580px]:hidden">{formatAddress(from)}</td>
                <td className="max-[700px]:hidden">{requestId > 0n ? formatAddress(requestId) : "Pending..."}</td>
                <td>{formatDateString(startTime)}</td>
                <td>{endTime > 0 ? formatDateString(endTime) : ""}</td>
                <td
                  ref={el => {
                    timeDivs.current[i] = el;
                  }}
                >
                  {((endTime - startTime) / 1000).toFixed(3)}s
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <a href="https://github.com/thecosmicuniverse/chainlink-vrf-test" target="_blank">
        <div className="absolute left-0 bottom-0 h-20 w-20 flex items-end bg-gradient-to-tr from-white from-0% via-white via-50% to-transparent to-50%">
          <img src={githubLogo} alt="github logo" className="w-10 h-10 pb-2 pl-2" />
        </div>
      </a>
    </>
  );
}

export default App;
