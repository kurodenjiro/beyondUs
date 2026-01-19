// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UsBeyondNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    constructor(
        string memory name, 
        string memory symbol, 
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        _nextTokenId = 1; // Start ID at 1
    }

    function mint(address to, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
    
    // Override to return supported interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
