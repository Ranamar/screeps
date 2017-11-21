/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.colonizer');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    claim: function(creep) {
        var dest = Game.flags['colonize'];
        if(creep.pos.roomName != dest.pos.roomName) {
            creep.moveTo(dest);
        }
        else {
            var target = creep.room.controller;
            creep.moveTo(target);
            var result = creep.claimController(target);
        }
    },
    reserve: function(creep) {
        let dest = Game.flags[creep.memory.flag];
        if(creep.pos.roomName != dest.pos.roomName) {
            creep.moveTo(dest);
        }
        else {
            let target = creep.room.controller;
            creep.moveTo(target);
            let result = creep.reserveController(target);
        }
    }
}
