'use client'

import { WalletConnect } from './components/WalletConnect'
import { NetworkInfo } from './components/NetworkInfo'
import { WalletInfo } from './components/WalletInfo'
import { DonateButton } from './components/DonateButton'
import { TokenInput } from './components/TokenInput'
import { useAccount, useContractWrite } from 'wagmi'
import WalletDashboard from './components/WalletDashboard'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Voting from './components/Voting'
import Board from './components/Board'
import { useRouter } from 'next/navigation'
import { BOARD_ADDRESS } from './constants/addresses'
import { BOARD_ABI } from './constants/abis'
import { publicClient } from './utils/client'

interface Post {
  id: number
  author: string
  title: string
  content: string
  timestamp: bigint
  likes: bigint
  monAmount: bigint
}

export default function Home() {
  const { isConnected, address } = useAccount()
  const [swapSuccess, setSwapSuccess] = useState(false)
  const [swapTxHash, setSwapTxHash] = useState('')
  const [activeTab, setActiveTab] = useState('board') // 'wallet', 'voting', 'board'
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  // 추천 기능
  const { writeContract: likePost, isPending: isLiking } = useContractWrite()

  const handleSwapSuccess = (txHash: string, from: string, to: string, value: string) => {
    setSwapTxHash(txHash)
    setSwapSuccess(true)
    setTimeout(() => setSwapSuccess(false), 5000)
  }

  const handleLike = async (postId: number) => {
    if (!address) return

    try {
      likePost({
        address: BOARD_ADDRESS,
        abi: BOARD_ABI,
        functionName: 'likePost',
        args: [BigInt(postId)]
      })
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const loadPosts = async () => {
    try {
      setLoading(true)
      const postCount = await publicClient.readContract({
        address: BOARD_ADDRESS,
        abi: BOARD_ABI,
        functionName: 'getPostCount'
      })

      const loadedPosts: Post[] = []
      for (let i = 0; i < Number(postCount); i++) {
        const post = await publicClient.readContract({
          address: BOARD_ADDRESS,
          abi: BOARD_ABI,
          functionName: 'getPost',
          args: [BigInt(i)]
        })
        
        // 컨트랙트에서 반환되는 데이터 구조 확인
        console.log('Post data:', post)
        console.log('Post content:', post[2])  // content 확인
        
        // 데이터가 배열인지 확인
        if (Array.isArray(post) && post.length >= 7) {
          try {
            loadedPosts.push({
              id: i,
              author: post[0],
              title: post[2],
              content: post[3],
              timestamp: post[4],
              likes: post[5],
              monAmount: post[6]
            })
          } catch (error) {
            console.error(`Error processing post ${i}:`, error)
            // 오류가 발생한 게시글은 건너뛰고 계속 진행
            continue
          }
        }
        
        // RPC 요청 제한을 피하기 위해 1초 대기
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 최신순으로 정렬 (timestamp 기준 내림차순)
      loadedPosts.sort((a, b) => Number(b.timestamp - a.timestamp))
      setPosts(loadedPosts)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <header className="mb-8">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold">Monad Board</h1>
            
              </div>
              <WalletConnect />
            </div>
            {isConnected && (
              <div className="flex justify-end">
                <div className="bg-gray-800 rounded-xl p-4 inline-block">
                  <h2 className="text-lg font-semibold mb-2">Donate</h2>
                  <DonateButton />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Welcome to Monad Board</h2>
            <p className="text-gray-400">Connect your wallet to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 게시물 작성 버튼 */}
            <div className="flex justify-end">
              <button
                onClick={() => router.push('/write')}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors text-lg font-medium flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Write New Post</span>
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-8">
                <motion.div 
                  className="relative w-32 h-32"
                  animate={{
                    rotate: 360
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  {/* Monad Logo */}
                  <motion.img
                    src="/Monad Logo - Inverted - Stacked Logo.svg"
                    alt="Monad Logo"
                    className="w-24 h-24 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 border-4 rounded-full"
                    style={{ borderColor: "#836EF9" }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.5, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
                
                <div className="text-center space-y-2">
                  <motion.div 
                    className="text-lg font-medium"
                    style={{ color: "#836EF9" }}
                    animate={{
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    Connecting to the Monad board
                  </motion.div>
                  <motion.div
                    className="text-sm"
                    style={{ color: "#836EF9", opacity: 0.8 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 0.5 }}
                  >
                    Connecting to the future of monad
                  </motion.div>
                  <motion.div
                    className="text-sm font-mono"
                    style={{ color: "#836EF9", opacity: 0.7 }}
                    animate={{
                      opacity: [0.4, 0.7, 0.4]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    Data Loading
                  </motion.div>
                  <motion.div 
                    className="flex justify-center space-x-1 mt-1"
                    animate={{
                      y: [0, -3, 0]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    {[..."•••"].map((dot, i) => (
                      <motion.span
                        key={i}
                        style={{ color: "#836EF9" }}
                        className="text-2xl"
                        initial={{ opacity: 0.3 }}
                        animate={{
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      >
                        {dot}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">{post.title}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                          Author: {post.author} | 
                          Date: {new Date(Number(post.timestamp) * 1000).toLocaleString()} | 
                          Likes: {Number(post.likes)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4 mb-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{post.content}</p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleLike(post.id)}
                        disabled={isLiking}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-600 transition-colors flex items-center space-x-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        <span>{isLiking ? 'Liking...' : 'Like'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
} 