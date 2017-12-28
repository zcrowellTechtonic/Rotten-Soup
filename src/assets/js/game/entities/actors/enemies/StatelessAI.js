import { Actor } from '#/entities/actors/Actor.js'
import { Game } from '#/Game.js'
import { getVisibleTiles } from '#/utils/HelperFunctions'

import ROT from 'rot-js'

/* StatelessAI class to encapsulate all enemies with simple AI that will move towards the player,
   run away from the player, attempt to stay within maximum range (if ranged) by using a limited set
   of parameters:
   - morale, distance to the player (how far, how close it should be), ranged?, magic caster?
   * based on http://www.roguebasin.com/index.php?title=Roguelike_Intelligence_-_Stateless_AIs
*/
export class StatelessAI extends Actor {
	constructor(x, y, options, config) {
		super(x, y, options)
		this.ai = config
	}

	act() {
		Game.engine.lock()
		const endTurn = () => {
			Game.engine.unlock()
			super.act()
		}
		let dx = Math.abs(this.x - Game.player.x)
		let dy = Math.abs(this.y - Game.player.y)
		if (dx > Game.width / 2 || dy > Game.height / 2) {
			endTurn()
			return
		}

		Game.player.recalculatePath()
		let visibleTiles = getVisibleTiles(this)
		let allVisibleActors = visibleTiles.reduce((actors, tile) => {
			return actors.concat(tile.actors)
		}, [])

		let playerInView = allVisibleActors.some(a => {
			return a === Game.player
		})

		if (playerInView) {
			if (!this.chasing) {
				Game.log(`A ${this.name} sees you.`, 'alert')
			}

			this.chasing = true
			let pathToPlayer = []
			Game.player.path.compute(this.x, this.y, (x, y) => {
				pathToPlayer.push([x, y])
			})

			let {
				morale,
				minPlayerDist,
				maxPlayerDist,
				ranged,
				melee,
				magic
			} = this.ai
			let healthRemainingPercentage = this.cb.hp / this.cb.maxhp

			const findNearbyTiles = () => {
				let nearbyTiles = []
				for (let i = 0; i < 7; i++) {
					let diff = ROT.DIRS[8][i]
					let x = this.x + diff[0]
					let y = this.y + diff[1]
					if (Game.inbounds(x, y)) {
						let ctile = Game.getTile(x, y)
						if (!ctile.blocked() && ctile.actors.length === 0)
							nearbyTiles.push(ctile)
					}
				}
				return nearbyTiles
			}
			const playerDistToTile = tile => {
				let { x1, y1 } = tile
				let { x2, y2 } = Game.player
				return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1), 2)
			}

			const getFarthestAwayTile = () => {
				let nearbyTiles = findNearbyTiles()
				if (nearbyTiles.length > 0)
					return nearbyTiles.reduce((farthest, tile) => {
						return playerDistToTile(farthest) >=
							playerDistToTile(tile)
							? farthest
							: tile
					}) // by default, just stay where we are
				else return null
			}

			// if morale is greater than the health remaining, we need to flee!
			if (morale >= healthRemainingPercentage) {
				let tile = getFarthestAwayTile()
				if (tile !== null) {
					if (!this.fleeing)
						Game.log(
							`The ${this.name.toLowerCase()} trembles at your might and attempts to escape death.`,
							'purple'
						)
					this.fleeing = true
					// if we can run away
					this.tryMove(tile.x, tile.y)
					endTurn()
					return
				} else {
					// we can't flee, so we might as well fight
					if (pathToPlayer.length <= 2) {
						let newPos = pathToPlayer[1]
						this.tryMove(newPos[0], newPos[1])
					}
				}
			} else {
				if (pathToPlayer.length >= 1) {
					let newPos = pathToPlayer[1] // 1 past the current position
					this.tryMove(newPos[0], newPos[1])
				}
			}

			/*
                              TYPICAL AI
                     If damage > morale
                        if can-run-away-from-player
                           run-away-from-player
                        else if can-attack-player
                           attack-player
                     else if too-far-from-player
                        AND can-attack-player
                        AND can-move-toward-player
                            if  random < charge-probability
                                move-toward-player
                            else attack-player
                     else if too-close-to-character
                        AND can-attack-player
                        AND can-move-away-from-player
                            if random < retreat-probability
                               move-away-from-player
                            else attack-player
                     else if can-attack-player
                        attack-player
                     else if too-far-from-player
                        AND can-move-toward-player
                  move-toward-player
                     else if too-close-to-player
                        AND can-move-away-from-player
                            move-away-from-player
                     else stand-still
                  */
		}

		endTurn()
	}

	interact(actor) {
		if (actor === Game.player) {
			this.attack(actor)
		} else {
			actor.react(this)
		}
	}
}
