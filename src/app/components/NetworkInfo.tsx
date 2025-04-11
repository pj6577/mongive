'use client'

import { useChainId, useSwitchChain, useAccount } from 'wagmi'
import { monadTestnet, sepolia } from 'wagmi/chains'

export function NetworkInfo() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const getChainInfo = () => {
    switch (chainId) {
      case monadTestnet.id:
        return {
          name: 'Monad Testnet',
          color: 'text-green-500',
          description: 'Monad 테스트 네트워크'
        }
      case sepolia.id:
        return {
          name: 'Sepolia',
          color: 'text-blue-500',
          description: 'Ethereum 테스트 네트워크'
        }
      default:
        return {
          name: 'Unknown Network',
          color: 'text-red-500',
          description: '알 수 없는 네트워크'
        }
    }
  }

  const currentChain = getChainInfo()

  if (!isConnected) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800">현재 네트워크</h3>
        <p className={`text-sm ${currentChain.color}`}>
          {currentChain.name} (Chain ID: {chainId})
        </p>
        <p className="text-sm text-gray-600">{currentChain.description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => switchChain({ chainId: monadTestnet.id })} 
          className={`px-4 py-2 rounded ${
            chainId === monadTestnet.id 
              ? 'bg-green-600 text-white cursor-not-allowed' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
          disabled={chainId === monadTestnet.id}
        >
          Monad Testnet
        </button>
        
        <button 
          onClick={() => switchChain({ chainId: sepolia.id })} 
          className={`px-4 py-2 rounded ${
            chainId === sepolia.id 
              ? 'bg-blue-600 text-white cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          disabled={chainId === sepolia.id}
        >
          Sepolia
        </button>
      </div>
    </div>
  )
} 