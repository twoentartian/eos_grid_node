const request = require("request");
const Eos = require('eosjs');
const Exec = require('child_process').exec;

const nodeos_endpoint = 'http://127.0.0.1:8888';

// Top level func
let fromAccount = undefined;
let toAccount = undefined;
let quantityTransfer = undefined;
let memoTransfer = undefined;
let firstRun = true;

let transfer = function (from, to, quantity, memo) {
	if (process.platform === 'win32' || process.platform === 'darwin') {
		if (firstRun){
			firstRun = false;
			console.log('EOS interaction is rejected due to win32/darwin platform');
		}
		return;
	}
	console.log('transfer ' + from + " to " + to + " with " + quantity);
	fromAccount = from;
	toAccount = to;
	quantityTransfer = quantity;
	memoTransfer = memo;
	
	CliTransfer();
	
	//getInfo();
};


// Get Info
let latestInfo = undefined;
let getInfo = function () {
	let options = {
		method: 'POST',
		url: nodeos_endpoint + '/v1/chain/get_info'
	};
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		latestInfo = JSON.parse(body);
		
		//serializeJsonToBin(from, to, quantity, memo); // Use RPC
		//initEos(); // Use EOSJS interface
		
	});
};

let CliTransfer = function () {
	Exec('cleos wallet unlock -n tyd --password PW5JM35wHotCBhpyus96YXC5U4L7NAZn3WsPudaEWMKLhgyRM9FMQ', function (error, stdout, stdeer) {
	
	});
	Exec('cleos push action eosio.token transfer \'[ "' + fromAccount + '", "' + toAccount + '", "' + quantityTransfer + '", "' + memoTransfer + '" ]\' -f -p ' + fromAccount, function (error, stdout, stdeer) {
		if (error != null) {
			console.log(error);
		}
	});
};

// Init EOS
let isEosInited = false;
let eos = undefined;
let initEos = function () {
	if (!isEosInited) {
		// Init EOS
		isEosInited = true;
		eos = Eos({
			keyProvider: '5K2ZnQq8d1XmEcQ5xQefx9dXEwdQ9FQtT18t6yYsoncy5RkaUH3',// private key
			httpEndpoint: nodeos_endpoint,
			chainId: latestInfo.chain_id,
		});
	}
	eosTransfer();
};

let eosTransfer = function () {
	let options = {
		authorization: fromAccount + '@active',
		broadcast: true,
		sign: true
	};
	eos.transfer(fromAccount, toAccount, quantityTransfer, memoTransfer, options)
};

// Serialize JSON to BIN
let bin = undefined;

let serializeJsonToBin = function (from, to, quantity, memo) {
	fromAccount = from;
	toAccount = to;
	let options = {
		method: 'POST',
		url: nodeos_endpoint + '/v1/chain/abi_json_to_bin',
		body: {
			code: 'operator',
			action: 'transfer',
			args: {
				from: from,
				to: to,
				quantity: quantity,
				memo: memo
			}
		},
		json: true
	};
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		
		bin = body;
		getLastestBlock(latestInfo);
	});
};

// Get latest block
let block = undefined;
let getLastestBlock = function (info) {
	let options = {
		method: 'POST',
		url: nodeos_endpoint + '/v1/chain/get_block',
		body: {block_num_or_id: info.head_block_num},
		json: true
	};
	
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		block = body;
		//unlockWallet();
		unlockWallet();
	});
};

// Unlock wallet
let unlockWallet = function () {
	var options = {
		method: 'POST',
		url: 'http://127.0.0.1:8900/v1/wallet/unlock',
		body:
			["tyd", "PW5JM35wHotCBhpyus96YXC5U4L7NAZn3WsPudaEWMKLhgyRM9FMQ"]
	};
	
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		getRequiredKeys();
	});
};


// Get requiredKeys
let requiredKey = undefined;
let getRequiredKeys = function () {
	var options = {
		method: 'POST',
		url: nodeos_endpoint + '/v1/chain/get_required_keys',
		body:
			{
				available_keys:
					['EOS6yExvTiSWy7vgKFt2xtvHA7fSGUKP3TAW3DgtNxB2M8YiZHBs5',
						'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'],
				transaction: {
					actions: [
						{
							account: "operator",
							authorization: [
								{
									actor: fromAccount,
									permission: "active"
								}
							],
							data: bin.binargs,
							name: "transfer"
						}
					],
					context_free_actions: [],
					context_free_data: [],
					delay_sec: 0,
					expiration: "2020-05-24T15:30:32.000",
					max_kcpu_usage: 0,
					max_net_usage_words: 0,
					ref_block_num: block.ref_block_num,
					ref_block_prefix: block.ref_block_prefix,
					signatures: []
				}
			},
		json: true
	};
	
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		requiredKey = body;
		signTransaction();
	});
};

// Sign transaction
let signTransaction = function () {
	let options = {
		method: 'POST',
		url: 'http://127.0.0.1:8900/v1/wallet/wallet_sign_trx',
		body: [{
			ref_block_num: block.ref_block_num,
			ref_block_prefix: block.ref_block_prefix,
			expiration: "2020-05-24T15:30:32.000",
			scope: [fromAccount, toAccount],
			read_scope: [],
			messages: [{
				code: "currency",
				type: "transfer",
				authorization: [{account: fromAccount, permission: "active"}],
				data: bin.binargs
			}],
			signatures: []
		}, [requiredKey.required_keys[0]], ""
		]
	};
	
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		
	});
};


module.exports.transfer = transfer;
