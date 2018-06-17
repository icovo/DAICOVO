require('date-utils');

var OVOToken = artifacts.require("./OVOToken.sol");
var MintableToken = artifacts.require("./MintableToken.sol");
var TimeLockPool = artifacts.require("./TimeLockPool.sol");

const ERROR_PREFIX = "VM Exception while processing transaction: ";


contract('Token test', async (accounts) => {
  var founder = accounts[0];
  var investor1 = accounts[1];
  var investor2 = accounts[2];
  var investor3 = accounts[3];
  var investor4 = accounts[4];
  var investor5 = accounts[5];

  /* Token test */

  it("Token ownership.", async () => {
    let token = await OVOToken.deployed();

    let returned = await token.owner();
    let expected = founder;
    assert.equal(returned, expected);
  })

  it("Token total supply", async () => {
    let token = await OVOToken.deployed();

    let returned = await token.totalSupply();
    let expected = 0;
    assert.equal(returned, expected);
  })

  it("Token name, symbol, decimals", async () => {
    let token = await OVOToken.deployed();

    let returned1 = await token.name();
    let expected1 = 'ICOVO'
    assert.equal(returned1, expected1);
    let returned2 = await token.symbol();
    let expected2 = 'OVO'
    assert.equal(returned2, expected2);
    let returned3 = await token.decimals();
    let expected3 = 9
    assert.equal(returned3, expected3);
  })

  it("Token minting", async () => {
    let token = await OVOToken.deployed();
    let amount = 100 * 10**9 

    let returned1 = await token.mint(investor1, amount, {from:founder});
    let expected1 = true;
    assert(returned1, expected1);

    let returned2 = await token.balanceOf(investor1);
    let expected2 = amount;
    assert(returned2, expected2);
  })
  
  it("Token transfer(ERC overridden, 2 arguments) to EOA", async () => {
    let token = await OVOToken.deployed();
    let amountInit = await token.balanceOf(investor1);
    let amountTransfer = 4 * 10**9;

    await token.transfer(investor2, amountTransfer, {from:investor1});

    let returned1 = await token.balanceOf(investor1);
    let expected1 = amountInit - amountTransfer;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor2);
    let expected2 = amountTransfer;
    assert.equal(returned2, expected2);
  })

  it("Token transfer(ERC223 overridden, 2 arguments) to a contract which doesn't has tokenFallback()", async () => {
    let token = await OVOToken.deployed();
    let tlp = await TimeLockPool.deployed();
    let amountInit = await token.balanceOf(investor1);
    let amountTransfer = 3 * 10**9;

    try{
       await token.transfer(tlp.address, amountTransfer, {from:investor1});
       assert(false);
    }catch(error){
        assert(error);
        assert(error.message.startsWith(ERROR_PREFIX + "revert"), "got '" + error.message);
       /* test passed */
    }
  })

  /* should also be tested to a contract which has tokenFallback() */

  /* Cannot test functions which has same name with different number of aruments. */
/*
  it("Token transfer(ERC overridden, 3 arguments) to EOA", async () => {
    let token = await OVOToken.deployed();
    let amountInit = await token.balanceOf(investor1);
    let amountTransfer = 4 * 10**9;

    await token.transfer(investor3, amountTransfer, "test", {from:investor1});

    let returned1 = await token.balanceOf(investor1);
    let expected1 = amountInit - amountTransfer;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor3);
    let expected2 = amountTransfer;
    assert.equal(returned2, expected2);
  })

  it("Token transfer(ERC223 overridden, 3 arguments) to a contract which doesn't has tokenFallback()", async () => {
    let token = await OVOToken.deployed();
    let tlp = await TimeLockPool.deployed();
    let amountInit = await token.balanceOf(investor1);
    let amountTransfer = 3 * 10**9;

    try{
       await token.transfer(tlp.address, amountTransfer, "test", {from:investor1});
       assert(false);
    }catch(error){
        assert(error);
        assert(error.message.startsWith(ERROR_PREFIX + "revert"), "got '" + error.message);
    }
  })
*/

  /* should also be tested to a contract which has tokenFallback() */


  it("Token forceTransfer to EOA", async () => {
    let token = await OVOToken.deployed();
    let amountInit = await token.balanceOf(investor1);
    let amountTransfer = 4 * 10**9;

    await token.forceTransfer(investor4, amountTransfer, {from:investor1});

    let returned1 = await token.balanceOf(investor1);
    let expected1 = amountInit - amountTransfer;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor4);
    let expected2 = amountTransfer;
    assert.equal(returned2, expected2);
  })

  it("Token forceTransfer to a contract which doesn't has tokenFallback()", async () => {
    let token = await OVOToken.deployed();
    let tlp = await TimeLockPool.deployed();
    let amountInit = await token.balanceOf(investor1);
    let amountTransfer = 3 * 10**9;

    await token.forceTransfer(tlp.address, amountTransfer, {from:investor1});

    let returned1 = await token.balanceOf(investor1);
    let expected1 = amountInit - amountTransfer;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(tlp.address);
    let expected2 = amountTransfer;
    assert.equal(returned2, expected2);
  })

  /* should also be tested to a contract which has tokenFallback() */

});

