'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useBalance, useWalletClient } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { AUTOHUNT_ADDRESS } from '../constants/addresses';
import { AUTO_HUNT_ABI } from '../config/contracts';
import toast from 'react-hot-toast';
import { createPublicClient, http } from 'viem';
import { monadTestnet } from 'wagmi/chains';

interface Character {
  level: number;
  exp: number;
  power: number;
  lastHuntTime: number;
  isHunting: boolean;
}

interface Monster {
  level: number;
  hp: number;
  exp: number;
  gcReward: number;
}

interface ContractCharacter {
  level: bigint;
  exp: bigint;
  power: bigint;
  lastHuntTime: bigint;
  isHunting: boolean;
}

interface ContractMonster {
  level: bigint;
  hp: bigint;
  exp: bigint;
  gcReward: bigint;
}

interface HuntingArea {
  id: number;
  name: string;
  level: number;
  monsters: Monster[];
}

interface BattleLog {
  id: string;
  type: 'attack' | 'damage' | 'victory' | 'defeat';
  value: number;
  isPlayer: boolean;
  timestamp: number;
}

interface BattleResult {
  isVictory: boolean;
  expGained: number;
  gcGained: number;
  damageDealt: number;
  damageTaken: number;
}

const formatGameNumber = (amount: bigint, type: 'hp' | 'exp' | 'gc') => {
  const num = Number(amount);
  switch(type) {
    case 'hp':
      return Math.floor(num / 1e15); // HP는 1000 단위로 표시
    case 'exp':
      return Math.floor(num / 1e16); // EXP는 100 단위로 표시
    case 'gc':
      return Math.floor(num / 1e18); // GC는 1 단위로 표시
    default:
      return num;
  }
};

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http()
});

const HUNTING_AREAS: HuntingArea[] = [
  {
    id: 1,
    name: "초보자의 숲",
    level: 1,
    monsters: []
  },
  {
    id: 2,
    name: "중급자의 동굴",
    level: 5,
    monsters: []
  },
  {
    id: 3,
    name: "고급자의 사막",
    level: 10,
    monsters: []
  }
];

