# Netcode Test Project
#### Implements Client Side Prediction, Server Reconciliation, and Lag Compensation
### Controls
#### WASD to move left player
#### OKL; to move right player
#### R to toggle reconciliation (and predicts)
#### P to toggle prediction (doesn't do anything when reconciliation is on)
#### T to toggle player overlays
#### Click (on the client's canvas) and when the player touches the other player, the other player respawns!
### Overlays
#### Orange Circle: Where the players were positioned when the "click" happened
#### White Circle : Where the player's lag compensated hitbox is
#### Red Circle (default): The client's own player
#### Green Circle: Where the player is according to the server in realtime
#### Blue Circle: Lag comepnsated player at max 400ms behind
### This project is completely open source and you are free to use any of this code in your projects (credit is appreciated)
#### Contact:  (most active) Discord: ZeroTix#6300

## To implement: Interpolation and Time Travel