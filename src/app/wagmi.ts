'use client'

import { http, createConfig } from 'wagmi'
import { monadTestnet , sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [monadTestnet, sepolia],
  transports: {
    [monadTestnet.id]: http(),
    [sepolia.id]: http(),
  },
}) 