// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UsBeyondNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UsBeyondFactory is Ownable {
    event CollectionCreated(address indexed collectionAddress, address indexed owner, string name, string symbol);

    struct CollectionInfo {
        address collectionAddress;
        string name;
        string symbol;
        address owner;
        uint256 createdAt;
    }

    CollectionInfo[] public collections;
    mapping(address => address[]) public userCollections;

    constructor() Ownable(msg.sender) {}

    function createCollection(string memory name, string memory symbol) external returns (address) {
        // Deploy new NFT contract
        UsBeyondNFT newCollection = new UsBeyondNFT(name, symbol, msg.sender);
        
        address collectionAddr = address(newCollection);
        
        // Store metadata
        CollectionInfo memory info = CollectionInfo({
            collectionAddress: collectionAddr,
            name: name,
            symbol: symbol,
            owner: msg.sender,
            createdAt: block.timestamp
        });
        
        collections.push(info);
        userCollections[msg.sender].push(collectionAddr);

        emit CollectionCreated(collectionAddr, msg.sender, name, symbol);

        return collectionAddr;
    }

    function getCollectionsByOwner(address owner) external view returns (address[] memory) {
        return userCollections[owner];
    }
    
    function getAllCollections() external view returns (CollectionInfo[] memory) {
        return collections;
    }
}
