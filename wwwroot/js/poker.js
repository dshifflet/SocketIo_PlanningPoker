PokerClient = function (id, user, host) {
    var self = this;

    this.socket = io();

    this.id = id;
    this.ready = false;
    this.user = user;
    this.host = host;

    this.clients = [];
    this.history = [];

    this.icons = new animalIcons();

    this.socket.on("poker message", function (msg) {
        self.processMessage(msg);
    });

    this.processMessage = function (data) {
        var msg = JSON.parse(data);
        if (msg.to !== self.id) {
            return;
        }
        for (var i = 0; i < self.commands.length; i++) {
            var element = self.commands[i];
            if (element.command && element.command === msg.command) {
                element.fn.apply(element.fn, msg.parameters);
            }
        }
    }

    this.sendMessage = function (destination, command, parameters) {
        var msg = {
            to: destination,
            room: self.host,
            from: self.id,
            command: command,
            parameters: parameters
        };
        var jsonMsg = JSON.stringify(msg);
        if (destination === self.id && msg.command !== "join") {
            self.processMessage(jsonMsg);
        } else {
            self.send(destination, jsonMsg);
        }
    };

    this.broadcastMessage = function (command, parameters) {

        for (var i = 0; i < self.clients.length; i++) {
            self.sendMessage(self.clients[i].id, command, parameters);
        }
        //todo dry
        var msg = {
            room: self.host,
            from: self.id,
            command: command,
            parameters: parameters
        };
        self.history.push(msg);
    }

    this.send = function (destination, message) {
        self.socket.emit("poker message", message);
    };

    /*******************************/
    /* HOST CODE
    /*******************************/
    this.hostJoined = function (id, user) {
        self.sendMessage(self.host, "start", []);
        var client;
        var i = 0;
        for (i = 0; i < self.clients.length; i++) {
            if (self.clients[i].id === id) {
                client = self.clients[i];
            }
        }
        if (!client) {
            self.clients.push({
                id: id,
                user: user
            });
        }
        self.sendMessage(id, "start", []);
        for (i = 0; i < self.history.length; i++) {
            self.sendMessage(id, self.history[i].command, self.history[i].parameters);
        }

    };

    this.hostStart = function () {};

    this.hostPlay = function (user, card) {
        self.broadcastMessage("playedCard", [user, card]);
    };

    this.hostCallGame = function () {
        self.broadcastMessage("gameCalled", []);
    };

    this.hostStartGame = function () {
        self.history = [];
        self.broadcastMessage("gameStarted", []);
        self.broadcastMessage("playCard", [self.user, ""]);
    };

    this.hostNameChanged = function (txt) {
        self.broadcastMessage("changeName", [txt]);
    };

    /*******************************/
    /* CLIENT CODE
    /*******************************/

    this.joinGame = function () {
        self.sendMessage(self.host, "join", [self.id, self.user]);
    };

    this.playCard = function (user, card) {
        self.sendMessage(self.host, "playCard", [user, card]);
    };

    this.newGame = function () {
        self.sendMessage(self.host, "startGame", []);
        self.sendMessage(self.host, "nameChanged", [document.getElementById("gamename").value]);
    };

    this.nameChange = function () {
        self.sendMessage(self.host, "nameChanged", [document.getElementById("gamename").value]);
    }

    this.changeName = function (txt) {
        document.getElementById("gamename").value = txt;
        self.showSnackBar(txt);
    }

    this.callGame = function () {
        self.sendMessage(self.host, "callGame", []);
    };

    this.clearTable = function () {
        var hand = document.getElementById("hand");
        hand.innerHTML = "";
        var table = document.getElementById("table");
        table.innerHTML = "";
    };

    this.dealCards = function () {
        self.clearTable();
        var hand = document.getElementById("hand");
        var cards = ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "♣"];

        for (var i = 0; i < cards.length; i++) {
            hand.innerHTML += "<div class='card' id='_playercard" + i + "'><p>" + cards[i] + "</p></div>";
        }
        for (var i = 0; i < cards.length; i++) {
            document.getElementById("_playercard" + i).addEventListener("click", function () {
                self.playCard(self.user, this.innerText);
            });
        }
        self.playCard(self.user, "");
    };

    this.showCards = function () {
        var elements = document.querySelectorAll(".playedcard");
        var last = "";
        var matched = 0;
        for (var i = 0; i < elements.length; i++) {
            splits = elements[i].id.split("_");
            newHtml = "<p>" + splits[splits.length - 1] + "</p>";
            elements[i].innerHTML = newHtml;
            if (last.length > 0 && last === newHtml) {
                matched++;
            }
            last = newHtml;
        }
        if (matched == elements.length - 1 && elements.length > 1) {
            self.showSnackBar("CONGRATULATIONS!")
            var originalColor = document.body.style.backgroundColor;
            for (var i = 1; i < 10; i++) {
                if (i == 9) {
                    setTimeout(function () {
                        document.body.style.backgroundColor = originalColor;
                        document.getElementById("snackbar").style.color = "white";
                    }, 250 * i);
                } else if (i % 2 === 0) {
                    setTimeout(function () {
                        document.body.style.backgroundColor = "#004924";
                        document.getElementById("snackbar").style.color = "red";
                    }, 250 * i);

                } else {
                    setTimeout(function () {
                        document.body.style.backgroundColor = "#00a852";
                        document.getElementById("snackbar").style.color = "yellow";
                    }, 250 * i);

                }
            }
        }
    };

    this.playedCard = function (user, card) {
        var table = document.getElementById("table");

        var playedCard = document.getElementById("_playedcard_" + user);
        var html = "<table id='_playedcard_" + user + "' style='float:left;'><tr>";
        var value = card;
        if (self.user != user && card != "") {
            value = "<p style='color:red;'>" + self.icons.getRandom() + "</p>";
        }

        html += "<td><div style='float:left;padding-left:10px;'><center><span class='username'>" + user + "</span><br/><div class='card playedcard' id='_card_" + user + "_" + card + "' style='float:none;'><p>" + value + "</p></div></center></div></td>";
        html += "</tr></table>";

        if (playedCard) {
            playedCard.outerHTML = html;
        } else {
            table.innerHTML += html
        }
    };

    this.gameStarted = function () {
        self.clearTable();
        self.dealCards();
        self.showSnackBar("A new game has started!");
    };

    this.gameCalled = function () {
        var hand = document.getElementById("hand");
        hand.innerHTML = "";
        self.showCards();
        self.showSnackBar("Game has been called!");
    };

    this.showSnackBar = function (txt) {
        // Get the snackbar DIV
        var x = document.getElementById("snackbar");
        if (x.className === "show") {
            return;
        }
        x.innerText = txt;
        // Add the "show" class to DIV
        x.className = "show";

        // After 3 seconds, remove the show class from DIV
        setTimeout(function () {
            x.className = x.className.replace("show", "");
        }, 3000);
    }

    this.commands = [{
            command: "join",
            fn: this.hostJoined
        },
        {
            command: "start",
            fn: this.hostStart
        },
        {
            command: "playCard",
            fn: this.hostPlay
        },
        {
            command: "playedCard",
            fn: this.playedCard
        },
        {
            command: "callGame",
            fn: this.hostCallGame
        },
        {
            command: "gameCalled",
            fn: this.gameCalled
        },
        {
            command: "startGame",
            fn: this.hostStartGame
        },
        {
            command: "gameStarted",
            fn: this.gameStarted
        },
        {
            command: "nameChanged",
            fn: this.hostNameChanged
        },
        {
            command: "changeName",
            fn: this.changeName
        },
    ];
}