
const updateRate = 60;

class Client {
	constructor(
		server,
		inputs = ["KeyW", "KeyA", "KeyS", "KeyD"],
		shouldConnect = true
	) {
		// local representation of players
		this.updateRate = updateRate;
		this.players = {};
		this.input = { left: false, right: false, up: false, down: false };
		this.ping = 200;
		this.jitter = 0;
		this.tick = null;
		this.client_side_prediction = true;
		this.server_reconciliation = true;
		this.entity_interpolation = false;
		this.input_sequence_number = 0;
		this.unconfirmed_inputs = [];
		this.server = server; // reference to the server
		this.isClient = true;
		this.inputCodes = {
			[inputs[0]]: { key: "up" },
			[inputs[1]]: { key: "left" },
			[inputs[2]]: { key: "down" },
			[inputs[3]]: { key: "right" }
		};

		this.capture = null;
		this.shotState = null;

		window.addEventListener("keydown", this.trackKeys.bind(this));
		window.addEventListener("keyup", this.trackKeys.bind(this));

		if (shouldConnect) {
			setTimeout(
				(() => {
					server.clientConnect(this);
				}).bind(this),
				this.calculateDelay()
			);
		}
	}
	trackKeys(event) {
		if (event.repeat) return;
		if (this.inputCodes[event.code] === undefined) return;
		this.input[this.inputCodes[event.code].key] = event.type === "keydown";
	}
	update() {
		if (this.selfId == null || this.startTime == null) {
			return; // not connected to the server yet
		}
		this.processInputs();
	}
	calculateDelay() {
		return this.ping + Math.random() * (this.jitter * 2) - this.jitter;
	}
	receive(obj) {
		if (obj.type === `ping`) {
			this.send({ type: `pung`, id: this.selfId, tick: obj.tick });
		}
		if (obj.type === "init") {
			for (const { data, id } of obj.players) {
				this.players[id] = new CPlayer(data);
			}
			this.selfId = Number(obj.selfId);
			this.startTime = Date.now();
			this.tick = obj.tick;
		}
		if (obj.type === "newPlayer") {
			this.players[obj.id] = new CPlayer(obj.player);
		}

		if (obj.type === 'capture') {
			this.capture = obj.data.players;
		}

		if (obj.type === 'shot') {
			this.shotState = obj.data.players;
		}

		if (obj.type === "state") {
			const players = obj.data.players;
			for (const { id, data, last_processed_input } of players) {
				if (Number(id) === this.selfId) {
					this.players[this.selfId].Snap(data);
					// console.log(this.server_reconciliation)
					if (this.server_reconciliation) {
						// do reconcilation

						let j = 0;
						while (j < this.unconfirmed_inputs.length) {
							const { input, tick } = this.unconfirmed_inputs[j];
							// console.log(tick, last_processed_input)
							if (tick <= last_processed_input) {
								// Already processed. so we can drop it
								this.unconfirmed_inputs.splice(j, 1);
							} else {
								// Not processed by the server yet. Re-apply it.
								applyInput(this.players[this.selfId], input);
								// collidePlayers(this.players)
								j++;
							}
						}
					} else {
						this.unconfirmed_inputs = [];
					}
				} else {
					if (this.entity_interpolation) {
						// do interpolation
					} else {
						this.players[id].Snap(data);
					}
				}
			}
		}
	}
	send(obj) {
		setTimeout(
			(() => {
				this.server.receive(this, obj);
			}).bind(this),
			this.calculateDelay()
		);
	}
	processInputs() {
		const expectedTick = Math.ceil(
			(Date.now() - this.startTime) * (this.updateRate / 1000)
		);

		while (this.tick < expectedTick) {
			const packageInput = {
				type: "input",
				data: copyInput(this.input),
				tick: this.tick,
				id: this.selfId
			};
			this.send(packageInput);
			if (this.client_side_prediction) {
				applyInput(this.players[this.selfId], this.input);
				// collidePlayers(this.players)
			}
			this.unconfirmed_inputs.push({
				input: copyInput(this.input),
				tick: this.tick
			});
			this.tick++;
		}
		this.send({ type: 'capture' })
		// const clientTick = this.server.presentTick() - this.server.pings[this.selfId];
		// const clientState = this.server.getSnapshot(clientTick);
		// this.capture = clientState?.players;
	}
}

