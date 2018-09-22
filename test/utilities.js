
module.exports.increaseTime = function increaseTime(duration) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: Date.now(),
    }, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}
