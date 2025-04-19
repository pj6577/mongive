// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SlotMachine is Ownable {
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

    IERC20 public monToken;
    uint256 public constant MIN_BET = 1 ether; // 1 MON
    uint256 public constant MAX_BET = 100 ether; // 100 MON
    uint256 public constant HOUSE_EDGE = 5; // 5%
    uint256 public constant JACKPOT_POOL_PERCENTAGE = 10; // 10% of bets go to jackpot
    uint256 public constant OWNER_SHARE = 2; // 2% of bets go to owner

    // 심볼 정의
    enum Symbol {
        MON,
        GC3,
        JACKPOT,
        SEVEN,
        CHERRY,
        BAR
    }

    // 승리 조합과 배율
    struct WinCombination {
        Symbol[3] symbols;
        uint256 multiplier;
    }

    WinCombination[] public winCombinations;
    mapping(address => uint256) public consecutiveWins;
    uint256 public jackpotPool;
    uint256 public ownerPool;
    mapping(address => uint256) public lastWinTime;
    mapping(address => uint256) public allowances;

    event Spin(address indexed player, uint256 betAmount, uint8[3] result, uint256 winAmount);
    event Jackpot(address indexed player, uint256 amount);
    event JackpotPoolIncreased(uint256 amount);
    event OwnerPoolIncreased(uint256 amount);

    constructor(address _monToken, address initialOwner) Ownable(initialOwner) {
        _status = _NOT_ENTERED;
        monToken = IERC20(_monToken);
        
        // 승리 조합 설정
        winCombinations.push(WinCombination([Symbol.MON, Symbol.MON, Symbol.MON], 3));
        winCombinations.push(WinCombination([Symbol.GC3, Symbol.GC3, Symbol.GC3], 5));
        winCombinations.push(WinCombination([Symbol.SEVEN, Symbol.SEVEN, Symbol.SEVEN], 10));
        winCombinations.push(WinCombination([Symbol.CHERRY, Symbol.CHERRY, Symbol.CHERRY], 7));
        winCombinations.push(WinCombination([Symbol.BAR, Symbol.BAR, Symbol.BAR], 4));
        winCombinations.push(WinCombination([Symbol.JACKPOT, Symbol.JACKPOT, Symbol.JACKPOT], 100));
    }

    function depositJackpot(uint256 amount) external {
        require(monToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        jackpotPool += amount;
        emit JackpotPoolIncreased(amount);
    }

    function spin(uint256 betAmount) external nonReentrant {
        require(betAmount > 0, "Bet amount must be greater than 0");
        require(monToken.transferFrom(msg.sender, address(this), betAmount), "Token transfer failed");

        // Calculate owner share and update pools
        uint256 ownerShare = (betAmount * OWNER_SHARE) / 100;
        uint256 jackpotShare = (betAmount * JACKPOT_POOL_PERCENTAGE) / 100;
        uint256 houseEdge = (betAmount * HOUSE_EDGE) / 100;
        
        ownerPool += ownerShare;
        jackpotPool += jackpotShare;
        
        emit OwnerPoolIncreased(ownerShare);
        emit JackpotPoolIncreased(jackpotShare);

        // Generate random numbers
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        )));
        
        uint8[3] memory result;
        uint256 winAmount = 0;
        bool isWin = false;
        
        // Use single random number for all three slots
        for (uint i = 0; i < 3; i++) {
            result[i] = uint8((randomNumber >> (i * 8)) % 6);
        }

        // Check for wins
        if (result[0] == result[1] && result[1] == result[2]) {
            // Three of a kind
            isWin = true;
            if (result[0] == 0) { // MON
                winAmount = (betAmount * 10) / 100;
            } else if (result[0] == 1) { // GC3
                winAmount = (betAmount * 15) / 100;
            } else if (result[0] == 2) { // JACKPOT
                winAmount = jackpotPool;
                jackpotPool = 0;
            } else if (result[0] == 3) { // SEVEN
                winAmount = (betAmount * 20) / 100;
            } else if (result[0] == 4) { // CHERRY
                winAmount = (betAmount * 25) / 100;
            } else { // BAR
                winAmount = (betAmount * 30) / 100;
            }
        } else if (result[0] == result[1] || result[1] == result[2] || result[0] == result[2]) {
            // Two of a kind
            isWin = true;
            winAmount = (betAmount * 5) / 100;
        }

        // Apply consecutive wins bonus
        if (isWin) {
            winAmount += (winAmount * consecutiveWins[msg.sender] * 5) / 100;
            consecutiveWins[msg.sender]++;
        } else {
            consecutiveWins[msg.sender] = 0;
        }

        // Transfer winnings
        if (winAmount > 0) {
            require(monToken.transfer(msg.sender, winAmount), "Win transfer failed");
        }

        emit Spin(msg.sender, betAmount, result, winAmount);
    }

    function calculateWinAmount(Symbol[3] memory result, uint256 betAmount) internal view returns (uint256) {
        for (uint i = 0; i < winCombinations.length; i++) {
            if (compareSymbols(result, winCombinations[i].symbols)) {
                return betAmount * winCombinations[i].multiplier;
            }
        }
        return 0;
    }

    function compareSymbols(Symbol[3] memory a, Symbol[3] memory b) internal pure returns (bool) {
        return a[0] == b[0] && a[1] == b[1] && a[2] == b[2];
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= ownerPool, "Insufficient owner pool");
        require(monToken.transfer(owner(), amount), "Withdrawal failed");
        ownerPool -= amount;
    }

    function getWinCombinations() external view returns (WinCombination[] memory) {
        return winCombinations;
    }

    function getJackpotPool() external view returns (uint256) {
        return jackpotPool;
    }

    function getOwnerPool() external view returns (uint256) {
        return ownerPool;
    }
} 