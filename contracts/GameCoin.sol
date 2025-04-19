// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GameCoin is ERC20, ERC20Permit, Ownable {
    // 게임 컨트랙트 주소
    address public gameContract;

    constructor() ERC20("GameCoin", "GC") ERC20Permit("GameCoin") Ownable(msg.sender) {
        // 초기 발행량: 1,000,000,000 GC (10억개)
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }

    // 게임 컨트랙트 설정 (관리자 전용)
    function setGameContract(address _gameContract) external onlyOwner {
        gameContract = _gameContract;
    }

    // 게임 보상 민팅 (게임 컨트랙트만 호출 가능)
    function mintReward(address player, uint256 amount) external {
        require(msg.sender == gameContract, "Only game contract can mint rewards");
        _mint(player, amount);
    }
} 