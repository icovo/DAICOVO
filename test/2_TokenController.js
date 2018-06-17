require('date-utils');

var OVOToken = artifacts.require("./OVOToken.sol");
var ERC20Interface = artifacts.require("./ERC20Interface.sol");
var TokenController = artifacts.require("./TokenController.sol");
var MintableToken = artifacts.require("./MintableToken.sol");
var TimeLockPool = artifacts.require("./TimeLockPool.sol");

contract('TokenController test', async (accounts) => {
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

  it("Init test - state", async () => {
    let tc = await TokenController.deployed();

    let returned1 = await tc.isStateInit.call();
    let expected1 = true;
    assert.equal(returned1, expected1);

    let returned2 = await tc.isStateTokensale.call();
    let expected2 = false;
    assert.equal(returned2, expected2);

    let returned3 = await tc.isStatePublic.call();
    let expected3 = false;
    assert.equal(returned3, expected3);
  })

  it("Distribution test", async () => {
    let tc = await TokenController.deployed();
    let token_addr =  await tc.targetToken();
    let token = await ERC20Interface.at(token_addr);

    let amountBefore = parseInt(await token.balanceOf(investor1));
    let amountDistribute = 15 * 10**(9-1);
    
    assert( await tc.mint(investor1, amountDistribute, {from: founder}) != 0x0 );

    let returned = await token.balanceOf(investor1);
    let expected = amountBefore + amountDistribute;
    assert.equal(returned, expected);
  })

  it("Time-locked distribution test", async () => {
    let tc = await TokenController.deployed();
    let tlp = await TimeLockPool.deployed();
    let token_addr =  await tc.targetToken();
    let token = await ERC20Interface.at(token_addr);

    let amountBefore = parseInt(await tlp.getLockedBalanceOf(investor1, token_addr));
    let amountDistribute = 225 * 10**(9-2);
    
    assert( await tc.mint(founder, amountDistribute, {from: founder}) != 0x0);
    assert( await token.approve(tlp.address, amountDistribute, {from: founder}) != 0x0);
    assert( await tlp.depositERC20(token_addr, investor1, amountDistribute, (Date.now()/1000) +300, {from: founder}) != 0x0);

    let returned = await tlp.getLockedBalanceOf(investor1, token_addr);
    let expected = amountBefore + amountDistribute;
    assert.equal(returned, expected);
  })

});


