import { ActionGetResponse, ActionPostResponse } from "@solana/actions";
import { serialize } from "wagmi";
import { parseEther } from "viem";

// CAIP-2 format for Monad
const blockchain = `eip155:10143`;

// Wallet address that will receive the donations
const donationWallet = `0x8Cce96679B7Ac1a58de0156861AAeb7eaA1Cf33e`; // 실제 수신 주소로 변경 필요

// Create headers with CAIP blockchain ID
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-blockchain-ids, x-action-version",
  "Content-Type": "application/json",
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.0",
};

// OPTIONS endpoint is required for CORS preflight requests
export const OPTIONS = async () => {
  return new Response(null, { headers });
};

// GET endpoint returns the Blink metadata (JSON) and UI configuration
export const GET = async (req: Request) => {
  const response: ActionGetResponse = {
    type: "action",
    icon: `${new URL("/donate-mon.png", req.url).toString()}`,
    label: "1 MON",
    title: "Donate MON",
    description:
      "Monad 테스트넷에서 MON 토큰을 기부할 수 있습니다. 다양한 금액 옵션 중에서 선택하거나 직접 금액을 입력할 수 있습니다.",
    links: {
      actions: [
        {
          type: "transaction",
          label: "0.01 MON",
          href: `/api/actions/donate-mon?amount=0.01`,
        },
        {
          type: "transaction",
          label: "0.05 MON",
          href: `/api/actions/donate-mon?amount=0.05`,
        },
        {
          type: "transaction",
          label: "0.1 MON",
          href: `/api/actions/donate-mon?amount=0.1`,
        },
        {
          type: "transaction",
          href: `/api/actions/donate-mon?amount={amount}`,
          label: "Donate",
          parameters: [
            {
              name: "amount",
              label: "기부 금액을 입력하세요 (MON)",
              type: "number",
            },
          ],
        },
      ],
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers,
  });
};

// POST endpoint handles the actual transaction creation
export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const amount = url.searchParams.get("amount");

    if (!amount) {
      throw new Error("Amount is required");
    }

    const transaction = {
      to: donationWallet,
      value: parseEther(amount).toString(),
      chainId: 10143,
    };

    const transactionJson = serialize(transaction);

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: transactionJson,
      message: "MON Donate",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
}; 