export default function AutoHunt() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [character, setCharacter] = useState<Character | null>(null);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentArea, setCurrentArea] = useState<HuntingArea>(HUNTING_AREAS[0]);
  const [huntingProgress, setHuntingProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([]);
  const [monsterHp, setMonsterHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    if (address) {
      loadCharacter();
      loadMonsters();
    }
  }, [address]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (character?.isHunting) {
      timer = setInterval(() => {
        setHuntingProgress(prev => (prev + 1) % 100);
        setRemainingTime(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [character?.isHunting]);

  // 고유 ID 생성 함수
  const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };

  const simulateBattle = async () => {
    if (!walletClient || !character) return;
    
    try {
      setIsLoading(true);
      const monster = monsters[selectedMonster];
      if (!monster) return;

      // 사냥 시작 트랜잭션
      const tx = await walletClient.writeContract({
        address: AUTOHUNT_ADDRESS as `0x${string}`,
        abi: AUTO_HUNT_ABI,
        functionName: 'startHunting',
        args: [selectedMonster]
      });
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // 전투 시뮬레이션
      let currentMonsterHp = Number(monster.hp);
      let currentPlayerHp = 100;
      let totalDamageDealt = 0;
      let totalDamageTaken = 0;
      let isVictory = false;

      while (currentMonsterHp > 0 && currentPlayerHp > 0) {
        // 플레이어 공격
        const playerDamage = Math.floor(Math.random() * 10) + 5;
        currentMonsterHp = Math.max(0, currentMonsterHp - playerDamage);
        totalDamageDealt += playerDamage;

        setBattleLogs(prev => [...prev, {
          id: generateUniqueId(),
          type: 'attack',
          value: playerDamage,
          isPlayer: true,
          timestamp: Date.now()
        }]);

        // 몬스터가 살아있으면 공격
        if (currentMonsterHp > 0) {
          const monsterDamage = Math.floor(Math.random() * 8) + 3;
          currentPlayerHp = Math.max(0, currentPlayerHp - monsterDamage);
          totalDamageTaken += monsterDamage;

          setBattleLogs(prev => [...prev, {
            id: generateUniqueId(),
            type: 'damage',
            value: monsterDamage,
            isPlayer: false,
            timestamp: Date.now()
          }]);
        }

        // HP 업데이트
        setMonsterHp(currentMonsterHp);
        setPlayerHp(currentPlayerHp);

        // 애니메이션을 위한 짧은 지연
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      isVictory = currentMonsterHp <= 0;
      const result: BattleResult = {
        isVictory,
        expGained: isVictory ? Number(monster.exp) : 0,
        gcGained: isVictory ? Number(monster.gcReward) : 0,
        damageDealt: totalDamageDealt,
        damageTaken: totalDamageTaken
      };

      setBattleResult(result);
      setIsBattleOver(true);

      // 전투 결과를 컨트랙트에 기록
      if (isVictory) {
        await walletClient.writeContract({
          address: AUTOHUNT_ADDRESS as `0x${string}`,
          abi: AUTO_HUNT_ABI,
          functionName: 'completeHunt',
          args: [selectedMonster, result.expGained, result.gcGained]
        });
        toast.success('전투에서 승리했습니다!');
      } else {
        toast.error('전투에서 패배했습니다...');
      }

      await loadCharacter();
    } catch (error) {
      console.error(error);
      toast.error('전투 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const startHunting = async () => {
    await simulateBattle();
  };

  const loadCharacter = async () => {
    try {
      const char = await publicClient.readContract({
        address: AUTOHUNT_ADDRESS as `0x${string}`,
        abi: AUTO_HUNT_ABI,
        functionName: 'getCharacter',
        args: [address]
      }) as ContractCharacter;

      setCharacter({
        level: Number(char.level),
        exp: Number(char.exp),
        power: Number(char.power),
        lastHuntTime: Number(char.lastHuntTime),
        isHunting: char.isHunting
      });
    } catch (error) {
      console.error('캐릭터 정보 로드 실패:', error);
    }
  };

  const loadMonsters = async () => {
    try {
      const monsterList = await publicClient.readContract({
        address: AUTOHUNT_ADDRESS as `0x${string}`,
        abi: AUTO_HUNT_ABI,
        functionName: 'getMonsters'
      }) as ContractMonster[];

      setMonsters(monsterList.map((m) => ({
        level: Number(m.level),
        hp: Number(m.hp),
        exp: Number(m.exp),
        gcReward: Number(m.gcReward)
      })));
    } catch (error) {
      console.error('몬스터 정보 로드 실패:', error);
    }
  };

  const createCharacter = async () => {
    if (!walletClient) return;
    
    try {
      setIsLoading(true);
      const tx = await walletClient.writeContract({
        address: AUTOHUNT_ADDRESS as `0x${string}`,
        abi: AUTO_HUNT_ABI,
        functionName: 'createCharacter'
      });
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      toast.success('캐릭터 생성 완료!');
      await loadCharacter();
    } catch (error) {
      toast.error('캐릭터 생성 실패');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!walletClient || !character) return;
    
    try {
      setIsLoading(true);
      const tx = await walletClient.writeContract({
        address: AUTOHUNT_ADDRESS as `0x${string}`,
        abi: AUTO_HUNT_ABI,
        functionName: 'claimRewards',
        args: [selectedMonster]
      });
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      toast.success('보상 수령 완료!');
      await loadCharacter();
    } catch (error) {
      toast.error('보상 수령 실패');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeArea = (area: HuntingArea) => {
    if (character?.isHunting) {
      toast.error('사냥 중에는 사냥터를 변경할 수 없습니다!');
      return;
    }
    setCurrentArea(area);
    setSelectedMonster(0);
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center text-yellow-400">자동 사냥 게임</h2>
            
            <div className="text-center p-8">
              <p className="text-xl text-gray-400 mb-4">지갑을 연결하여 게임을 시작하세요!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700 shadow-2xl">
          <h2 className="text-3xl font-bold mb-6 text-center text-yellow-400">자동 사냥 게임</h2>
          
          {/* 사냥터 선택 */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-yellow-400">사냥터 선택</h3>
            <div className="grid grid-cols-3 gap-4">
              {HUNTING_AREAS.map(area => (
                <motion.button
                  key={area.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => changeArea(area)}
                  className={`p-4 rounded-lg border ${
                    currentArea.id === area.id
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-700 hover:border-yellow-500/50'
                  }`}
                >
                  <p className="text-lg font-bold">{area.name}</p>
                  <p className="text-sm text-gray-400">레벨 {area.level} 이상</p>
                </motion.button>
              ))}
            </div>
          </div>

          {!character ? (
            <div className="text-center p-8">
              <p className="text-xl text-gray-400 mb-6">캐릭터를 생성하여 모험을 시작하세요!</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createCharacter}
                disabled={isLoading}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-8 py-3 rounded-lg text-lg font-bold shadow-lg disabled:opacity-50"
              >
                {isLoading ? '생성 중...' : '캐릭터 생성'}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 캐릭터 정보 */}
              <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-yellow-400">캐릭터 정보</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <p className="text-gray-400">레벨</p>
                    <p className="text-2xl font-bold text-yellow-400">{character.level}</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <p className="text-gray-400">경험치</p>
                    <p className="text-2xl font-bold text-green-400">{formatGameNumber(BigInt(character.exp), 'exp')} EXP</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <p className="text-gray-400">전투력</p>
                    <p className="text-2xl font-bold text-red-400">{formatGameNumber(BigInt(character.power), 'hp')}</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <p className="text-gray-400">상태</p>
                    <p className={`text-2xl font-bold ${character.isHunting ? 'text-red-400' : 'text-green-400'}`}>
                      {character.isHunting ? '사냥 중' : '대기 중'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 전투 화면 */}
              {character.isHunting && (
                <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    {/* 플레이어 */}
                    <div className="w-1/2 text-center">
                      <motion.div
                        animate={{ x: isAttacking ? 50 : 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="bg-blue-500 w-16 h-16 rounded-full mx-auto mb-2" />
                        <div className="text-sm">HP: {playerHp}/100</div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <motion.div
                            className="bg-green-500 h-2 rounded-full"
                            initial={{ width: '100%' }}
                            animate={{ width: `${playerHp}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </motion.div>
                    </div>

                    {/* 몬스터 */}
                    <div className="w-1/2 text-center">
                      <motion.div
                        animate={{ x: isAttacking ? -50 : 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="bg-red-500 w-16 h-16 rounded-full mx-auto mb-2" />
                        <div className="text-sm">HP: {monsterHp}/{monsters[selectedMonster]?.hp}</div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <motion.div
                            className="bg-red-500 h-2 rounded-full"
                            initial={{ width: '100%' }}
                            animate={{ width: `${(monsterHp / Number(monsters[selectedMonster]?.hp)) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* 전투 로그 */}
                  <div className="mt-4 h-32 overflow-y-auto bg-gray-800/50 rounded-lg p-2">
                    {battleLogs.slice(-5).map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`text-sm mb-1 ${
                          log.isPlayer 
                            ? log.type === 'victory' 
                              ? 'text-green-400 font-bold' 
                              : 'text-blue-400'
                            : log.type === 'defeat'
                              ? 'text-red-400 font-bold'
                              : 'text-red-400'
                        }`}
                      >
                        {log.type === 'attack' && `플레이어가 ${log.value}의 데미지를 입혔습니다!`}
                        {log.type === 'damage' && `몬스터가 ${log.value}의 데미지를 입혔습니다!`}
                        {log.type === 'victory' && '🎉 전투에서 승리했습니다!'}
                        {log.type === 'defeat' && '💀 전투에서 패배했습니다...'}
                      </motion.div>
                    ))}
                  </div>

                  {/* 전투 결과 표시 */}
                  {isBattleOver && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-center mt-4 p-4 rounded-lg ${
                        battleResult?.isVictory ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
                      }`}
                    >
                      <p className={`text-xl font-bold ${
                        battleResult?.isVictory ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {battleResult?.isVictory ? '�� 승리!' : '💀 패배...'}
                      </p>
                      <p className="text-sm mt-2">
                        {battleResult?.isVictory ? '보상을 수령하세요!' : '다시 도전하세요!'}
                      </p>
                    </motion.div>
                  )}

                  {/* 진행 상태 */}
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                    <motion.div
                      className="bg-yellow-500 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${huntingProgress}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-yellow-400">
                      남은 시간: {Math.floor(remainingTime / 60)}분 {remainingTime % 60}초
                    </p>
                  </div>
                </div>
              )}

              {/* 몬스터 선택 */}
              <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-yellow-400">몬스터 선택</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monsters.map((monster, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedMonster === index 
                          ? 'border-yellow-500 bg-yellow-500/10' 
                          : 'border-gray-700 hover:border-yellow-500/50'
                      }`}
                      onClick={() => setSelectedMonster(index)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-bold text-yellow-400">레벨 {monster.level}</p>
                          <p className="text-gray-400">HP: {formatGameNumber(BigInt(monster.hp), 'hp')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400">+{formatGameNumber(BigInt(monster.exp), 'exp')} EXP</p>
                          <p className="text-yellow-400">+{formatGameNumber(BigInt(monster.gcReward), 'gc')} GC</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startHunting}
                  disabled={isLoading || character.isHunting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold shadow-lg disabled:opacity-50"
                >
                  {isLoading ? '처리 중...' : character.isHunting ? '사냥 중...' : '사냥 시작'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={claimRewards}
                  disabled={isLoading || !character.isHunting || remainingTime > 0}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg text-lg font-bold shadow-lg disabled:opacity-50"
                >
                  {isLoading ? '처리 중...' : remainingTime > 0 ? `${Math.floor(remainingTime / 60)}:${remainingTime % 60}` : '보상 수령'}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 