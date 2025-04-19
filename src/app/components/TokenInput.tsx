'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useChainId, useBalance, useWalletClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { LiquidityProvider } from './LiquidityProvider'

interface TokenInputProps {
  onSwapSuccess: (txHash: string, from: string, to: string, value: string) => void
}

interface Token {
  address: string
  symbol: string
  decimals: number
}

const TOKENS: Record<number, Token[]> = {
  10143: [ // Monad Testnet
    {
      address: '0x0000000000000000000000000000000000000000', // MON (네이티브 토큰)
      symbol: 'MON',
      decimals: 18
    },
    {
      address: '0x8d56e0D81d0FE0b94100B11947b1779a8485ec46', // GC3 토큰 주소
      symbol: 'GC3',
      decimals: 18
    }
  ]
}

// Uniswap V3 Router ABI
const UNISWAP_ROUTER_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'recipient', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  }
]

// Uniswap V3 Router 주소 (모나드 테스트넷)
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'

export function TokenInput({ onSwapSuccess }: TokenInputProps) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [fromToken, setFromToken] = useState(0) // 0: MON, 1: GC3
  const [toToken, setToToken] = useState(1) // 0: MON, 1: GC3
  const [amount, setAmount] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState('')
  const [showLiquidity, setShowLiquidity] = useState(false)

  const { data: monBalance } = useBalance({
    address,
    chainId
  })

  const { data: gc3Balance } = useBalance({
    address,
    token: TOKENS[chainId]?.[1].address as `0x${string}`,
    chainId
  })

  const handleSwap = async () => {
    if (!address || !amount || !walletClient) return

    try {
      setError('')
      setIsSwapping(true)

      // 잔액 확인
      if (fromToken === 0 && monBalance && parseEther(amount) > monBalance.value) {
        setError('MON 잔액이 부족합니다')
        return
      }

      if (fromToken === 1 && gc3Balance && parseEther(amount) > gc3Balance.value) {
        setError('GC3 잔액이 부족합니다')
        return
      }

      // 스왑 실행
      await walletClient.writeContract({
        address: UNISWAP_ROUTER as `0x${string}`,
        abi: UNISWAP_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [
          TOKENS[chainId]?.[fromToken].address,
          TOKENS[chainId]?.[toToken].address,
          3000, // 0.3% fee tier
          address,
          BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // 20분 후 만료
          parseEther(amount),
          0, // 최소 출력량 (0으로 설정하여 모든 금액 허용)
          0 // 가격 제한 없음
        ],
        value: fromToken === 0 ? parseEther(amount) : undefined
      })

    } catch (error) {
      console.error('스왑 에러:', error)
      setError('스왑 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setIsSwapping(false)
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-700/50 p-4 rounded-xl"
      >
        <h3 className="text-lg font-semibold mb-4">토큰 스왑</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <div className="flex space-x-2">
              <select
                value={fromToken}
                onChange={(e) => setFromToken(Number(e.target.value))}
                className="bg-gray-600 rounded-lg p-2"
              >
                <option value={0}>MON</option>
                <option value={1}>GC3</option>
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-gray-600 rounded-lg p-2"
                placeholder="0.0"
                min="0"
                step="0.0001"
              />
            </div>
            {fromToken === 0 && monBalance && (
              <p className="text-sm text-gray-400 mt-1">
                잔액: {formatEther(monBalance.value)} MON
              </p>
            )}
            {fromToken === 1 && gc3Balance && (
              <p className="text-sm text-gray-400 mt-1">
                잔액: {formatEther(gc3Balance.value)} GC3
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <div className="flex space-x-2">
              <select
                value={toToken}
                onChange={(e) => setToToken(Number(e.target.value))}
                className="bg-gray-600 rounded-lg p-2"
              >
                <option value={0}>MON</option>
                <option value={1}>GC3</option>
              </select>
              <input
                type="text"
                value="0.0"
                readOnly
                className="flex-1 bg-gray-600 rounded-lg p-2"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleSwap}
            disabled={isSwapping || !amount || !walletClient}
            className={`w-full py-2 px-4 rounded-lg font-semibold ${
              isSwapping || !amount || !walletClient
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isSwapping ? '스왑 중...' : '스왑하기'}
          </button>

          <button
            onClick={() => setShowLiquidity(!showLiquidity)}
            className="w-full py-2 px-4 rounded-lg font-semibold bg-gray-500 hover:bg-gray-600"
          >
            {showLiquidity ? '유동성 공급 숨기기' : '유동성 공급하기'}
          </button>
        </div>
      </motion.div>

      {showLiquidity && <LiquidityProvider />}
    </div>
  )
} 