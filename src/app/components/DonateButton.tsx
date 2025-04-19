'use client'

import { useAccount, useSendTransaction } from 'wagmi'
import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { parseEther } from 'viem'
import ReactConfetti from 'react-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

const GOAL_AMOUNT = 1.0 // MON
const SPECIAL_EFFECTS = {
  '10': { pieces: 700, emoji: '🌟' },
  '5': { pieces: 500, emoji: '💝' },
  '1': { pieces: 300, emoji: '✨' },
}

export function DonateButton() {
  const { isConnected } = useAccount()
  const { sendTransaction, isPending, isSuccess, reset } = useSendTransaction()
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('0.1')
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [totalDonated, setTotalDonated] = useState(0)
  const [sparklePosition, setSparklePosition] = useState({ x: 0, y: 0 })
  const [showSparkle, setShowSparkle] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [displayAmount, setDisplayAmount] = useState('0.1')
  const [hasDonated, setHasDonated] = useState(false)

  useEffect(() => {
    if (isSuccess && hasDonated) {
      console.log('Transaction confirmed by user')
      setShowConfetti(true)
      setShowSuccess(true)
      setIsOpen(false)
      setTotalDonated(prev => prev + parseFloat(amount))
      setHasDonated(false)
      reset()
    }
  }, [isSuccess, amount, hasDonated, reset])

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSparklePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  if (!isConnected) return null

  const spinAnimation = async () => {
    setIsSpinning(true)
    const amounts = ['0.1', '1', '10']
    const spins = 10
    const delay = 100

    for (let i = 0; i < spins; i++) {
      const randomIndex = Math.floor(Math.random() * amounts.length)
      setDisplayAmount(amounts[randomIndex])
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    setDisplayAmount(amount)
    setIsSpinning(false)
  }

  const handleDonate = async () => {
    try {
      setError(null)
      setShowConfetti(false)
      setShowSuccess(false)
      setHasDonated(true)
      
      if (!isPending) {
        await spinAnimation()
      }

      const response = await fetch('/api/donate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '기부 처리 중 오류가 발생했습니다')
      }

      const { transaction } = await response.json()

      await sendTransaction({
        to: transaction.to,
        value: parseEther(amount),
        chainId: transaction.chainId,
      })
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
      setShowConfetti(false)
      setShowSuccess(false)
    }
  }

  const progress = (totalDonated / GOAL_AMOUNT) * 100
  const currentEffect = SPECIAL_EFFECTS[amount as keyof typeof SPECIAL_EFFECTS] || SPECIAL_EFFECTS['0.1']

  return (
    <>
      <div className="space-y-4">
        <div className="relative w-full max-w-sm">
          <div className="h-2 bg-gray-700 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-400">
            목표 금액까지: {GOAL_AMOUNT - totalDonated} MON
          </div>
        </div>

        <motion.button
          onClick={() => setIsOpen(true)}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setShowSparkle(true)}
          onMouseLeave={() => setShowSparkle(false)}
          className="relative px-6 py-3 text-lg font-semibold text-white rounded-lg 
            bg-gradient-to-r from-purple-600 to-pink-500 
            hover:from-purple-500 hover:to-pink-400
            shadow-lg hover:shadow-xl
            transition-all duration-300 ease-out
            overflow-hidden
            group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span>Donate</span>
            <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">
              💝
            </span>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/40 to-pink-500/40 
            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 -z-10 blur-xl bg-gradient-to-r from-purple-600/20 to-pink-500/20 
            group-hover:blur-2xl transition-all duration-300" />
          {showSparkle && (
            <motion.div
              className="pointer-events-none absolute z-20"
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                left: sparklePosition.x,
                top: sparklePosition.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              ✨
            </motion.div>
          )}
        </motion.button>
      </div>

      <Dialog
        open={isOpen}
        onClose={() => !isPending && setIsOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-gray-800 p-6">
            <Dialog.Title className="text-lg font-medium text-white mb-4">
              MON Donate
            </Dialog.Title>
            
            <div className="space-y-4">
              <div className="relative h-20 bg-gray-700 rounded-lg overflow-hidden">
                <motion.div
                  className="absolute inset-0 flex items-center justify-center text-4xl font-bold"
                  animate={{
                    y: isSpinning ? [0, -20, 0] : 0,
                    scale: isSpinning ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: isSpinning ? Infinity : 0,
                  }}
                >
                  <span className="text-white">{displayAmount} MON</span>
                </motion.div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Object.entries(SPECIAL_EFFECTS).map(([value, effect]) => (
                  <button
                    key={value}
                    onClick={() => setAmount(value)}
                    disabled={isPending}
                    className={`px-3 py-2 rounded ${
                      amount === value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {value} MON
                    <div className="text-sm">{effect.emoji}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Input Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  min="0.1"
                  max="10"
                  step="0.1"
                  disabled={isPending}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDonate}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                  disabled={isPending}
                >
                  {isPending ? '처리 중...' : 'Donate'}
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {typeof window !== 'undefined' && showConfetti && createPortal(
        <div className="fixed inset-0 w-full h-full flex items-center justify-center pointer-events-none z-[9999]">
          <ReactConfetti
            recycle={false}
            numberOfPieces={currentEffect.pieces}
            gravity={0.3}
            width={window.innerWidth}
            height={window.innerHeight}
          />
        </div>,
        document.body
      )}

      {typeof window !== 'undefined' && showSuccess && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 w-full h-full flex items-center justify-center z-[10000]">
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-8 rounded-xl shadow-2xl text-center max-w-md w-full mx-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-6xl mb-4"
              >
                {currentEffect.emoji}
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">기부 감사합니다!</h2>
              <p className="text-white/80 mb-4">
                {amount} MON이 성공적으로 전송되었습니다.
              </p>
              {progress >= 100 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-yellow-300 text-lg mb-4"
                >
                  🎉 목표 금액을 달성했습니다! 🎉
                </motion.div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSuccess(false)}
                className="px-6 py-2 bg-white text-purple-600 rounded-full font-semibold"
              >
                확인
              </motion.button>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
} 