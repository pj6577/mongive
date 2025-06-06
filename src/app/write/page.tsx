'use client';

import { useState, useEffect } from 'react';
import { useAccount, useContractWrite } from 'wagmi';
import { BOARD_ADDRESS } from '../constants/addresses';
import { BOARD_ABI } from '../constants/abis';
import { useRouter } from 'next/navigation';
import { WalletConnect } from '../components/WalletConnect';
import { publicClient } from '../utils/client';

export default function WritePage() {
  const { address } = useAccount();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: ''
  });
  const { isConnected } = useAccount();

  // 제목과 내용의 최대 길이 상수
  const MAX_TITLE_LENGTH = 20;
  const MAX_CONTENT_LENGTH = 100;

  // 닉네임 설정
  const { writeContract: setNicknameContract, isPending: isSettingNickname } = useContractWrite();

  // 게시글 작성
  const { writeContractAsync: createPost, isPending: isCreating } = useContractWrite();

  const handleSetNickname = async () => {
    if (!address) return;

    try {
      setNicknameContract({
        address: BOARD_ADDRESS,
        abi: BOARD_ABI,
        functionName: 'setNickname',
        args: [nickname]
      });
    } catch (error) {
      console.error('Error setting nickname:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      // 게시글 작성 (monAmount를 0으로 설정)
      const hash = await createPost({
        address: BOARD_ADDRESS,
        abi: BOARD_ABI,
        functionName: 'createPost',
        args: [newPost.title, newPost.content, 0n]
      });

      // 트랜잭션이 완료될 때까지 기다림
      await publicClient.waitForTransactionReceipt({ hash });

      // 성공 시 메인 페이지로 이동
      router.push('/');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold">Write New Post</h1>
            </div>
            <WalletConnect />
          </div>
        </header>

        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Connect your wallet to write a post</h2>
            <p className="text-gray-400">Please connect your wallet to get started</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* 닉네임 설정 */}
            {/* <div className="mb-8 bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Set Your Nickname123213</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your nickname"
                />
                <button
                  onClick={handleSetNickname}
                  disabled={isSettingNickname}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600"
                >
                  {isSettingNickname ? 'Setting...' : 'Set Nickname'}
                </button>
              </div>
            </div> */}

            {/* 게시글 작성 폼 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-lg font-medium mb-2">
                  Title (max {MAX_TITLE_LENGTH} characters)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="title"
                    value={newPost.title}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, MAX_TITLE_LENGTH);
                      setNewPost({ ...newPost, title: value });
                    }}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {newPost.title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor="content" className="block text-lg font-medium mb-2">
                  Content (max {MAX_CONTENT_LENGTH} characters)
                </label>
                <div className="relative">
                  <textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, MAX_CONTENT_LENGTH);
                      setNewPost({ ...newPost, content: value });
                    }}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                    required
                  />
                  <span className="absolute right-3 bottom-3 text-sm text-gray-400">
                    {newPost.content.length}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors text-lg font-medium disabled:bg-gray-600"
                >
                  {isCreating ? 'Waiting for transaction approval...' : 'Create Post'}
                </button>
                {isCreating && (
                  <p className="text-sm text-yellow-500 text-center">
                    ⚠️ Please approve the transaction in your wallet to complete the post creation
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
} 