require('date-utils');

var TokenController = artifacts.require("./DAICOVO/TokenController.sol");
var OVOToken = artifacts.require("./DAICOVO/OVOToken.sol");
var TimeLockPool = artifacts.require("./DAICOVO/TimeLockPool.sol");

module.exports = function(deployer) { 

  deployer.deploy(OVOToken)
  .then(function() {
    return deployer.deploy(TokenController, OVOToken.address)
  })
  .then(function() {
    return deployer.deploy(TimeLockPool);
  });
};

