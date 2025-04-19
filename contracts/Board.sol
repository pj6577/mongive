// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Board is Ownable {
    struct Post {
        address author;
        string authorNickname;
        string title;
        string content;
        uint256 timestamp;
        uint256 likes;
        uint256 monAmount;
    }

    IERC20 public monToken;
    Post[] public posts;
    mapping(address => string) public nicknames;
    uint256 public totalFees;
    
    uint256 public constant MAX_TITLE_LENGTH = 50;
    uint256 public constant MAX_CONTENT_LENGTH = 500;
    uint256 public constant MAX_NICKNAME_LENGTH = 20;

    event PostCreated(uint256 indexed postId, address indexed author, uint256 monAmount);
    event PostLiked(uint256 indexed postId, address indexed liker);
    event NicknameSet(address indexed user, string nickname);

    constructor(address initialOwner, address _monToken) Ownable(initialOwner) {
        monToken = IERC20(_monToken);
    }

    function setNickname(string memory _nickname) external {
        require(bytes(_nickname).length > 0, "Nickname cannot be empty");
        require(bytes(_nickname).length <= MAX_NICKNAME_LENGTH, "Nickname too long");
        nicknames[msg.sender] = _nickname;
        emit NicknameSet(msg.sender, _nickname);
    }

    function createPost(string memory _title, string memory _content, uint256 _monAmount) public {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_content).length > 0, "Content cannot be empty");
        require(bytes(_title).length <= 50, "Title too long");
        require(bytes(_content).length <= 500, "Content too long");

        // 모나드 토큰 할당이 0보다 큰 경우에만 전송
        if (_monAmount > 0) {
            require(monToken.transferFrom(msg.sender, address(this), _monAmount), "MON token transfer failed");
            uint256 fee = (_monAmount * 3) / 100; // 3% 수수료
            totalFees += fee;
        }

        uint256 postId = posts.length;
        posts.push(Post({
            author: msg.sender,
            authorNickname: nicknames[msg.sender],
            title: _title,
            content: _content,
            timestamp: block.timestamp,
            likes: 0,
            monAmount: _monAmount
        }));

        emit PostCreated(postId, msg.sender, _monAmount);
    }

    function getPost(uint256 _postId) external view returns (
        address author,
        string memory authorNickname,
        string memory title,
        string memory content,
        uint256 timestamp,
        uint256 likes,
        uint256 monAmount
    ) {
        require(_postId < posts.length, "Post does not exist");
        Post memory post = posts[_postId];
        return (
            post.author,
            post.authorNickname,
            post.title,
            post.content,
            post.timestamp,
            post.likes,
            post.monAmount
        );
    }

    function getPostCount() external view returns (uint256) {
        return posts.length;
    }

    function getTopPosts() external view returns (uint256[] memory) {
        uint256 length = posts.length;
        uint256[] memory postIds = new uint256[](length);
        
        // 초기 ID 배열 생성
        for (uint256 i = 0; i < length; i++) {
            postIds[i] = i;
        }

        // 버블 정렬 대신 선택 정렬을 사용하여 오버플로우 방지
        for (uint256 i = 0; i < length - 1; i++) {
            uint256 maxIndex = i;
            for (uint256 j = i + 1; j < length; j++) {
                if (posts[postIds[j]].monAmount > posts[postIds[maxIndex]].monAmount) {
                    maxIndex = j;
                }
            }
            if (maxIndex != i) {
                uint256 temp = postIds[i];
                postIds[i] = postIds[maxIndex];
                postIds[maxIndex] = temp;
            }
        }

        return postIds;
    }

    function likePost(uint256 _postId) external {
        require(_postId < posts.length, "Post does not exist");
        posts[_postId].likes++;
        emit PostLiked(_postId, msg.sender);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = totalFees;
        totalFees = 0;
        require(monToken.transfer(owner(), amount), "Fee transfer failed");
    }
} 