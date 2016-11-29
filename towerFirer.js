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

var structureNeedsRepairs = function(structure) {
    var tileFlags = structure.room.lookForAt(LOOK_FLAGS, structure.pos);
    return (tileFlags.length > 0) && (structure.hits < structure.hitsMax*0.8) && (structure.hits < 5000);
}

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
                var repairTargets = tower.pos.findInRange(FIND_STRUCTURES, 5, { filter: structureNeedsRepairs });
                if (repairTargets[0] != undefined) {
                    tower.repair(repairTargets[0]);
                }
                //TODO else heal? costs energy, though
            }
        }
    }
}

module.exports = towerFirer;