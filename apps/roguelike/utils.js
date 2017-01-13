 function actorCreator(id, x, y) {
     let symbol = String.fromCharCode(id - 1);
     switch (symbol) {
         case '$':
            return new Store(x, y);
         case '@':
            return new Player(x, y);
         case 'g':
            return new Goblin(x, y);
         case '<':
            return new Ladder(x, y, symbol, "up");
         case '>':
            return new Ladder(x, y, symbol, "down");
         default:
            return null;
     }
 }

class Map {
    constructor(json) {
        if (! json) throw "Bad map creation";
        let obstacles = json.layers[0];
        let actorLayer = json.layers[1];
        this.player = null;
        this.width = obstacles.width;
        this.height = obstacles.height;
        this.actors = []; // store all of the actors in array
        this.data = new Array(this.height); // stores all tiles in the game

        console.log("Creating game map...");
        for (var i = 0; i < this.height; i++) {
            this.data[i] = new Array(this.width);
            for (var j = 0; j < this.width; j++) {
                // Grabs the symbol from the layer
                var id = obstacles.data[i*this.width + j];
                this.data[i][j] = new Tile(j, i, id);
            }
        }

        console.log("Creating actors...");
        for (var i = 0; i < this.height; i++) {
            for (var j = 0; j < this.width; j++) {
                let id = actorLayer.data[i*this.width + j]; // grab the id in the json data
                if (id != 0) { // id of zero indicates no actor in this spot
                    let newActor = actorCreator(id, j, i); // create the new actor
                    if (newActor.options.symbol == "@") this.player = newActor;
                    this.actors.push(newActor); // add to the list of all actors
                    this.data[i][j].actors.push(newActor); // also push to the tiles' actors
                }
            }
        }
    }

    print() {
        let buf = "";
        for (var i = 0; i < this.height; i++) {
            let row = "";
            for (var j = 0; j < this.width; j++)
                row += this.data[i][j].symbol; //+ " ";
            buf += row + '\n';
        }

        for (var i = 0; i < this.actors.length; i++) {
            let actor = this.actors[i];
            /* to calculate where the actor should go, we have to consider
            the new line character in each line of the buffer, which is equal
            to the actor's y coord. */
            let index = actor.y*this.width + actor.x + actor.y;
            buf = buf.substr(0, index)
             + actor.options.symbol
             + buf.substr(index+1);
        }
        console.log(buf);
    }


    /* Returns the tiles adjacent to the given tile */
    adjTiles(tile) {
        let adjacentTiles = [];
        for (var dist of ROT.DIRS[8]) {
            let nx = tile.x + dist[0];
            let ny = tile.y + dist[1];
            if (nx < 0 || nx == this.width || ny < 0 || ny == this.height)
                continue; // out of bounds, skip
            else
                adjacentTiles.push(this.data[ny][nx]);
        }
        return adjacentTiles;
    }

}

class Tile {
    constructor(x, y, id) {
        this.symbol = id == 0 ? String.fromCharCode(32) : String.fromCharCode(id - 1);
        this.options = environment[this.symbol];
        this.actors = [];
        this.x = x;
        this.y = y;
    }

    /* Indicates whether or not a tile is blocked; however, this excludes the player
     * for AI purposes. */
    blocked() {
        if (this.options.blocked) return true;
        for (var actor of this.actors) {
            if (actor.options.blocked && actor != Game.player)
                return true;
        }
        return false;
    }
}

class HUD {
    constructor() {
        $('body').append(
            "<div id='hud' class='w3-container w3-roguefont w3-black'>"
            + this.getStats() + "</div>");
    }

    update() {
        document.getElementById('hud').innerHTML = this.getStats();
    }

    createBar(barID, color, width) {
        let cb = Game.player.options.combat;
        var num = cb.mana;
        var denom = cb.maxmana;
        if (barID == "hpbar") {
            num = cb.hp;
            denom = cb.maxhp;
        } else if (barID == "staminabar") {
            num = cb.stamina;
            denom = cb.maxstamina;
        }

        let pct = ((num / denom)*100) + "%";
        return `<div class='w3-progress-container w3-black w3-third'>
                  <div id='${barID}'
                  class='w4-progressbar w3-border w3-round ${color}' style='width:${pct}'>
                  <div class='w3-center w3-text-white'>${pct}</div></div></div>`;
   }

    getStats() {
        var buffer = "";
        var p = Game.player;
        var cb = p.options.combat;
        /* HP Bar */
        buffer += "<div class='w3-row w3-card-4 w3-margin-top'><div class='w3-quarter'><i>Hitpoints </i>"
                    + cb.hp + "/" + cb.maxhp + "</div>";
        buffer += this.createBar("hpbar", "w3-red");
        buffer += "</div>"

        /* Stamina Bar */
        buffer += "<div class='w3-row w3-margin-top'><span class='w3-quarter'><i>Stamina </i>"
                    + cb.stamina + "/" + cb.maxstamina + "</span>";
        buffer += this.createBar("staminabar", "w3-green");
        buffer += "</div>"

        /* Mana Bar */
        buffer += "<div class='w3-row w3-margin-top'><span class='w3-quarter''><i>Mana </i>"
                    + cb.mana + "/" + cb.maxmana + "</span>";
        buffer += this.createBar("manabar", "w3-blue");
        buffer += "</div>"
        return buffer;
    }

    deathScreen() {
        var modal = `<div id="deathScreen" class="w3-modal" >
                  <div class="w3-container w3-border w3-black w3-modal-content w3-animate-top w3-card-8" style='width:400px;'>
                      <span style='text-align:center; margin:0 auto;'
                      class='w3-text-red w3-wide w3-text-shadow'>
                        <i style='font-size:100px;' class='w3-deathfont'>YOU DIED</i>
                      </span>
                      <div class="w3-padding-16">
                          <button class="w3-btn-block w3-ripple w3-text-shadow w3-green" onclick="Game.HUD.newGame()">
                          <b>Try Again?</b>
                          </button>
                      </div>
                  </div>
                </div>`;

        $('#hud').append(modal);
        document.getElementById('deathScreen').style.display = "block";
    }

    newGame() {
        Game.loadMap("/apps/roguelike/maps/expanded_start.json");
    }

}
