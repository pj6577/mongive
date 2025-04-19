// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./GameCoin.sol";

contract AutoHunt is Ownable {
    GameCoin public gcToken;
    
    // ReentrancyGuard 직접 구현
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    struct Character {
        uint256 level;
        uint256 exp;
        uint256 power;
        uint256 lastHuntTime;
        bool isHunting;
    }
    
    struct Monster {
        uint256 level;
        uint256 hp;
        uint256 exp;
        uint256 gcReward;
    }
    
    mapping(address => Character) public characters;
    Monster[] public monsters;
    
    uint256 public constant EXP_PER_LEVEL = 1000;
    uint256 public constant POWER_PER_LEVEL = 10;
    uint256 public constant HUNT_COOLDOWN = 1 hours;
    uint256 public constant GC_PER_POWER = 0.1 ether; // 0.1 GC per power point
    
    event CharacterCreated(address indexed player);
    event StartedHunting(address indexed player, uint256 monsterId);
    event HuntingReward(address indexed player, uint256 exp, uint256 gcReward);
    event LevelUp(address indexed player, uint256 newLevel);
    
    constructor(address _gcToken) Ownable(msg.sender) {
        gcToken = GameCoin(_gcToken);
        _status = _NOT_ENTERED;
        
        // 초기 몬스터 설정
        monsters.push(Monster(1, 100, 100, 1 ether));  // 1 GC
        monsters.push(Monster(5, 300, 300, 3 ether));  // 3 GC
        monsters.push(Monster(10, 600, 600, 6 ether)); // 6 GC
        monsters.push(Monster(15, 1000, 1000, 10 ether)); // 10 GC
    }
    
    function createCharacter() external {
        require(characters[msg.sender].level == 0, "Character already exists");
        characters[msg.sender] = Character(1, 0, POWER_PER_LEVEL, 0, false);
        emit CharacterCreated(msg.sender);
    }
    
    function startHunting(uint256 monsterId) external nonReentrant {
        Character storage character = characters[msg.sender];
        require(character.level > 0, "Character does not exist");
        require(!character.isHunting, "Already hunting");
        require(monsterId < monsters.length, "Invalid monster");
        require(block.timestamp >= character.lastHuntTime + HUNT_COOLDOWN, "Hunting cooldown");
        
        Monster memory monster = monsters[monsterId];
        require(character.level >= monster.level, "Level too low");
        
        character.isHunting = true;
        character.lastHuntTime = block.timestamp;
        
        emit StartedHunting(msg.sender, monsterId);
    }
    
    function claimRewards(uint256 monsterId) external nonReentrant {
        Character storage character = characters[msg.sender];
        require(character.isHunting, "Not hunting");
        require(monsterId < monsters.length, "Invalid monster");
        
        Monster memory monster = monsters[monsterId];
        uint256 huntDuration = block.timestamp - character.lastHuntTime;
        uint256 powerMultiplier = character.power / POWER_PER_LEVEL;
        
        // 경험치와 보상 계산
        uint256 expReward = (monster.exp * powerMultiplier * huntDuration) / 1 hours;
        uint256 gcReward = (monster.gcReward * powerMultiplier * huntDuration) / 1 hours;
        
        // 경험치 적용 및 레벨업 체크
        character.exp += expReward;
        while (character.exp >= EXP_PER_LEVEL * character.level) {
            character.exp -= EXP_PER_LEVEL * character.level;
            character.level++;
            character.power = character.level * POWER_PER_LEVEL;
            emit LevelUp(msg.sender, character.level);
        }
        
        // GC 토큰 보상 민팅
        gcToken.mintReward(msg.sender, gcReward);
        
        character.isHunting = false;
        emit HuntingReward(msg.sender, expReward, gcReward);
    }
    
    function getCharacter(address player) external view returns (Character memory) {
        return characters[player];
    }
    
    function getMonsters() external view returns (Monster[] memory) {
        return monsters;
    }
    
    // 비상시 토큰 회수 (관리자 전용)
    function withdrawEmergency() external onlyOwner {
        uint256 balance = gcToken.balanceOf(address(this));
        require(gcToken.transfer(owner(), balance), "Emergency withdrawal failed");
    }
} 