pragma solidity ^0.4.24;

import "./DaicovoStandardToken.sol";

/**
 * @title OVO Token
 * @dev ERC20, ERC223 compliant mintable token.
 */
contract OVOToken is DaicovoStandardToken {
    constructor () public DaicovoStandardToken("ICOVO", "OVO", 9) {
    }
}
