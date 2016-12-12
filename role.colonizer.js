/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.colonizer');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    run: function(creep) {
        var dest = Game.flags['Attack1'];
        if(creep.pos.roomName != dest.pos.roomName) {
            creep.moveTo(dest);
        }
        else {
            var target = creep.room.controller;
            creep.moveTo(target);
            var result = creep.claimController(target);
        }
    }
}
