const net = require('net');
const websocket = require('nodejs-websocket');
const eosOperation = require("./eosOperation.js");

// EOS Config
const bankSuffix = '.bank';

let Simulator = {
	instance: {},
	isProto: true,
	getInstance: function (secondPerTick, numberHome) {
		if (!this.isProto) {
			return this.instance;
		}
		let instance = {};
		instance.market = Market.createNew();

		// Community targets
		instance.community = Community.createNew();
		for (let i = 0; i < numberHome; i++) {
			let tempHome = Home.createNew('User' + i, 'UserId' + i, 'MeterId' + i, 20);
			instance.community.idHomeMap.set(tempHome.identification.id, tempHome);
			instance.community.homes[tempHome.identification.id] = tempHome;
		}
		for (let [id, home] of instance.community.idHomeMap) {
			instance.market.AddUserPrice(home, 9 + Number((0.5*Math.random()).toFixed(2)));
		}

		instance.community.grid[0] = Grid.createNew('grid', 'grid0', 'gridMeter0', 400);
		instance.community.generator[0] = Generator.createNew('solar', 'solar0', 'solarMeter0', 100);
		instance.community.generator[1] = Generator.createNew('wind', 'wind0', 'windMeter0', 50);
		instance.community.battery[0] = Battery.createNew('battery', 'battery0', 5000, 0.3, 0.5);
		
		instance.ChangeUserId = function (oldId, newId) {
			instance.community.ChangeUserId(oldId,newId);
			instance.market.RefreshId();
		};
		
		// Time driven
		instance.secondPerTick = secondPerTick;
		instance.StartTimer = function () {
			setInterval(this.tickFunc1, this.secondPerTick * 1000);
		};
		instance.tickFunc1 = function () {
			// Check Battery Critical situation
			instance.community.battery.forEach(function (battery) {
				instance.community.grid[0].generateEnergy(battery);
			});

			// Home Owners Use Energy
			for (let [id, home] of instance.community.idHomeMap) {
				home.consumeEnergy(instance.community.battery[0]);
			}

			// Generators charge battery
			instance.community.generator[0].generationSpeed = Math.round(Number((50+Math.random()*100).toFixed(2)));
			instance.community.generator[1].generationSpeed = Math.round(Number((25+Math.random()*50).toFixed(2)));
			instance.community.generator.forEach(function (generator) {
				generator.generateEnergy(instance.community.battery[0]);
			});

			// Random Auction price
			let changedList = ['home21','home22','home23','home24','home25'];
			changedList.forEach(function (homeId) {
				instance.market.AddUserPrice(instance.community.homes[homeId], 9 + Number(Math.random().toFixed(2)));
			});

			// Auction
			let energy = 0;
			instance.community.generator.forEach(function (generator) {
				energy += generator.meter.reading - generator.meter.previousReading;
			});
			instance.market.SellEnergy(energy);

			//setTimeout(instance.tickFunc2, 600);
		};
		instance.tickFunc2 = function () {

		};
		this.instance = instance;
		this.isProto = false;
		return this.instance;
	},
};

let Community = {
	createNew: function () {
		let community = {};
		community.idHomeMap = new Map();
		community.homes = {};
		community.battery = [];
		community.generator = [];
		community.grid = [];
		community.ChangeUserId = function (oldId, newId) {
			if (community.idHomeMap.has(oldId)) {
				let tempHome = community.idHomeMap.get(oldId);
				
				tempHome.identification.id = newId;
				community.idHomeMap.set(newId, tempHome);
				community.idHomeMap.delete(oldId);

				// Update homes
				community.homes = {};
				for (let [id, home] of community.idHomeMap) {
					community.homes[id] = home;
				}
			}
		};
		return community;
	}
};

