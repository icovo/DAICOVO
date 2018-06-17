var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = process.env.ROPSTEN_MNEMONIC;
var accessToken = process.env.INFURA_ACCESS_TOKEN;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
   networks: {
     development: {
       host: "localhost",
       port: 8545,
       network_id: "*" // Match any network id
     },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(
          mnemonic,
          "https://ropsten.infura.io/" + accessToken
        );
      },
      network_id: 3,
      gasPrice: 100,
      gas: 4700000
    } 
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }

};
