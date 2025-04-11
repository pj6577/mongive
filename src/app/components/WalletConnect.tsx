'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

export function WalletConnect() {
  const { address, isConnected } = useAccount()

  return (
    <div className="space-y-2">
      <ConnectButton />
      {isConnected && (
        <p className="text-sm text-gray-600">
          Connected to: {address}
        </p>
      )}
    </div>
  )
} 