let Market = {
	createNew: function () {
		let market = {};
		market.latestSell = {};
		market.userPriceMap = new Map();
		market.userPriceMap_JsonUse = Object.create(null);
		market.AddUserPrice = function (user, price) {
			this.userPriceMap.set(user,price);
			this.userPriceMap_JsonUse = {};
			for (let [user, price] of this.userPriceMap) {
				this.userPriceMap_JsonUse[user.identification.id] = price;
			}
		};
		market.SellEnergy = function (energy) {
			let highestPrice = 0;
			let highestUser;
			for (let [user, price] of this.userPriceMap.entries()) {
				if (price > highestPrice) {
					highestPrice = price;
					highestUser = user;
				}
			}
			if (highestUser === undefined) {
				throw 'No user';
			}
			this.latestSell['user'] = highestUser.identification.id;
			this.latestSell['price'] = highestPrice;
			this.latestSell['amount'] = energy;

			highestUser.topUpEnergy(energy, 'clean');
		};
		market.RefreshId = function () {
			this.userPriceMap_JsonUse = {};
			for (let [user, price] of this.userPriceMap.entries()) {
				this.userPriceMap_JsonUse[user.identification.id] = price;
			}
		};

		return market;
	}
};

let Meter = {
	createNew: function (id) {
		let meter = {};
		meter.id = id;
		meter.reading = 0;
		meter.previousReading = 0;
		meter.PassEnergy = function (energy) {
			this.previousReading = this.reading;
			this.reading += energy;
		};
		meter.InitReading = function (energy) {
			this.reading = energy;
		};
		return meter;
	}
};

let TargetIdentification = {
	createNew: function (name, id) {
		let targetIdentification = {};
		targetIdentification.name = name;
		targetIdentification.id = id;
		return targetIdentification;
	}
};

let Generator = {
	createNew: function (name, id, meterId, generationSpeed) {
		let generator = {};
		generator.identification = TargetIdentification.createNew(name, id);
		generator.meter = Meter.createNew(meterId);
		generator.generationSpeed = generationSpeed;
		generator.generateEnergy = function (battery) {
			let realChargedEnergy = battery.ChargeEnergy(this.generationSpeed);
			this.meter.PassEnergy(realChargedEnergy);
		};
		return generator;
	}
};

let Grid = {
	createNew: function (name, id, meterId, generationSpeed) {
		let grid = Generator.createNew(name, id, meterId, generationSpeed);
		grid.generateEnergy = function (battery) {
			if (battery.ratio < battery.chargeLowThres) {
				if (battery.isInCriticalState === false) {
					battery.isInCriticalState = true;
				}
			}
			if (battery.ratio > battery.chargeHighThres) {
				if (battery.isInCriticalState === true) {
					battery.isInCriticalState = false;
				}
			}
			if (battery.isInCriticalState) {
				let realChargedEnergy = battery.ChargeEnergy(this.generationSpeed);
				this.meter.PassEnergy(realChargedEnergy);
			}
		};
		return grid;
	}
};

let Battery = {
	createNew: function (name, id, capacity, chargeLowThreshold, chargeHighThreshold) {
		let battery = {};
		battery.identification = TargetIdentification.createNew(name, id);
		battery.capacity = capacity;
		battery.energy = 0;
		battery.cleanEnergy = 0;
		battery.ratio = battery.energy / battery.capacity;
		battery.chargeLowThres = chargeLowThreshold;
		battery.chargeHighThres = chargeHighThreshold;
		battery.isInCriticalState = false;
		battery.ChargeEnergy = function (energy) {
			let chargeAmount = 0;
			if (this.energy + energy <= this.capacity) {
				this.energy += energy;
				chargeAmount = energy;
			}
			else {
				chargeAmount = this.capacity - this.energy;
				this.energy = this.capacity;
			}
			this.ratio = this.energy / this.capacity;
			return chargeAmount;
		};
		battery.UseEnergy = function (energy) {
			let usedAmount = 0;
			if (this.energy - energy >= 0) {
				usedAmount = energy;
				this.energy -= energy;
			}
			else {
				usedAmount = this.energy;
				this.energy = 0;
			}
			this.ratio = this.energy / this.capacity;
			return usedAmount;
		};
		return battery;
	}
};

