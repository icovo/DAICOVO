pragma solidity ^0.4.19;

import "../token/ERC20/ERC20Interface.sol";
import "../math/SafeMath.sol";
import "./TokenSaleManager.sol";
import "../crowdsale/distribution/FinalizableCrowdsale.sol";
import "../crowdsale/validation/WhitelistedCrowdsale.sol";

/// @title Template for token sales.
/// @author ICOVO AG
/// @dev This contract is deployed and controlled by TokenSaleManager.
/// @dev This contract receives funds and transfer them to DAICO pool after being finalized.
contract TokenSale is FinalizableCrowdsale,
                      WhitelistedCrowdsale {
    using SafeMath for uint256;

    address public managerAddr; 
    address public poolAddr;
    bool public isInitialized = false;
    uint256 public timeLockRate;
    uint256 public timeLockEnd;
    uint256 public tokensMinted = 0;
    uint256 public tokensCap;
    uint256 public minAcceptableWei;
    bool public carryover;

    modifier onlyManager{
        require(msg.sender == managerAddr);
        _;
    }

    /// @dev Constructor.
    /// @param _rate Number of tokens issued with 1 ETH. [minimal unit of the token / ETH]
    /// @param _poolAddr The contract address of DaicoPool.
    /// @param _tokenAddr The contract address of a ERC20 token.
    /// @param _openingTime A timestamp of the date this sale will start.
    /// @param _closingTime A timestamp of the date this sale will end.
    /// @param _tokensCap Number of tokens to be sold. Can be 0 if it accepts carryover.
    /// @param _timeLockRate Specified rate of issued tokens will be locked. ex. 50 = 50%
    /// @param _timeLockEnd A timestamp of the date locked tokens will be released.
    /// @param _carryover If true, unsold tokens will be carryovered to next sale. 
    /// @param _minAcceptableWei Minimum contribution.
    /// @return 
    function TokenSale (
        uint256 _rate, /* The unit of rate is [nano tokens / ETH] in this contract */
        ERC20Interface _token,
        address _poolAddr,
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _tokensCap,
        uint256 _timeLockRate,
        uint256 _timeLockEnd,
        bool _carryover,
        uint256 _minAcceptableWei
    ) public Crowdsale(_rate, _poolAddr, _token) TimedCrowdsale(_openingTime, _closingTime) {
        managerAddr = msg.sender;
        poolAddr = _poolAddr;
        timeLockRate = _timeLockRate;
        timeLockEnd = _timeLockEnd;
        tokensCap = _tokensCap;
        carryover = _carryover;
        minAcceptableWei = _minAcceptableWei;
    }

    /// @dev Initialize the sale. If carryoverAmount is given, it added the tokens to be sold.
    /// @param carryoverAmount
    /// @return 
    function initialize(uint256 carryoverAmount) external onlyManager {
        require(!isInitialized);
        isInitialized = true;
        tokensCap = tokensCap.add(carryoverAmount);
    }

    /// @dev Finalize the sale. It transfers all the funds it has. Can be repeated.
    /// @return 
    function finalize() onlyOwner public {
        //require(!isFinalized);
        require(isInitialized);
        require(canFinalize());

        finalization();
        Finalized();

        isFinalized = true;
    }


    /// @dev Check if the sale can be finalized.
    /// @return True if closing time has come or tokens are sold out.
    function canFinalize() public constant returns(bool) {
        return (hasClosed() || (isInitialized && tokensCap <= tokensMinted));
    }

    /// @dev It transfers all the funds it has.
    /// @return 
    function finalization() internal {
        if(address(this).balance > 0){
            poolAddr.transfer(address(this).balance);
        }
    }

    /**
     * @dev Overrides delivery by minting tokens upon purchase.
     * @param _beneficiary Token purchaser
     * @param _tokenAmount Number of tokens to be minted
     * @return
     */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
        //require(tokensMinted.add(_tokenAmount) <= tokensCap);
        require(tokensMinted < tokensCap);

        uint256 time_locked = _tokenAmount.mul(timeLockRate).div(100); 
        uint256 instant = _tokenAmount.sub(time_locked);

        if (instant > 0) {
            require(TokenSaleManager(managerAddr).mint(_beneficiary, instant));
        }
        if (time_locked > 0) {
            require(TokenSaleManager(managerAddr).mintTimeLocked(
                _beneficiary,
                time_locked,
                timeLockEnd
            ));
        }
  
        tokensMinted = tokensMinted.add(_tokenAmount);
    }

    /// @dev Overrides _forwardFunds to do nothing. 
    /// @return
    function _forwardFunds() internal {}

    /// @dev Overrides _preValidatePurchase to check minimam contribution and initialization.
    /// @return
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        require(isInitialized);
        require(_weiAmount >= minAcceptableWei);
    }

    /**
     * @dev Overridden in order to change the unit of rate with [nano toekns / ETH]
     * instead of original [minimal unit of the token / wei].
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
      return _weiAmount.mul(rate).div(10**18); //The unit of rate is [nano tokens / ETH].
    }

}
