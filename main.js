const htmlFrontEnd = require('./server.js');
const backend = require('./backend.js');
const eosOperation = require("./eosOperation.js");

if (module === require.main) {
	//htmlFrontEnd.createServerHttp(5555);
	htmlFrontEnd.createServerExpress(5555);
	backend.createServer(5556);

	let simulator0 = backend.Simulator.getInstance(3, 10); // time interval must be greater than 3 second.
	simulator0.ChangeUserId('UserId0','home11');
	simulator0.ChangeUserId('UserId1','home12');
	simulator0.ChangeUserId('UserId2','home13');
	simulator0.ChangeUserId('UserId3','home14');
	simulator0.ChangeUserId('UserId4','home15');
	simulator0.ChangeUserId('UserId5','home21');
	simulator0.ChangeUserId('UserId6','home22');
	simulator0.ChangeUserId('UserId7','home23');
	simulator0.ChangeUserId('UserId8','home24');
	simulator0.ChangeUserId('UserId9','home25');


	//simulator0.community.generator[0].generateEnergy(simulator0.community.battery[0], 100);
	for (let [id, home] of simulator0.community.idHomeMap) {
		home.topUpEnergy(200, 'fossil');
	}

	simulator0.StartTimer();
}
