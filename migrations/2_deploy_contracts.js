require('date-utils');

var TokenController = artifacts.require("./DAICOVO/TokenController.sol");
var OVOToken = artifacts.require("./DAICOVO/OVOToken.sol");
var TimeLockPool = artifacts.require("./DAICOVO/TimeLockPool.sol");
var TokenSaleManager = artifacts.require("./DAICOVO/TokenSaleManager.sol");
var TokenSale = artifacts.require("./DAICOVO/TokenSale.sol");
var DaicoPool = artifacts.require("./DAICOVO/DaicoPool.sol");

module.exports = function(deployer) { 
  var tsm;

  deployer.deploy(OVOToken)
  .then(function() {
    return deployer.deploy(TokenController, OVOToken.address)
  })
  .then(function() {
    return deployer.deploy(TimeLockPool);
  })
  .then(function() {
    return deployer.deploy(DaicoPool, OVOToken.address, 13503 * 10**11, 9000 * 10**18);
  })
  .then(function() {
    return deployer.deploy(
      TokenSaleManager,
      TokenController.address,
      TimeLockPool.address,
      DaicoPool.address,
      OVOToken.address
    );
  })
};

