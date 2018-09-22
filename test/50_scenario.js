require('date-utils');

utils = require('./utilities.js');

var OVOToken = artifacts.require("./OVOToken.sol");
var ERC20Interface = artifacts.require("./ERC20Interface.sol");
var TokenController = artifacts.require("./TokenController.sol");
var MintableToken = artifacts.require("./MintableToken.sol");
var TimeLockPool = artifacts.require("./TimeLockPool.sol");
var TokenSaleManager = artifacts.require("./TokenSaleManager.sol");
var TokenSale = artifacts.require("./TokenSale.sol");
var DaicoPool = artifacts.require("./DaicoPool.sol");
var Voting = artifacts.require("./Voting.sol");

contract('Scenario test', async (accounts) => {
  var founder = accounts[0];
  var investor1 = accounts[1];
  var investor2 = accounts[2];
  var investor3 = accounts[3];
  var investor4 = accounts[4];
  var investor5 = accounts[5];

  var initialTap = 13503 * 10**11;
  var initialRelease = 9000;

  var sale1_term = 15 * 24 * 3600;
  var time_between_sale1and2 = 21 * 24 * 3600;
  var sale2_term = 30 * 24 * 3600;

  var tokensCap1 = 20 * 10**6 * 10**9;
  var rate1 = 933 * 10**9 // [nano tokens / ETH]
  var amountSend1 = Math.round(tokensCap1 / rate1)  + 1;

  var tokensCap2 = 80 * 10**6 * 10**9;
  var rate2 = 666 * 10**9 // [nano tokens / ETH]
  var amountSend2 = Math.round(tokensCap2 / rate2)  + 1;

  var raisedEthInClosedsale = 6500;

  it("Transfer ownership.", async () => {
    let token = await OVOToken.deployed();
    let tc = await TokenController.deployed();

    await token.transferOwnership(tc.address, {from:founder});

    let returned = await token.owner();
    let expected = tc.address;
    assert.equal(returned, expected);
  })

  it("Distribution", async () => {
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

  it("Time-locked distribution", async () => {
    let tc = await TokenController.deployed();
    let tlp = await TimeLockPool.deployed();
    let token_addr =  await tc.targetToken();
    let token = await ERC20Interface.at(token_addr);

    let amountBefore = parseInt(await tlp.getLockedBalanceOf(investor1, token_addr));
    let amountDistribute = 225 * 10**(9-2);
    
    assert( await tc.mint(founder, amountDistribute, {from: founder}) != 0x0);
    assert( await token.approve(tlp.address, amountDistribute, {from: founder}) != 0x0);
    let timestamp = await web3.eth.getBlock('latest').timestamp;
    assert( await tlp.depositERC20(token_addr, investor1, amountDistribute, timestamp +300, {from: founder}) != 0x0);

    let returned = await tlp.getLockedBalanceOf(investor1, token_addr);
    let expected = amountBefore + amountDistribute;
    assert.equal(returned, expected);
  })

  it("Token Sales setup", async () => {
    let tsm = await TokenSaleManager.deployed();
    let timestamp = await web3.eth.getBlock('latest').timestamp;

    var openingTime1 = timestamp + 5;
    var closingTime1 = openingTime1 + sale1_term;
    var carryover1 = true;
    var timeLockRate1 = 40;
    var timeLockEnd1 = openingTime1 + sale1_term;
    var minAcceptableWei1 = 50 * 10**16;

    var openingTime2 = closingTime1 + time_between_sale1and2;
    var closingTime2 = openingTime2 + sale2_term;
    var carryover2 = false;
    var timeLockRate2 = 0;
    var timeLockEnd2 = 0;
    var minAcceptableWei2 = 25 * 10**16;

    await tsm.addTokenSale(
        openingTime1,
        closingTime1,
        tokensCap1,
        rate1,
        carryover1,
        timeLockRate1,
        timeLockEnd1,
        minAcceptableWei1,
        {from: founder}
    );

    //5 sec past
    await utils.increaseTime(5);

    await tsm.addTokenSale(
        openingTime2,
        closingTime2,
        tokensCap2,
        rate2,
        carryover2,
        timeLockRate2,
        timeLockEnd2,
        minAcceptableWei2,
        {from: founder}
    );

    let returned1 = await tsm.tokenSales(0);
    let returned2 = await tsm.tokenSales(1);
    assert(returned1 != '0x0' );
    assert(returned2 != '0x0' );
  })

  it("Deposit funds raised in closed sale.", async () => {
    let pool = await DaicoPool.deployed();

    await pool.sendTransaction({value:web3.toWei(raisedEthInClosedsale,"Ether"), from: founder});
 
    let returned = web3.fromWei(await web3.eth.getBalance(pool.address));
    let expected = raisedEthInClosedsale;
    assert.equal(returned, expected);
  })

  it("Initialization.", async () => {
    let tsm = await TokenSaleManager.deployed();

    await tsm.initialize();

    let returned = await tsm.isStarted();
    let expected = true;
    assert.equal(returned, expected);

  })

  it("Distribution", async () => {
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


  it("Start TokenSale mode.", async () => {
    let tc = await TokenController.deployed();

    await tc.openTokensale(TokenSaleManager.address, {from: founder});

    let returned = await tc.isStateTokensale();
    let expected = true;
    assert.equal(returned, expected);
  })

  it("Whitelist registration", async () => {
    let tsm = await TokenSaleManager.deployed();
    let ts1 = await TokenSale.at(await tsm.tokenSales(0));
    let ts2 = await TokenSale.at(await tsm.tokenSales(1));

    await tsm.addToWhitelist(investor4, {from: founder});
    await tsm.addToWhitelist(investor5, {from: founder});

    let returned1 = await ts1.whitelist(investor4);
    let expected1 = true;
    assert.equal(returned1, expected1);

    let returned2 = await ts2.whitelist(investor4);
    let expected2 = true;
    assert.equal(returned2, expected2);

    let returned3 = await ts1.whitelist(investor5);
    let expected3 = true;
    assert.equal(returned3, expected3);

    let returned4 = await ts2.whitelist(investor5);
    let expected4 = true;
    assert.equal(returned4, expected4);

  })

  it("Purchase tokens on sale1", async () => {
    let tsm = await TokenSaleManager.deployed();
    let ts1 = await TokenSale.at(await tsm.tokenSales(0));
    let tlp = await TimeLockPool.deployed();
    let token = await OVOToken.deployed();

    let rate = await ts1.rate();
    let timeLockRate = await ts1.timeLockRate();
    let tokensToSell = await ts1.tokensCap();
    let amountSend = Math.round(tokensToSell / rate)  + 1;

    await ts1.sendTransaction({from:investor4, value: web3.toWei(amountSend,"ether")});

    let returned1 = await ts1.tokensMinted();
    let expected1 = amountSend * rate;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor4);
    let expected2 = amountSend * rate * (100 - timeLockRate) / 100;
    assert.equal(returned2, expected2);

    let returned3 = await tlp.getLockedBalanceOf(investor4, token.address);
    let expected3 = amountSend * rate * timeLockRate / 100;
    assert.equal(returned3, expected3);
  })


  var fundRaised1;
  it("Finalize TokenSale1.", async () => {
    let tsm = await TokenSaleManager.deployed();
    let ts1 = await TokenSale.at(await tsm.tokenSales(0));
    let pool = await DaicoPool.deployed();

    fundRaised1 = web3.fromWei(await web3.eth.getBalance(ts1.address)).toNumber();
    await tsm.finalize(0);

    let returned1 = await ts1.isFinalized();
    let expected1 = true;
    assert.equal(returned1, expected1);
  })

  it("Purchase tokens on sale2", async () => {
    let tsm = await TokenSaleManager.deployed();
    let ts2 = await TokenSale.at(await tsm.tokenSales(1));
    let tlp = await TimeLockPool.deployed();
    let token = await OVOToken.deployed();

    let rate = await ts2.rate();
    let timeLockRate = await ts2.timeLockRate();
    let tokensToSell = await ts2.tokensCap();
    let amountSend = Math.round(tokensToSell / rate)  + 1;

    let balanceBefore = await token.balanceOf(investor5);

    // time skip to sale2
    await utils.increaseTime(sale1_term + time_between_sale1and2);

    await ts2.sendTransaction({from:investor5, value: web3.toWei(amountSend,"ether")});

    let returned1 = await ts2.tokensMinted();
    let expected1 = amountSend * rate;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor5) - balanceBefore;
    let expected2 = amountSend * rate * (100 - timeLockRate) / 100;
    assert.equal(returned2, expected2);

    let returned3 = await tlp.getLockedBalanceOf(investor5, token.address);
    let expected3 = amountSend * rate * timeLockRate / 100;
    assert.equal(returned3, expected3);
  })

  var fundRaised2;
  var tap_open_time;
  it("Finalize TokenSale2 and TokenSaleManager.", async () => {
    let tsm = await TokenSaleManager.deployed();
    let ts2 = await TokenSale.at(await tsm.tokenSales(1));
    let pool = await DaicoPool.deployed();

    fundRaised2 = web3.fromWei(await web3.eth.getBalance(ts2.address)).toNumber();
    await tsm.finalize(1);

    let returned2 = await ts2.isFinalized()
    let expected2 = true;
    assert.equal(returned2, expected2);

    await tsm.finalizeTokenSaleManager();
    tap_open_time = await web3.eth.getBlock('latest').timestamp;

    let returned3 = await tsm.isFinalized()
    let expected3 = true;
    assert.equal(returned3, expected3);

    let returned4 = web3.fromWei(await web3.eth.getBalance(pool.address));
    let expected4 = fundRaised1 + fundRaised2 + raisedEthInClosedsale;
    assert.equal(returned4, expected4);
  })

  it("Initial check of DaicoPool", async () => {
    let pool = await DaicoPool.deployed();
 
    let returned1 = web3.fromWei(await web3.eth.getBalance(pool.address)).toNumber();
    let expected1 = raisedEthInClosedsale + fundRaised1 + fundRaised2;
    assert.equal(returned1, expected1);

    let returned2 = web3.fromWei(await pool.fundRaised()).toNumber();
    let expected2 = raisedEthInClosedsale + fundRaised1 + fundRaised2;
    assert.equal(returned2, expected2);

    let returned3 = await pool.tap();
    let expected3 = initialTap ;
    assert.equal(returned3, expected3);

    let returned4 = web3.fromWei(await pool.getReleasedBalance()).toNumber();
    let expected4 = initialRelease;
    assert.isAtLeast(returned4, expected4);
  })

  it("Fund release check.", async () => {
    let pool = await DaicoPool.deployed();

    let returned1 = await pool.isStateProjectInProgress();
    let expected1 = true;
    assert.equal(returned1, expected1);

    //put a clock forward by 10 days 
    await utils.increaseTime(3600*24*10); 

    let time_elapsed = 3600*24*10;
    let returned2 = web3.fromWei(await pool.getReleasedBalance()).toNumber();
    let expected2a = initialRelease + parseFloat(web3.fromWei((time_elapsed - 1) * initialTap));
    let expected2b = initialRelease + parseFloat(web3.fromWei((time_elapsed + 600) * initialTap));
    assert.isAtLeast(returned2, expected2a);
    assert.isAtMost(returned2, expected2b);
  })
 
  it("DaicoPool withdrawal test", async () => {
    let pool = await DaicoPool.deployed();

    let poolBalanceBefore = web3.fromWei(await web3.eth.getBalance(pool.address)).toNumber();
    let founderBalanceBefore = web3.fromWei(await web3.eth.getBalance(founder)).toNumber();
    let availableBefore = web3.fromWei(await pool.getAvailableBalance()).toNumber();

    await pool.withdraw(web3.toWei(400,"Ether"),{from:founder});

    let returned1 = web3.fromWei(await web3.eth.getBalance(pool.address)).toNumber() - poolBalanceBefore;
    let expected1 = -400;
    assert.equal(returned1, expected1);

    let returned2 = web3.fromWei(await web3.eth.getBalance(founder)).toNumber() - founderBalanceBefore;
    let expected2 = 400;
    assert.isAtMost(returned2, expected2);
    assert.isAtLeast(returned2, expected2 - 1); //considering gas fee

    let returned3 = web3.fromWei(await pool.withdrawnBalance());
    let expected3 = 400;
    assert.equal(returned3, expected3);

    let returned4 = web3.fromWei(await pool.getAvailableBalance()) - availableBefore;
    let expected4 = -400;
    assert.isAtLeast(returned4, expected4);
    assert.isAtMost(returned4, expected4 + 1);

    await pool.withdraw(web3.toWei(600,"Ether"),{from:founder});
 
    let returned11 = web3.fromWei(await web3.eth.getBalance(pool.address)).toNumber() - poolBalanceBefore;
    let expected11 = -1000;
    assert.equal(returned11, expected11);

    let returned12 = web3.fromWei(await web3.eth.getBalance(founder)).toNumber() - founderBalanceBefore;
    let expected12 = 1000;
    assert.isAtMost(returned12, expected12);
    assert.isAtLeast(returned12, expected12 - 1); //considering gas fee

    let returned13 = web3.fromWei(await pool.withdrawnBalance());
    let expected13 = 1000;
    assert.equal(returned13, expected13);

    let returned14 = web3.fromWei(await pool.getAvailableBalance()) - availableBefore;
    let expected14 = -1000;
    assert.isAtLeast(returned14, expected14);
    assert.isAtMost(returned14, expected14 + 1);
  })

  it("Make a raiseTap proposal 1.", async () => {
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    await vt.addRaiseTapProposal("http://testProposal.com",  150,{from:founder,value:web3.toWei(1,"Ether")});

    let returned1 = await vt.getCurrentVoting();
    let expected1 = 1;
    assert.equal(returned1, expected1);

    let returned2 = await vt.isStarted(returned1);
    let expected2 = true;
    assert.equal(returned2, expected2);

  })


  it("Voting1 - Reject.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let current = await vt.getCurrentVoting();

    await token.approve(vt.address, 0, {from:investor4});
    await token.approve(vt.address, tokensCap1, {from:investor4});
    await vt.vote(true, tokensCap1 * 0.5, {from:investor4}); 

    await token.approve(vt.address, 0, {from:investor5});
    await token.approve(vt.address, tokensCap2, {from:investor5});
    await vt.vote(false, tokensCap2 * 0.5, {from:investor5}); 

    let returned1 = await vt.getVoterCount(current);
    let expected1 = 2;
    assert.equal(returned1, expected1);

    let returned2 = await vt.isEnded(current);
    let expected2 = false;
    assert.equal(returned2, expected2);
  })

  it("Voting1 finalize.", async () => {
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let current = await vt.getCurrentVoting();

    //put a clock forward by 14 days 
    await utils.increaseTime(3600*24*14); 

    let returned1 = await vt.isEnded(current);
    let expected1 = true;
    assert.equal(returned1, expected1);

    await vt.finalizeVoting(); 

    let returned2 = await vt.isPassed(current);
    let expected2 = false;
    assert.equal(returned2, expected2);
 
    let returned3 = await pool.tap();
    let expected3 = initialTap;
    assert.equal(returned3, expected3);
  })

  it("Return tokens.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let beforeBalance4 = await token.balanceOf(investor4);
    let beforeBalance5 = await token.balanceOf(investor5);

    list = new Array();
    list.push(investor4);
    list.push(investor5);
    await vt.returnTokenMulti(list);

    let returned1 = await token.balanceOf(investor4) - beforeBalance4;
    let expected1 = tokensCap1 * 0.5;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor5) - beforeBalance5;
    let expected2 = tokensCap2 * 0.5;
    assert.equal(returned2, expected2);
  })

  it("Make a raiseTap proposal 2.", async () => {
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    await vt.addRaiseTapProposal("http://testProposal.com",  200,{from:founder,value:web3.toWei(1,"Ether")});

    let returned1 = await vt.getCurrentVoting();
    let expected1 = 2;
    assert.equal(returned1, expected1);

    let returned2 = await vt.isStarted(returned1);
    let expected2 = true;
    assert.equal(returned2, expected2);

  })

  it("Voting2 - Accept.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let current = await vt.getCurrentVoting();

    await token.approve(vt.address, 0, {from:investor4});
    await token.approve(vt.address, tokensCap1, {from:investor4});
    await vt.vote(false, tokensCap1 * 0.5, {from:investor4}); 

    await token.approve(vt.address, 0, {from:investor5});
    await token.approve(vt.address, tokensCap2, {from:investor5});
    await vt.vote(true, tokensCap2 * 0.5, {from:investor5}); 

    let returned1 = await vt.getVoterCount(current);
    let expected1 = 2;
    assert.equal(returned1, expected1);

    let returned2 = await vt.isEnded(current);
    let expected2 = false;
    assert.equal(returned2, expected2);
  })

  it("Voting2 finalize.", async () => {
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let current = await vt.getCurrentVoting();

    //put a clock forward by 14 days 
    await utils.increaseTime(3600*24*14); 

    let returned1 = await vt.isEnded(current);
    let expected1 = true;
    assert.equal(returned1, expected1);

    await vt.finalizeVoting(); 

    let returned2 = await vt.isPassed(current);
    let expected2 = true;
    assert.equal(returned2, expected2);
 
    let returned3 = await pool.tap();
    let expected3 = initialTap * 2;
    assert.equal(returned3, expected3);
  })

  it("Return tokens.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let beforeBalance4 = await token.balanceOf(investor4);
    let beforeBalance5 = await token.balanceOf(investor5);

    list = new Array();
    list.push(investor4);
    list.push(investor5);
    await vt.returnTokenMulti(list);

    let returned1 = await token.balanceOf(investor4) - beforeBalance4;
    let expected1 = tokensCap1 * 0.5;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor5) - beforeBalance5;
    let expected2 = tokensCap2 * 0.5;
    assert.equal(returned2, expected2);
  })

  it("Make a selfDestruction proposal.", async () => {
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    await vt.addDestructionProposal("http://testProposal.com", {from:founder,value:web3.toWei(1,"Ether")});

    let returned1 = await vt.getCurrentVoting();
    let expected1 = 3;
    assert.equal(returned1, expected1);

    let returned2 = await vt.isStarted(returned1);
    let expected2 = true;
    assert.equal(returned2, expected2);

  })

  it("Voting3 - Accept.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let current = await vt.getCurrentVoting();

    await token.approve(vt.address, 0, {from:investor4});
    await token.approve(vt.address, tokensCap1, {from:investor4});
    await vt.vote(false, tokensCap1 * 0.5, {from:investor4}); 

    await token.approve(vt.address, 0, {from:investor5});
    await token.approve(vt.address, tokensCap2, {from:investor5});
    await vt.vote(true, tokensCap2 * 0.5, {from:investor5}); 

    let returned1 = await vt.getVoterCount(current);
    let expected1 = 2;
    assert.equal(returned1, expected1);

    let returned2 = await vt.isEnded(current);
    let expected2 = false;
    assert.equal(returned2, expected2);
  })

  it("Voting3 finalize.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let current = await vt.getCurrentVoting();

    //put a clock forward by 14 days 
    await utils.increaseTime(3600*24*14); 

    let returned23 = await pool.isStateDestructed();
    let expected23 = false;
    assert.equal(returned23, expected23);

    let returned1 = await vt.isEnded(current);
    let expected1 = true;
    assert.equal(returned1, expected1);

    let releasedBalanceBefore = web3.fromWei(await pool.getReleasedBalance()).toNumber();
    let lastTap = await pool.tap();

    await vt.finalizeVoting(); 

    let returned2 = await vt.isPassed(current);
    let expected2 = true;
    assert.equal(returned2, expected2);
 
    let returned3 = await pool.isStateDestructed();
    let expected3 = true;
    assert.equal(returned3, expected3);

    let returned4 = web3.fromWei(await pool.getReleasedBalance()).toNumber() - releasedBalanceBefore;
    let expected4a = lastTap * (3600 * 24 * 30) * (10**-18);
    let expected4b = lastTap * (3600 * 24 * 30 + 600) * (10**-18);
    assert.isAtLeast(Math.floor(returned4), Math.floor(expected4a));
    assert.isAtMost(Math.floor(returned4), Math.floor(expected4b));

    let totalSupply = await token.totalSupply();
    let remainingFund = await web3.eth.getBalance(pool.address) - await pool.getAvailableBalance();
    let returned5 = web3.fromWei(await pool.refundRateNano(), 'szabo').toNumber();
    let expected5 = web3.fromWei(remainingFund * 10**9 / totalSupply, 'szabo');
    assert.equal(Math.floor(returned5), Math.floor(expected5));
  })

  it("Return tokens.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();
    let vt = Voting.at(await pool.votingAddr());

    let beforeBalance4 = await token.balanceOf(investor4);
    let beforeBalance5 = await token.balanceOf(investor5);

    await vt.returnToken(investor4);
    await vt.returnToken(investor5);

    let returned1 = await token.balanceOf(investor4) - beforeBalance4;
    let expected1 = tokensCap1 * 0.5;
    assert.equal(returned1, expected1);

    let returned2 = await token.balanceOf(investor5) - beforeBalance5;
    let expected2 = tokensCap2 * 0.5;
    assert.equal(returned2, expected2);
  })

  it("Refund from DaicoPool.", async () => {
    let token = await OVOToken.deployed();
    let pool = await DaicoPool.deployed();

    let refundRateNano = await pool.refundRateNano();


    let tokenBalance4 = await token.balanceOf(investor4);
    let ethBalance4 = await web3.eth.getBalance(investor4)
    await token.approve(pool.address, 0, {from:investor4});
    await token.approve(pool.address, tokenBalance4, {from:investor4});
    await pool.refund(tokenBalance4, {from:investor4});
 
    let returned1 = web3.fromWei(await web3.eth.getBalance(investor4) - ethBalance4, 'ether');
    let expected1 = web3.fromWei(refundRateNano * tokenBalance4 / 10**9, 'ether');
    assert.equal(Math.floor(returned1), Math.floor(expected1));


    let tokenBalance5 = await token.balanceOf(investor5);
    let ethBalance5 = await web3.eth.getBalance(investor5)
    await token.approve(pool.address, 0, {from:investor5});
    await token.approve(pool.address, tokenBalance5, {from:investor5});
    await pool.refund(tokenBalance5, {from:investor5}); 

    let returned2 = web3.fromWei(await web3.eth.getBalance(investor5) - ethBalance5, 'ether');
    let expected2 = web3.fromWei(refundRateNano * tokenBalance5 / 10**9, 'ether');
    assert.equal(Math.floor(returned2), Math.floor(expected2));

   })

});


