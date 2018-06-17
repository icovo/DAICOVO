require('date-utils');

var OVOToken = artifacts.require("./OVOToken.sol");
var ERC20Interface = artifacts.require("./ERC20Interface.sol");
var TokenController = artifacts.require("./TokenController.sol");
var MintableToken = artifacts.require("./MintableToken.sol");
var TimeLockPool = artifacts.require("./TimeLockPool.sol");

const ERROR_PREFIX = "VM Exception while processing transaction: ";

contract('TimeLockPool test', async (accounts) => {
  var founder = accounts[0];
  var investor1 = accounts[1];
  var investor2 = accounts[2];
  var investor3 = accounts[3];
  var investor4 = accounts[4];
  var investor5 = accounts[5];

  it("Transfer ownership.", async () => {
    let token = await OVOToken.deployed();
    let tc = await TokenController.deployed();

    await token.transferOwnership(tc.address, {from:founder});

    let returned = await token.owner();
    let expected = tc.address;
    assert.equal(returned, expected);
  })

  it("Withdraw test. Should be reverted.", async () => {
    let token = await OVOToken.deployed();
    let tlp = await TimeLockPool.deployed();

    try{
       await tlp.withdraw(investor2, token.address, {from:investor2});
       assert(false);
    }catch(error){
        assert(error);
        assert(error.message.startsWith(ERROR_PREFIX + "revert"), "got '" + error.message);
       /* test passed */
    }
  })

  it("Deposit ERC20 test", async () => {
    let tc = await TokenController.deployed();
    let tlp = await TimeLockPool.deployed();
    let token = await OVOToken.deployed();

    let amountBefore = parseInt(await tlp.getLockedBalanceOf(investor2, token.address));
    let amountDistribute = 5 * 10**9;
    let releaseTime = parseInt(Date.now()/1000) + 300;
 
    assert( await tc.mint(founder, amountDistribute, {from: founder}) != 0x0);
    assert( await token.approve(tlp.address, amountDistribute, {from: founder}) != 0x0);
    assert( await tlp.depositERC20(token.address, investor2, amountDistribute, releaseTime, {from: founder}) != 0x0);

    let returned1 = await tlp.getLockedBalanceOf(investor2, token.address);
    let expected1 = amountBefore + amountDistribute;
    assert.equal(returned1, expected1);

    let returned2 = await tlp.getNextReleaseTimeOf(investor2, token.address);
    let expected2 = releaseTime;
    assert.equal(returned2, expected2);
  })

  it("Deposit ETH test", async () => {
    let tlp = await TimeLockPool.deployed();

    let amountBefore = parseInt(await tlp.getLockedBalanceOf(investor2, '0x0'));
    let amountDeposit = 6 * 10**9;
    let releaseTime = parseInt(Date.now()/1000) + 300;

    assert( await tlp.depositETH(investor2, releaseTime, {from: founder, value: amountDeposit}) != 0x0);

    let returned = await tlp.getLockedBalanceOf(investor2, '0x0');
    let expected = amountBefore + amountDeposit;
    assert.equal(returned, expected);

    let returned2 = await tlp.getNextReleaseTimeOf(investor2, '0x0');
    let expected2 = releaseTime;
    assert.equal(returned2, expected2);
  })

  it("Withdraw ERC20 test", async () => {
    let tc = await TokenController.deployed();
    let tlp = await TimeLockPool.deployed();
    let token = await OVOToken.deployed();

    let amountBefore = parseInt(await tlp.getAvailableBalanceOf(investor3, token.address));
    let amountDistribute = 5 * 10**9;
    let releaseTime = parseInt(Date.now()/1000) - 300;
 
    assert( await tc.mint(founder, amountDistribute, {from: founder}) != 0x0);
    assert( await token.approve(tlp.address, amountDistribute, {from: founder}) != 0x0);
    assert( await tlp.depositERC20(token.address, investor3, amountDistribute, releaseTime, {from: founder}) != 0x0);

    let returned1 = await tlp.getAvailableBalanceOf(investor3, token.address);
    let expected1 = amountBefore + amountDistribute;
    assert.equal(returned1, expected1);

    let balanceBefore = parseInt(await token.balanceOf(investor3));

    assert( await tlp.withdraw(investor3, token.address, {from: investor3}) != 0x0);

    let returned2 = await tlp.getAvailableBalanceOf(investor3, token.address);
    let expected2 = 0;
    assert.equal(returned2, expected2);

    let returned3 = await token.balanceOf(investor3);
    let expected3 = balanceBefore + amountDistribute + amountBefore;
    assert.equal(returned3, expected3);
  })

  it("Withdraw ETH test", async () => {
    let tlp = await TimeLockPool.deployed();
    let token = await OVOToken.deployed();

    let availableBalanceBefore = parseInt(await tlp.getAvailableBalanceOf(investor3, '0x0'));
    let amountDistribute = 7 * 10**9;
    let releaseTime = parseInt(Date.now()/1000) - 300;
 
    assert( await tlp.depositETH(investor3, releaseTime, {from: founder, value:amountDistribute}) != 0x0);

    let returned1 = await tlp.getAvailableBalanceOf(investor3, '0x0');
    let expected1 = availableBalanceBefore + amountDistribute;
    assert.equal(returned1, expected1);

    let balanceBefore = parseInt(await web3.eth.getBalance(investor3));

    assert( await tlp.withdraw(investor3, '0x0', {from: founder}) != 0x0);

    let returned2 = await tlp.getAvailableBalanceOf(investor3, '0x0');
    let expected2 = 0;
    assert.equal(returned2, expected2);

    let returned3 = parseInt(await web3.eth.getBalance(investor3));
    let expected3 = balanceBefore + amountDistribute;
    assert.isAbove(returned3, expected3*0.99);
  })

});


