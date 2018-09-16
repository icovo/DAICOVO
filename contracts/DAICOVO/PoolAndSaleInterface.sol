pragma solidity ^0.4.24;

contract PoolAndSaleInterface {
    address public tokenSaleAddr;
    address public votingAddr;
    address public votingTokenAddr;
    uint256 public tap;
    uint256 public initialTap;
    uint256 public initialRelease;

    function setTokenSaleContract(address _tokenSaleAddr) external;
    function startProject() external;
}
