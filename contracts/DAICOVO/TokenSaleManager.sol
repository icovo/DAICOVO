pragma solidity ^0.4.24;

import "./TokenController.sol";
import "./TimeLockPool.sol";
import "./TokenSale.sol";
import "../crowdsale/distribution/FinalizableCrowdsale.sol";
import "../crowdsale/validation/WhitelistedCrowdsale.sol";
import "./PoolAndSaleInterface.sol";
import "../math/SafeMath.sol";


/// @title A contract which manages the token sales.
/// @author ICOVO AG
/// @dev This contract is the owner of the token sales so that they are set up vit this manager.
contract TokenSaleManager is Ownable {
    using SafeMath for uint256;

    ERC20Interface public token;
    address public poolAddr;
    address public tokenControllerAddr;
    address public timeLockPoolAddr;
    address[] public tokenSales;
    mapping( address => bool ) public tokenSaleIndex;
    bool public isStarted = false;
    bool public isFinalized = false;

    modifier onlyDaicoPool {
        require(msg.sender == poolAddr);
        _;
    }

    modifier onlyTokenSale {
        require(tokenSaleIndex[msg.sender]);
        _;
    }

    /// @dev Constructor. It set the DaicoPool to receive the starting signal from this contract.
    /// @param _tokenControllerAddr The contract address of TokenController.
    /// @param _timeLockPoolAddr The contract address of a TimeLockPool.
    /// @param _daicoPoolAddr The contract address of DaicoPool.
    /// @param _token The contract address of a ERC20 token.
    constructor (
        address _tokenControllerAddr,
        address _timeLockPoolAddr,
        address _daicoPoolAddr,
        ERC20Interface _token
    ) public {
        require(_tokenControllerAddr != address(0x0));
        tokenControllerAddr = _tokenControllerAddr;

        require(_timeLockPoolAddr != address(0x0));
        timeLockPoolAddr = _timeLockPoolAddr;

        token = _token;

        poolAddr = _daicoPoolAddr;
        require(PoolAndSaleInterface(poolAddr).votingTokenAddr() == address(token));
        PoolAndSaleInterface(poolAddr).setTokenSaleContract(this);

    }

    /// @dev This contract doen't receive any ETH.
    function() external payable {
        revert();
    }

    /// @dev Add a new token sale with specific parameters. New sale should start
    /// @dev after the previous one closed.
    /// @param openingTime A timestamp of the date this sale will start.
    /// @param closingTime A timestamp of the date this sale will end.
    /// @param tokensCap Number of tokens to be sold. Can be 0 if it accepts carryover.
    /// @param rate Number of tokens issued with 1 ETH. [minimal unit of the token / ETH]  
    /// @param carryover If true, unsold tokens will be carryovered to next sale. 
    /// @param timeLockRate Specified rate of issued tokens will be locked. ex. 50 = 50%
    /// @param timeLockEnd A timestamp of the date locked tokens will be released.
    /// @param minAcceptableWei Minimum contribution.
    function addTokenSale (
        uint256 openingTime,
        uint256 closingTime,
        uint256 tokensCap,
        uint256 rate,
        bool carryover,
        uint256 timeLockRate,
        uint256 timeLockEnd,
        uint256 minAcceptableWei
    ) external onlyOwner {
        require(!isStarted);
        require(
            tokenSales.length == 0 ||
            TimedCrowdsale(tokenSales[tokenSales.length-1]).closingTime() < openingTime
        );

        require(TokenController(tokenControllerAddr).state() == TokenController.State.Init);

        tokenSales.push(new TokenSale(
            rate,
            token,
            poolAddr,
            openingTime,
            closingTime,
            tokensCap,
            timeLockRate,
            timeLockEnd,
            carryover,
            minAcceptableWei
        ));
        tokenSaleIndex[tokenSales[tokenSales.length-1]] = true;

    }

    /// @dev Initialize the tokensales. No other sales can be added after initialization.
    /// @return True if successful, revert otherwise.
    function initialize () external onlyOwner returns (bool) {
        require(!isStarted);
        TokenSale(tokenSales[0]).initialize(0);
        isStarted = true;
    }

    /// @dev Request TokenController to mint new tokens. This function is only called by 
    /// @dev token sales.
    /// @param _beneficiary The address to receive the new tokens.
    /// @param _tokenAmount Token amount to be minted.
    /// @return True if successful, revert otherwise.
    function mint (
        address _beneficiary,
        uint256 _tokenAmount
    ) external onlyTokenSale returns(bool) {
        require(isStarted && !isFinalized);
        require(TokenController(tokenControllerAddr).mint(_beneficiary, _tokenAmount));
        return true;
    }

    /// @dev Mint new tokens with time-lock. This function is only called by token sales.
    /// @param _beneficiary The address to receive the new tokens.
    /// @param _tokenAmount Token amount to be minted.
    /// @param _releaseTime A timestamp of the date locked tokens will be released.
    /// @return True if successful, revert otherwise.
    function mintTimeLocked (
        address _beneficiary,
        uint256 _tokenAmount,
        uint256 _releaseTime
    ) external onlyTokenSale returns(bool) {
        require(isStarted && !isFinalized);
        require(TokenController(tokenControllerAddr).mint(this, _tokenAmount));
        require(ERC20Interface(token).approve(timeLockPoolAddr, _tokenAmount));
        require(TimeLockPool(timeLockPoolAddr).depositERC20(
            token,
            _beneficiary,
            _tokenAmount,
            _releaseTime
        ));
        return true;
    }

    /// @dev Adds single address to whitelist of all token sales.
    /// @param _beneficiary Address to be added to the whitelist
    function addToWhitelist(address _beneficiary) external onlyOwner {
        require(isStarted);
        for (uint256 i = 0; i < tokenSales.length; i++ ) {
            WhitelistedCrowdsale(tokenSales[i]).addToWhitelist(_beneficiary);
        }
    }

    /// @dev Adds multiple addresses to whitelist of all token sales.
    /// @param _beneficiaries Addresses to be added to the whitelist
    function addManyToWhitelist(address[] _beneficiaries) external onlyOwner {
        require(isStarted);
        for (uint256 i = 0; i < tokenSales.length; i++ ) {
            WhitelistedCrowdsale(tokenSales[i]).addManyToWhitelist(_beneficiaries);
        }
    }


    /// @dev Finalize the specific token sale. Can be done if end date has come or 
    /// @dev all tokens has been sold out. It process carryover if it is set.
    /// @param _indexTokenSale index of the target token sale. 
    function finalize (uint256 _indexTokenSale) external {
        require(isStarted && !isFinalized);
        TokenSale ts = TokenSale(tokenSales[_indexTokenSale]);

        if (ts.canFinalize()) {
            ts.finalize();
            uint256 carryoverAmount = 0;
            if (ts.carryover() &&
                ts.tokensCap() > ts.tokensMinted() &&
                _indexTokenSale.add(1) < tokenSales.length) {
                carryoverAmount = ts.tokensCap().sub(ts.tokensMinted());
            } 
            if(_indexTokenSale.add(1) < tokenSales.length) {
                TokenSale(tokenSales[_indexTokenSale.add(1)]).initialize(carryoverAmount);
            }
        }

    }

    /// @dev Finalize the manager. Can be done if all token sales are already finalized.
    /// @dev It makes the DaicoPool open the TAP.
    function finalizeTokenSaleManager () external{
        require(isStarted && !isFinalized);
        for (uint256 i = 0; i < tokenSales.length; i++ ) {
            require(FinalizableCrowdsale(tokenSales[i]).isFinalized());
        }
        require(TokenController(tokenControllerAddr).closeTokensale());
        isFinalized = true;
        PoolAndSaleInterface(poolAddr).startProject();
    }
}

