const tokens = {
  router: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3", // PCSv2 Router Mainnet
  purchaseAmount: "0.04",
  pair: [
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "0x45549BaC7DC9fd41f3D11Ee931962c09570A1D1D",
  ],
  buy: 0,
  autosell: 0,
  buyAmount: 0.04,
  autosellmultiplier: 2,
  gasLimit: "1000000",
  gasPrice: "5",
  receiveraccount: "",
  sellx: 2,
  buyDelay: 1,
  buyRetries: 3,
  retryMinTimeout: 250,
  retryMaxTimeout: 3000,
  deadline: 60,
};
module.exports = tokens;

/*

The targeted token needs to be in second position of the pair array

Currently only WBNB Pairs are supported - Pull requests welcome :)

### BSC Testnet Usage ### 

Change the first item in pair array
    "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // WBNB Testnet

Change the router
    "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"; // PCSv2 Router Testnet
 
Then use https://pancake.kiemtienonline360.com/#/

*/
