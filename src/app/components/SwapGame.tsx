'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { TokenInput } from './TokenInput'
import { Leaderboard } from './Leaderboard'

interface SwapRecord {
  hash: string
  from: string
  to: string
  value: string
  bonus: string
  multiplier: number
  timestamp: number
}

export default function SwapGame() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [swapCount, setSwapCount] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [showBonus, setShowBonus] = useState(false)
  const [bonusAmount, setBonusAmount] = useState('0')
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<{address: string, score: number}[]>([])

  // 스왑 성공 시 호출되는 함수
  const handleSwapSuccess = async (txHash: string, from: string, to: string, value: string) => {
    // 랜덤 보너스 계산 (0.001 ~ 0.01 ETH)
    const bonus = (Math.random() * 0.009 + 0.001).toFixed(4)
    const multiplier = Math.min(5, currentMultiplier + 0.1) // 최대 5배까지 증가
    
    // 새로운 스왑 기록 추가
    const newRecord: SwapRecord = {
      hash: txHash,
      from,
      to,
      value,
      bonus,
      multiplier,
      timestamp: Date.now()
    }

    setSwapHistory(prev => [newRecord, ...prev])
    setSwapCount(prev => prev + 1)
    setCurrentMultiplier(multiplier)
    setBonusAmount(bonus)
    setShowBonus(true)

    // 3초 후 보너스 표시 숨기기
    setTimeout(() => setShowBonus(false), 3000)

    // 리더보드 업데이트
    updateLeaderboard()
  }

  // 리더보드 업데이트
  const updateLeaderboard = async () => {
    try {
      const response = await fetch(`/api/leaderboard?networkId=${chainId}`)
      const data = await response.json()
      setLeaderboard(data)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  if (!address) {
    return (
      <div className="text-center p-4">
        <p>지갑을 연결해주세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 게임 상태 표시 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-700/50 p-4 rounded-xl"
      >
        <h3 className="text-lg font-semibold mb-4">스왑 게임</h3>
        <div className="space-y-2">
          <p>스왑 횟수: {swapCount}</p>
          <p>현재 보너스 배율: {currentMultiplier.toFixed(1)}x</p>
          <p>총 보너스: {swapHistory.reduce((sum, record) => sum + Number(record.bonus), 0).toFixed(4)} ETH</p>
        </div>
      </motion.div>

      {/* 스왑 인터페이스 */}
      <TokenInput onSwapSuccess={handleSwapSuccess} />

      {/* 보너스 애니메이션 */}
      <AnimatePresence>
        {showBonus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-yellow-500/80 text-black font-bold text-2xl p-4 rounded-lg">
              +{bonusAmount} ETH 보너스!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 리더보드 */}
      <Leaderboard data={leaderboard} />
    </div>
  )
} 