function copyInput(input) {
	return {
		up: input.up,
		left: input.left,
		right: input.right,
		down: input.down
	};
}

function applyInput(player, input) {
	player.x += (input.right - input.left) * 5;
	player.y += (input.down - input.up) * 5;
	boundPlayer(player);
}

function collidePlayers(players) {
	for (const i of Object.keys(players)) {
		const player1 = players[i];
		for (const j of Object.keys(players)) {
			if (i === j) continue;
			const player2 = players[j];
			const distX = player1.x - player2.x;
			const distY = player1.y - player2.y;
			if (
				distX * distX + distY * distY <
				player1.radius * 2 * (player2.radius * 2)
			) {
				const magnitude = Math.sqrt(distX * distX + distY * distY) || 1;
				const xv = distX / magnitude;
				const yv = distY / magnitude;
				player1.x = player2.x + (player1.radius + 0.05 + player2.radius) * xv;
				player1.y = player2.y + (player1.radius + 0.05 + player2.radius) * yv;
			}
		}
	}
}

function boundPlayer(player) {
	if (player.x - player.radius < 0) {
		player.x = player.radius;
	}
	if (player.x + player.radius > window.innerWidth / 3) {
		player.x = window.innerWidth / 3 - player.radius;
	}

	if (player.y - player.radius < 0) {
		player.y = player.radius;
	}
	if (player.y + player.radius > window.innerHeight) {
		player.y = window.innerHeight - player.radius;
	}
}

class CPlayer {
	constructor(pack) {
		this.x = pack.x;
		this.y = pack.y;
		this.radius = pack.radius;
	}
	Snap(data) {
		this.x = data.x;
		this.y = data.y;
		this.radius = data.radius;
	}
}

class Player {
	constructor() {
		this.x = Math.round(window.innerWidth / 6);
		this.y = Math.round(Math.random() * window.innerHeight);
		this.radius = 30;
	}
	respawn() {
		this.x = Math.round(window.innerWidth / 6);
		this.y = Math.round(Math.random() * window.innerHeight);
	}
	pack() {
		return {
			x: this.x,
			y: this.y,
			radius: this.radius
		};
	}
}

// since tickrate will be 60, and lag compensation  wont benefit anoynoe with
// higher than 400ms ->
// we only store the last 24 states

