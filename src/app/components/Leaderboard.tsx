'use client'

import { motion } from 'framer-motion'

interface LeaderboardProps {
  data: { address: string; score: number }[]
}

export function Leaderboard({ data }: LeaderboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-700/50 p-4 rounded-xl"
    >
      <h3 className="text-lg font-semibold mb-4">리더보드</h3>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((item, index) => (
            <motion.div
              key={item.address}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex justify-between items-center p-2 bg-gray-600/50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold">{index + 1}위</span>
                <span className="text-sm">
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </span>
              </div>
              <span className="font-semibold">{item.score.toFixed(4)} ETH</span>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-gray-400">아직 기록이 없습니다</p>
        )}
      </div>
    </motion.div>
  )
} 