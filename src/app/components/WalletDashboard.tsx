'use client'

import { useAccount, useBlockNumber, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  status: 'success' | 'failed'
}

export default function WalletDashboard() {
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const chainId = useChainId()

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!address) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/transactions/${address}?networkId=${chainId}`)
        const data = await response.json()
        if (data.transactions) {
          setTransactions(data.transactions)
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [address, chainId])

  if (!address) {
    return (
      <div className="text-center p-4">
        <p>지갑을 연결해주세요</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6">지갑 활동 기록</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 트랜잭션 통계 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-700/50 p-4 rounded-xl"
        >
          <h3 className="text-lg font-semibold mb-2">트랜잭션 통계</h3>
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <p>총 트랜잭션: {transactions.length}</p>
                <p>성공: {transactions.filter(tx => tx.status === 'success').length}</p>
                <p>실패: {transactions.filter(tx => tx.status === 'failed').length}</p>
              </>
            )}
          </div>
        </motion.div>

        {/* 최근 활동 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-700/50 p-4 rounded-xl"
        >
          <h3 className="text-lg font-semibold mb-2">최근 활동</h3>
          {isLoading ? (
            <p>로딩 중...</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 3).map((tx) => (
                <div key={tx.hash} className="text-sm">
                  <p className="truncate">해시: {tx.hash}</p>
                  <p>금액: {formatEther(BigInt(tx.value))} ETH</p>
                  <p className={`${tx.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.status === 'success' ? '성공' : '실패'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 네트워크 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-700/50 p-4 rounded-xl"
        >
          <h3 className="text-lg font-semibold mb-2">네트워크 정보</h3>
          <div className="space-y-2">
            <p>현재 블록: {blockNumber?.toString()}</p>
            <p>지갑 주소: {address.slice(0, 6)}...{address.slice(-4)}</p>
          </div>
        </motion.div>
      </div>

      {/* 상세 트랜잭션 목록 */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">상세 트랜잭션 기록</h3>
        {isLoading ? (
          <p>로딩 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="p-2">해시</th>
                  <th className="p-2">보낸 주소</th>
                  <th className="p-2">받은 주소</th>
                  <th className="p-2">금액</th>
                  <th className="p-2">상태</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.hash} className="border-t border-gray-700">
                    <td className="p-2 truncate max-w-xs">{tx.hash}</td>
                    <td className="p-2 truncate max-w-xs">{tx.from}</td>
                    <td className="p-2 truncate max-w-xs">{tx.to}</td>
                    <td className="p-2">{formatEther(BigInt(tx.value))} ETH</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tx.status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {tx.status === 'success' ? '성공' : '실패'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 