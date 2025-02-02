const ethers = require("ethers");
require('log-timestamp');
const retry = require("async-retry");
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const bscnode = 'wss://bsc-ws-node.nariox.org:443';

const tokens = require('./tokens.js');
purchaseAmount = ethers.utils.parseUnits(tokens.purchaseAmount, 'ether');

var index1;
var index2;
if(tokens.pair[1].toLowerCase() > tokens.pair[0].toLowerCase()) {
	index1 = 1;
	index2 = 0;
}else {
	index1 = 0;
	index2 = 1;
}
let pingTimeout = null;
let keepAliveInterval = null;
let provider;
let wallet;
let account;
let routeraddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
let privatekey = ''
let grasshopper;

provider = new ethers.providers.WebSocketProvider(bscnode);
wallet = new ethers.Wallet(privatekey);
account = wallet.connect(provider);
router = new ethers.Contract(routeraddress, pcsAbi, account);

console.log('Checking BNB price');
const decimal_stable = 1000000000000000000;
const bnb_decimal = 1000000000000000000;

const factory = new ethers.Contract(
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    [
      "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    ],
    account
  );
  
const tokencontract = new ethers.Contract(
	  tokens.pair[1],
	  [
		"function balanceOf(address account) external view returns (uint256)",
		"function decimals() view returns (uint8)",
		"function allowance(address owner, address spender) external view returns (uint)",
		"function approve(address _spender, uint256 _value) public returns (bool success)",
		"function name() external pure returns (string memory)",
		"function symbol() external view returns (string memory)",
	  ],
	  account
	);
async function get_reserve(pair){
	const pair_contract = new ethers.Contract(
	  pair,
	  [
		"function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
	  ],
	  account
	);
	const reserves = await pair_contract.getReserves();
	return reserves;
}




async function get_pricebnb(){
	tokenreserves = await get_reserve('0x58f876857a02d6762e0101bb5c46a8c1ed44dc16');
	bnbprice = (tokenreserves[1] / 10 ** 18) / (tokenreserves[0] / 10 ** 18);
	return bnbprice;
}


async function get_pricetoken(token1, token2){
	bnbprice = await get_pricebnb();
	const tokenpair = await factory.getPair(token1, token2);
	tokenreserves = await get_reserve(tokenpair);
	tokendecimal = await tokencontract.decimals();
	tokenpriceinbnb = (tokenreserves[index2] / 10 ** 18) / (tokenreserves[index1] / 10 ** tokendecimal);
	newprice = bnbprice * tokenpriceinbnb;
	return newprice;
}

async function sell(token1, token2, stoploss, tstop){ 
	allowance = await tokencontract.allowance('0xAaF7c4D2558d6D6C2F86a55ff42F401D93F3C365', routeraddress);
    if (allowance._hex === "0x00") {
        tx = await tokencontract.approve(
        routeraddress,
        ethers.constants.MaxUint256
      );
      console.log("Approved for sale");
      console.log("Your txHash: " + tx.hash);
    } else {
      console.log(" already approved for sale");
    }
	balance1 = await tokencontract.balanceOf('0xAaF7c4D2558d6D6C2F86a55ff42F401D93F3C365');
	tokendecimal = await tokencontract.decimals();
	balance = balance1 / 10 ** tokendecimal;
	amountOutMin = 0;
	const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
	balance1,
	amountOutMin,
	[tokens.pair[1], tokens.pair[0]],
	tokens.receiveraccount,
	Date.now() + 1000 * tokens.deadline,
	{
		gasLimit: tokens.gasLimit,
		gasPrice: ethers.utils.parseUnits(tokens.gasPrice, "gwei"),
		}
	);
	console.log("Your Sell txHash: " + tx.hash);
}
const run = async () => {
	await sell(tokens.pair[1], '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 0, 0);
	console.log('ngek');
}


run();
