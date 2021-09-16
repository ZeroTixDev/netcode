
// todo estimate client ping

window.showServerOnClient = false;
window.tickRate = 60;
window.paused = false;
function createCanvases(amount) {
	const list = [];
	for (let i = 0; i < amount; i++) {
		const canvas = document.createElement(`canvas`);
		const ctx = canvas.getContext(`2d`);
		canvas.width = window.innerWidth * (1 / amount);
		canvas.height = window.innerHeight;
		canvas.style.position = "absolute";
		canvas.style.left = `${window.innerWidth * (i / amount)}px`;
		document.body.appendChild(canvas);
		list.push(canvas);
	}
	return list;
}

const canvases = createCanvases(3);
const ctxs = canvases.map((canvas) => canvas.getContext("2d"));
window.server = new Server();
window.client1 = new Client(server, ["KeyW", "KeyA", "KeyS", "KeyD"]);
window.client2 = new Client(server, ["KeyO", "KeyK", "KeyL", "Semicolon"]);

client1.ping = 100;
client2.ping = 300;

canvases[0].addEventListener(`mousedown`, () => {
	client1.send({ type: "shoot", tick: client1.tick });
});

canvases[2].addEventListener(`mousedown`, () => {
	client2.send({ type: "shoot", tick: client1.tick });
});

window.addEventListener("keydown", (event) => {
	if (event.repeat) return;
	if (event.code === "KeyT") {
		showServerOnClient = !showServerOnClient;
	}
	if (event.code === "KeyP") {
		client1.client_side_prediction = !client1.client_side_prediction;
		client2.client_side_prediction = !client2.client_side_prediction;
	}
	if (event.code === "KeyR") {
		client1.server_reconciliation = !client1.server_reconciliation;
		client2.server_reconciliation = !client2.server_reconciliation;
	}
});

(function run() {
	requestAnimationFrame(run);
	if (!window.paused) {
		update();
	}
	render();
})();

function update() {
	// server.update();
	client1.update();
	client2.update();
}

function render() {
	renderView(client1, canvases[0], ctxs[0]);
	renderView(server, canvases[1], ctxs[1]);
	renderView(client2, canvases[2], ctxs[2]);
}

function renderView(data, canvas, ctx) {
	ctx.fillStyle = "gray";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "black";
	ctx.font = "15px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	if (data.isClient) {
		ctx.fillText(`Ping: ${data.calculateDelay()}ms`, canvas.width / 2, 20);
		ctx.fillText(
			`Estimated Tick delay: ${server.pings[data.selfId]}`,
			canvas.width / 2,
			40
		);
	}

	if (data.isServer) {
		ctx.fillText(`[SERVER] Tickrate: ${tickRate}`, canvas.width / 2, 20);
	}

	if (data.isServer && showServerOnClient) {
		for (const playerId of Object.keys(data.players)) {
			for (const otherId of Object.keys(data.players)) {
				if (playerId === otherId) continue;
				const history = data.getSnapshot(
					data.presentTick() - data.pings[otherId]
				);
				if (!history) continue;
				const player = history.players[playerId];
				ctx.fillStyle = "blue";
				ctx.beginPath();
				ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
				ctx.fill();
			}
			// const history = data.getSnapshot(
			//   data.presentTick() - data.pings[playerId]
			// );
			// if (!history) continue;
			// const player = history.players[playerId];
			// ctx.fillStyle = "blue";
			// ctx.beginPath();
			// ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
			// ctx.fill();
		}
		// if (oldestHistory != null && oldestHistory.players != null) {
		// 	// console.log('rendring old history')
		// 	for (const playerId of Object.keys(oldestHistory.players)) {
		// 		const player = oldestHistory.players[playerId]
		// 		ctx.fillStyle = 'blue';
		// 		ctx.beginPath();
		// 		ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
		// 		ctx.fill()
		// 	}
		// }
	}

	if (data.isClient && showServerOnClient) {
		for (const playerId of Object.keys(data.players)) {
			if (Number(playerId) !== data.selfId) continue;
			ctx.fillStyle = "green";
			ctx.beginPath();
			ctx.arc(
				server.players[playerId].x,
				server.players[playerId].y,
				server.players[playerId].radius,
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}
	if (data.capture != null && showServerOnClient) {
		for (const playerId of Object.keys(data.capture)) {
			if (Number(playerId) === data.selfId) continue;
			const player = data.capture[playerId];
			ctx.fillStyle = 'white';
			ctx.beginPath();
			ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	if (data.shotState != null && showServerOnClient) {
		for (const playerId of Object.keys(data.shotState)) {
			// if (Number(playerId) === data.selfId) continue;
			const player = data.shotState[playerId];
			ctx.fillStyle = 'orange';
			ctx.beginPath();
			ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	for (const playerId of Object.keys(data.players)) {
		const player = data.players[playerId];
		ctx.fillStyle = "black";
		if (Number(playerId) === data.selfId) {
			ctx.fillStyle = "red";
		}
		ctx.beginPath();
		ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
		ctx.fill();
	}

}
