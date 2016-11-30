/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('towerFirer');
 * mod.thing == 'a thing'; // true
 *
 * shamelessly stolen from reify and then modified
 */

towerFirer = {
    fire: function(roomName) {
        var towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
            filter: (s) => s.structureType == STRUCTURE_TOWER
        });
        for (let tower of towers) {
            var target = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (target != undefined) {
                tower.attack(target);
            }
            else {
                var repairTargets = tower.pos.findInRange(FIND_STRUCTURES, 10, { filter: Structure.prototype.structureNeedsRepairs });
                if (repairTargets[0] != undefined) {
                    tower.repair(repairTargets[0]);
                }
                //TODO else heal? costs energy, though I suppose spawning a healer does too.
            }
        }
    }
}

module.exports = towerFirer;