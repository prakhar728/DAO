// File: app/api/contracts/abi/route.ts
import { NextRequest, NextResponse } from "next/server";

type NetworkConfig = {
  apiUrl: string;
  apiKey: string | undefined;
};

type NetworkConfigs = {
  [key: string]: NetworkConfig;
};

type ExplorerResponse = {
  status: string;
  message: string;
  result: string;
  contractName?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Get query parameters
  const url = new URL(request.url);
  const network = url.searchParams.get("network");
  const address = url.searchParams.get("address");

  // Validate inputs
  if (!address) {
    return NextResponse.json(
      { message: "Contract address is required" },
      { status: 400 }
    );
  }

  if (!network) {
    return NextResponse.json(
      { message: "Network is required" },
      { status: 400 }
    );
  }

  try {
    // Get network-specific API configuration
    const networkConfig = getNetworkConfig(network);

    if (!networkConfig) {
      return NextResponse.json(
        { message: `Unsupported network: ${network}` },
        { status: 400 }
      );
    }

    // Build the API URL
    const apiUrl = new URL(networkConfig.apiUrl);
    apiUrl.searchParams.append("module", "contract");
    apiUrl.searchParams.append("action", "getabi");
    apiUrl.searchParams.append("address", address);

    if (networkConfig.apiKey) {
      apiUrl.searchParams.append("apikey", networkConfig.apiKey);
    }

    console.log(apiUrl.toString());

    // Make the request to the blockchain explorer API
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ExplorerResponse;

    // Handle API-specific error responses
    if (data.status === "0" || data.message === "NOTOK") {
      return NextResponse.json(
        { message: data.result || "Failed to fetch contract ABI" },
        { status: 400 }
      );
    }

    // Parse the ABI string into a JSON object
    let parsedAbi: any[];
    try {
      parsedAbi = JSON.parse(data.result);
    } catch (parseError) {
      return NextResponse.json(
        { message: "Invalid ABI format returned from API" },
        { status: 500 }
      );
    }

    // Return the parsed ABI to the client
    return NextResponse.json({
      abi: parsedAbi,
      name: data.contractName || "Unknown Contract",
      network: network,
    });
  } catch (error) {
    console.error("Error fetching contract ABI:", error);
    return NextResponse.json(
      { message: "Failed to fetch contract ABI: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to get network-specific configuration
function getNetworkConfig(network: string): NetworkConfig | undefined {
  const configs: NetworkConfigs = {
    arbitrum: {
      apiUrl: "https://api.arbiscan.io/api",
      apiKey: process.env.ARBISCAN_API_KEY,
    },
    mainnet: {
      apiUrl: "https://api.etherscan.io/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
    sepolia: {
      apiUrl: "https://api-sepolia.etherscan.io/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
    goerli: {
      apiUrl: "https://api-goerli.etherscan.io/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
    polygon: {
      apiUrl: "https://api.polygonscan.com/api",
      apiKey: process.env.POLYGONSCAN_API_KEY,
    },
    optimism: {
      apiUrl: "https://api-optimistic.etherscan.io/api",
      apiKey: process.env.OPTIMISM_SCAN_API_KEY,
    },
    "arbitrum-sepolia": {
      apiUrl: "https://api-sepolia.arbiscan.io/api",
      apiKey: process.env.ARBISCAN_API_KEY,
    },
  };

  return configs[network.toLowerCase()];
}