class Server {
	constructor() {
		this.players = {};
		this.clients = {};
		this.lastProcessedInputTick = {};
		this.inputMessages = [];
		this.isServer = true;
		this.updateRate = updateRate;
		this.tick = 0;
		this.startTime = Date.now();

		this.maximumAllowedPingForCompensation = 400;
		this.historyMaxSize = Math.round(
			this.maximumAllowedPingForCompensation / (1000 / this.updateRate)
		);

		this.history = {};
		this.pings = {};
		this.pingRate = 20;
		setInterval(
			(() => {
				this.update();
			}).bind(this),
			1000 / tickRate
		);
		setInterval(
			(() => {
				this.pingClients();
			}).bind(this),
			1000 / this.pingRate
		);
	}
	pingClients() {
		const pack = {
			type: `ping`,
			tick: this.tick
		};

		for (const client of Object.values(this.clients)) {
			this.send(client, pack);
		}
	}
	oldestHistory() {
		return this.history[Object.keys(this.history)[0]];
	}
	presentTick() {
		return Math.ceil((Date.now() - this.startTime) * (this.updateRate / 1000));
	}
	_allPlayerPacks() {
		const packs = [];
		for (const playerId of Object.keys(this.players)) {
			packs.push({ data: this.players[playerId].pack(), id: playerId });
		}
		return packs;
	}
	processInputs() {
		for (let i = 0; i < this.inputMessages.length; i++) {
			const { id, data, tick } = this.inputMessages[i];

			if (
				(this.lastProcessedInputTick[id] + 1 === tick &&
					this.lastProcessedInputTick[id] != null) ||
				this.lastProcessedInputTick[id] == null
			) {
				applyInput(this.players[id], data);
				// collidePlayers(this.players);
			}
			this.lastProcessedInputTick[id] = tick;
		}

		this.inputMessages = [];
	}
	sendWorldState() {
		// todo maybe: send world state to each client differently
		//  like not sending playerse not inside their view
		const state = { players: [] };

		for (const clientId of Object.keys(this.clients)) {
			const player = this.players[clientId];
			state.players.push({
				id: clientId,
				data: player.pack(),
				last_processed_input: this.lastProcessedInputTick[clientId]
			});
		}

		for (const client of Object.values(this.clients)) {
			this.send(client, { type: "state", data: state });
		}
	}
	copyPlayers() {
		const players = {};
		for (const playerId of Object.keys(this.players)) {
			players[playerId] = this.players[playerId].pack();
		}
		return players;
	}
	getSnapshot(tick) {
		if (tick < Object.keys(this.history)[0]) {
			return this.oldestHistory();
		}
		return this.history[tick];
	}
	takeSnapshots() {
		const expectedTick = this.presentTick();

		while (this.tick < expectedTick) {
			// take a snapshot
			this.history[this.tick] = {
				players: this.copyPlayers()
			};
			if (Object.keys(this.history).length > this.historyMaxSize) {
				delete this.history[Object.keys(this.history)[0]];
			}
			this.tick++;
		}
	}
	update() {
		// process inputs and update game
		// then send world states
		this.processInputs();
		this.takeSnapshots();
		this.sendWorldState();
	}
	validateInput(data) {
		return true;
	}
	receive(client, obj) {
		if (obj.type === "input" && this.validateInput(obj)) {
			this.inputMessages.push({ id: obj.id, data: obj.data, tick: obj.tick });
		}
		if (obj.type === `pung`) {
			this.pings[obj.id] = Math.floor((this.presentTick() - obj.tick) / 2);
		}
		if (obj.type === 'capture') {
			this.send(client, { type: 'capture', data: { players: this.copyPlayers() } })
		}
		if (obj.type === "shoot") {
			// const players = {
			// 	[client.selfId]: this.copyPlayers()[client.selfId],
			// };
			// const oldState = { players: this.copyPlayers() };

			// for (const playerId of Object.keys(oldState.players)) {
			// 	if (Number(playerId) === client.selfId) continue;
			// 	const history = this.getSnapshot(this.presentTick() - this.pings[playerId]);
			// 	if (!history) continue;
			// 	players[playerId] = history.players[playerId];
			// }
			const state = { players: this.copyPlayers() }//this.getSnapshot(this.presentTick() - this.pings[client.selfId]);
			const player = state.players[client.selfId];

			for (const j of Object.keys(state.players)) {
				if (client.selfId === Number(j)) continue;
				const player2 = state.players[j];
				const distX = player.x - player2.x;
				const distY = player.y - player2.y;
				if (
					distX * distX + distY * distY <
					player.radius * 2 * (player2.radius * 2)
				) {
					// respawn othe rplayer
					// todo time travel..
					this.players[j].respawn()
					break;
				}
			}

			this.send(client, { type: 'shot', data: { players: this.copyPlayers() } });
			// console.log(this.pings[client.selfId] * (1000 / 60), 'ms');
			// const clientTick = this.presentTick() - this.pings[client.selfId];
			// console.log(clientTick, 'client tick', this.presentTick(), 'server tick')
			// const clientState = this.getSnapshot(clientTick);
			// this.send(client, { type: 'capture', data: clientState })
		}
	}
	send(client, obj) {
		setTimeout(
			(() => {
				client.receive(obj);
			}).bind(this),
			client.calculateDelay()
		);
	}
	broadcast(obj, except = []) {
		for (const clientId of Object.keys(this.clients)) {
			if (except.includes(Number(clientId))) {
				// CLIENTID IS A STRING BY DEFAULT
				continue;
			}
			this.send(this.clients[clientId], obj);
		}
	}
	generateId() {
		return Math.random();
	}
	clientConnect(client) {
		const id = this.generateId();
		this.clients[id] = client;
		this.players[id] = new Player();
		this.send(this.clients[id], {
			type: "init",
			players: this._allPlayerPacks(),
			selfId: id,
			tick: this.presentTick()
		});
		this.broadcast({ type: "newPlayer", id, player: this.players[id].pack() }, [
			id
		]);
	}
}
