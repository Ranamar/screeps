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
        var dest = Game.flags['ColonizeRoom'];
        if(creep.pos.roomName != dest.pos.roomName) {
            creep.moveTo(dest);
        }
        else {
            var target = creep.room.controller;
            var result = creep.claimController(target);
            if(result == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
            else {
                console.log("*** Claim went wrong", creep.name, creep.pos, result);
            }
        }
    }
}
