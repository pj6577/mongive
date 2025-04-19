'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useWalletClient, usePublicClient, PublicClient } from 'wagmi'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { BOARD_ADDRESS, MON_TOKEN_ADDRESS } from '../constants/addresses'
import { BOARD_ABI, ERC20_ABI } from '../constants/abis'
import { ethers } from 'ethers'

interface Post {
  author: string
  authorNickname: string
  title: string
  content: string
  timestamp: bigint
  likes: bigint
  monAmount: bigint
}

export default function Board() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const client = usePublicClient()
  const publicClient = client as PublicClient
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [isSettingNickname, setIsSettingNickname] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    monAmount: ''
  })
  const [nickname, setNickname] = useState('')
  const [userNickname, setUserNickname] = useState('')
  const [monBalance, setMonBalance] = useState<bigint>(0n)

  const loadMonBalance = async () => {
    if (!publicClient || !address) {
      console.log('Missing dependencies:', { publicClient, address });
      return;
    }
    
    try {
      console.log('Loading MON balance for address:', address);
      console.log('Using MON token address:', MON_TOKEN_ADDRESS);
      
      const balance = await publicClient.readContract({
        address: MON_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      }) as bigint;
      
      console.log('Raw MON balance:', balance);
      const formattedBalance = ethers.formatEther(balance.toString());
      console.log('Formatted MON balance:', formattedBalance);
      
      setMonBalance(balance);
    } catch (error) {
      console.error('Error loading MON balance:', error);
      toast.error('모나드 토큰 잔액을 불러오는데 실패했습니다');
    }
  };

  const loadPosts = async () => {
    if (!publicClient) {
      console.log('Waiting for publicClient...');
      return;
    }
    
    try {
      setIsLoading(true);
      let retries = 3;

      while (retries > 0) {
        try {
          // 먼저 게시글 개수를 가져옵니다
          const count = await publicClient.readContract({
            address: BOARD_ADDRESS,
            abi: BOARD_ABI,
            functionName: 'getPostCount'
          }) as bigint;

          const loadedPosts: Post[] = [];
          
          // 각 게시글을 순차적으로 불러옵니다
          for (let i = 0; i < Number(count); i++) {
            try {
              const result = await publicClient.readContract({
                address: BOARD_ADDRESS,
                abi: BOARD_ABI,
                functionName: 'getPost',
                args: [BigInt(i)]
              });

              loadedPosts.push({
                author: result[0],
                authorNickname: result[1],
                title: result[2],
                content: result[3],
                timestamp: result[4],
                likes: result[5],
                monAmount: result[6]
              });

              // 각 요청 사이에 딜레이를 줍니다
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error: any) {
              console.error(`Error loading post ${i}:`, error);
              if (error.message?.includes('request limit reached')) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }

          // 모나드 토큰 양에 따라 정렬
          loadedPosts.sort((a, b) => Number(b.monAmount - a.monAmount));
          setPosts(loadedPosts);
          break;
        } catch (error: any) {
          console.error('Error in loadPosts:', error);
          if (error.message?.includes('request limit reached')) {
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
          }
          toast.error('게시글을 불러오는 중 오류가 발생했습니다');
          break;
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (address && publicClient) {
      console.log('Initializing board...');
      loadPosts();
      loadUserNickname();
      loadMonBalance();
    }
  }, [address, publicClient]);

  const loadUserNickname = async () => {
    if (!publicClient || !address) return;
    
    try {
      const nickname = await publicClient.readContract({
        address: BOARD_ADDRESS,
        abi: BOARD_ABI,
        functionName: 'nicknames',
        args: [address]
      });
      setUserNickname(nickname);
    } catch (error) {
      console.error('Error loading nickname:', error);
    }
  };

  const handleSetNickname = async () => {
    if (!walletClient || !nickname) return

    try {
      setIsSettingNickname(true)
      let retries = 3
      let lastError = null

      while (retries > 0) {
        try {
          if (!publicClient) {
            throw new Error('Public client is not initialized');
          }
          
          const { request } = await publicClient.simulateContract({
            address: BOARD_ADDRESS,
            abi: BOARD_ABI,
            functionName: 'setNickname',
            args: [nickname]
          });

          const hash = await walletClient.writeContract(request)
          await publicClient.waitForTransactionReceipt({ hash })
          
          toast.success('닉네임이 설정되었습니다!')
          setUserNickname(nickname)
          setNickname('')
          return
        } catch (error: any) {
          lastError = error
          if (error.message?.includes('request limit reached')) {
            retries--
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000))
              continue
            }
          }
          throw error
        }
      }

      throw lastError
    } catch (error: any) {
      console.error('Error setting nickname:', error)
      if (error.message?.includes('Nickname too long')) {
        toast.error('닉네임이 너무 깁니다 (최대 20자)')
      } else if (error.message?.includes('Nickname cannot be empty')) {
        toast.error('닉네임을 입력해주세요')
      } else {
        toast.error('닉네임 설정 중 오류가 발생했습니다')
      }
    } finally {
      setIsSettingNickname(false)
    }
  }

  const handleCreatePost = async () => {
    if (!publicClient || !walletClient || !address) {
      console.error('Missing required dependencies:', { publicClient, walletClient, address });
      toast.error('지갑이 연결되지 않았습니다');
      return;
    }

    try {
      setIsCreatingPost(true);
      console.log('Starting post creation...');
      let retries = 3;

      while (retries > 0) {
        try {
          console.log('Creating post with data:', {
            title: newPost.title,
            content: newPost.content
          });

          // 게시글 작성
          const { request } = await publicClient.simulateContract({
            address: BOARD_ADDRESS,
            abi: BOARD_ABI,
            functionName: 'createPost',
            args: [newPost.title, newPost.content, BigInt(0)], // 모나드 토큰 할당 없음
            account: address
          });
          const hash = await walletClient.writeContract(request);
          console.log('Post creation transaction hash:', hash);
          await publicClient.waitForTransactionReceipt({ hash });

          toast.success('게시글이 작성되었습니다');
          setNewPost({ title: '', content: '', monAmount: '0' });
          loadPosts();
          break;
        } catch (error: any) {
          console.error('Error in create post attempt:', error);
          if (error.message?.includes('request limit reached')) {
            retries--;
            if (retries > 0) {
              console.log(`Retrying... ${retries} attempts left`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }
          }
          if (error.message?.includes('Title too long')) {
            toast.error('제목이 너무 길습니다');
          } else if (error.message?.includes('Content too long')) {
            toast.error('내용이 너무 길습니다');
          } else if (error.message?.includes('Title cannot be empty')) {
            toast.error('제목을 입력해주세요');
          } else if (error.message?.includes('Content cannot be empty')) {
            toast.error('내용을 입력해주세요');
          } else {
            toast.error('게시글 작성 중 오류가 발생했습니다');
          }
          break;
        }
      }
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!walletClient) return

    try {
      const { request } = await publicClient.simulateContract({
        address: BOARD_ADDRESS,
        abi: BOARD_ABI,
        functionName: 'likePost',
        args: [BigInt(postId)],
        account: address
      })

      const hash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash })
      
      toast.success('좋아요가 반영되었습니다!')
      loadPosts()
    } catch (error: any) {
      console.error('Error liking post:', error)
      if (error.message?.includes('Already liked')) {
        toast.error('이미 좋아요를 누르셨습니다')
      } else {
        toast.error('좋아요 처리 중 오류가 발생했습니다')
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
        <h2 className="text-2xl font-bold text-white mb-4">닉네임 설정</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">현재 닉네임</label>
            <p className="text-white">{userNickname || '설정되지 않음'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">새 닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="새 닉네임을 입력하세요 (최대 20자)"
              maxLength={20}
            />
          </div>
          <button
            onClick={handleSetNickname}
            disabled={isSettingNickname}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isSettingNickname ? '설정 중...' : '닉네임 설정'}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">새 게시글 작성</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">제목 (최대 50자)</label>
            <input
              type="text"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="제목을 입력하세요"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">내용 (최대 500자)</label>
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="내용을 입력하세요"
              rows={4}
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">MON 토큰 할당량</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={newPost.monAmount}
                onChange={(e) => setNewPost({ ...newPost, monAmount: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="할당할 MON 토큰량"
                min="0"
                step="0.01"
              />
              <span className="text-gray-400">MON</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              현재 잔액: {ethers.formatEther(monBalance.toString())} MON
            </p>
          </div>
          <button
            onClick={handleCreatePost}
            disabled={isCreatingPost}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isCreatingPost ? '작성 중...' : '게시글 작성'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">게시글 목록</h2>
        {posts.length === 0 ? (
          <p className="text-gray-400">작성된 게시글이 없습니다.</p>
        ) : (
          posts.map((post, postId) => (
            <motion.div
              key={postId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{post.title}</h3>
                  <p className="text-gray-400 mt-1">{post.content}</p>
                </div>
                <div className="text-sm text-gray-400">
                  <div>작성자: {post.authorNickname || post.author.slice(0, 6)}...{post.author.slice(-4)}</div>
                  <div>작성일: {formatDate(post.timestamp)}</div>
                  <div className="text-purple-400 mt-1">
                    할당된 MON: {ethers.formatEther(post.monAmount)} MON
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleLike(postId)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  좋아요 ({Number(post.likes)})
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
} 