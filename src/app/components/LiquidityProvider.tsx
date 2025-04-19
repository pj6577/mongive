'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useChainId, useBalance, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'

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

// Uniswap V3 Factory ABI
const UNISWAP_FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'sqrtPriceX96', type: 'uint160' }
    ],
    name: 'createPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

// Uniswap V3 Pool ABI
const UNISWAP_POOL_ABI = [
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'amount', type: 'uint128' },
      { name: 'data', type: 'bytes' }
    ],
    name: 'mint',
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

// ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

// Uniswap V3 Factory 주소 (모나드 테스트넷)
const UNISWAP_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984'

export function LiquidityProvider() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [monAmount, setMonAmount] = useState('')
  const [gc3Amount, setGc3Amount] = useState('')
  const [isProviding, setIsProviding] = useState(false)
  const [error, setError] = useState('')

  const { data: monBalance } = useBalance({
    address,
    chainId
  })

  const { data: gc3Balance } = useBalance({
    address,
    token: TOKENS[chainId]?.[1].address as `0x${string}`,
    chainId
  })

  const handleProvideLiquidity = async () => {
    if (!address || !monAmount || !gc3Amount || !walletClient || !publicClient) return

    try {
      setError('')
      setIsProviding(true)

      // 잔액 확인
      if (monBalance && parseEther(monAmount) > monBalance.value) {
        setError('MON 잔액이 부족합니다')
        return
      }

      if (gc3Balance && parseEther(gc3Amount) > gc3Balance.value) {
        setError('GC3 잔액이 부족합니다')
        return
      }

      const token0 = TOKENS[chainId]?.[0].address
      const token1 = TOKENS[chainId]?.[1].address
      const fee = 3000 // 0.3% fee tier

      console.log('Factory 주소:', UNISWAP_FACTORY)
      console.log('토큰0:', token0)
      console.log('토큰1:', token1)
      console.log('수수료:', fee)

      // 1. GC3 토큰 승인
      console.log('GC3 토큰 승인 시작')
      const approveTx = await walletClient.writeContract({
        address: token1 as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [
          UNISWAP_FACTORY as `0x${string}`,
          parseEther(gc3Amount)
        ]
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      console.log('GC3 토큰 승인 완료')

      // 2. 풀 존재 여부 확인
      console.log('풀 존재 여부 확인')
      const poolAddress = await publicClient.readContract({
        address: UNISWAP_FACTORY as `0x${string}`,
        abi: UNISWAP_FACTORY_ABI,
        functionName: 'getPool',
        args: [token0, token1, fee]
      })

      console.log('풀 주소:', poolAddress)

      let finalPoolAddress = poolAddress

      // 3. 풀이 없으면 생성
      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        console.log('새로운 풀 생성 시작')
        const createPoolTx = await walletClient.writeContract({
          address: UNISWAP_FACTORY as `0x${string}`,
          abi: UNISWAP_FACTORY_ABI,
          functionName: 'createPool',
          args: [
            token0,
            token1,
            fee,
            BigInt('79228162514264337593543950336') // 초기 가격 (1:1)
          ]
        })
        
        console.log('풀 생성 트랜잭션:', createPoolTx)
        
        // 트랜잭션 완료 대기
        await publicClient.waitForTransactionReceipt({ hash: createPoolTx })
        
        // 새로 생성된 풀 주소 가져오기
        finalPoolAddress = await publicClient.readContract({
          address: UNISWAP_FACTORY as `0x${string}`,
          abi: UNISWAP_FACTORY_ABI,
          functionName: 'getPool',
          args: [token0, token1, fee]
        })

        console.log('생성된 풀 주소:', finalPoolAddress)
      }

      // 4. 유동성 공급
      console.log('유동성 공급 시작')
      const mintTx = await walletClient.writeContract({
        address: finalPoolAddress as `0x${string}`,
        abi: UNISWAP_POOL_ABI,
        functionName: 'mint',
        args: [
          address,
          -887220, // tickLower
          887220,  // tickUpper
          parseEther(monAmount),
          '0x' // 추가 데이터 없음
        ],
        value: parseEther(monAmount)
      })

      await publicClient.waitForTransactionReceipt({ hash: mintTx })
      console.log('유동성 공급 완료')

    } catch (error) {
      console.error('유동성 공급 에러:', error)
      setError('유동성 공급 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setIsProviding(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-700/50 p-4 rounded-xl"
    >
      <h3 className="text-lg font-semibold mb-4">유동성 공급</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">MON 금액</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={monAmount}
              onChange={(e) => setMonAmount(e.target.value)}
              className="flex-1 bg-gray-600 rounded-lg p-2"
              placeholder="0.0"
              min="0"
              step="0.0001"
            />
          </div>
          {monBalance && (
            <p className="text-sm text-gray-400 mt-1">
              잔액: {formatEther(monBalance.value)} MON
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">GC3 금액</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={gc3Amount}
              onChange={(e) => setGc3Amount(e.target.value)}
              className="flex-1 bg-gray-600 rounded-lg p-2"
              placeholder="0.0"
              min="0"
              step="0.0001"
            />
          </div>
          {gc3Balance && (
            <p className="text-sm text-gray-400 mt-1">
              잔액: {formatEther(gc3Balance.value)} GC3
            </p>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          onClick={handleProvideLiquidity}
          disabled={isProviding || !monAmount || !gc3Amount || !walletClient || !publicClient}
          className={`w-full py-2 px-4 rounded-lg font-semibold ${
            isProviding || !monAmount || !gc3Amount || !walletClient || !publicClient
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProviding ? '유동성 공급 중...' : '유동성 공급하기'}
        </button>
      </div>
    </motion.div>
  )
} 