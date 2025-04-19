'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { createPublicClient, http, parseAbi } from 'viem';
import { monadTestnet } from 'wagmi/chains';

const MON_TOKEN_ADDRESS = '0x8d56e0D81d0FE0b94100B11947b1779a8485ec46';
const SLOT_MACHINE_ADDRESS = '0x4A56810A41Db3df40A75Cb08F7E19dC0FcA5e666';

const symbols = ['MON', 'GC3', 'JACKPOT', 'SEVEN', 'CHERRY', 'BAR'] as const;
type SymbolType = typeof symbols[number];

const symbolColors: Record<SymbolType, string> = {
  MON: 'text-blue-500',
  GC3: 'text-green-500',
  JACKPOT: 'text-yellow-500',
  SEVEN: 'text-red-500',
  CHERRY: 'text-pink-500',
  BAR: 'text-purple-500'
};

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http()
});

export default function SlotMachine() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [betAmount, setBetAmount] = useState('1');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<SymbolType[]>([]);
  const [winAmount, setWinAmount] = useState(0);
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [jackpotPool, setJackpotPool] = useState(0);
  const [ownerPool, setOwnerPool] = useState(0);
  const [spinningSymbols, setSpinningSymbols] = useState<SymbolType[]>([]);

  useEffect(() => {
    if (address) {
      fetchJackpotPool();
      fetchOwnerPool();
    }
  }, [address]);

  const fetchJackpotPool = async () => {
    try {
      const pool = await publicClient.readContract({
        address: SLOT_MACHINE_ADDRESS as `0x${string}`,
        abi: parseAbi(['function getJackpotPool() view returns (uint256)']),
        functionName: 'getJackpotPool'
      });
      setJackpotPool(Number(ethers.formatEther(pool)));
    } catch (error) {
      console.error('Failed to fetch jackpot pool:', error);
    }
  };

  const fetchOwnerPool = async () => {
    try {
      const pool = await publicClient.readContract({
        address: SLOT_MACHINE_ADDRESS as `0x${string}`,
        abi: parseAbi(['function getOwnerPool() view returns (uint256)']),
        functionName: 'getOwnerPool'
      });
      setOwnerPool(Number(ethers.formatEther(pool)));
    } catch (error) {
      console.error('Failed to fetch owner pool:', error);
    }
  };

  const handleSpin = async () => {
    if (!address || !walletClient) {
      toast.error('지갑을 연결해주세요');
      return;
    }

    try {
      setIsSpinning(true);
      const amount = ethers.parseEther(betAmount);

      // 스핀 애니메이션을 위한 랜덤 심볼 생성
      const spinInterval = setInterval(() => {
        setSpinningSymbols([
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ]);
      }, 100);

      // 슬롯 머신 spin
      const spinTx = await walletClient.writeContract({
        address: SLOT_MACHINE_ADDRESS as `0x${string}`,
        abi: parseAbi([
          'function spin(uint256 betAmount)',
          'event Spin(address indexed player, uint256 betAmount, uint8[3] result, uint256 winAmount)'
        ]),
        functionName: 'spin',
        args: [amount]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: spinTx });
      
      // 이벤트 디코딩
      const event = receipt.logs.find(log => 
        log.topics[0] === ethers.keccak256(ethers.toUtf8Bytes('Spin(address,uint256,uint8[3],uint256)'))
      );

      if (!event) {
        throw new Error('Spin event not found');
      }

      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint8[3]', 'uint256'],
        event.data
      );

      clearInterval(spinInterval);
      
      // 결과 업데이트
      const newResult = decoded[1].map((i: number) => symbols[i]);
      const newWinAmount = Number(ethers.formatEther(decoded[2]));
      
      setResult(newResult);
      setWinAmount(newWinAmount);
      
      if (newWinAmount > 0) {
        setConsecutiveWins(prev => prev + 1);
        toast.success(`축하합니다! ${newWinAmount} MON을 획득했습니다!`);
      } else {
        setConsecutiveWins(0);
        toast.error('아쉽네요! 다음 기회를 노려보세요!');
      }

      // 잭팟 풀 업데이트
      await fetchJackpotPool();
    } catch (error) {
      console.error(error);
      toast.error('트랜잭션 실패');
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">MON 슬롯 머신</h1>
        
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <p>연속 승리: {consecutiveWins}회</p>
            <p>보너스 배율: {consecutiveWins * 5}%</p>
            <p className="text-yellow-500">잭팟 풀: {jackpotPool} MON</p>
            <p className="text-green-500">오너 풀: {ownerPool} MON</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-32 px-4 py-2 rounded bg-gray-700 text-white"
              min="1"
              max="100"
            />
            <span className="text-white">MON</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-32 bg-gray-700 rounded-lg flex items-center justify-center text-4xl font-bold"
            >
              <AnimatePresence mode="wait">
                {isSpinning ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={symbolColors[spinningSymbols[index]]}
                  >
                    {spinningSymbols[index]}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={symbolColors[result[index]]}
                  >
                    {result[index]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`w-full py-4 rounded-lg text-xl font-bold transition-all ${
            isSpinning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transform hover:scale-105'
          }`}
        >
          {isSpinning ? '스핀 중...' : '스핀!'}
        </button>

        {winAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-green-500 text-xl font-bold"
          >
            +{winAmount} MON 획득!
          </motion.div>
        )}
      </div>
    </div>
  );
} 