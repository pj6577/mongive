// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    struct Poll {
        string title;
        string description;
        string[] options;
        uint256[] votes;
        uint256 totalVotes;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        mapping(address => bool) hasVoted;
    }

    IERC20 public monToken;
    uint256 public minVoteAmount;
    uint256 public pollCount;
    mapping(uint256 => Poll) public polls;

    event PollCreated(uint256 indexed pollId, string title, uint256 startTime, uint256 endTime);
    event Voted(uint256 indexed pollId, address indexed voter, uint256 optionIndex, uint256 amount);
    event PollEnded(uint256 indexed pollId);

    constructor(address _monToken, uint256 _minVoteAmount, address initialOwner) Ownable(initialOwner) {
        monToken = IERC20(_monToken);
        minVoteAmount = _minVoteAmount;
    }

    function createPoll(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _duration
    ) external onlyOwner {
        require(_options.length >= 2, "At least 2 options required");
        require(_duration > 0, "Duration must be positive");

        uint256 pollId = pollCount++;
        Poll storage poll = polls[pollId];
        
        poll.title = _title;
        poll.description = _description;
        poll.options = _options;
        poll.votes = new uint256[](_options.length);
        poll.startTime = block.timestamp;
        poll.endTime = block.timestamp + _duration;
        poll.isActive = true;

        emit PollCreated(pollId, _title, poll.startTime, poll.endTime);
    }

    function vote(uint256 _pollId, uint256 _optionIndex, uint256 _amount) external {
        Poll storage poll = polls[_pollId];
        require(poll.isActive, "Poll is not active");
        require(block.timestamp >= poll.startTime && block.timestamp <= poll.endTime, "Voting period has ended");
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(_optionIndex < poll.options.length, "Invalid option");
        require(_amount >= minVoteAmount, "Amount below minimum");

        require(monToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        poll.votes[_optionIndex] += _amount;
        poll.totalVotes += _amount;
        poll.hasVoted[msg.sender] = true;

        emit Voted(_pollId, msg.sender, _optionIndex, _amount);
    }

    function endPoll(uint256 _pollId) external onlyOwner {
        Poll storage poll = polls[_pollId];
        require(poll.isActive, "Poll already ended");
        require(block.timestamp > poll.endTime, "Voting period not ended");

        poll.isActive = false;
        emit PollEnded(_pollId);
    }

    function getPollResults(uint256 _pollId) external view returns (
        string memory title,
        string memory description,
        string[] memory options,
        uint256[] memory votes,
        uint256 totalVotes,
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) {
        Poll storage poll = polls[_pollId];
        return (
            poll.title,
            poll.description,
            poll.options,
            poll.votes,
            poll.totalVotes,
            poll.startTime,
            poll.endTime,
            poll.isActive
        );
    }

    function withdrawTokens() external onlyOwner {
        uint256 balance = monToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(monToken.transfer(owner(), balance), "Transfer failed");
    }
} 