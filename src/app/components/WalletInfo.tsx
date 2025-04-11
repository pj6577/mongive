'use client'

import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'

export function WalletInfo() {
  const { address, chain } = useAccount()
  const { data: balance } = useBalance({
    address: address as `0x${string}`,
  })

  if (!address) return null

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
      <h3 className="text-xl font-semibold mb-4">지갑 정보</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">주소</span>
          <span className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">잔액</span>
          <span className="font-mono">
            {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0'} {balance?.symbol}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">네트워크</span>
          <span className="font-mono">{chain?.name}</span>
        </div>
      </div>
    </div>
  )
} 