let Home = {
	createNew: function (name, id, meterId, consumptionSpeed) {
		let home = {};
		home.state = false;
		home.identification = TargetIdentification.createNew(name, id);
		home.meter = Meter.createNew(meterId);
		home.cleanEnergy = 0;
		home.fossilEnergy = 0;
		home.consumptionSpeed = consumptionSpeed;
		home.usedEnergyType = undefined;
		home.consumeEnergy = function (battery) {
			if (this.state === true) {
				let realConsumedEnergy = battery.UseEnergy(this.consumptionSpeed);
				this.meter.PassEnergy(realConsumedEnergy);
				if (this.cleanEnergy <= 0) {
					this.usedEnergyType = 'fossil';
					this.fossilEnergy -= realConsumedEnergy;
					eosOperation.transfer(this.identification.id, this.identification.id + bankSuffix, Math.abs(realConsumedEnergy).toFixed(4) + " FOSSIL", "");
				}
				else {
					this.usedEnergyType = 'clean';
					this.cleanEnergy -= realConsumedEnergy;
					let overhead = undefined;
					if (this.cleanEnergy < 0) {
						overhead = Math.abs(this.cleanEnergy);
						eosOperation.transfer(this.identification.id, this.identification.id + bankSuffix, (realConsumedEnergy - overhead).toFixed(4) + " CLEAN", "");
						this.cleanEnergy = 0;
						this.fossilEnergy -= overhead;
						eosOperation.transfer(this.identification.id, this.identification.id + bankSuffix, overhead.toFixed(4) + " FOSSIL", "");
					}
					else {
						eosOperation.transfer(this.identification.id, this.identification.id + bankSuffix, realConsumedEnergy.toFixed(4) + " CLEAN", "");
					}
				}

				if (this.fossilEnergy <= 0 && this.cleanEnergy <= 0) {
					//turn off switch
					this.setSwitch(false);
				}
			}
		};
		home.topUpEnergy = function (energy, type) {
			if (type === 'clean') {
				this.cleanEnergy += energy;
				eosOperation.transfer(this.identification.id + bankSuffix, this.identification.id, energy.toFixed(4) + " CLEAN", "");
			}
			else if (type === 'fossil') {
				this.fossilEnergy += energy;
				eosOperation.transfer(this.identification.id + bankSuffix, this.identification.id, energy.toFixed(4) + " FOSSIL", "");
			}
			else if (type === undefined) {
				return;
			}
			else {
				throw 'Not Implemented';
			}
			if ((this.fossilEnergy > 0 || this.cleanEnergy > 0) && !this.state) {
				// turn on switch
				this.setSwitch(true);
			}
		};
		home.setSwitch = function (state) {
			this.state = state;
			if (this.state === true) {
				console.log(home.identification.id + ' switch on');
			}
			else if (this.state === false) {
				console.log(home.identification.id + ' switch off');
			}
			else {
				throw 'Not Implemented';
			}
		};
		return home;
	}
};

// Create local server to deliver community information
let CreateServer = function (port) {
	let server = websocket.createServer(function (conn) {
		// Command Map
		let wsCommandMap = {};
		wsCommandMap['require'] = function(conn, commandReceived){
			// Send JSON
			commandReceived['result'] = Simulator.getInstance();
			conn.sendText(JSON.stringify(commandReceived));
		};
		wsCommandMap['changePrice'] = function(conn, commandReceived){
			// Change price
			let items = commandReceived.content.split(' ');
			try {
				Simulator.getInstance().market.AddUserPrice(Simulator.getInstance().community.idHomeMap.get(items[0]),Number(items[1]));
				commandReceived['result'] = 'ok';
				console.log('ws: ok');
			}
			catch (err) {
				commandReceived['result'] = 'fail';
				console.log('ws: fail');
			}
			conn.sendText(JSON.stringify(commandReceived));

		};
		wsCommandMap['chargeFossil'] = function(conn, commandReceived){
			// Charge fossil
			let items = commandReceived.content.split(' ');
			try {
				Simulator.getInstance().community.idHomeMap.get(items[0]).topUpEnergy(Number(items[1]),'fossil');
				commandReceived['result'] = 'ok';
				console.log('ws: ok');
			}
			catch (err) {
				commandReceived['result'] = 'fail';
				console.log('ws: fail');
			}
			conn.sendText(JSON.stringify(commandReceived));
		};


		console.log('Connected');
		conn.on("text", function (str) {
			let commandReceived = JSON.parse(str);
			try {
				wsCommandMap[commandReceived.type](conn, commandReceived);
			}
			catch (err){
				console.log('warning, Failed to execute websocket command: ' + commandReceived.type);
			}
		});
		conn.on("close", function (code, reason) {
			console.log('Closed');
		})
	}).listen(port);
};

module.exports.Simulator = Simulator;
module.exports.createServer = CreateServer;
