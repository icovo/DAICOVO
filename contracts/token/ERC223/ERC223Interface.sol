pragma solidity ^0.4.24;

/**
 * Released under the MIT license.
 * https://github.com/Dexaran/ERC223-token-standard/blob/master/LICENSE
*/

contract ERC223Interface {
    function totalSupply() external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value, bytes data) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}

