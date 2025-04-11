'use client'

import { WalletConnect } from './components/WalletConnect'
import { NetworkInfo } from './components/NetworkInfo'
import { WalletInfo } from './components/WalletInfo'
import { DonateButton } from './components/DonateButton'
import { useAccount } from 'wagmi'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* 헤더 섹션 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">기초코인수급자 v0.1</h1>
          <WalletConnect />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!isConnected ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Monad DApp에 오신 것을 환영합니다</h2>
              <p className="text-gray-400 mb-8">지갑을 연결하여 시작하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">지갑 정보</h2>
                <WalletInfo />
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">네트워크 정보</h2>
                <NetworkInfo />
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">기부하기</h2>
                <DonateButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 