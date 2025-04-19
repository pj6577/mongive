'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { motion } from 'framer-motion'
import { parseEther, formatEther } from 'viem'
import toast from 'react-hot-toast'
import { VOTING_ADDRESS } from '../constants/addresses'
import { VOTING_ABI } from '../constants/abis'
import { createPublicClient, http } from 'viem'
import { monadTestnet } from 'wagmi/chains'
import { MON_TOKEN_ADDRESS } from '../constants/addresses'
import { ERC20_ABI } from '../constants/abis'

interface Poll {
  title: string
  description: string
  options: string[]
  votes: bigint[]
  totalVotes: bigint
  startTime: bigint
  endTime: bigint
  isActive: boolean
}

export default function Voting() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingPoll, setIsCreatingPoll] = useState(false)
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    options: ['', ''],
    duration: 7 // 7일
  })
  const [minVoteAmount, setMinVoteAmount] = useState<bigint>(BigInt(0))

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http()
  })

  useEffect(() => {
    loadPolls()
    loadMinVoteAmount()
  }, [])

  const loadMinVoteAmount = async () => {
    try {
      const amount = await publicClient.readContract({
        address: VOTING_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'minVoteAmount'
      })
      setMinVoteAmount(amount as bigint)
    } catch (error) {
      console.error('Error loading min vote amount:', error)
    }
  }

  const loadPolls = async () => {
    try {
      let retries = 3
      let lastError = null

      while (retries > 0) {
        try {
          const count = await publicClient.readContract({
            address: VOTING_ADDRESS,
            abi: VOTING_ABI,
            functionName: 'pollCount'
          }) as bigint

          const pollPromises = []
          for (let i = 0; i < Number(count); i++) {
            // 각 요청 사이에 100ms 대기
            await new Promise(resolve => setTimeout(resolve, 100))
            pollPromises.push(
              publicClient.readContract({
                address: VOTING_ADDRESS,
                abi: VOTING_ABI,
                functionName: 'getPollResults',
                args: [BigInt(i)]
              })
            )
          }

          const results = await Promise.all(pollPromises)
          const formattedPolls = results.map(result => ({
            title: result[0],
            description: result[1],
            options: [...result[2]],
            votes: [...result[3]],
            totalVotes: result[4],
            startTime: result[5],
            endTime: result[6],
            isActive: result[7]
          }))
          setPolls(formattedPolls)
          return
        } catch (error: any) {
          lastError = error
          if (error.message?.includes('request limit reached')) {
            retries--
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 대기
              continue
            }
          }
          throw error
        }
      }

      throw lastError
    } catch (error) {
      console.error('Error loading polls:', error)
      toast.error('투표 목록을 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePoll = async () => {
    if (!walletClient) return

    try {
      setIsCreatingPoll(true)
      const { request } = await publicClient.simulateContract({
        address: VOTING_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'createPoll',
        args: [
          newPoll.title,
          newPoll.description,
          newPoll.options,
          BigInt(newPoll.duration * 24 * 60 * 60) // 일수를 초로 변환
        ],
        account: address
      })

      const hash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash })
      
      toast.success('투표가 생성되었습니다!')
      setNewPoll({
        title: '',
        description: '',
        options: ['', ''],
        duration: 7
      })
      loadPolls()
    } catch (error) {
      console.error('Error creating poll:', error)
      toast.error('투표 생성 중 오류가 발생했습니다')
    } finally {
      setIsCreatingPoll(false)
    }
  }

  const handleVote = async (pollId: number, optionIndex: number) => {
    if (!walletClient) return

    try {
      // 투표 가능 여부 확인
      const poll = await publicClient.readContract({
        address: VOTING_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'getPollResults',
        args: [BigInt(pollId)]
      })

      if (!poll[7]) { // isActive가 false인 경우
        toast.error('이미 종료된 투표입니다')
        return
      }

      // 현재 시간을 초 단위로 변환 (소수점 제거)
      const currentTime = BigInt(Math.floor(Date.now() / 1000))
      if (currentTime > poll[6]) { // 현재 시간이 endTime보다 늦은 경우
        toast.error('투표 기간이 종료되었습니다')
        return
      }

      // MON 토큰 잔액 확인
      const balance = await publicClient.readContract({
        address: MON_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address!]
      }) as bigint

      if (balance < minVoteAmount) {
        toast.error(`MON 토큰이 부족합니다. 최소 ${formatEther(minVoteAmount)} MON이 필요합니다.`)
        return
      }

      // MON 토큰 승인 확인
      const allowance = await publicClient.readContract({
        address: MON_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address!, VOTING_ADDRESS]
      }) as bigint

      if (allowance < minVoteAmount) {
        // MON 토큰 승인 요청
        const { request: approveRequest } = await publicClient.simulateContract({
          address: MON_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [VOTING_ADDRESS, minVoteAmount],
          account: address
        })

        const approveHash = await walletClient.writeContract(approveRequest)
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        toast.success('토큰 승인이 완료되었습니다')
      }

      // 투표 실행 (재시도 로직 추가)
      let retries = 3
      let lastError = null

      while (retries > 0) {
        try {
          const { request } = await publicClient.simulateContract({
            address: VOTING_ADDRESS,
            abi: VOTING_ABI,
            functionName: 'vote',
            args: [BigInt(pollId), BigInt(optionIndex), minVoteAmount],
            account: address
          })

          const hash = await walletClient.writeContract(request)
          await publicClient.waitForTransactionReceipt({ hash })
          
          toast.success('투표가 완료되었습니다!')
          loadPolls()
          return
        } catch (error: any) {
          lastError = error
          if (error.message?.includes('request limit reached')) {
            retries--
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 대기
              continue
            }
          }
          throw error
        }
      }

      throw lastError
    } catch (error: any) {
      console.error('Error voting:', error)
      
      if (error.message?.includes('request limit reached')) {
        toast.error('RPC 요청 제한에 도달했습니다. 잠시 후 다시 시도해주세요.')
      } else if (error.message?.includes('Already voted')) {
        toast.error('이미 투표하셨습니다')
      } else if (error.message?.includes('Amount below minimum')) {
        toast.error('최소 투표 금액보다 적습니다')
      } else if (error.message?.includes('Token transfer failed')) {
        toast.error('토큰 전송에 실패했습니다')
      } else if (error.message?.includes('Poll not active')) {
        toast.error('투표가 활성화되지 않았습니다')
      } else if (error.message?.includes('Invalid option index')) {
        toast.error('잘못된 선택지입니다')
      } else {
        toast.error('투표 중 오류가 발생했습니다: ' + error.message)
      }
    }
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">새로운 투표 생성</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">제목</label>
            <input
              type="text"
              value={newPoll.title}
              onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="투표 제목을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">설명</label>
            <textarea
              value={newPoll.description}
              onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="투표 설명을 입력하세요"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">선택지</label>
            {newPoll.options.map((option, index) => (
              <input
                key={index}
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...newPoll.options]
                  newOptions[index] = e.target.value
                  setNewPoll({ ...newPoll, options: newOptions })
                }}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white mb-2"
                placeholder={`선택지 ${index + 1}`}
              />
            ))}
            <button
              onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}
              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              선택지 추가
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">투표 기간 (일)</label>
            <input
              type="number"
              value={newPoll.duration}
              onChange={(e) => setNewPoll({ ...newPoll, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              min="1"
            />
          </div>
          <button
            onClick={handleCreatePoll}
            disabled={isCreatingPoll}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isCreatingPoll ? '생성 중...' : '투표 생성'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">진행 중인 투표</h2>
        {polls.length === 0 ? (
          <p className="text-gray-400">진행 중인 투표가 없습니다.</p>
        ) : (
          polls.map((poll, pollId) => (
            <motion.div
              key={pollId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{poll.title}</h3>
                  <p className="text-gray-400 mt-1">{poll.description}</p>
                </div>
                <div className="text-sm text-gray-400">
                  <div>시작: {formatDate(poll.startTime)}</div>
                  <div>종료: {formatDate(poll.endTime)}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                {poll.options.map((option, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">{option}</span>
                      <span className="text-gray-400">
                        {poll.totalVotes > BigInt(0)
                          ? `${((Number(poll.votes[index]) / Number(poll.totalVotes)) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{
                          width: poll.totalVotes > BigInt(0)
                            ? `${(Number(poll.votes[index]) / Number(poll.totalVotes)) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleVote(pollId, index)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      투표하기 ({formatEther(minVoteAmount)} MON)
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
} 